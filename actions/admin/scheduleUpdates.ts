'use server';

import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { Frequency } from "@/types";
import { ExternalControlState } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Remove duplicate type definitions and use imported types
type MaintenanceState = 'done' | 'need maintance' | 'late maintance';
type CalibrationState = 'calibrated' | 'need calibration' | 'late calibration';

interface ScheduleUpdate {
  last_updated: Date;
  updated_by: 'manual' | 'automatic';
}

// Replace local function with imported one
import { calculateNextDate as calcNextDate } from "@/utils/date-utils";
import { sendEmail } from '@/utils/resend/email';

function calculateNextDate(currentDate: Date, frequency: Frequency): Date {
  return calcNextDate(frequency, currentDate);
}

function determineMaintenanceState(nextDate: Date): MaintenanceState {
  // Safely handle invalid dates
  if (!nextDate || isNaN(nextDate.getTime())) {
    console.warn('Invalid date provided to determineMaintenanceState:', nextDate);
    return 'need maintance';
  }

  const today = new Date();
  // Normalize both dates to remove time component for accurate comparison
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedNextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
  
  // Calculate days difference (will be negative if nextDate is in the past)
  const daysDiff = (normalizedNextDate.getTime() - normalizedToday.getTime()) / (1000 * 60 * 60 * 24);
  
  // Restrict debug logging to development environment
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Debug] Date comparison for maintenance state: nextDate=${normalizedNextDate.toISOString()}, today=${normalizedToday.toISOString()}, daysDiff=${daysDiff}`);
  }
  
  if (daysDiff < 0) {
    return 'late maintance';  // Past due date
  } else if (daysDiff === 0) {
    return 'need maintance';  // Due today
  }
  return 'done';
}

function determineCalibrationState(nextDate: Date): CalibrationState {
  // Safely handle invalid dates
  if (!nextDate || isNaN(nextDate.getTime())) {
    console.warn('Invalid date provided to determineCalibrationState:', nextDate);
    return 'need calibration';
  }

  const today = new Date();
  // Normalize both dates to remove time component for accurate comparison
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedNextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
  
  // Calculate days difference (will be negative if nextDate is in the past)
  const daysDiff = (normalizedNextDate.getTime() - normalizedToday.getTime()) / (1000 * 60 * 60 * 24);
  
  // Remove verbose logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Debug] Date comparison for calibration state: nextDate=${normalizedNextDate.toISOString()}, today=${normalizedToday.toISOString()}, daysDiff=${daysDiff}`);
  }
  
  if (daysDiff < 0) {
    return 'late calibration';  // Past due date
  } else if (daysDiff === 0) {
    return 'need calibration';  // Due today
  }
  return 'calibrated';
}

function determineExternalControlState(nextDate: Date): ExternalControlState {
  // Safely handle invalid dates
  if (!nextDate || isNaN(nextDate.getTime())) {
    console.warn('Invalid date provided to determineExternalControlState:', nextDate);
    return 'E.Q.C  Reception';
  }
  
  const today = new Date();
  // Normalize both dates to remove time component for accurate comparison
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedNextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
  
  // Calculate days difference (will be negative if nextDate is in the past)
  const daysDiff = (normalizedNextDate.getTime() - normalizedToday.getTime()) / (1000 * 60 * 60 * 24);
  
  // Restrict debug logging to development environment
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Debug] Date comparison for external control state: nextDate=${normalizedNextDate.toISOString()}, today=${normalizedToday.toISOString()}, daysDiff=${daysDiff}`);
  }
  
  if (daysDiff < 0) {
    return 'E.Q.C  Reception'; // Past due date
  } else if (daysDiff === 0) {
    return 'Final Date'; // Due today
  }
  return 'Done'; // In date
}

// Check for latest history record and determine if we should override the state
async function checkLatestHistoryState(scheduleId: number, type: 'maintenance' | 'calibration' | 'external'): Promise<{state: string | null, nextDate: string | null}> {
  const idField = type === 'maintenance' ? 'schedule_id' : 
                  type === 'calibration' ? 'calibration_schedule_id' : 
                  'external_control_id';
  
  const stateField = type === 'external' ? 'external_control_state' : 'state';
  const nextDateField = type === 'maintenance' ? 'next_maintenance_date' : 
                        type === 'calibration' ? 'next_calibration_date' : 
                        null;
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Debug] Checking for latest history for ${type} ${scheduleId}`);
  }
  
  // Get the latest history record for this schedule - ordering by performed_date DESC, created_at DESC
  // This ensures we get the newest record first
  const { data, error } = await supabase
    .from('equipment_history')
    .select('*')
    .eq(idField, scheduleId)
    .order('performed_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error(`Error fetching history for ${type} ${scheduleId}:`, error);
    return { state: null, nextDate: null };
  }
  
  if (!data || data.length === 0) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Debug] No history found for ${type} ${scheduleId}`);
    }
    return { state: null, nextDate: null }; // No history found
  }
  
  const latestHistory = data[0];
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Debug] Found latest history for ${type} ${scheduleId}:`, {
      history_id: latestHistory.history_id,
      performed_date: latestHistory.performed_date,
      state: latestHistory[stateField],
      nextDate: nextDateField ? latestHistory[nextDateField] : null
    });
  }
  
  // Return both the state and next date from history
  return { 
    state: latestHistory[stateField],
    nextDate: nextDateField ? latestHistory[nextDateField] : null
  };
}

