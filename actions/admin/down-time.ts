'use server';

import { DowntimeRecord } from "@/types";


import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

 const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function createDowntimeRecord(data: Omit<DowntimeRecord, 'record_id'>) {
    const { data: result, error } = await supabase
      .from('downtime_record')
      .insert([data])
      .select()
      .single();
  
    if (error) throw new Error(error.message);
    return result;
  }
  export async function updateDowntimeRecord(record_id: number, data: Partial<DowntimeRecord>) {
    const { data: result, error } = await supabase
      .from('downtime_record')
      .update(data)
      .match({ record_id })
      .select()
      .single();
  
    if (error) throw new Error(error.message);
    return result;
  }
  
  export async function deleteDowntimeRecord(record_id: number) {
    const { error } = await supabase
      .from('downtime_record')
      .delete()
      .match({ record_id });
  
    if (error) throw new Error(error.message);
    return true;
  }
  
  
  export async function getDowntimeRecords(equipment_id: number) {
    const { data, error } = await supabase
      .from('downtime_record')
      .select('*')
      .eq('equipment_id', equipment_id)
      .order('start_date', { ascending: false });
  
    if (error) throw new Error(error.message);
    return data;
  }
  