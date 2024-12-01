'use server';

import { CreateLaboratoryParams, Laboratory, OmanGovernorate } from "@/types";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

 const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
 

export async function updateUserLabAssignment(
    userId: string,
    labId: string
  ): Promise<{ data?: any; error?: string }> {
    console.log('Starting updateUserLabAssignment:', { userId, labId });
  
    try {
      // First update user metadata
      const { data: userData, error: userError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            labId: labId,
            role: 'lab in charge'  // Ensure role is set to lab in charge
          }
        }
      );
  
      if (userError) {
        console.error('Error updating user metadata:', userError);
        return { error: 'Failed to update user metadata' };
      }
  
      // Clear any existing lab assignments for this user
      const { error: clearError } = await supabase
        .from('laboratory')
        .update({ manager_id: null })
        .eq('manager_id', userId);
  
      if (clearError) {
        console.error('Error clearing previous lab assignments:', clearError);
        return { error: 'Failed to clear previous lab assignments' };
      }
  
      // Update new laboratory with this manager
      const { data: labData, error: labError } = await supabase
        .from('laboratory')
        .update({ manager_id: userId })
        .eq('lab_id', labId)
        .select();
  
      if (labError) {
        console.error('Error updating laboratory manager:', labError);
        return { error: 'Failed to update laboratory manager' };
      }
  
      return { data: labData };
  
    } catch (error) {
      console.error('Unexpected error:', error);
      return { error: 'An unexpected error occurred' };
    }
  }

  export async function getLaboratoriesByState(
    state: OmanGovernorate
  ): Promise<Laboratory[]> {
    // Input validation
    if (!state) {
      throw new Error('State parameter is required');
    }
  
    // Query laboratories by state
    const { data: labs, error } = await supabase
      .from('laboratory')
      .select('*')
      .eq('location_state', state);
  
    // Error handling
    if (error) {
      console.error('Error fetching laboratories:', error);
      throw error;
    }
  
    // Return results
    return labs || [];
  }
  
  
  
  
  
  
  export async function createLaboratory(laboratory: CreateLaboratoryParams) {
    const { data, error } = await supabase.from('laboratory').insert(laboratory);
    if (error) throw error;
    return data;
  }
  
  //labs
  //get labs
  export async function getLaboratories() {
    const { data, error } = await supabase.from('laboratory').select('*');
    if (error) throw error;
    console.log(error)
    return data;
  }
  
  export async function updateLaboratory(labId: number, updates: Partial<CreateLaboratoryParams>) {
    const { data, error } = await supabase.from('laboratory').update(updates).eq('lab_id', labId);
    if (error) throw error;
    return data;
  }
  
  export async function deleteLaboratory(labId: number) {
    const { data, error } = await supabase.from('laboratory').delete().eq('lab_id', labId);
    if (error) throw error;
    return data;
  }
  
  export async function getLaboratoryById(labId: number): Promise<Laboratory> {
    const { data, error } = await supabase.from('laboratory').select('*').eq('lab_id', labId).single();
    if (error) throw error;
    return data;
  }
  
  export async function getLaboratoryUserId(userId: string): Promise<Laboratory> {
    const { data, error } = await supabase.from('laboratory').select('*').eq('manager_id', userId).single();
    if (error) throw error;
    return data;
  }