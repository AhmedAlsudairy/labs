'use server';

import { ExternalControl } from "@/lib/types";
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

  return data;
}

export async function addExternalControl(data: Omit<ExternalControl, 'control_id'>) {
  try {
    const nextDate = calculateNextDate(data.frequency, data.next_date ?? new Date());

    const { error } = await supabase
      .from('external_control')
      .insert([{
        next_date: nextDate,
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

export async function updateExternalControl(control_id: number, data: Partial<ExternalControl>) {
  try {
    let nextDate = data.next_date;
    if (data.next_date && data.frequency) {
      nextDate = calculateNextDate(data.frequency, data.next_date ?? new Date());
    }

    const { error } = await supabase
      .from('external_control')
      .update({
        next_date: nextDate,
        description: data.description,
        frequency: data.frequency,
        responsible: data.responsible,
        equipment_id: data.equipment_id,
        state: data.state,
        updated_by: data.updated_by,
        last_updated: new Date().toISOString(),
      })
      .eq('control_id', control_id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating external control:', error);
    return false;
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