// Helper function to check if a schedule was recently updated manually
async function wasRecentlyUpdatedManually(scheduleId: number, type: 'maintenance' | 'calibration'): Promise<boolean> {
  const table = type === 'maintenance' ? 'maintenance_schedule' : 'calibration_schedule';
  const idField = type === 'maintenance' ? 'schedule_id' : 'calibration_schedule_id';

  const { data, error } = await supabase
    .from(table)
    .select('last_updated, updated_by')
    .eq(idField, scheduleId)
    .single();

  if (error || !data) return false;

  // Check if there was a manual update in the last hour
  const lastUpdate = new Date(data.last_updated);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  return data.updated_by === 'manual' && lastUpdate > hourAgo;
}

export async function updateMaintenanceSchedules() {
  try {
    console.log('Starting updateMaintenanceSchedules at', new Date().toISOString());
    // Initialize notification tracking counters
    let notificationsSent = 0;
    let notificationsFailed = 0;
    
    const { data: maintenanceSchedules, error: maintenanceError } = await supabase
      .from('maintenance_schedule')
      .select(`
        *,
        equipment:equipment_id (
          *,
          device (*),
          laboratory:lab_id (
            *
          )
        )
      `);

    if (maintenanceError) {
      console.error('Error fetching maintenance schedules:', maintenanceError);
      return { success: false, error: maintenanceError, updatedCount: 0 };
    }

    const updatedSchedules = [];
    const failedSchedules = [];

    for (const schedule of maintenanceSchedules || []) {
      try {
        // Skip if recently updated manually or in need/late maintenance state with manual update
        // But if the state is 'done' and date is late, we should update it regardless
        if (schedule.updated_by === 'manual' && 
            (schedule.state === 'need maintance' || schedule.state === 'late maintance')) {
          console.log(`Skipping maintenance schedule ${schedule.schedule_id} - manually marked as ${schedule.state}`);
          continue;
        }
        
        // Check if it's manually marked as 'done' but the date is actually late
        const nextDate = new Date(schedule.next_date);
        const state = determineMaintenanceState(nextDate);
        const previousState = schedule.state;
        
        // Always update if a manual 'done' is actually late based on date
        const manualDoneButLate = schedule.updated_by === 'manual' && 
                                  schedule.state === 'done' && 
                                  (state === 'need maintance' || state === 'late maintance');
        
        if (manualDoneButLate) {
          console.log(`[Debug] Maintenance schedule ${schedule.schedule_id} is manually marked as 'done' but is actually ${state} based on date`);
        }

        // Check if there's a recent history record that should override the state and next date
        const { state: historyState, nextDate: historyNextDate } = await checkLatestHistoryState(schedule.schedule_id, 'maintenance');
        if (historyState) {
          console.log(`[Debug] Found history state '${historyState}' for maintenance schedule ${schedule.schedule_id}, will use this instead of calculated state`);
        }
        if (historyNextDate) {
          console.log(`[Debug] Found history next_date '${historyNextDate}' for maintenance schedule ${schedule.schedule_id}, will use this instead of scheduled next_date`);
        }
        
        // Determine the state to use: history state takes priority if available
        const stateToUse = historyState || state;
        
        // Use next date from history if available, otherwise use the schedule's next date
        let newNextDate = historyNextDate || schedule.next_date;
        
        // Only update if state would change to done or if it's an automatic update or manual done but late
        if (schedule.updated_by !== 'manual' || stateToUse === 'done' || manualDoneButLate) {
          if (stateToUse === 'done' && !historyNextDate) {  // Only calculate new date if no history date is available
            // Use a normalized date to prevent timezone issues when calculating the next date
            const baseDate = new Date();
            baseDate.setHours(12, 0, 0, 0);
            const nextDateObj = calculateNextDate(baseDate, schedule.frequency);
            // Format as YYYY-MM-DD to ensure consistency when storing in the database
            newNextDate = nextDateObj.toISOString().split('T')[0];
          }

          // Update maintenance schedule and create history separately instead of using RPC function
          try {
            // 1. Update the maintenance schedule
            const { error: updateError } = await supabase
              .from('maintenance_schedule')
              .update({
                next_date: newNextDate,
                state: stateToUse,
                last_updated: new Date().toISOString(),
                updated_by: 'automatic'
              })
              .eq('schedule_id', schedule.schedule_id);

            if (updateError) {
              console.error('Error updating maintenance schedule:', updateError);
              failedSchedules.push({
                id: schedule.schedule_id,
                error: updateError
              });
              continue;
            }

            // 2. Create a history record
            const { error: historyError } = await supabase
              .from('equipment_history')
              .insert({
                schedule_id: schedule.schedule_id,
                performed_date: new Date().toISOString(),
                completed_date: new Date().toISOString(),
                state: stateToUse,
                description: `Maintenance schedule state changed from ${previousState} to ${stateToUse}`,
                work_performed: stateToUse === 'done' ? 'Automatic maintenance completion' : '',
                next_maintenance_date: newNextDate
              });

            if (historyError) {
              console.error('Error creating maintenance history:', historyError);
              // Continue with the process even if history creation fails
              // We've already updated the schedule successfully
            }
          } catch (error) {
            console.error('Error in maintenance update process:', error);
            failedSchedules.push({
              id: schedule.schedule_id,
              error
            });
            continue;
          }

          updatedSchedules.push({
            id: schedule.schedule_id,
            previousState,
            newState: stateToUse,
            nextDate: newNextDate
          });

          // Send notifications only if state changed and isn't 'done'
          if (stateToUse !== 'done' && stateToUse !== previousState && schedule.equipment?.laboratory?.manager_id) {
            // Cast stateToUse to MaintenanceState since we know it's a valid state
            const typedState = stateToUse as MaintenanceState;
            const emailResult = await sendMaintenanceNotification(schedule, typedState, newNextDate);
            if (emailResult?.success) {
              notificationsSent++;
              console.log(`[Email Debug] Successfully sent maintenance notification for schedule ${schedule.schedule_id}`);
            } else {
              notificationsFailed++;
              console.log(`[Email Debug] Failed to send maintenance notification for schedule ${schedule.schedule_id}`);
            }
          }
        }
      } catch (scheduleError) {
        console.error(`Error processing maintenance schedule ${schedule.schedule_id}:`, scheduleError);
        failedSchedules.push({
          id: schedule.schedule_id,
          error: scheduleError
        });
      }
    }

    console.log(`Completed updateMaintenanceSchedules at ${new Date().toISOString()}, updated: ${updatedSchedules.length}, failed: ${failedSchedules.length}, emails sent: ${notificationsSent}, emails failed: ${notificationsFailed}`);
    return { 
      success: true, 
      updatedCount: updatedSchedules.length,
      failedCount: failedSchedules.length,
      notificationsSent,
      notificationsFailed,
      updatedSchedules,
      failedSchedules
    };
  } catch (error) {
    console.error('Unexpected error in updateMaintenanceSchedules:', error);
    return { success: false, error, updatedCount: 0 };
  }
}

