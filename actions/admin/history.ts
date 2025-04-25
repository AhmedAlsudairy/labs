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

// Helper function to validate manager ID
function isValidManagerId(id: string | undefined): id is string {
    return id !== undefined && id !== '';
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
        
        // Ensure dates are properly formatted for database storage
        // Convert date objects to ISO strings to maintain timezone consistency
        const performed_date = historyData.performed_date instanceof Date 
            ? historyData.performed_date.toISOString() 
            : historyData.performed_date;
            
        const completed_date = historyData.completed_date instanceof Date 
            ? historyData.completed_date.toISOString() 
            : historyData.completed_date;
            
        const next_maintenance_date = historyData.next_maintenance_date instanceof Date 
            ? historyData.next_maintenance_date.toISOString() 
            : historyData.next_maintenance_date;
        
        // Insert history record - measure critical operation time
        console.log("Step 1: Inserting into equipment_history");
        const insertStart = Date.now();
        const { data: result, error } = await supabase
            .from('equipment_history')
            .insert({
                performed_date: performed_date,
                completed_date: completed_date,
                description: historyData.description,
                technician_notes: historyData.technician_notes,
                schedule_id: historyData.schedule_id,
                work_performed: historyData.work_performed,
                parts_used: historyData.parts_used,
                next_maintenance_date: next_maintenance_date,
                state: historyData.state
            })
            .select()
            .single();
        console.log(`Equipment history insert took ${Date.now() - insertStart}ms`);

        if (error) {
            console.error("Error inserting maintenance history:", error);
            return { error };
        }

        // Get current schedule state to determine proper updates
        const { data: currentSchedule, error: scheduleError } = await supabase
            .from('maintenance_schedule')
            .select('*')
            .eq('schedule_id', data.schedule_id)
            .single();
            
        if (scheduleError) {
            console.error("Error fetching current maintenance schedule:", scheduleError);
        } else {
            console.log("Current maintenance schedule:", currentSchedule);
        }

        // Determine the appropriate state and next date for the schedule
        let newState = data.state;
        let newNextDate;

        // Always prioritize the manually set next_maintenance_date from history
        if (historyData.next_maintenance_date) {
            console.log(`Using manually set next_maintenance_date: ${historyData.next_maintenance_date}`);
            newNextDate = historyData.next_maintenance_date;
        } else if (data.state === 'done') {
            console.log("No next_maintenance_date set and state is 'done', calculating next date");
            // Use the completed date as the base for calculating the next date
            newNextDate = calculateNextDate(
                frequency || 'monthly', 
                new Date(historyData.completed_date)
            );
            console.log(`Calculated next date: ${newNextDate} based on completed date: ${historyData.completed_date}`);
        } else {
            // For non-done states with no next_maintenance_date, preserve the current next_date
            newNextDate = currentSchedule?.next_date;
            console.log(`Using current schedule next date: ${newNextDate} for state: ${data.state}`);
        }
        
        // Update maintenance schedule
        console.log("Step 2: Updating maintenance schedule");
        const updateStart = Date.now();
        try {
            const { error: updateError } = await supabase
                .from('maintenance_schedule')
                .update({
                    next_date: newNextDate,
                    state: newState,
                    last_updated: new Date().toISOString(),
                    updated_by: 'manual'
                })
                .eq('schedule_id', data.schedule_id);
                
            if (updateError) {
                console.error("Error updating maintenance schedule:", updateError);
            } else {
                console.log(`Successfully updated maintenance schedule ${data.schedule_id} with next date ${newNextDate} and state ${newState}`);
            }
                
            console.log(`Schedule update took ${Date.now() - updateStart}ms`);
        } catch (scheduleError) {
            console.error("Error updating maintenance schedule:", scheduleError);
        }

        // Return early with the result before waiting for non-critical operations
        console.log(`Total handler time so far: ${Date.now() - startTime}ms`);
        
        // Fire and forget the email notifications
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

                // Send email notification about maintenance history update
                try {
                    const coordinator_email = cordinator?.[0]?.email;
                    const manager_email = userData?.user?.email;
                    
                    // Get equipment details for more informative email
                    const { data: equipmentData } = await supabase
                        .from('equipment')
                        .select('*, device(*), laboratory:lab_id(*)')
                        .eq('equipment_id', equipment_id)
                        .single();
                    
                    const equipmentName = equipmentData?.device?.[0]?.name || 'Unknown Equipment';
                    const labName = equipmentData?.laboratory?.name || 'Unknown Lab';
                    const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;
                    
                    const emailContent = {
                        to: [coordinator_email, manager_email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
                        title: `Maintenance History Update: ${equipmentName} - ${labName}`,
                        body: `
                            Lab: ${labName}<br/>
                            Equipment: ${equipmentName}<br/>
                            Maintenance Date: ${performed_date}<br/>
                            Work Performed: ${historyData.work_performed}<br/>
                            Description: ${historyData.description}<br/>
                            Status: ${historyData.state}<br/>
                            Next Maintenance Date: ${next_maintenance_date}<br/>
                            <br/>
                            View equipment details: <a href="${equipmentUrl}">Click here</a>
                        `
                    };
                    
                    console.log(`[Email Debug] Sending maintenance history notification to:`, emailContent.to.join(', '));
                    const emailResult = await sendEmail(emailContent);
                    console.log(`[Email Debug] Maintenance history email result:`, emailResult);
                } catch (emailError) {
                    console.error("Error sending maintenance history email notification:", emailError);
                }
                
                console.log(`Background operations took ${Date.now() - notifyStart}ms`);
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

// Fix addCalibrationHistory function
export async function addCalibrationHistory(
    data: CalibrationHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    let startTime = Date.now();
    console.log("Starting calibration history submission...");
    
    try {
        console.log("Adding calibration history with data:", JSON.stringify(data, null, 2));
        
        // Extract frequency from data before inserting
        const { frequency, ...historyData } = data;
        
        // Ensure dates are properly formatted for database storage
        const performed_date = historyData.performed_date instanceof Date 
            ? historyData.performed_date.toISOString() 
            : historyData.performed_date;
            
        const completed_date = historyData.completed_date instanceof Date 
            ? historyData.completed_date.toISOString() 
            : historyData.completed_date;
            
        const next_calibration_date = historyData.next_calibration_date instanceof Date 
            ? historyData.next_calibration_date.toISOString() 
            : historyData.next_calibration_date;
        
        // Insert history record
        console.log("Step 1: Inserting into equipment_history");
        const insertStart = Date.now();
        const { data: result, error } = await supabase
            .from('equipment_history')
            .insert({
                performed_date: performed_date,
                completed_date: completed_date,
                description: historyData.description,
                technician_notes: historyData.technician_notes,
                calibration_schedule_id: historyData.calibration_schedule_id,
                calibration_results: historyData.calibration_results,
                next_calibration_date: next_calibration_date,
                state: historyData.state
            })
            .select()
            .single();
        console.log(`Equipment history insert took ${Date.now() - insertStart}ms`);

        if (error) {
            console.error("Error inserting calibration history:", error);
            return { error };
        }

        // Get current schedule state to determine proper updates
        const { data: currentSchedule, error: scheduleError } = await supabase
            .from('calibration_schedule')
            .select('*')
            .eq('calibration_schedule_id', data.calibration_schedule_id)
            .single();
            
        if (scheduleError) {
            console.error("Error fetching current calibration schedule:", scheduleError);
        } else {
            console.log("Current calibration schedule:", currentSchedule);
        }

        // Determine the appropriate state and next date for the schedule
        let newState = data.state;
        let newNextDate;
        
        if (data.state === 'calibrated') {
            console.log("State is 'calibrated', calculating next date");
            // Use the completed date as the base for calculating the next date
            newNextDate = calculateNextDate(
                frequency || 'monthly', 
                new Date(historyData.completed_date)
            );
            console.log(`Calculated next date: ${newNextDate} based on completed date: ${historyData.completed_date}`);
        } else {
            // For non-calibrated states, preserve the current next_date or use history's next_calibration_date
            newNextDate = historyData.next_calibration_date || currentSchedule?.next_date;
            console.log(`Using next date: ${newNextDate} for state: ${data.state}`);
        }
        
        // Update calibration schedule
        console.log("Step 2: Updating calibration schedule");
        const updateStart = Date.now();
        try {
            const { error: updateError } = await supabase
                .from('calibration_schedule')
                .update({
                    next_date: newNextDate,
                    state: newState,
                    last_updated: new Date().toISOString(),
                    updated_by: 'manual'
                })
                .eq('calibration_schedule_id', data.calibration_schedule_id);
                
            if (updateError) {
                console.error("Error updating calibration schedule:", updateError);
            } else {
                console.log(`Successfully updated calibration schedule ${data.calibration_schedule_id} with next date ${newNextDate} and state ${newState}`);
            }
                
            console.log(`Schedule update took ${Date.now() - updateStart}ms`);
        } catch (scheduleError) {
            console.error("Error updating calibration schedule:", scheduleError);
        }

        // Return early with the result before waiting for non-critical operations
        console.log(`Total handler time so far: ${Date.now() - startTime}ms`);
        
        // Fire and forget the email notifications
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

                // Send email notification about calibration history update
                try {
                    const coordinator_email = cordinator?.[0]?.email;
                    const manager_email = userData?.user?.email;
                    
                    // Get equipment details for more informative email
                    const { data: equipmentData } = await supabase
                        .from('equipment')
                        .select('*, device(*), laboratory:lab_id(*)')
                        .eq('equipment_id', equipment_id)
                        .single();
                    
                    const equipmentName = equipmentData?.device?.[0]?.name || 'Unknown Equipment';
                    const labName = equipmentData?.laboratory?.name || 'Unknown Lab';
                    const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;
                    
                    const emailContent = {
                        to: [coordinator_email, manager_email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
                        title: `Calibration History Update: ${equipmentName} - ${labName}`,
                        body: `
                            Lab: ${labName}<br/>
                            Equipment: ${equipmentName}<br/>
                            Calibration Date: ${performed_date}<br/>
                            Calibration Results: ${historyData.calibration_results || 'Not specified'}<br/>
                            Description: ${historyData.description}<br/>
                            Status: ${historyData.state}<br/>
                            Next Calibration Date: ${next_calibration_date}<br/>
                            <br/>
                            View equipment details: <a href="${equipmentUrl}">Click here</a>
                        `
                    };
                    
                    console.log(`[Email Debug] Sending calibration history notification to:`, emailContent.to.join(', '));
                    const emailResult = await sendEmail(emailContent);
                    console.log(`[Email Debug] Calibration history email result:`, emailResult);
                } catch (emailError) {
                    console.error("Error sending calibration history email notification:", emailError);
                }
                
                console.log(`Background operations took ${Date.now() - notifyStart}ms`);
                console.log("Background operations completed");
            } catch (backgroundError) {
                console.error("Error in background operations:", backgroundError);
            }
        }, 100); // Run after 100ms to ensure it doesn't block

        return { data: result };
    } catch (error) {
        console.error('Error in addCalibrationHistory:', error);
        return { error: error instanceof Error ? error : new Error('Unknown error') };
    } finally {
        console.log(`Total calibration history submission took ${Date.now() - startTime}ms`);
    }
}

