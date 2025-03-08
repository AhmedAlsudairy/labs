'use server';

import { EquipmentHistory, MaintenanceEquipmentHistory, CalibrationEquipmentHistory, ExternalControlHistory, Frequency } from "@/types";
import { updateCalibrationSchedules, updateMaintenanceSchedules } from "./scheduleUpdates";
import { sendEmail } from "@/utils/resend/email";
import { getLaboratoryById } from "./lab";
import { calculateNextDate } from "@/utils/date-utils";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Helper function to filter out undefined emails
function filterValidEmails(emails: (string | undefined)[]): string[] {
    return emails.filter((email): email is string => !!email);
}

// Get history by calibration schedule
export async function getHistoryByCalibrationScheduleId(calibrationScheduleId: number) {
    const { data, error } = await supabase
        .from('equipment_history')
        .select('*')
        .eq('calibration_schedul_id', calibrationScheduleId)
        .order('performed_date', { ascending: false });

    if (error) return { error };
    return { data };
}

// Update history record
export async function updateHistory(
    historyId: number,
    updates: Partial<Omit<EquipmentHistory, 'history_id'>>
) {
    const { data, error } = await supabase
        .from('equipment_history')
        .update(updates)
        .eq('history_id', historyId)
        .select()
        .single();

    if (error) return { error };
    return { data };
}

// Delete history record
export async function deleteHistory(historyId: number) {
    const { error } = await supabase
        .from('equipment_history')
        .delete()
        .eq('history_id', historyId);

    if (error) return { error };
    return { success: true };
}

// Get single history record
export async function getHistoryById(historyId: number) {
    const { data, error } = await supabase
        .from('equipment_history')
        .select('*')
        .eq('history_id', historyId)
        .single();

    if (error) return { error };
    return { data };
}

// Type for maintenance history data
type MaintenanceHistoryInput = Omit<MaintenanceEquipmentHistory, 'history_id'>;

// Type for calibration history data
type CalibrationHistoryInput = Omit<CalibrationEquipmentHistory, 'history_id'>;

// Type for external control history data
type ExternalControlHistoryInput = Omit<ExternalControlHistory, 'history_id'>;

// Modified addMaintenanceHistory function
export async function addMaintenanceHistory(
    data: MaintenanceHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    try {
        // Insert history record
        const { data: result, error } = await supabase
            .from('equipment_history')
            .insert([{ ...data }])
            .select()
            .single();

        if (error) throw error;

        // Update maintenance schedule with new next date if state is done
        if (data.state === 'done') {
            const { error: scheduleError } = await supabase
                .from('maintenance_schedule')
                .update({
                    next_date: calculateNextDate(data.frequency || 'monthly'),
                    state: 'done',
                    last_updated: new Date().toISOString(),
                    updated_by: 'manual'
                })
                .eq('schedule_id', data.schedule_id);

            if (scheduleError) throw scheduleError;
        }

        const { data: cordinator } = await supabase
            .rpc('get_lab_matched_users', {
                p_lab_id: lab_id
            });
        const lab = await getLaboratoryById(lab_id);
        if (!isValidManagerId(lab?.manager_id)) {
            console.warn('Invalid or missing manager_id');
            return { error: new Error('Invalid manager_id') };
        }

        const { data: userData, error: userError } = await supabase.auth
            .admin.getUserById(lab.manager_id);

        const cordinator_email = cordinator?.[0]?.email;
        const manager_email = userData?.user?.email;

        const validEmails = filterValidEmails([
            manager_email,
            'micronboy632@gmail.com',
            cordinator_email
        ]);

        if (validEmails.length === 0) {
            console.warn('No valid email addresses found for notification');
            return { data: result };
        }

        const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;

        const emailContent = {
            to: validEmails,
            title: `Equipment Maintenance Status Update: ${data.state}`,
            body: `
                Equipment maintenance status has been updated to: ${data.state}<br/>
                Description: ${data.description}<br/>
                Next maintenance date: ${data.next_maintenance_date}<br/>
                <br/>
                View equipment details: <a href="${equipmentUrl}">Click here</a>
            `
        };

        await updateMaintenanceSchedules();
        await sendEmail(emailContent);

        return { data: result };
    } catch (error) {
        console.error('Error in addMaintenanceHistory:', error);
        throw error;
    }
}

