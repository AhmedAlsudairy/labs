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
  
  export async function getCalibrationRecords(labId: number): Promise<MaintenanceRecord[]> {
    const { data, error } = await supabase
      .from('calibration_schedule')
      .select('*, equipment:equipment_id(lab_id)')
      .eq('equipment.lab_id', labId);

    if (error) {
      console.error('Error fetching calibration records:', error);
      throw error;
    }

    console.log('Raw calibration records:', data);
    
    return data.map(record => ({
      id: record.calibration_schedule_id,
      date: record.next_date,
      equipmentId: record.equipment_id,
      state: record.state,
      responsible: record.responsible,
      description: record.description || 'Scheduled calibration',
      frequency: record.frequency
    }));
  }

  export async function getCalibrationRecordCount(equipmentId: number): Promise<number> {
    const { count, error } = await supabase
      .from('calibration_schedule')
      .select('*', { count: 'exact', head: true })
      .eq('equipment_id', equipmentId);

    if (error) throw error;
    return count || 0;
  }

  export async function getCalibrationRecordsByState(equipmentIds: number[]) {
    try {
      console.log(`[Calibration] Starting check for equipment IDs:`, equipmentIds);
      
      const { data, error } = await supabase
        .from('calibration_schedule')
        .select('*')
        .in('equipment_id', equipmentIds);

      if (error) {
        console.error(`[Calibration] Database error:`, error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log(`[Calibration] No records found for equipment`);
        return {};
      }

      const currentDate = new Date();
      const results: { [key: number]: { needCalibration: number; lateCalibration: number } } = {};

      // Initialize results for all equipment IDs
      equipmentIds.forEach(id => {
        results[id] = { needCalibration: 0, lateCalibration: 0 };
      });

      // Process all records at once
      data.forEach(record => {
        const nextDate = new Date(record.next_date);
        const timeDiff = nextDate.getTime() - currentDate.getTime();
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (!results[record.equipment_id]) {
          results[record.equipment_id] = { needCalibration: 0, lateCalibration: 0 };
        }

        if (daysUntilDue <= 7 && daysUntilDue > 0 && record.state !== 'calibrated') {
          results[record.equipment_id].needCalibration++;
        }

        if (nextDate < currentDate && record.state !== 'calibrated') {
          results[record.equipment_id].lateCalibration++;
        }
      });

      return results;
    } catch (error) {
      console.error(`[Calibration] Error processing:`, error);
      throw error;
    }
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