export async function updateCalibrationSchedules() {
  try {
    console.log('Starting updateCalibrationSchedules at', new Date().toISOString());
    // Initialize notification tracking counters
    let notificationsSent = 0;
    let notificationsFailed = 0;
    
    const { data: calibrationSchedules, error: calibrationError } = await supabase
      .from('calibration_schedule')
      .select(`
        *,
        equipment:equipment_id (
          *,
          device (*),
          laboratory:lab_id (
            *
          )
        )
      `);

    if (calibrationError) {
      console.error('Error fetching calibration schedules:', calibrationError);
      return { success: false, error: calibrationError, updatedCount: 0 };
    }

    const updatedSchedules = [];
    const failedSchedules = [];

    for (const schedule of calibrationSchedules || []) {
      try {
        // Skip if recently updated manually or in need/late calibration state with manual update
        if (schedule.updated_by === 'manual' && 
            (schedule.state === 'need calibration' || schedule.state === 'late calibration')) {
          console.log(`Skipping calibration schedule ${schedule.calibration_schedule_id} - manually marked as ${schedule.state}`);
          continue;
        }

        const nextDate = new Date(schedule.next_date);
        const state = determineCalibrationState(nextDate);
        const previousState = schedule.state;
        
        // Always update if a manual 'calibrated' is actually late based on date
        const manualCalibratedButLate = schedule.updated_by === 'manual' && 
                                       schedule.state === 'calibrated' && 
                                       (state === 'need calibration' || state === 'late calibration');
        
        if (manualCalibratedButLate) {
          console.log(`[Debug] Calibration schedule ${schedule.calibration_schedule_id} is manually marked as 'calibrated' but is actually ${state} based on date`);
        }
        
        // Check if there's a recent history record that should override the state
        const { state: historyState } = await checkLatestHistoryState(schedule.calibration_schedule_id, 'calibration');
        if (historyState) {
          console.log(`[Debug] Found history state '${historyState}' for calibration schedule ${schedule.calibration_schedule_id}, will use this instead of calculated state`);
        }
        
        // Determine the state to use: history state takes priority if available
        const stateToUse = historyState || state;
        
        // Only update if state would change to calibrated or if it's an automatic update or manual calibrated but late
        let newNextDate = schedule.next_date;
        if (schedule.updated_by !== 'manual' || stateToUse === 'calibrated' || manualCalibratedButLate) {
          if (stateToUse === 'calibrated') {
            // Use a normalized date to prevent timezone issues when calculating the next date
            const baseDate = new Date();
            baseDate.setHours(12, 0, 0, 0);
            const nextDateObj = calculateNextDate(baseDate, schedule.frequency);
            // Format as YYYY-MM-DD to ensure consistency when storing in the database
            newNextDate = nextDateObj.toISOString().split('T')[0];
          }

          // Update calibration schedule and create history separately instead of using RPC function
          try {
            // 1. Update the calibration schedule
            const { error: updateError } = await supabase
              .from('calibration_schedule')
              .update({
                next_date: newNextDate,
                state: state,
                last_updated: new Date().toISOString(),
                updated_by: 'automatic'
              })
              .eq('calibration_schedule_id', schedule.calibration_schedule_id);

            if (updateError) {
              console.error('Error updating calibration schedule:', updateError);
              failedSchedules.push({
                id: schedule.calibration_schedule_id,
                error: updateError
              });
              continue;
            }

            // 2. Create a history record
            const { error: historyError } = await supabase
              .from('equipment_history')
              .insert({
                calibration_schedule_id: schedule.calibration_schedule_id,
                performed_date: new Date().toISOString(),
                completed_date: new Date().toISOString(),
                state: state,
                description: `Calibration schedule state changed from ${previousState} to ${state}`,
                calibration_results: state === 'calibrated' ? 'Automatic calibration completion' : '',
                next_calibration_date: newNextDate
              });

            if (historyError) {
              console.error('Error creating calibration history:', historyError);
              // Continue with the process even if history creation fails
              // We've already updated the schedule successfully
            }
          } catch (error) {
            console.error('Error in calibration update process:', error);
            failedSchedules.push({
              id: schedule.calibration_schedule_id,
              error
            });
            continue;
          }

          updatedSchedules.push({
            id: schedule.calibration_schedule_id,
            previousState,
            newState: state,
            nextDate: newNextDate
          });

          // Send notifications only if state changed and isn't 'calibrated'
          if (state !== 'calibrated' && state !== previousState && schedule.equipment?.laboratory?.manager_id) {
            const emailResult = await sendCalibrationNotification(schedule, state, newNextDate);
            if (emailResult?.success) {
              notificationsSent++;
              console.log(`[Email Debug] Successfully sent calibration notification for schedule ${schedule.calibration_schedule_id}`);
            } else {
              notificationsFailed++;
              console.log(`[Email Debug] Failed to send calibration notification for schedule ${schedule.calibration_schedule_id}`);
            }
          }
        }
      } catch (scheduleError) {
        console.error(`Error processing calibration schedule ${schedule.calibration_schedule_id}:`, scheduleError);
        failedSchedules.push({
          id: schedule.calibration_schedule_id,
          error: scheduleError
        });
      }
    }

    console.log(`Completed updateCalibrationSchedules at ${new Date().toISOString()}, updated: ${updatedSchedules.length}, failed: ${failedSchedules.length}, emails sent: ${notificationsSent}, emails failed: ${notificationsFailed}`);
    return { 
      success: true, 
      updatedCount: updatedSchedules.length,
      failedCount: failedSchedules.length,
      notificationsSent,
      notificationsFailed,
      updatedSchedules,
      failedSchedules
    };
  } catch (error) {
    console.error('Unexpected error in updateCalibrationSchedules:', error);
    return { success: false, error, updatedCount: 0 };
  }
}