// Fix addExternalControlHistory function to properly handle external_control_state values
export async function addExternalControlHistory(
    data: ExternalControlHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    let startTime = Date.now();
    console.log("Starting external control history submission...");
    
    try {
        console.log("Adding external control history with data:", JSON.stringify(data, null, 2));
        
        // Extract frequency from data before inserting
        const { frequency, ...historyData } = data;
        
        // Ensure dates are properly formatted for database storage
        const performed_date = historyData.performed_date instanceof Date 
            ? historyData.performed_date.toISOString() 
            : historyData.performed_date;
            
        const completed_date = historyData.completed_date instanceof Date 
            ? historyData.completed_date.toISOString() 
            : historyData.completed_date;
        
        // Insert history record
        console.log("Step 1: Inserting into equipment_history");
        const insertStart = Date.now();
        const { data: result, error: historyError } = await supabase
            .from('equipment_history')
            .insert({
                performed_date: performed_date,
                completed_date: completed_date,
                description: historyData.description,
                technician_notes: historyData.technician_notes,
                external_control_id: historyData.external_control_id,
                work_performed: historyData.work_performed,
                parts_used: historyData.parts_used,
                // Use a valid maintanace_state enum value instead of external control state
                state: 'done', // This is maintanace_state which accepts only valid enum values
                external_control_state: historyData.external_control_state // Store the actual external control state
            })
            .select()
            .single();
        console.log(`Equipment history insert took ${Date.now() - insertStart}ms`);

        if (historyError) {
            console.error("Error inserting external control history:", historyError);
            return { error: historyError };
        }

        // Get current external control state to determine proper updates
        const { data: currentControl, error: controlError } = await supabase
            .from('external_control')
            .select('*')
            .eq('control_id', data.external_control_id)
            .single();
            
        if (controlError) {
            console.error("Error fetching current external control:", controlError);
        } else {
            console.log("Current external control:", currentControl);
        }

        // Determine the appropriate state and next date for the external control
        let newState = historyData.external_control_state;
        let newNextDate: string | Date | undefined;
        
        // Check if state is 'Done' to calculate next date - using the correct enum value
        // We need to explicitly check against the string value, not the enum type
        if ((data.external_control_state as string) === 'Done') {
            console.log("State is 'Done', calculating next date");
            // Use the completed date as the base for calculating the next date
            newNextDate = calculateNextDate(
                frequency || 'monthly', 
                new Date(historyData.completed_date || new Date())
            );
            console.log(`Calculated next date: ${newNextDate} based on completed date: ${historyData.completed_date}`);
        } else {
            // For non-Done states, preserve the current next_date
            newNextDate = currentControl?.next_date;
            console.log(`Using existing next date: ${newNextDate} for state: ${historyData.external_control_state}`);
        }
        
        // Update external control
        console.log("Step 2: Updating external control");
        const updateStart = Date.now();
        try {
            const { error: updateError } = await supabase
                .from('external_control')
                .update({
                    next_date: newNextDate,
                    state: newState,
                    last_updated: new Date().toISOString(),
                    updated_by: 'manual'
                })
                .eq('control_id', data.external_control_id);
                
            if (updateError) {
                console.error("Error updating external control:", updateError);
            } else {
                console.log(`Successfully updated external control ${data.external_control_id} with next date ${newNextDate} and state ${newState}`);
            }
                
            console.log(`External control update took ${Date.now() - updateStart}ms`);
        } catch (controlError) {
            console.error("Error updating external control:", controlError);
        }

        // Return early with the result before waiting for non-critical operations
        console.log(`Total handler time so far: ${Date.now() - startTime}ms`);
        
        // Fire and forget the email notifications
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

                // Send email notification about external control update
                try {
                    const coordinator_email = cordinator?.[0]?.email;
                    const manager_email = userData?.user?.email;
                    
                    // Get equipment details for more informative email
                    const { data: equipmentData } = await supabase
                        .from('equipment')
                        .select('*, device(*), laboratory:lab_id(*)')
                        .eq('equipment_id', equipment_id)
                        .single();
                    
                    const equipmentName = equipmentData?.device?.[0]?.name || 'Unknown Equipment';
                    const labName = equipmentData?.laboratory?.name || 'Unknown Lab';
                    const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;
                    
                    const stateColors = {
                        'Done': 'green',
                        'Final Date': 'orange',
                        'E.Q.C  Reception': 'red'
                    };
                    
                    const stateColor = stateColors[historyData.external_control_state as keyof typeof stateColors] || 'black';
                    
                    const emailContent = {
                        to: [coordinator_email, manager_email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
                        title: `External Control Update: ${historyData.external_control_state} - ${labName}`,
                        body: `
                            Lab: ${labName}<br/>
                            Equipment: ${equipmentName}<br/>
                            External Control Date: ${performed_date}<br/>
                            Status: <span style="color: ${stateColor}">${historyData.external_control_state}</span><br/>
                            Work Performed: ${historyData.work_performed || 'Not specified'}<br/>
                            Description: ${historyData.description}<br/>
                            Next Control Date: ${newNextDate ? new Date(newNextDate).toLocaleDateString() : 'Not set'}<br/>
                            <br/>
                            View equipment details: <a href="${equipmentUrl}">Click here</a>
                        `
                    };
                    
                    console.log(`[Email Debug] Sending external control notification to:`, emailContent.to.join(', '));
                    const emailResult = await sendEmail(emailContent);
                    console.log(`[Email Debug] External control email result:`, emailResult);
                } catch (emailError) {
                    console.error("Error sending external control notification:", emailError);
                }
                
                console.log(`Background operations took ${Date.now() - notifyStart}ms`);
                console.log("Background operations completed");
            } catch (backgroundError) {
                console.error("Error in background operations:", backgroundError);
            }
        }, 100); // Run after 100ms to ensure it doesn't block

        return { data: result };
    } catch (error) {
        console.error('Error in addExternalControlHistory:', error);
        return { error: error instanceof Error ? error : new Error('Unknown error') };
    } finally {
        console.log(`Total external control history submission took ${Date.now() - startTime}ms`);
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

// Get history by external control ID
export async function getHistoryByExternalControlId(externalControlId: number) {
    const { data, error } = await supabase
        .from('equipment_history')
        .select('*')
        .eq('external_control_id', externalControlId)
        .order('performed_date', { ascending: false });

    if (error) return { error };
    return { data };
}