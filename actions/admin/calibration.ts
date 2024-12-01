'use server';


import { MaintenanceRecord } from "@/types";
import { calculateNextDate } from "@/utils/utils";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

 const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
export async function addCalibrationRecord(
    recordData: Omit<MaintenanceRecord, 'id'>
  ): Promise<MaintenanceRecord> {
    const nextDate = calculateNextDate( recordData.frequency,recordData.date ?? new Date());
    
    const { data, error } = await supabase
      .from('calibration_schedule')
      .insert({
        equipment_id: recordData.equipmentId,
        next_date: nextDate,
        frequency: recordData.frequency,
        description: recordData.description,
        state: recordData.state,
        responsible: recordData.responsible,
  
      })
      .select()
      .single();
  
    if (error) throw error;
    
    return {
      id: data.schedule_id,
      date: data.next_date,
      equipmentId: data.equipment_id,
      description: data.description,
      state: data.state,
  responsible: data.responsible,
      frequency: data.frequency
    };
  }
  
  export async function getCalibrationRecords(equipmentId: number): Promise<MaintenanceRecord[]> {
    const { data, error } = await supabase
      .from('calibration_schedule')
      .select('*')
      .eq('equipment_id', equipmentId);
  
    if (error) throw error;
    console.log(data)
    return data.map(record => ({
      id: record.calibration_schedule_id,
      date: record.next_date,
      equipmentId: record.equipment_id,
      state: record.state,
  responsible: record.responsible,
      description: record.description || 'Scheduled maintenance', // Fallback if description is null
      frequency: record.frequency
    }));
  }
  
  // Update calibration record
  export async function updateCalibrationRecord(
    recordId: number, 
    recordData: Partial<MaintenanceRecord>
  ): Promise<MaintenanceRecord> {
    // If date and frequency provided, calculate next date
    let nextDate = recordData.date;
    if (recordData.date && recordData.frequency) {
      nextDate = calculateNextDate(recordData.frequency, recordData.date ?? new Date());
    }
  
    const { data, error } = await supabase
      .from('calibration_schedule')
      .update({
        next_date: nextDate,
        equipment_id: recordData.equipmentId,
        frequency: recordData.frequency,
        description: recordData.description,
        state: recordData.state,
        responsible: recordData.responsible,
      })
      .eq('schedule_id', recordId)
      .select()
      .single();
  
    if (error) throw error;
  
    return {
      id: data.calibration_schedule_id,
      date: data.next_date,
      equipmentId: data.equipment_id,
      state: data.state,
      responsible: data.responsible,
      description: data.description || 'Scheduled calibration',
      frequency: data.frequency
    };
  }
  // Delete calibration record
  
  export async function deleteCalibrationRecord(recordId: number): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('calibration_schedule')
      .delete()
      .eq('calibration_schedule_id', recordId);
  console.log(error)
    if (error) throw error;
    return { success: true };
  }