export async function updateExternalControlSchedules(equipment_id?: number) {
  try {
    console.log('Starting updateExternalControlSchedules at', new Date().toISOString());
    // Initialize notification tracking counters
    let notificationsSent = 0;
    let notificationsFailed = 0;
    
    const query = supabase
      .from('external_control')
      .select(`
        *,
        equipment:equipment_id (
          equipment_id,
          device (
            name
          ),
          laboratory:lab_id (
            *
          )
        )
      `);

    // If equipment_id is provided, filter by it
    if (equipment_id) {
      query.eq('equipment_id', equipment_id);
    }

    const { data: externalControls, error: externalError } = await query;

    if (externalError) {
      console.error('Error fetching external control schedules:', externalError);
      return { success: false, error: externalError, updatedCount: 0 };
    }

    const updatedControls = [];
    const failedControls = [];

    for (const control of externalControls || []) {
      try {
        // Skip if recently updated manually
        if (control.updated_by === 'manual' && 
            (control.state === 'Final Date' || control.state === 'E.Q.C  Reception')) {
          console.log(`Skipping external control ${control.control_id} - manually marked as ${control.state}`);
          continue;
        }

        const nextDate = new Date(control.next_date);
        const state = determineExternalControlState(nextDate);
        const previousState = control.state;
        
        // Only log debugging info in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Debug] External Control ID ${control.control_id} check:`);
          console.log(`[Debug] - Current state: ${previousState}`);
          console.log(`[Debug] - Next date: ${control.next_date}`);
          console.log(`[Debug] - Parsed nextDate: ${nextDate}`);
          console.log(`[Debug] - Calculated new state: ${state}`);
          console.log(`[Debug] - Last updated: ${control.last_updated}`);
          console.log(`[Debug] - Updated by: ${control.updated_by}`);
        }
        
        // Check if it's manually marked as 'Done' but the date is actually late
        const manualDoneButLate = control.updated_by === 'manual' && 
                                 control.state === 'Done' && 
                                 (state === 'Final Date' || state === 'E.Q.C  Reception');
                                 
        if (manualDoneButLate && process.env.NODE_ENV === 'development') {
          console.log(`[Debug] - External Control ${control.control_id} is manually marked as 'Done' but is actually ${state} based on date`);
        }
        
        // Check if there's a recent history record that should override the state
        const { state: historyState } = await checkLatestHistoryState(control.control_id, 'external');
        if (historyState && process.env.NODE_ENV === 'development') {
          console.log(`[Debug] - Found history state '${historyState}' for external control ${control.control_id}, will use this instead of calculated state`);
        }
        
        // Determine the state to use: history state takes priority if available
        const stateToUse = historyState || state;
        
        // Only update if state would change to Done or if it's an automatic update or manual Done but late
        let newNextDate = control.next_date;
        if (control.updated_by !== 'manual' || stateToUse === 'Done' || manualDoneButLate) {
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Debug] - External Control ${control.control_id} will be updated`);
            console.log(`[Debug] - Update condition: updated_by=${control.updated_by}, state=${state}`);
          }
          
          if (stateToUse === 'Done') {
            // Use a normalized date to prevent timezone issues when calculating the next date
            const baseDate = new Date();
            baseDate.setHours(12, 0, 0, 0);
            
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Debug] - Calculating new next date from base: ${baseDate.toISOString()}`);
              console.log(`[Debug] - Using frequency: ${control.frequency}`);
            }
            
            const nextDateObj = calculateNextDate(baseDate, control.frequency);
            
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Debug] - New calculated date object: ${nextDateObj.toISOString()}`);
            }
            
            // Format as YYYY-MM-DD to ensure consistency when storing in the database
            newNextDate = nextDateObj.toISOString().split('T')[0];
            
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Debug] - Formatted new next date: ${newNextDate}`);
            }
          }

          // Update external control and create history separately instead of using RPC function
          try {
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Debug] - Attempting to update External Control ${control.control_id} in database`);
              console.log(`[Debug] - Update payload:`, {
                next_date: newNextDate,
                state: state,
                last_updated: new Date().toISOString(),
                updated_by: 'automatic'
              });
            }
            
            // 1. Update the external control record
            const { data: updateData, error: updateError } = await supabase
              .from('external_control')
              .update({
                next_date: newNextDate,
                state: state,
                last_updated: new Date().toISOString(),
                updated_by: 'automatic'
              })
              .eq('control_id', control.control_id)
              .select();
            
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Debug] - Update response:`, updateData || 'No data returned');
            }
            
            if (updateError) {
              console.error('Error updating external control:', updateError);
              failedControls.push({
                id: control.control_id,
                error: updateError
              });
              continue;
            } else if (process.env.NODE_ENV === 'development') {
              console.log(`[Debug] - External Control ${control.control_id} successfully updated in database`);
            }

            // 2. Create a history record
            const { error: historyError } = await supabase
              .from('equipment_history')
              .insert({
                external_control_id: control.control_id,
                performed_date: new Date().toISOString(),
                completed_date: new Date().toISOString(),
                state: state, // This is maintanace_state
                external_control_state: state, // Use the dedicated column for external control state
                description: `External control state changed from ${previousState} to ${state}`,
                work_performed: state === 'Done' ? 'Automatic completion' : ''
              });

            if (historyError) {
              console.error('Error creating external control history:', historyError);
              // Continue with the process even if history creation fails
              // We've already updated the external control successfully
            }
          } catch (error) {
            console.error('Error in external control update process:', error);
            failedControls.push({
              id: control.control_id,
              error
            });
            continue;
          }

          updatedControls.push({
            id: control.control_id,
            previousState,
            newState: state,
            nextDate: newNextDate
          });

          // Send notifications only if state changed and isn't 'Done'
          if (state !== 'Done' && state !== previousState && control.equipment?.laboratory?.manager_id) {
            await sendExternalControlNotification(control, state, newNextDate);
          }
        }
      } catch (controlError) {
        console.error(`Error processing external control ${control.control_id}:`, controlError);
        failedControls.push({
          id: control.control_id,
          error: controlError
        });
      }
    }

    console.log(`Completed updateExternalControlSchedules at ${new Date().toISOString()}, updated: ${updatedControls.length}, failed: ${failedControls.length}`);
    return { 
      success: true, 
      updatedCount: updatedControls.length,
      failedCount: failedControls.length,
      updatedControls,
      failedControls
    };
  } catch (error) {
    console.error('Unexpected error in updateExternalControlSchedules:', error);
    return { success: false, error, updatedCount: 0 };
  }
}

