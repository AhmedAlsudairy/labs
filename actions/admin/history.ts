'use server';

import { 
  EquipmentHistory, 
  MaintenanceEquipmentHistory, 
  CalibrationEquipmentHistory, 
  ExternalControlHistory, 
  Frequency,
  MaintenanceHistoryInput,
  CalibrationHistoryInput,
  ExternalControlHistoryInput
} from "@/types";
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
        .eq('calibration_schedule_id', calibrationScheduleId) // Fixed column name
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

// Optimized addMaintenanceHistory function
export async function addMaintenanceHistory(
    data: MaintenanceHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    let startTime = Date.now();
    console.log("Starting maintenance history submission...");
    
    try {
        console.log("Adding maintenance history with data:", JSON.stringify(data, null, 2));
        
        // Extract frequency from data before inserting
        const { frequency, ...historyData } = data;
        
        // Insert history record - measure critical operation time
        console.log("Step 1: Inserting into equipment_history");
        const insertStart = Date.now();
        const { data: result, error } = await supabase
            .from('equipment_history')
            .insert({
                performed_date: historyData.performed_date,
                completed_date: historyData.completed_date,
                description: historyData.description,
                technician_notes: historyData.technician_notes,
                schedule_id: historyData.schedule_id,
                work_performed: historyData.work_performed,
                parts_used: historyData.parts_used,
                next_maintenance_date: historyData.next_maintenance_date,
                state: historyData.state
            })
            .select()
            .single();
        console.log(`Equipment history insert took ${Date.now() - insertStart}ms`);

        if (error) {
            console.error("Error inserting maintenance history:", error);
            return { error };
        }

        // Update maintenance schedule with new next date if state is done
        if (data.state === 'done') {
            console.log("Step 2: Updating maintenance schedule");
            const updateStart = Date.now();
            try {
                // Use the completed date as the base for calculating the next date
                const nextDateFromCompleted = calculateNextDate(
                    frequency || 'monthly', 
                    new Date(historyData.completed_date)
                );
                
                console.log(`Calculated next date: ${nextDateFromCompleted} based on completed date: ${historyData.completed_date}`);
                
                // Fire and forget the update - don't await it
                const updatePromise = supabase
                    .from('maintenance_schedule')
                    .update({
                        next_date: nextDateFromCompleted,
                        state: 'done',
                        last_updated: new Date().toISOString(),
                        updated_by: 'manual'
                    })
                    .eq('schedule_id', data.schedule_id);
                
                // Don't wait for this to complete before returning
                updatePromise.then(({ error: scheduleError }) => {
                    if (scheduleError) {
                        console.error("Error updating maintenance schedule:", scheduleError);
                    } else {
                        console.log(`Successfully updated maintenance schedule ${data.schedule_id} with next date ${nextDateFromCompleted}`);
                    }
                });
                
                console.log(`Schedule update initiated in ${Date.now() - updateStart}ms`);
            } catch (scheduleError) {
                console.error("Error updating maintenance schedule:", scheduleError);
                // Don't throw here, just log the error and continue
            }
        }

        // Return early with the result before waiting for non-critical operations
        console.log(`Total handler time so far: ${Date.now() - startTime}ms`);
        
        // Fire and forget the email notifications and schedule updates
        // These operations can run in the background
        setTimeout(async () => {
            try {
                console.log("Step 3: Background operations - email notifications");
                const notifyStart = Date.now();
                const { data: cordinator } = await supabase
                    .rpc('get_lab_matched_users', { p_lab_id: lab_id });
                    
                const lab = await getLaboratoryById(lab_id);
                if (!isValidManagerId(lab?.manager_id)) {
                    console.warn('Invalid or missing manager_id');
                    return;
                }

                const { data: userData } = await supabase.auth
                    .admin.getUserById(lab.manager_id);

                // ...email sending code...
                
                console.log(`Background operations took ${Date.now() - notifyStart}ms`);
                console.log("Step 4: Updating maintenance schedules");
                await updateMaintenanceSchedules();
                console.log("Background operations completed");
            } catch (backgroundError) {
                console.error("Error in background operations:", backgroundError);
            }
        }, 100); // Run after 100ms to ensure it doesn't block

        return { data: result };
    } catch (error) {
        console.error('Error in addMaintenanceHistory:', error);
        return { error: error instanceof Error ? error : new Error('Unknown error') };
    } finally {
        console.log(`Total maintenance history submission took ${Date.now() - startTime}ms`);
    }
}

function isValidManagerId(id: string | undefined): id is string {
    return id !== undefined && id !== '';
}

// Fix addCalibrationHistory function
export async function addCalibrationHistory(
    data: CalibrationHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    try {
        console.log("Adding calibration history with data:", JSON.stringify(data, null, 2));
        
        // Extract frequency from data before inserting
        const { frequency, ...historyData } = data;
        
        const { data: calibrationResult, error: historyError } = await supabase
            .from('equipment_history')
            .insert({
                performed_date: historyData.performed_date,
                completed_date: historyData.completed_date,
                description: historyData.description,
                technician_notes: historyData.technician_notes,
                calibration_schedule_id: historyData.calibration_schedule_id,
                calibration_results: historyData.calibration_results,
                next_calibration_date: historyData.next_calibration_date,
                state: historyData.state
            })
            .select()
            .single();

        if (historyError) {
            console.error("Error inserting calibration history:", historyError);
            throw historyError;
        }

        // Update calibration schedule with new next date if state is calibrated
        if (data.state === 'calibrated') {
            const { error: scheduleError } = await supabase
                .from('calibration_schedule')
                .update({
                    next_date: calculateNextDate(frequency || 'monthly'),
                    state: 'calibrated',
                    last_updated: new Date().toISOString(),
                    updated_by: 'manual'
                })
                .eq('calibration_schedule_id', data.calibration_schedule_id);

            if (scheduleError) throw scheduleError;
        }

        return { data: calibrationResult };
    } catch (error) {
        console.error('Error in addCalibrationHistory:', error);
        throw error;
    }
}

// Fix addExternalControlHistory function
export async function addExternalControlHistory(
    data: ExternalControlHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    try {
        console.log("Adding external control history with data:", JSON.stringify(data, null, 2));
        
        // Get lab information for notifications first
        const lab = await getLaboratoryById(lab_id);
        if (!lab) {
            throw new Error('Laboratory not found');
        }
        
        // Extract frequency from data before inserting
        const { frequency, ...historyData } = data;

        const { data: controlResult, error: historyError } = await supabase
            .from('equipment_history')
            .insert({
                performed_date: historyData.performed_date,
                completed_date: historyData.completed_date,
                description: historyData.description,
                technician_notes: historyData.technician_notes,
                external_control_id: historyData.external_control_id,
                work_performed: historyData.work_performed,
                parts_used: historyData.parts_used,
                state: historyData.state,
                external_control_state: historyData.external_control_state
            })
            .select()
            .single();

        if (historyError) {
            console.error("Error inserting external control history:", historyError);
            throw historyError;
        }

        // Update external control with new next date if state is Done
        if (data.state === 'Done' as any) { // Type assertion to fix comparison
            const { error: scheduleError } = await supabase
                .from('external_control')
                .update({
                    next_date: calculateNextDate(frequency || 'monthly'),
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

        return { data: controlResult };
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