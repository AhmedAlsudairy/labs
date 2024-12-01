'use server';

import { EquipmentHistory } from "@/types";
import { updateCalibrationSchedules, updateMaintenanceSchedules } from "./scheduleUpdates";
import { sendEmail } from "@/utils/resend/email";
import { getLaboratoryById } from "./lab";

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
      .eq('calibration_schedule_id', calibrationScheduleId)
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
  
  
// Modified addMaintenanceHistory function
export async function addMaintenanceHistory(
    data: Omit<EquipmentHistory, 'history_id' | 'calibration_schedule_id'>, 
    lab_id: number,
    equipment_id: number
  ) {
    // Insert history record
    const { data: result, error } = await supabase
      .from('equipment_history')
      .insert([{ ...data }])
      .select()
      .single();
  
    if (error) return { error };
    // Update schedule
    const { error: updateError } = await supabase
      .from('maintenance_schedule')
      .update({ 
        state: data.state,
        next_date: data.next_maintenance_date, 
        updated_by: 'manual'
  
      })
      .eq('schedule_id', data.schedule_id);
  
    if (updateError) return { error: updateError };
  console.log("herrrrrree",updateError)
  
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
  }
  function isValidManagerId(id: string | undefined): id is string {
    return id !== undefined && id !== '';
  }
  
  // Similar changes for addCalibrationHistory function
  export async function addCalibrationHistory(
    data: Omit<EquipmentHistory, 'history_id' | 'schedule_id'>,  
    lab_id: number,
    equipment_id: number
  ) {
  
    // Insert history record
    const { data: result, error } = await supabase
      .from('equipment_history')
      .insert([{ 
        ...data,
        
      }])
      .select()
      .single();
  
    if (error) return { error };
    // Update schedule
    const { error: updateError } = await supabase
      .from('calibration_schedule')
      .update({ 
        state: data.state,
        next_date: data.next_calibration_date ,
        updated_by: 'manual'
  
      })
      .eq('calibration_schedule_id', data.calibration_schedule_id);
  console.log('Adding calibration history:iodfshh',updateError)
  
    if (updateError) return { error: updateError };
  
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
      title: `Equipment Calibration Status Update: ${data.state}`,
      body: `
        Equipment calibration status has been updated to: ${data.state}<br/>
        Description: ${data.description}<br/>
        Next calibration date: ${data.next_maintenance_date}<br/>
        <br/>
        View equipment details: <a href="${equipmentUrl}">Click here</a>
      `
    };
  
    await updateCalibrationSchedules();
    await sendEmail(emailContent);
  
    return { data: result };
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
  