/**
 * Utility function to force-update maintenance schedules based on the latest history records
 * This is useful to ensure schedule dates match the latest history entries
 */
export async function syncMaintenanceSchedulesWithHistory() {
  console.log('Starting syncMaintenanceSchedulesWithHistory at', new Date().toISOString());
  
  try {
    // Get all maintenance schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('maintenance_schedule')
      .select('*');
      
    if (schedulesError) {
      console.error('Error fetching maintenance schedules:', schedulesError);
      return { success: false, error: schedulesError, message: 'Failed to fetch maintenance schedules' };
    }
    
    const updatedSchedules = [];
    const failedSchedules = [];
    
    // Process each schedule
    for (const schedule of schedules || []) {
      try {
        console.log(`Processing maintenance schedule ID ${schedule.schedule_id}`);
        
        // Get the latest history record for this schedule - using both performed_date and created_at
        // to ensure we get the absolute latest record
        const { data: historyRecords, error: historyError } = await supabase
          .from('equipment_history')
          .select('*')
          .eq('schedule_id', schedule.schedule_id)
          .order('performed_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (historyError) {
          console.error(`Error fetching history for schedule ${schedule.schedule_id}:`, historyError);
          failedSchedules.push({ id: schedule.schedule_id, error: historyError });
          continue;
        }
        
        // Skip if no history records found
        if (!historyRecords || historyRecords.length === 0) {
          console.log(`No history records found for schedule ${schedule.schedule_id}, skipping`);
          continue;
        }
        
        const latestHistory = historyRecords[0];
        console.log(`Found latest history record:`, {
          history_id: latestHistory.history_id,
          performed_date: latestHistory.performed_date,
          next_maintenance_date: latestHistory.next_maintenance_date || 'not set'
        });
        
        // Only update if the history record has a next_maintenance_date
        if (latestHistory.next_maintenance_date) {
          console.log(`Found next_maintenance_date ${latestHistory.next_maintenance_date} in history for schedule ${schedule.schedule_id}`);
          
          // Calculate the state based on this next date
          const nextDate = new Date(latestHistory.next_maintenance_date);
          const state = determineMaintenanceState(nextDate);
          
          console.log(`Updating schedule ${schedule.schedule_id} with next_date=${latestHistory.next_maintenance_date}, state=${state}`);
          
          // Update the maintenance schedule
          const { error: updateError } = await supabase
            .from('maintenance_schedule')
            .update({
              next_date: latestHistory.next_maintenance_date,
              state: state,
              last_updated: new Date().toISOString(),
              updated_by: 'automatic' // Changed from 'sync-utility' to 'automatic' to match allowed values
            })
            .eq('schedule_id', schedule.schedule_id);
            
          if (updateError) {
            console.error(`Error updating schedule ${schedule.schedule_id}:`, updateError);
            failedSchedules.push({ id: schedule.schedule_id, error: updateError });
          } else {
            updatedSchedules.push({ 
              id: schedule.schedule_id, 
              previousDate: schedule.next_date,
              newDate: latestHistory.next_maintenance_date,
              previousState: schedule.state,
              newState: state
            });
          }
        } else {
          console.log(`No next_maintenance_date found in history for schedule ${schedule.schedule_id}, skipping`);
        }
      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule.schedule_id}:`, scheduleError);
        failedSchedules.push({ id: schedule.schedule_id, error: scheduleError });
      }
    }
    
    console.log(`Completed syncMaintenanceSchedulesWithHistory at ${new Date().toISOString()}`);
    console.log(`Updated ${updatedSchedules.length} schedules, failed ${failedSchedules.length}`);
    
    return {
      success: true,
      updatedCount: updatedSchedules.length,
      failedCount: failedSchedules.length,
      updatedSchedules,
      failedSchedules
    };
  } catch (error) {
    console.error('Error in syncMaintenanceSchedulesWithHistory:', error);
    return { success: false, error, message: 'Internal error in sync utility' };
  }
}

// Helper function for maintenance notifications
async function sendMaintenanceNotification(schedule: any, state: MaintenanceState, newNextDate: Date) {
  console.log(`[Email Debug] Starting maintenance notification for equipment ID ${schedule.equipment_id}, state: ${state}`);
  console.log(`[Email Debug] Schedule details for notification check:`, {
    schedule_id: schedule.schedule_id,
    equipment_id: schedule.equipment_id,
    state: state,
    previousState: schedule.state,
    nextDate: newNextDate,
    laboratory_manager_id: schedule.equipment?.laboratory?.manager_id || 'missing'
  });
  
  try {
    const { data: userData } = await supabase.auth
      .admin.getUserById(schedule.equipment.laboratory.manager_id);
    console.log(`[Email Debug] Manager data:`, userData?.user?.email || 'No manager email found');

    const { data: cordinator } = await supabase
      .rpc('get_lab_matched_users', {
        p_lab_id: schedule.equipment.laboratory.lab_id
      });
    console.log(`[Email Debug] Coordinator data:`, cordinator?.[0]?.email || 'No coordinator email found');

    // Check if we have valid recipients
    if (!userData?.user?.email && (!cordinator || cordinator.length === 0)) {
      console.log(`[Email Debug] No valid recipients found for notification! Manager ID: ${schedule.equipment.laboratory.manager_id}`);
    }

    const cordinator_email = cordinator?.[0]?.email;
    const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${schedule.equipment.laboratory.lab_id}/${schedule.equipment_id}`;
    
    const emailContent = {
      to: [cordinator_email, userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
      title: `Equipment Maintenance Schedule Alert: ${state} - ${schedule.equipment.laboratory.name}`,
      body: `
        Lab: ${schedule.equipment.laboratory.name}<br/>
        Equipment: ${schedule.equipment.device?.[0]?.name || 'Unknown Equipment'}<br/>
        Current Status: ${state}<br/>
        Next maintenance date: ${newNextDate}<br/>
        Description: ${schedule.description || 'Regular maintenance required'}<br/>
        <br/>
        View equipment details: <a href="${equipmentUrl}">Click here</a>
      `
    };
    
    console.log(`[Email Debug] Maintenance email content:`, {
      recipients: emailContent.to.join(', '),
      subject: emailContent.title
    });

    const result = await sendEmail(emailContent);
    console.log(`[Email Debug] Maintenance email result:`, result);
    return result;
  } catch (error) {
    console.error(`[Email Debug] Error sending maintenance notification:`, error);
    return { success: false, message: 'Failed to send maintenance email' };
  }
}

// Helper function for calibration notifications
async function sendCalibrationNotification(schedule: any, state: CalibrationState, newNextDate: Date) {
  console.log(`[Email Debug] Starting calibration notification for equipment ID ${schedule.equipment_id}, state: ${state}`);
  
  try {
    const { data: userData } = await supabase.auth
      .admin.getUserById(schedule.equipment.laboratory.manager_id);
    console.log(`[Email Debug] Manager data:`, userData?.user?.email || 'No manager email found');

    const { data: cordinator } = await supabase
      .rpc('get_lab_matched_users', {
        p_lab_id: schedule.equipment.laboratory.lab_id
      });
    console.log(`[Email Debug] Coordinator data:`, cordinator?.[0]?.email || 'No coordinator email found');

    const cordinator_email = cordinator?.[0]?.email;
    const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${schedule.equipment.laboratory.lab_id}/${schedule.equipment_id}`;
    
    const emailContent = {
      to: [cordinator_email, userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
      title: `Equipment Calibration Schedule Alert: ${state} - ${schedule.equipment.laboratory.name}`,
      body: `
        Lab: ${schedule.equipment.laboratory.name}<br/>
        Equipment: ${schedule.equipment.device?.[0]?.name || 'Unknown Equipment'}<br/>
        Current Status: ${state}<br/>
        Next calibration date: ${newNextDate}<br/>
        Description: ${schedule.description || 'Regular calibration required'}<br/>
        <br/>
        View equipment details: <a href="${equipmentUrl}">Click here</a>
      `
    };
    
    console.log(`[Email Debug] Calibration email content:`, {
      recipients: emailContent.to.join(', '),
      subject: emailContent.title
    });

    const result = await sendEmail(emailContent);
    console.log(`[Email Debug] Calibration email result:`, result);
    return result;
  } catch (error) {
    console.error(`[Email Debug] Error sending calibration notification:`, error);
    return { success: false, message: 'Failed to send calibration email' };
  }
}

// Helper function for external control notifications
async function sendExternalControlNotification(control: any, state: ExternalControlState, newNextDate: string) {
  console.log(`[Email Debug] Starting external control notification for control ID ${control.control_id}, state: ${state}`);
  
  try {
    const { data: userData } = await supabase.auth
      .admin.getUserById(control.equipment.laboratory.manager_id);
    console.log(`[Email Debug] Manager data:`, userData?.user?.email || 'No manager email found');

    const { data: cordinator } = await supabase
      .rpc('get_lab_matched_users', {
        p_lab_id: control.equipment.laboratory.lab_id
      });
    console.log(`[Email Debug] Coordinator data:`, cordinator?.[0]?.email || 'No coordinator email found');

    const cordinator_email = cordinator?.[0]?.email;
    const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${control.equipment.laboratory.lab_id}/${control.equipment_id}`;
    
    const stateColors = {
      'Done': 'green',
      'Final Date': 'yellow',
      'E.Q.C  Reception': 'red'
    };

    const emailContent = {
      to: [cordinator_email, userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
      title: `External Control Schedule Alert: ${state} - ${control.equipment.laboratory.name}`,
      body: `
        Lab: ${control.equipment.laboratory.name}<br/>
        Equipment: ${control.equipment.device?.[0]?.name || 'Unknown Equipment'}<br/>
        Current Status: <span style="color: ${stateColors[state]}">${state}</span><br/>
        Next control date: ${newNextDate}<br/>
        Description: ${control.description || 'External control required'}<br/>
        <br/>
        View equipment details: <a href="${equipmentUrl}">Click here</a>
      `
    };
    
    console.log(`[Email Debug] External control email content:`, {
      recipients: emailContent.to.join(', '),
      subject: emailContent.title
    });

    const result = await sendEmail(emailContent);
    console.log(`[Email Debug] External control email result:`, result);
    return result;
  } catch (error) {
    console.error(`[Email Debug] Error sending external control notification:`, error);
    return { success: false, message: 'Failed to send external control email' };
  }
}

export async function updateAllSchedules() {
  console.log('Starting updateAllSchedules at', new Date().toISOString());
  const results = {
    maintenance: null as any,
    calibration: null as any,
    externalControl: null as any,
    overallSuccess: false,
    startTime: new Date().toISOString(),
    endTime: '',
    errors: [] as string[]
  };

  try {
    // Run each update sequentially to avoid potential database conflicts
    results.maintenance = await updateMaintenanceSchedules();
    results.calibration = await updateCalibrationSchedules();
    results.externalControl = await updateExternalControlSchedules();
    
    // Check if all updates were successful
    const allSuccessful = 
      results.maintenance?.success !== false && 
      results.calibration?.success !== false && 
      results.externalControl?.success !== false;
    
    results.overallSuccess = allSuccessful;
    
    // Collect any errors
    if (!results.maintenance?.success) {
      results.errors.push(`Maintenance update failed: ${results.maintenance?.error?.message || 'Unknown error'}`);
    }
    
    if (!results.calibration?.success) {
      results.errors.push(`Calibration update failed: ${results.calibration?.error?.message || 'Unknown error'}`);
    }
    
    if (!results.externalControl?.success) {
      results.errors.push(`External control update failed: ${results.externalControl?.error?.message || 'Unknown error'}`);
    }
    
    results.endTime = new Date().toISOString();
    console.log('Completed updateAllSchedules at', results.endTime);
    
    return results;
  } catch (error) {
    console.error('Unexpected error in updateAllSchedules:', error);
    results.errors.push(`Unexpected error: ${(error as Error).message}`);
    results.overallSuccess = false;
    results.endTime = new Date().toISOString();
    return results;
  }
}
