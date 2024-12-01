'use server';

import { Equipment, EquipmentUsage, MaintenanceRecord, Staff, Laboratory, UserRole, CreateUserParams, CalibrationData, ExternalControl, CreateEquipmentInput, CreateLaboratoryParams, EquipmentHistory, OmanGovernorate, user_category, DowntimeRecord } from '@/types';
import { sendEmail } from '@/utils/resend/email';
import { calculateNextDate } from '@/utils/utils';
import { createClient } from '@supabase/supabase-js';
import { Result } from 'postcss';
import { updateCalibrationSchedules, updateMaintenanceSchedules } from './scheduleUpdates';
import { CloudCog } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);


export async function getExternalControls(equipmentId: number): Promise<ExternalControl[]> {
  const { data, error } = await supabase
    .from('external_control')
    .select('*')
    .eq('device_id', equipmentId);

  if (error) throw error;
  return data.map(control => ({
    id: control.control_id,
    date: control.date,
    result: control.result,
    equipmentId: control.device_id,
  }));
}



// actions/admin.ts


// export async function addCalibrationHistory(
//   data: Omit<EquipmentHistory, 'history_id' | 'schedule_id'>,  
//   lab_id: number,
//   equipment_id: number
// ) {
//   console.log('=== Starting addCalibrationHistory ===');
//   console.log('Input data:', { data, lab_id, equipment_id });

//   // Insert history record
//   const { data: result, error } = await supabase
//     .from('equipment_history')
//     .insert([{ 
//       ...data,
//     }])
//     .select()
//     .single();
  
//   console.log('Insert history result:', { result, error });

//   if (error) {
//     console.error('Failed to insert equipment history:', error);
//     return { error };
//   }

//   // Update schedule
//   const updateData = { 
//     state: data.state,
//     next_date: data.next_calibration_date 
//   };
//   console.log('Updating calibration schedule with:', updateData);
  
//   const { error: updateError } = await supabase
//     .from('calibration_schedule')
//     .update(updateData)
//     .eq('calibration_schedule_id', data.calibration_schedule_id);

//   if (updateError) {
//     console.error('Failed to update calibration schedule:', updateError);
//     return { error: updateError };
//   }

//   const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;
  
//   const emailContent = {
//     to: ['micronboy632@gmail.com'],
//     title: `Equipment Calibration Status Update: ${data.state}`,
//     body: `
//       Equipment calibration status has been updated to: ${data.state}<br/>
//       Description: ${data.description}<br/>
//       Next calibration date: ${data.next_maintenance_date}<br/>
//       <br/>
//       View equipment details: <a href="${equipmentUrl}">Click here</a>
//     `
//   };

//   try {
//     await sendEmail(emailContent);
//     console.log('Email notification sent successfully');
//   } catch (emailError) {
//     console.error('Failed to send email notification:', emailError);
//   }

//   console.log('=== Completed addCalibrationHistory successfully ===');
//   return { data: result };
// }

