'use server';

import { MaintenanceRecord } from "@/types";
import { calculateNextDate } from "@/utils/utils";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

 const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
 
export async function updateMaintenanceRecord(
    recordId: number, 
    recordData: Partial<MaintenanceRecord>
  ): Promise<MaintenanceRecord> {
    // If date and frequency provided, calculate next date
    let nextDate = recordData.date;
    if (recordData.date && recordData.frequency) {
      nextDate = calculateNextDate( recordData.frequency,recordData.date ?? new Date());
    }
  
    const { data, error } = await supabase
      .from('maintenance_schedule')
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
    console.log(data)
    console.log(error)
    return {
      id: data.schedule_id,
      date: data.next_date,
      equipmentId: data.equipment_id,
      state: data.state,
   responsible: data.responsible,
      description: data.description || 'Scheduled maintenance',
      frequency: data.frequency
    };
  }
  
  export async function deleteMaintenanceRecord(recordId: number): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('maintenance_schedule')
      .delete()
      .eq('schedule_id', recordId);
  
    if (error) throw error;
    return { success: true };
  }
  
  export async function addMaintenanceRecord(
    recordData: Omit<MaintenanceRecord, 'id'>
  ): Promise<MaintenanceRecord> {
    const nextDate = calculateNextDate( recordData.frequency,recordData.date ?? new Date());
    
    const { data, error } = await supabase
      .from('maintenance_schedule')
      .insert({
        equipment_id: recordData.equipmentId,
        next_date: nextDate,
        frequency: recordData.frequency,
        description: recordData.description,
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
      responsible: data.responsible,
      state: data.state,
  
      frequency: data.frequency
    };
  }
  
  export async function getMaintenanceRecords(id: number, mode: 'lab' | 'equipment' = 'lab'): Promise<MaintenanceRecord[]> {
    if (!id) {
      console.error('No ID provided');
      return [];
    }

    try {
      if (mode === 'lab') {
        console.log('Fetching maintenance records for lab:', id);

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

        // Get maintenance records for these equipment
        const { data: records, error: recordsError } = await supabase
          .from('maintenance_schedule')
          .select(`
            schedule_id,
            next_date,
            equipment_id,
            state,
            responsible,
            description,
            frequency
          `)
          .in('equipment_id', equipmentIds);

        if (recordsError) {
          console.error('Error fetching maintenance records:', recordsError);
          return [];
        }

        if (!records) {
          console.log('No maintenance records found for lab');
          return [];
        }

        console.log('Found maintenance records:', records);

        const maintenanceRecords = records.map(record => ({
          id: record.schedule_id,
          date: record.next_date,
          equipmentId: record.equipment_id,
          state: record.state || 'pending',
          responsible: record.responsible || '',
          description: record.description || 'Scheduled maintenance',
          frequency: record.frequency || 'monthly',
          type: 'maintenance' as const
        }));

        console.log('Processed maintenance records:', maintenanceRecords);
        return maintenanceRecords;

      } else {
        console.log('Fetching maintenance records for equipment:', id);

        const { data: records, error } = await supabase
          .from('maintenance_schedule')
          .select(`
            schedule_id,
            next_date,
            equipment_id,
            state,
            responsible,
            description,
            frequency
          `)
          .eq('equipment_id', id);

        if (error) {
          console.error('Error fetching maintenance records:', error);
          return [];
        }

        if (!records) {
          console.log('No maintenance records found for equipment:', id);
          return [];
        }

        console.log('Found maintenance records:', records);

        const maintenanceRecords = records.map(record => ({
          id: record.schedule_id,
          date: record.next_date,
          equipmentId: record.equipment_id,
          state: record.state || 'pending',
          responsible: record.responsible || '',
          description: record.description || 'Scheduled maintenance',
          frequency: record.frequency || 'monthly',
          type: 'maintenance' as const
        }));

        console.log('Processed maintenance records:', maintenanceRecords);
        return maintenanceRecords;
      }
    } catch (error) {
      console.error('Error in getMaintenanceRecords:', error);
      return [];
    }
  }

  export async function getMaintenanceRecordCount(equipmentId: number): Promise<number> {
    const { count, error } = await supabase
      .from('maintenance_schedule')
      .select('*', { count: 'exact', head: true })
      .eq('equipment_id', equipmentId);

    if (error) throw error;
    return count || 0;
  }

  export async function getMaintenanceRecordsByState(equipmentIds: number[]) {
    try {
      console.log(`[Maintenance] Starting check for equipment IDs:`, equipmentIds);
      
      const { data, error } = await supabase
        .from('maintenance_schedule')
        .select('*')
        .in('equipment_id', equipmentIds);

      if (error) {
        console.error(`[Maintenance] Database error:`, error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log(`[Maintenance] No records found for equipment`);
        return {};
      }

      const currentDate = new Date();
      const results: { [key: number]: { needMaintenance: number; lateMaintenance: number } } = {};

      // Initialize results for all equipment IDs
      equipmentIds.forEach(id => {
        results[id] = { needMaintenance: 0, lateMaintenance: 0 };
      });

      // Process all records at once
      data.forEach(record => {
        const nextDate = new Date(record.next_date);
        const timeDiff = nextDate.getTime() - currentDate.getTime();
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (!results[record.equipment_id]) {
          results[record.equipment_id] = { needMaintenance: 0, lateMaintenance: 0 };
        }

        if (daysUntilDue <= 7 && daysUntilDue > 0 && record.state !== 'done') {
          results[record.equipment_id].needMaintenance++;
        }

        if (nextDate < currentDate && record.state !== 'done') {
          results[record.equipment_id].lateMaintenance++;
        }
      });

      return results;
    } catch (error) {
      console.error(`[Maintenance] Error processing:`, error);
      throw error;
    }
  }