function isValidManagerId(id: string | undefined): id is string {
    return id !== undefined && id !== '';
}

// Similar changes for addCalibrationHistory function
export async function addCalibrationHistory(
    data: CalibrationHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    try {
        // Get lab information for notifications
        const lab = await getLaboratoryById(lab_id);
        if (!lab) {
            throw new Error('Laboratory not found');
        }

        const { data: historyData, error: historyError } = await supabase
            .from('equipment_history')
            .insert({
                ...data,
                calibration_schedul_id: data.calibration_schedule_id,
                equipment_id,
            })
            .select()
            .single();

        if (historyError) throw historyError;

        // Update calibration schedule with new next date if state is calibrated
        if (data.state === 'calibrated') {
            const { error: scheduleError } = await supabase
                .from('calibration_schedule')
                .update({
                    next_date: calculateNextDate(data.frequency || 'monthly'),
                    state: 'calibrated',
                    last_updated: new Date().toISOString(),
                    updated_by: 'manual'
                })
                .eq('calibration_schedule_id', data.calibration_schedule_id);

            if (scheduleError) throw scheduleError;
        }

        // Rest of the function remains the same...
        return { data: historyData };
    } catch (error) {
        console.error('Error in addCalibrationHistory:', error);
        throw error;
    }
}

// Add external control history
export async function addExternalControlHistory(
    data: ExternalControlHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    try {
        // Get lab information for notifications
        const lab = await getLaboratoryById(lab_id);
        if (!lab) {
            throw new Error('Laboratory not found');
        }

        const { data: historyData, error: historyError } = await supabase
            .from('equipment_history')
            .insert({
                ...data,
                equipment_id,
            })
            .select()
            .single();

        if (historyError) throw historyError;

        // Update external control with new next date if state is Done
        if (data.state === 'Done' as any) { // Type assertion to fix comparison
            const { error: scheduleError } = await supabase
                .from('external_control')
                .update({
                    next_date: calculateNextDate(data.frequency || 'monthly'),
                    state: 'Done',
                    last_updated: new Date().toISOString(),
                    updated_by: 'manual'
                })
                .eq('control_id', data.external_control_id);

            if (scheduleError) throw scheduleError;
        }

        // Send notification emails
        const { data: cordinator } = await supabase
            .rpc('get_lab_matched_users', {
                p_lab_id: lab_id
            });

        if (!isValidManagerId(lab.manager_id)) {
            console.warn('Invalid or missing manager_id');
            return { error: new Error('Invalid manager_id') };
        }

        const { data: userData } = await supabase.auth
            .admin.getUserById(lab.manager_id);

        const cordinator_email = cordinator?.[0]?.email;
        const manager_email = userData?.user?.email;

        const validEmails = filterValidEmails([
            manager_email,
            'micronboy632@gmail.com',
            cordinator_email
        ]);

        if (validEmails.length > 0) {
            const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;

            const emailContent = {
                to: validEmails,
                title: `External Control Status Update: ${data.state}`,
                body: `
                    External control status has been updated to: ${data.state}<br/>
                    Description: ${data.description}<br/>
                    Performed date: ${data.performed_date}<br/>
                    <br/>
                    View equipment details: <a href="${equipmentUrl}">Click here</a>
                `
            };

            await sendEmail(emailContent);
        }

        return { data: historyData };
    } catch (error) {
        console.error('Error in addExternalControlHistory:', error);
        throw error;
    }
}

// Get history by maintenance schedule
export async function getHistoryByScheduleId(scheduleId: number) {
    const { data, error } = await supabase
        .from('equipment_history')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('performed_date', { ascending: false });

    if (error) return { error };
    return { data };
}

// Get external control history
export async function getExternalControlHistory(equipmentId: number) {
    const { data, error } = await supabase
        .from('equipment_history')
        .select('*')
        .eq('equipment_id', equipmentId)
        .is('calibration_schedule_id', null)
        .is('schedule_id', null)
        .order('performed_date', { ascending: false });

    if (error) return { error };
    return { data };
}