'use server';

import { ExternalControl, Frequency } from "@/lib/types";
import { calculateNextDate } from "@/utils/utils";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function getExternalControlRecords(equipment_id: number) {
  const { data, error } = await supabase
    .from('external_control')
    .select('*')
    .eq('equipment_id', equipment_id)
    .order('next_date', { ascending: true });

  if (error) {
    console.error('Error fetching external control records:', error);
    return [];
  }

  // Map the response to include a date field for consistency with other record types
  return data.map(control => ({
    ...control,
    date: control.next_date // Add date field to match structure of maintenance/calibration records
  }));
}

export async function addExternalControl(data: Omit<ExternalControl, 'control_id'>) {
  try {
    // Convert string date to Date object before passing to calculateNextDate
    const dateObj = data.next_date ? new Date(data.next_date) : new Date();
    const nextDate = calculateNextDate(data.frequency, dateObj);
    
    // First, get the current max control_id from the database
    const { data: maxIdResult, error: maxIdError } = await supabase
      .from('external_control')
      .select('control_id')
      .order('control_id', { ascending: false })
      .limit(1);
    
    if (maxIdError) {
      console.error('Error fetching max control_id:', maxIdError);
      throw maxIdError;
    }
    
    // Calculate the next control_id (1 if there are no records, otherwise max + 1)
    const nextControlId = maxIdResult && maxIdResult.length > 0 ? maxIdResult[0].control_id + 1 : 1;
    
    // Now insert with the manually calculated control_id
    const { error } = await supabase
      .from('external_control')
      .insert([{
        control_id: nextControlId, // Add the manually generated ID
        next_date: nextDate.toISOString().split('T')[0], // Convert Date back to string for DB
        description: data.description,
        frequency: data.frequency,
        responsible: data.responsible,
        equipment_id: data.equipment_id,
        state: data.state,
        updated_by: data.updated_by,
        last_updated: new Date().toISOString(),
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding external control:', error);
    return false;
  }
}

// Update external control record
export async function updateExternalControl(
  controlId: number, 
  recordData: Partial<ExternalControl>
): Promise<ExternalControl> {
  try {
    // If date and frequency provided, calculate next date
    let nextDate: string | undefined = recordData.next_date;
    
    if (recordData.next_date && recordData.frequency) {
      // Convert string date to Date object for calculation
      const dateObj = new Date(recordData.next_date);
      // Set time to noon to prevent timezone issues
      dateObj.setHours(12, 0, 0, 0);
      // Fixed the parameter order: frequency first, then date
      const calculatedDate = calculateNextDate(recordData.frequency, dateObj);
      // Format as YYYY-MM-DD for consistency
      nextDate = calculatedDate.toISOString().split('T')[0];
    }
    
    // Check latest history for this external control to determine state
    const { data: latestHistory, error: historyError } = await supabase
      .from('equipment_history')
      .select('*')
      .eq('external_control_id', controlId)
      .order('created_at', { ascending: false })
      .limit(1);

    // Use provided state or get from latest history, fallback to current state
    let stateToUse = recordData.state;
    
    if (latestHistory && latestHistory.length > 0) {
      console.log(`Found latest history for external control ${controlId}:`, latestHistory[0]);
      // Use the external_control_state from latest history entry
      stateToUse = latestHistory[0].external_control_state;
    }

    const { data, error } = await supabase
      .from('external_control')
      .update({
        next_date: nextDate,
        frequency: recordData.frequency,
        description: recordData.description,
        state: stateToUse, // Use state from history if available
        responsible: recordData.responsible,
        last_updated: new Date().toISOString(),
        updated_by: 'manual'
      })
      .eq('control_id', controlId)
      .select()
      .single();

    if (error) throw error;
    
    return {
      control_id: data.control_id,
      equipment_id: data.equipment_id,
      next_date: data.next_date,
      state: data.state,
      responsible: data.responsible,
      description: data.description || 'External control',
      frequency: data.frequency,
      // Add the missing properties required by the ExternalControl type
      updated_by: data.updated_by || 'manual',
      last_updated: data.last_updated || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error updating external control:', error);
    throw error;
  }
}

export async function deleteExternalControl(control_id: number) {
  try {
    const { error } = await supabase
      .from('external_control')
      .delete()
      .eq('control_id', control_id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting external control:', error);
    return false;
  }
}

export async function getExternalControl(control_id: number): Promise<ExternalControl | null> {
  try {
    const { data, error } = await supabase
      .from("external_control")
      .select("*")
      .eq("control_id", control_id)
      .single();

    if (error) throw error;
    return data as ExternalControl;
  } catch (error) {
    console.error("Error fetching external control:", error);
    return null;
  }
}

export async function getExternalControlsByEquipment(equipment_id: number): Promise<ExternalControl[]> {
  try {
    const { data, error } = await supabase
      .from("external_control")
      .select("*")
      .eq("equipment_id", equipment_id)
      .order("next_date", { ascending: false });

    if (error) throw error;
    return data as ExternalControl[];
  } catch (error) {
    console.error("Error fetching external controls:", error);
    return [];
  }
}

export async function getExternalControlsByLab(lab_id: number): Promise<(ExternalControl & { equipment: { equipment_id: number; name: string } })[]> {
  try {
    const { data, error } = await supabase
      .from("external_control")
      .select("*, equipment:equipment_id(equipment_id, name)")
      .eq("equipment.lab_id", lab_id)
      .order("next_date", { ascending: false });

    if (error) throw error;
    return data as (ExternalControl & { equipment: { equipment_id: number; name: string } })[];
  } catch (error) {
    console.error("Error fetching external controls:", error);
    return [];
  }
}
