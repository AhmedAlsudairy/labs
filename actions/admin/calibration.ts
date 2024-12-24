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
  
  export async function getCalibrationRecords(id: number, mode: 'lab' | 'equipment' = 'lab'): Promise<MaintenanceRecord[]> {
    if (!id) {
      console.error('No ID provided');
      return [];
    }

    try {
      if (mode === 'lab') {
        console.log('Fetching calibration records for lab:', id);

        // First get equipment IDs for this lab
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('equipment_id')
          .eq('lab_id', id);

        if (equipmentError) {
          console.error('Error fetching equipment:', equipmentError);
          return [];
        }

        if (!equipment || equipment.length === 0) {
          console.log('No equipment found for lab:', id);
          return [];
        }

        const equipmentIds = equipment.map(e => e.equipment_id);
        console.log('Found equipment IDs:', equipmentIds);

        // Get calibration records for these equipment
        const { data: records, error: recordsError } = await supabase
          .from('calibration_schedule')
          .select(`
            calibration_schedule_id,
            next_date,
            equipment_id,
            state,
            responsible,
            description,
            frequency
          `)
          .in('equipment_id', equipmentIds);

        if (recordsError) {
          console.error('Error fetching calibration records:', recordsError);
          return [];
        }

        if (!records) {
          console.log('No calibration records found for lab');
          return [];
        }

        console.log('Found calibration records:', records);

        const calibrationRecords = records.map(record => ({
          id: record.calibration_schedule_id,
          date: record.next_date,
          equipmentId: record.equipment_id,
          state: record.state || 'pending',
          responsible: record.responsible || '',
          description: record.description || 'Scheduled calibration',
          frequency: record.frequency || 'monthly',
          type: 'calibration' as const
        }));

        console.log('Processed calibration records:', calibrationRecords);
        return calibrationRecords;

      } else {
        console.log('Fetching calibration records for equipment:', id);

        const { data: records, error } = await supabase
          .from('calibration_schedule')
          .select(`
            calibration_schedule_id,
            next_date,
            equipment_id,
            state,
            responsible,
            description,
            frequency
          `)
          .eq('equipment_id', id);

        if (error) {
          console.error('Error fetching calibration records:', error);
          return [];
        }

        if (!records) {
          console.log('No calibration records found for equipment:', id);
          return [];
        }

        console.log('Found calibration records:', records);

        const calibrationRecords = records.map(record => ({
          id: record.calibration_schedule_id,
          date: record.next_date,
          equipmentId: record.equipment_id,
          state: record.state || 'pending',
          responsible: record.responsible || '',
          description: record.description || 'Scheduled calibration',
          frequency: record.frequency || 'monthly',
          type: 'calibration' as const
        }));

        console.log('Processed calibration records:', calibrationRecords);
        return calibrationRecords;
      }
    } catch (error) {
      console.error('Error in getCalibrationRecords:', error);
      return [];
    }
  }

  export async function getCalibrationRecordCount(equipmentId: number): Promise<number> {
    const { count, error } = await supabase
      .from('calibration_schedule')
      .select('*', { count: 'exact', head: true})
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