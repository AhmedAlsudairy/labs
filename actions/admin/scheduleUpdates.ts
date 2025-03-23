'use server';

import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { sendEmail } from '@/utils/resend/email';
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
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < -2) {
    return 'late maintance';
  } else if (daysDiff <= 0) {
    return 'need maintance';
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
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return 'late calibration';
  } else if (daysDiff <= 3) { // Fix: Changed from <= 0 to <= 3 to give early warning
    return 'need calibration';
  }
  return 'calibrated';
}

function determineExternalControlState(nextDate: Date): ExternalControlState {
  // Safely handle invalid dates
  if (!nextDate || isNaN(nextDate.getTime())) {
    console.warn('Invalid date provided to determineExternalControlState:', nextDate);
    return 'E.Q.C Reception';
  }
  
  const today = new Date();
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return 'E.Q.C Reception'; // Red - Late
  } else if (daysDiff <= 7) {
    return 'Final Date'; // Yellow - In date but close
  }
  return 'Done'; // Green - In date
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
        if (schedule.updated_by === 'manual' && 
            (schedule.state === 'need maintance' || schedule.state === 'late maintance')) {
          console.log(`Skipping maintenance schedule ${schedule.schedule_id} - manually marked as ${schedule.state}`);
          continue;
        }

        const nextDate = new Date(schedule.next_date);
        const state = determineMaintenanceState(nextDate);
        const previousState = schedule.state;
        
        // Only update if state would change to done or if it's an automatic update
        let newNextDate = schedule.next_date;
        if (schedule.updated_by !== 'manual' || state === 'done') {
          if (state === 'done') {
            newNextDate = calculateNextDate(new Date(), schedule.frequency);
          }

          // Create a transaction to update both maintenance_schedule and equipment_history
          const { data, error: updateError } = await supabase.rpc('update_maintenance_schedule_with_history', {
            p_schedule_id: schedule.schedule_id,
            p_equipment_id: schedule.equipment_id,
            p_state: state,
            p_next_date: newNextDate,
            p_previous_state: previousState,
            p_description: `Maintenance schedule state changed from ${previousState} to ${state}`,
            p_work_performed: state === 'done' ? 'Automatic maintenance completion' : null
          });

          if (updateError) {
            console.error('Error updating maintenance schedule:', updateError);
            failedSchedules.push({
              id: schedule.schedule_id,
              error: updateError
            });
            continue;
          }

          updatedSchedules.push({
            id: schedule.schedule_id,
            previousState,
            newState: state,
            nextDate: newNextDate
          });

          // Send notifications only if state changed and isn't 'done'
          if (state !== 'done' && state !== previousState && schedule.equipment?.laboratory?.manager_id) {
            await sendMaintenanceNotification(schedule, state, newNextDate);
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

    console.log(`Completed updateMaintenanceSchedules at ${new Date().toISOString()}, updated: ${updatedSchedules.length}, failed: ${failedSchedules.length}`);
    return { 
      success: true, 
      updatedCount: updatedSchedules.length,
      failedCount: failedSchedules.length,
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
        
        // Only update if state would change to calibrated or if it's an automatic update
        let newNextDate = schedule.next_date;
        if (schedule.updated_by !== 'manual' || state === 'calibrated') {
          if (state === 'calibrated') {
            newNextDate = calculateNextDate(new Date(), schedule.frequency);
          }

          // Create a transaction to update both calibration_schedule and equipment_history
          const { data, error: updateError } = await supabase.rpc('update_calibration_schedule_with_history', {
            p_calibration_schedule_id: schedule.calibration_schedule_id,
            p_equipment_id: schedule.equipment_id,
            p_state: state,
            p_next_date: newNextDate,
            p_previous_state: previousState,
            p_description: `Calibration schedule state changed from ${previousState} to ${state}`,
            p_calibration_results: state === 'calibrated' ? 'Automatic calibration completion' : null
          });

          if (updateError) {
            console.error('Error updating calibration schedule:', updateError);
            failedSchedules.push({
              id: schedule.calibration_schedule_id,
              error: updateError
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
            await sendCalibrationNotification(schedule, state, newNextDate);
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

    console.log(`Completed updateCalibrationSchedules at ${new Date().toISOString()}, updated: ${updatedSchedules.length}, failed: ${failedSchedules.length}`);
    return { 
      success: true, 
      updatedCount: updatedSchedules.length,
      failedCount: failedSchedules.length,
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
            (control.state === 'Final Date' || control.state === 'E.Q.C Reception')) {
          console.log(`Skipping external control ${control.control_id} - manually marked as ${control.state}`);
          continue;
        }

        const nextDate = new Date(control.next_date);
        const state = determineExternalControlState(nextDate);
        const previousState = control.state;
        
        // Only update if state would change to Done or if it's an automatic update
        let newNextDate = control.next_date;
        if (control.updated_by !== 'manual' || state === 'Done') {
          if (state === 'Done') {
            newNextDate = calculateNextDate(new Date(), control.frequency);
          }

          // Create a transaction to update both external_control and equipment_history
          const { data, error: updateError } = await supabase.rpc('update_external_control_with_history', {
            p_control_id: control.control_id,
            p_equipment_id: control.equipment_id,
            p_state: state,
            p_next_date: newNextDate,
            p_previous_state: previousState,
            p_description: `External control state changed from ${previousState} to ${state}`
          });

          if (updateError) {
            console.error('Error updating external control:', updateError);
            failedControls.push({
              id: control.control_id,
              error: updateError
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

// Helper function for maintenance notifications
async function sendMaintenanceNotification(schedule: any, state: MaintenanceState, newNextDate: Date) {
  const { data: userData } = await supabase.auth
    .admin.getUserById(schedule.equipment.laboratory.manager_id);

  const { data: cordinator } = await supabase
    .rpc('get_lab_matched_users', {
      p_lab_id: schedule.equipment.laboratory.lab_id
    });

  const cordinator_email = cordinator?.[0]?.email;
  const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${schedule.equipment.laboratory.lab_id}/${schedule.equipment_id}`;
  
  const emailContent = {
    to: [cordinator_email, userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
    title: `Equipment Maintenance Schedule Alert: ${state}`,
    body: `
      Equipment: ${schedule.equipment.device?.[0]?.name || 'Unknown Equipment'}<br/>
      Current Status: ${state}<br/>
      Next maintenance date: ${newNextDate}<br/>
      Description: ${schedule.description || 'Regular maintenance required'}<br/>
      <br/>
      View equipment details: <a href="${equipmentUrl}">Click here</a>
    `
  };

  await sendEmail(emailContent);
}

// Helper function for calibration notifications
async function sendCalibrationNotification(schedule: any, state: CalibrationState, newNextDate: Date) {
  const { data: userData } = await supabase.auth
    .admin.getUserById(schedule.equipment.laboratory.manager_id);

  const { data: cordinator } = await supabase
    .rpc('get_lab_matched_users', {
      p_lab_id: schedule.equipment.laboratory.lab_id
    });

  const cordinator_email = cordinator?.[0]?.email;
  const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${schedule.equipment.laboratory.lab_id}/${schedule.equipment_id}`;
  
  const emailContent = {
    to: [cordinator_email, userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
    title: `Equipment Calibration Schedule Alert: ${state}`,
    body: `
      Equipment: ${schedule.equipment.device?.[0]?.name || 'Unknown Equipment'}<br/>
      Current Status: ${state}<br/>
      Next calibration date: ${newNextDate}<br/>
      Description: ${schedule.description || 'Regular calibration required'}<br/>
      <br/>
      View equipment details: <a href="${equipmentUrl}">Click here</a>
    `
  };

  await sendEmail(emailContent);
}

// Helper function for external control notifications
async function sendExternalControlNotification(control: any, state: ExternalControlState, newNextDate: Date) {
  const { data: userData } = await supabase.auth
    .admin.getUserById(control.equipment.laboratory.manager_id);

  const { data: cordinator } = await supabase
    .rpc('get_lab_matched_users', {
      p_lab_id: control.equipment.laboratory.lab_id
    });

  const cordinator_email = cordinator?.[0]?.email;
  const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${control.equipment.laboratory.lab_id}/${control.equipment_id}`;
  
  const stateColors = {
    'Done': 'green',
    'Final Date': 'yellow',
    'E.Q.C Reception': 'red'
  };

  const emailContent = {
    to: [cordinator_email, userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
    title: `External Control Schedule Alert: ${state}`,
    body: `
      Equipment: ${control.equipment.device?.name || 'Unknown Equipment'}<br/>
      Current Status: <span style="color: ${stateColors[state]}">${state}</span><br/>
      Next control date: ${newNextDate}<br/>
      Description: ${control.description || 'External control required'}<br/>
      <br/>
      View equipment details: <a href="${equipmentUrl}">Click here</a>
    `
  };

  await sendEmail(emailContent);
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
