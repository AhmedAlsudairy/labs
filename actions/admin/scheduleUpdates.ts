import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { sendEmail } from '@/utils/resend/email';
import { EquipmentHistory } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  } else if (daysDiff <= 0) { // Within a week of next date
    return 'need maintance';
  }
  return 'done';
}

function determineCalibrationState(nextDate: Date): CalibrationState {
  const today = new Date();
  const daysDiff = (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff < 0) {
    return 'late calibration';
  } else if (daysDiff <= 0) { // Within a week of next date
    return 'need calibration';
  }
  return 'calibrated';
}

export async function updateMaintenanceSchedules() {
  // Get all maintenance schedules with equipment and lab information
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

  // Update each maintenance schedule
  for (const schedule of maintenanceSchedules || []) {
    const nextDate = new Date(schedule.next_date);
    const state = determineMaintenanceState(nextDate);
    
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
      continue;
    }

    // Get user details using admin.getUserById
    if (state !== 'done' && schedule.equipment?.laboratory?.manager_id) {
      const { data: userData, error: userError } = await supabase.auth
        .admin.getUserById(schedule.equipment.laboratory.manager_id);

      if (userError) {
        console.error('Error fetching user:', userError);
        continue;
      }

      const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${schedule.equipment.laboratory.lab_id}/${schedule.equipment_id}`;
      const { data:cordinator } = await supabase
      .rpc('get_lab_matched_users', {
        p_lab_id: schedule.equipment.laboratory.lab_id
      })
    
      const cordinator_email = cordinator[0].email 
      const emailContent = {
        to: [cordinator_email,userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
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
  }
}

export async function updateCalibrationSchedules() {
  // Get all calibration schedules with equipment and lab information
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

  // Update each calibration schedule
  for (const schedule of calibrationSchedules || []) {
    const nextDate = new Date(schedule.next_date);
    const state = determineCalibrationState(nextDate);
    
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
      .eq('calibration_schedule_id', schedule.calibration_schedule_id);

    if (updateError) {
      console.error('Error updating calibration schedule:', updateError);
      continue;
    }

    // Get user details using admin.getUserById
    if (state !== 'calibrated' && schedule.equipment?.laboratory?.manager_id) {
      const { data: userData, error: userError } = await supabase.auth
        .admin.getUserById(schedule.equipment.laboratory.manager_id);

      if (userError) {
        console.error('Error fetching user:', userError);
        continue;
      }
      const { data:cordinator } = await supabase
      .rpc('get_lab_matched_users', {
        p_lab_id: schedule.equipment.laboratory.lab_id
      })
    
      const cordinator_email = cordinator[0].email  
      const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${schedule.equipment.laboratory.lab_id}/${schedule.equipment_id}`;
      
      const emailContent = {
        to: [cordinator_email,userData?.user?.email, 'micronboy632@gmail.com'].filter(Boolean) as string[],
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
  }
}

// Function to update both maintenance and calibration schedules
export async function updateAllSchedules() {
  await Promise.all([
    updateMaintenanceSchedules(),
    updateCalibrationSchedules()
  ]);
}
