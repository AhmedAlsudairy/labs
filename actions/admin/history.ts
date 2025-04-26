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

                // Send email notification about maintenance history update
                try {
                    const coordinator_email = cordinator?.[0]?.email;
                    const manager_email = userData?.user?.email;
                    
                    // Get equipment details for more informative email
                    const { data: equipmentData } = await supabase
                        .from('equipment')
                        .select('*, device(*)')
                        .eq('equipment_id', equipment_id)
                        .single();
                    
                    const equipmentName = equipmentData?.device?.[0]?.name || 'Unknown Equipment';
                    const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;
                    
                    const emailContent = {
                        to: [coordinator_email, manager_email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
                        title: `Maintenance History Update: ${equipmentName}`,
                        body: `
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
                    // Continue execution even if email fails
                }
                
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

// External Control History function with detailed debugging
export async function addExternalControlHistory(
    data: ExternalControlHistoryInput,
    lab_id: number,
    equipment_id: number
) {
    try {
        console.log(`[DEBUG][${new Date().toISOString()}] ===== EXTERNAL CONTROL HISTORY FUNCTION START =====`);
        console.log(`[DEBUG][${new Date().toISOString()}] Input parameters:`);
        console.log(`  • lab_id: ${lab_id}, Type: ${typeof lab_id}`);
        console.log(`  • equipment_id: ${equipment_id}, Type: ${typeof equipment_id}`);
        console.log(`[DEBUG][${new Date().toISOString()}] Raw input data:`, JSON.stringify(data, null, 2));
        console.log(`[DEBUG][${new Date().toISOString()}] Data type check - control_id:`, data.control_id, typeof data.control_id);
        console.log(`[DEBUG][${new Date().toISOString()}] Data type check - state:`, data.state, typeof data.state);
        console.log(`[DEBUG][${new Date().toISOString()}] Data type check - external_control_state:`, data.external_control_state, typeof data.external_control_state);
        
        // Get lab information for notifications first
        console.log(`[DEBUG][${new Date().toISOString()}] Fetching lab information...`);
        const lab = await getLaboratoryById(lab_id);
        if (!lab) {
            console.error(`[DEBUG][${new Date().toISOString()}] ERROR: Laboratory not found for ID:`, lab_id);
            throw new Error('Laboratory not found');
        }
        console.log(`[DEBUG][${new Date().toISOString()}] Lab found:`, lab.name);
        
        // Extract frequency from data before inserting
        const { frequency, ...historyData } = data;
        console.log(`[DEBUG][${new Date().toISOString()}] Extracted frequency:`, frequency);
        console.log(`[DEBUG][${new Date().toISOString()}] Control ID after destructuring:`, historyData.control_id, typeof historyData.control_id);

        // Create basic insert data without control_id initially
        console.log(`[DEBUG][${new Date().toISOString()}] Creating insert data object...`);
        const insertData: any = {
            performed_date: historyData.performed_date,
            completed_date: historyData.completed_date,
            description: historyData.description,
            technician_notes: historyData.technician_notes,
            work_performed: historyData.work_performed,
            parts_used: historyData.parts_used,
            state: historyData.state,
            external_control_state: historyData.external_control_state
            // control_id is handled separately below
        };
        
        // Only add control_id if it's a positive number (real DB record)
        // Completely omit it for negative IDs (temporary records)
        if (historyData.control_id && typeof historyData.control_id === 'number' && historyData.control_id > 0) {
            console.log(`[DEBUG][${new Date().toISOString()}] Adding valid control_id:`, historyData.control_id);
            insertData.control_id = historyData.control_id;
        } else {
            console.log(`[DEBUG][${new Date().toISOString()}] Detected negative control_id (${historyData.control_id}) - OMITTING FIELD COMPLETELY`);
            // Field is completely omitted from the insert data
        }
        
        // Log each field individually for clarity
        console.log(`[DEBUG][${new Date().toISOString()}] INSERT DATA DETAILS:`);
        console.log(`  • control_id:`, insertData.control_id, typeof insertData.control_id);
        console.log(`  • external_control_state:`, insertData.external_control_state);
        console.log(`  • performed_date:`, insertData.performed_date);
        console.log(`  • completed_date:`, insertData.completed_date);
        console.log(`  • description:`, insertData.description);
        console.log(`  • technician_notes:`, insertData.technician_notes);
        console.log(`  • work_performed:`, insertData.work_performed);
        console.log(`  • parts_used:`, insertData.parts_used);
        console.log(`[DEBUG][${new Date().toISOString()}] Complete insert data:`, JSON.stringify(insertData, null, 2));

        // Insert the history record with or without control_id
        console.log(`[DEBUG][${new Date().toISOString()}] Executing database insert operation...`);
        console.log(`[DEBUG][${new Date().toISOString()}] Database table: equipment_history`);
        
        // Define result variable outside try block so it's available in the outer scope
        let controlResult: any = null;
        
        try {
            const result = await supabase
                .from('equipment_history')
                .insert(insertData)
                .select()
                .single();

            // Destructure inside the try block
            const { data, error: historyError } = result;
            controlResult = data; // Assign to the outer variable

            if (historyError) {
                console.error(`[DEBUG][${new Date().toISOString()}] DATABASE ERROR DETAILS:`);
                console.error(`  • Error code:`, historyError.code);
                console.error(`  • Error message:`, historyError.message);
                console.error(`  • Error details:`, historyError.details);
                console.error(`  • Full error:`, JSON.stringify(historyError, null, 2));
                throw historyError;
            }
            
            console.log(`[DEBUG][${new Date().toISOString()}] INSERT SUCCESSFUL! Result:`, controlResult);
        } catch (error) {
            console.error(`[DEBUG][${new Date().toISOString()}] UNEXPECTED ERROR during database insert:`, error);
            throw error;
        }

        // Always update external control with the latest status and next date
        if (data.control_id && typeof data.control_id === 'number' && data.control_id > 0) {
            console.log(`[DEBUG][${new Date().toISOString()}] Updating external control #${data.control_id} with new state:`, data.external_control_state);
            
            // Create update object
            const updateData: any = {
                // Always update the state to match the history entry
                state: data.external_control_state,
            };
            
            // Add next_date if present
            if (data.next_date) {
                updateData.next_date = data.next_date;
            }
            
            // Add last_updated info
            updateData.last_updated = new Date().toISOString();
            updateData.updated_by = 'system'; // Or could be user info if available
            
            // The external_control table might use a different ID field name than what we're using
            // Try with more debugging to see exactly what's happening
            console.log(`[DEBUG][${new Date().toISOString()}] Attempting to update external control in database:`);
            console.log(`  • Table: external_control`);
            console.log(`  • ID being used for filter: ${data.control_id}`);
            console.log(`  • Update payload:`, updateData);

            // First, try to find the record to confirm it exists
            let existingControl = null;
            const { data: controlData, error: findError } = await supabase
                .from('external_control')
                .select('*')
                .eq('control_id', data.control_id)
                .single();
                
            existingControl = controlData;

            if (findError) {
                console.log(`[DEBUG][${new Date().toISOString()}] Error finding external control record with control_id=${data.control_id}:`, findError);
                
                // Try with id instead
                const { data: altRecord, error: altFindError } = await supabase
                    .from('external_control')
                    .select('*')
                    .eq('id', data.control_id)
                    .single();
                    
                if (altFindError) {
                    console.log(`[DEBUG][${new Date().toISOString()}] Error finding external control record with id=${data.control_id}:`, altFindError);
                } else {
                    console.log(`[DEBUG][${new Date().toISOString()}] Found external control record using id field instead:`, altRecord);
                    existingControl = altRecord; // This is fine now that existingControl is a let
                }
            } else {
                console.log(`[DEBUG][${new Date().toISOString()}] Found external control record:`, existingControl);
            }

            // Now try to update using both possible ID field names
            let updateError = null;
            
            // Try control_id first
            const { error: error1 } = await supabase
                .from('external_control')
                .update(updateData)
                .eq('control_id', data.control_id);
                
            if (error1) {
                console.log(`[DEBUG][${new Date().toISOString()}] Error updating with control_id field:`, error1);
                updateError = error1;
                
                // Try with id as fallback
                const { error: error2 } = await supabase
                    .from('external_control')
                    .update(updateData)
                    .eq('id', data.control_id);
                    
                if (error2) {
                    console.log(`[DEBUG][${new Date().toISOString()}] Error updating with id field too:`, error2);
                    updateError = error2;
                } else {
                    console.log(`[DEBUG][${new Date().toISOString()}] Successfully updated using id field`);
                    updateError = null;
                }
            } else {
                console.log(`[DEBUG][${new Date().toISOString()}] Successfully updated using control_id field`);
            }
            
            const scheduleError = updateError;

            if (scheduleError) {
                console.error(`[DEBUG][${new Date().toISOString()}] Error updating external control:`, scheduleError);
                // We don't throw this error as the history was already created
            } else {
                console.log(`[DEBUG][${new Date().toISOString()}] Successfully updated external control #${data.control_id} with state:`, data.external_control_state);
            }
        } else {
            console.log(`[DEBUG][${new Date().toISOString()}] Cannot update external control - invalid ID:`, data.control_id);
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

// Get external control history for an equipment
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
    console.log("Fetching history for control_id:", externalControlId);
    const { data, error } = await supabase
        .from('equipment_history')
        .select('*')
        .eq('control_id', externalControlId) // Changed to control_id to match DB schema
        .order('performed_date', { ascending: false });

    if (error) return { error };
    return { data };
}