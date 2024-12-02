'use server';

import { CreateLaboratoryParams, Laboratory, OmanGovernorate } from "@/types";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);


export async function updateUserLabAssignment(
  userId: string,
  labId: string,
  role: string
): Promise<{ data?: any; error?: string }> {
  console.log('Starting updateUserLabAssignment:', { userId, labId, role });

  try {
    // Get user data first
    const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (getUserError || !user) {
      console.error('Error getting user data:', getUserError);
      return { error: 'Failed to get user data' };
    }

    // Update user metadata
    const { data: userData, error: userError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          labId: labId,
          role: role
        }
      }
    );

    if (userError) {
      console.error('Error updating user metadata:', userError);
      return { error: 'Failed to update user metadata' };
    }

    // Clear any existing assignments for this user based on role
    const clearUpdates: { [key: string]: null } = {};
    switch (role) {
      case 'lab in charge':
        clearUpdates.manager_id = null;
        break;
      case 'lab technician':
        clearUpdates.technician_lab_id = null;
        break;
      case 'maintenance staff':
        clearUpdates.maintenance_staff_id = null;
        break;
    }

    if (Object.keys(clearUpdates).length > 0) {
      const { error: clearError } = await supabase
        .from('laboratory')
        .update(clearUpdates)
        .eq(Object.keys(clearUpdates)[0], userId);

      if (clearError) {
        console.error('Error clearing previous lab assignments:', clearError);
        return { error: 'Failed to clear previous lab assignments' };
      }
    }

    // Prepare update data based on role
    const updateData: any = {
      email: user.email
    };

    switch (role) {
      case 'lab in charge':
        updateData.manager_id = userId;
        updateData.manager_name = user.user_metadata?.name || user.email;
        break;
      case 'lab technician':
        updateData.technician_lab_id = userId;
        break;
      case 'maintenance staff':
        updateData.maintenance_staff_id = userId;
        break;
    }

    // Update laboratory with staff information
    const { data: labData, error: labError } = await supabase
      .from('laboratory')
      .update(updateData)
      .eq('lab_id', labId)
      .select();

    if (labError) {
      console.error('Error updating laboratory staff:', labError);
      return { error: 'Failed to update laboratory staff' };
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
  console.log('Creating laboratory with data:', laboratory);
  const { data, error } = await supabase.from('laboratory').insert(laboratory).select();
  if (error) {
    console.error('Error creating laboratory:', error);
    throw error;
  }
  console.log('Laboratory created successfully:', data);
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

export async function getLaboratoryUserId(userId: string): Promise<Laboratory | null> {
  // Check all possible role associations
  const { data: managerLab, error: managerError } = await supabase
    .from('laboratory')
    .select('*')
    .eq('manager_id', userId)
    .single();

  if (managerLab) return managerLab;

  const { data: technicianLab, error: technicianError } = await supabase
    .from('laboratory')
    .select('*')
    .eq('technician_lab_id', userId)
    .single();

  if (technicianLab) return technicianLab;

  const { data: maintenanceLab, error: maintenanceError } = await supabase
    .from('laboratory')
    .select('*')
    .eq('maintenance_staff_id', userId)
    .single();

  if (maintenanceLab) return maintenanceLab;

  // If no laboratory is found for any role
  if (managerError?.code === 'PGRST116' || 
      technicianError?.code === 'PGRST116' || 
      maintenanceError?.code === 'PGRST116') {
    return null;
  }

  // If there's a different error, throw it
  if (managerError) throw managerError;
  if (technicianError) throw technicianError;
  if (maintenanceError) throw maintenanceError;

  return null;
}

export async function assignStaffToLaboratory(
  labId: number,
  staffId: string,
  role: 'lab technician' | 'maintenance staff'
): Promise<{ success?: boolean; error?: string }> {
  try {
    // First verify the user exists and has the correct role
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(staffId);

    if (userError || !userData.user) {
      console.error('Error fetching user:', userError);
      return { error: 'User not found' };
    }

    if (userData.user.user_metadata?.role !== role) {
      return { error: `User must have ${role} role to be assigned` };
    }

    // Update the laboratory with the new staff member
    const updateData = role === 'lab technician'
      ? { technician_lab_id: staffId }
      : { maintenance_staff_id: staffId };

    const { error: updateError } = await supabase
      .from('laboratory')
      .update(updateData)
      .eq('lab_id', labId);

    if (updateError) {
      console.error('Error updating laboratory staff:', updateError);
      return { error: 'Failed to assign staff member to laboratory' };
    }

    // Update user metadata with lab assignment
    const { error: userUpdateError } = await supabase.auth.admin.updateUserById(
      staffId,
      {
        user_metadata: {
          ...userData.user.user_metadata,
          labId: labId.toString()
        }
      }
    );

    if (userUpdateError) {
      console.error('Error updating user metadata:', userUpdateError);
      return { error: 'Failed to update user laboratory assignment' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in assignStaffToLaboratory:', error);
    return { error: 'An unexpected error occurred' };
  }
}