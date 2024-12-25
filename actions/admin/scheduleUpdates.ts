'use server';

import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { sendEmail } from '@/utils/resend/email';
import {   } from '@/types';
import { ExternalControlState } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annually';
type MaintenanceState = 'done' | 'need maintance' | 'late maintance';
type CalibrationState = 'calibrated' | 'need calibration' | 'late calibration';

interface ScheduleUpdate {
  last_updated: Date;
  updated_by: 'manual' | 'automatic';
}

function calculateNextDate(currentDate: Date, frequency: Frequency): Date {
  switch (frequency) {
    case 'daily':
      return addDays(currentDate, 1);
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'bimonthly':
      return addMonths(currentDate, 2);
    case 'quarterly':
      return addMonths(currentDate, 3);
    case 'biannual':
      return addMonths(currentDate, 6);
    case 'annually':
      return addYears(currentDate, 1);
    default:
      return currentDate;
  }
}

function determineMaintenanceState(nextDate: Date): MaintenanceState {
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
  const today = new Date();
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return 'late calibration';
  } else if (daysDiff <= 0) {
    return 'need calibration';
  }
  return 'calibrated';
}

function determineExternalControlState(nextDate: Date): ExternalControlState {
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
    return;
  }

  for (const schedule of maintenanceSchedules || []) {
    // Skip if recently updated manually or in need/late maintenance state with manual update
    if (schedule.updated_by === 'manual' && 
        (schedule.state === 'need maintance' || schedule.state === 'late maintance')) {
      console.log(`Skipping maintenance schedule ${schedule.schedule_id} - manually marked as ${schedule.state}`);
      continue;
    }

    const nextDate = new Date(schedule.next_date);
    const state = determineMaintenanceState(nextDate);
    
    // Only update if state would change to done or if it's an automatic update
    let newNextDate = schedule.next_date;
    if (schedule.updated_by !== 'manual' || state === 'done') {
      if (state === 'done') {
        newNextDate = calculateNextDate(new Date(), schedule.frequency);
      }

      const { error: updateError } = await supabase
        .from('maintenance_schedule')
        .update({ 
          state,
          next_date: newNextDate,
          last_updated: new Date().toISOString(),
          updated_by: 'automatic'
        })
        .eq('schedule_id', schedule.schedule_id);

      if (updateError) {
        console.error('Error updating maintenance schedule:', updateError);
        continue;
      }

      // Send notifications only if state changed
      if (state !== 'done' && schedule.equipment?.laboratory?.manager_id) {
        await sendMaintenanceNotification(schedule, state, newNextDate);
      }
    }
  }
}

export async function updateCalibrationSchedules() {
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
    return;
  }

  for (const schedule of calibrationSchedules || []) {
    // Skip if recently updated manually or in need/late calibration state with manual update
    if (schedule.updated_by === 'manual' && 
        (schedule.state === 'need calibration' || schedule.state === 'late calibration')) {
      console.log(`Skipping calibration schedule ${schedule.calibration_schedule_id} - manually marked as ${schedule.state}`);
      continue;
    }

    const nextDate = new Date(schedule.next_date);
    const state = determineCalibrationState(nextDate);
    
    // Only update if state would change to calibrated or if it's an automatic update
    let newNextDate = schedule.next_date;
    if (schedule.updated_by !== 'manual' || state === 'calibrated') {
      if (state === 'calibrated') {
        newNextDate = calculateNextDate(new Date(), schedule.frequency);
      }

      const { error: updateError } = await supabase
        .from('calibration_schedule')
        .update({ 
          state,
          next_date: newNextDate,
          last_updated: new Date().toISOString(),
          updated_by: 'automatic'
        })
        .eq('calibration_schedule_id', schedule.calibration_schedule_id);

      if (updateError) {
        console.error('Error updating calibration schedule:', updateError);
        continue;
      }

      // Send notifications only if state changed
      if (state !== 'calibrated' && schedule.equipment?.laboratory?.manager_id) {
        await sendCalibrationNotification(schedule, state, newNextDate);
      }
    }
  }
}

export async function updateExternalControlSchedules(equipment_id?: number) {
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
    return;
  }

  for (const control of externalControls || []) {
    // Skip if recently updated manually
    if (control.updated_by === 'manual' && 
        (control.state === 'Final Date' || control.state === 'E.Q.C Reception')) {
      console.log(`Skipping external control ${control.control_id} - manually marked as ${control.state}`);
      continue;
    }

    const nextDate = new Date(control.next_date);
    const state = determineExternalControlState(nextDate);
    
    // Only update if state would change to Done or if it's an automatic update
    let newNextDate = control.next_date;
    if (control.updated_by !== 'manual' || state === 'Done') {
      if (state === 'Done') {
        newNextDate = calculateNextDate(new Date(), control.frequency);
      }

      const { error: updateError } = await supabase
        .from('external_control')
        .update({ 
          state,
          next_date: newNextDate,
          last_updated: new Date().toISOString(),
          updated_by: 'automatic'
        })
        .eq('control_id', control.control_id);

      if (updateError) {
        console.error('Error updating external control:', updateError);
        continue;
      }

      // Send notifications only if state changed
      if (state !== 'Done' && control.equipment?.laboratory?.manager_id) {
        await sendExternalControlNotification(control, state, newNextDate);
      }
    }
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
  await Promise.all([
    updateMaintenanceSchedules(),
    updateCalibrationSchedules(),
    updateExternalControlSchedules()
  ]);
}
