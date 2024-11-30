import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annually';
type MaintenanceState = 'done' | 'need maintance' | 'late maintance';
type CalibrationState = 'calibrated' | 'need calibration' | 'late calibration';

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
  
  if (daysDiff < 0) {
    return 'late maintance';
  } else if (daysDiff <= 7) { // Within a week of next date
    return 'need maintance';
  }
  return 'done';
}

function determineCalibrationState(nextDate: Date): CalibrationState {
  const today = new Date();
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return 'late calibration';
  } else if (daysDiff <= 7) { // Within a week of next date
    return 'need calibration';
  }
  return 'calibrated';
}

export async function updateMaintenanceSchedules() {
  // Get all maintenance schedules
  const { data: maintenanceSchedules, error: maintenanceError } = await supabase
    .from('maintenance_schedule')
    .select('*');

  if (maintenanceError) {
    console.error('Error fetching maintenance schedules:', maintenanceError);
    return;
  }

  // Update each maintenance schedule
  for (const schedule of maintenanceSchedules || []) {
    const nextDate = new Date(schedule.next_date);
    const state = determineMaintenanceState(nextDate);
    
    // If state is 'late maintance' or 'need maintance', calculate the next date based on frequency
    let newNextDate = schedule.next_date;
    if (state !== 'done') {
      newNextDate = calculateNextDate(new Date(), schedule.frequency);
    }

    const { error: updateError } = await supabase
      .from('maintenance_schedule')
      .update({ 
        state,
        next_date: newNextDate
      })
      .eq('schedule_id', schedule.schedule_id);

    if (updateError) {
      console.error('Error updating maintenance schedule:', updateError);
    }
  }
}

export async function updateCalibrationSchedules() {
  // Get all calibration schedules
  const { data: calibrationSchedules, error: calibrationError } = await supabase
    .from('calibration_schedule')
    .select('*');

  if (calibrationError) {
    console.error('Error fetching calibration schedules:', calibrationError);
    return;
  }

  // Update each calibration schedule
  for (const schedule of calibrationSchedules || []) {
    const nextDate = new Date(schedule.next_date);
    const state = determineCalibrationState(nextDate);
    
    // If state is 'late calibration' or 'need calibration', calculate the next date based on frequency
    let newNextDate = schedule.next_date;
    if (state !== 'calibrated') {
      newNextDate = calculateNextDate(new Date(), schedule.frequency);
    }

    const { error: updateError } = await supabase
      .from('calibration_schedule')
      .update({ 
        state,
        next_date: newNextDate
      })
      .eq('schedule_id', schedule.schedule_id);

    if (updateError) {
      console.error('Error updating calibration schedule:', updateError);
    }
  }
}

// Function to update both maintenance and calibration schedules
export async function updateAllSchedules() {
  await Promise.all([
    updateMaintenanceSchedules(),
    updateCalibrationSchedules()
  ]);
}
