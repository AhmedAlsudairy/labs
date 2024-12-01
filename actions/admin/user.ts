'use server';

import { CreateUserParams, Laboratory, OmanGovernorate, Staff, user_category, UserRole } from "@/types";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

 const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);





export async function getUsersByLaboratories(
    state: OmanGovernorate,
    lab_category: 'food' | 'animal' | 'human'
  ): Promise<Laboratory[]> {
    if (!state || !lab_category) {
      throw new Error('Both state and lab_category are required');
    }
  
    // First get laboratories
    const { data: labs, error: labError } = await supabase
      .from('laboratory')
      .select('*')
      .eq('location_state', state)
      .eq('lab_category', lab_category);
  
    if (labError) {
      console.error('Error fetching laboratories:', labError);
      throw labError;
    }
  
    // For each lab, get the manager details from auth.users
    const laboratoriesWithUsers: Laboratory[] = await Promise.all(
      (labs || []).map(async (lab) => {
        if (lab.manager_id) {
          const { data: userData, error: userError } = await supabase.auth
            .admin.getUserById(lab.manager_id);
  
          if (userError) {
            console.error(`Error fetching user for lab ${lab.lab_id}:`, userError);
            return {
              ...lab,
              user: undefined
            };
          }
  
          return {
            ...lab,
            user: userData ? {
              id: userData.user.id,
              name: userData.user.user_metadata?.name || '',
              email: userData.user.email || '',
              role: userData.user.user_metadata?.role as UserRole,
              metadata: {
                governorate: userData.user.user_metadata?.governorate,
                labId: userData.user.user_metadata?.labId
              }
            } : undefined
          };
        }
        return lab;
      })
    );
  
    return laboratoriesWithUsers;
  }
  
  
  
export async function updateUserRole(
    userId: string, 
    newRole: UserRole,
    oldRole: UserRole,
    metadata: { 
      governorate?: string; 
      labId?: string;
      user_category: user_category; // Added user_category as required field
    }
  ) {
    console.log('Starting updateUserRole with:', { userId, newRole, oldRole, metadata });
  
    const validRoles: UserRole[] = ['admin', 'cordinator', 'lab in charge', 'maintance staff'];
    if (!validRoles.includes(newRole)) {
      return { error: 'Invalid role specified.' };
    }
  
    // Validate metadata based on role
    if (newRole === 'cordinator' && !metadata.governorate) {
      return { error: 'Governorate must be specified for coordinator role.' };
    }
  
    if (newRole === 'lab in charge' && !metadata.labId) {
      return { error: 'Laboratory must be specified for lab in charge role.' };
    }
  
    // Validate user_category
    if (!metadata.user_category) {
      return { error: 'User category must be specified.' };
    }
  
    try {
      const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            role: newRole,
            user_category: metadata.user_category, // Add user_category to metadata
            ...(newRole === 'cordinator' && { governorate: metadata.governorate }),
            ...(newRole === 'lab in charge' && { labId: metadata.labId }),
          }
        }
      );
  
      console.log('Auth update result:', { data, error });
  
      if (error) {
        console.error('Error updating user role:', error);
        return { error: 'Failed to update user role.' };
      }
  
      // Handle laboratory manager updates
      if (oldRole === 'lab in charge') {
        console.log('Clearing old lab manager_id for user:', userId);
        const { data: clearData, error: clearError } = await supabase
          .from('laboratory')
          .update({ manager_id: null })
          .eq('manager_id', userId)
          .select();
  
        console.log('Clear manager result:', { clearData, clearError });
  
        if (clearError) {
          console.error('Error clearing old laboratory manager:', clearError);
        }
      }
  
      if (newRole === 'lab in charge' && metadata.labId) {
        console.log('Setting new lab manager_id:', { 
          userId, 
          labId: metadata.labId 
        });
  
        // First check if lab exists
        const { data: labCheck } = await supabase
          .from('laboratory')
          .select('lab_id, manager_id')
          .eq('lab_id', metadata.labId)
          .single();
  
        console.log('Lab check result:', labCheck);
  
        // Update manager_id
        const { data: updateData, error: updateError } = await supabase
          .from('laboratory')
          .update({ manager_id: userId })
          .eq('lab_id', metadata.labId)
          .select();
  
        console.log('Update manager result:', { updateData, updateError });
  
        if (updateError) {
          console.error('Error updating laboratory manager:', updateError);
          return { error: 'Failed to update laboratory manager.' };
        }
  
        // Verify update
        const { data: verifyData } = await supabase
          .from('laboratory')
          .select('manager_id')
          .eq('lab_id', metadata.labId)
          .single();
  
        console.log('Verification result:', verifyData);
      }
  
      return { 
        success: true, 
        message: `User role updated to ${newRole} (${metadata.user_category})${
          metadata.governorate ? ` for ${metadata.governorate} governorate` : ''
        }${
          metadata.labId ? ` for laboratory ${metadata.labId}` : ''
        }` 
      };
    } catch (error) {
      console.error('Unexpected error updating user role:', error);
      return { error: `Failed to update user role: ${(error as Error).message}` };
    }
  }
  
  // In actions/admin.ts
  export async function createUser({ email, password, role, name, metadata }: CreateUserParams
    
  ) {
    console.log('Creating user:', { email, role, name, metadata });
  
    const validRoles: UserRole[] = ['admin', 'cordinator', 'lab in charge', 'maintance staff'];
    if (!validRoles.includes(role)) {
      console.error('Invalid role specified:', role);
      return { error: 'Invalid role specified.' };
    }
  
    try {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          name, 
          role,
          ...metadata 
        }
      });
  
      if (createError) {
        console.error('Error creating user:', createError);
        return { error: 'Failed to create user: ' + createError.message };
      }
  
      if (!newUser?.user) {
        console.error('User creation failed: No user returned');
        return { error: 'User creation failed' };
      }
  
      console.log('User created successfully:', newUser.user.id);
      if (role === 'lab in charge' && newUser?.user) {
        try {
          // Update the laboratory with the new manager's ID
          await supabase
            .from('laboratory')
            .update({ manager_id: newUser.user.id })
            .eq('lab_id', metadata?.labId);
        } catch (error) {
          console.error('Error updating laboratory manager:', error);
        }
      }
      return { success: true, message: `User created successfully with role: ${role}` };
    } catch (error) {
      console.error('Unexpected error creating user:', error);
      return { error: 'Failed to create user. ' + (error as Error).message };
    }
  }
  export async function deleteUser(userId: string) {
    const { data, error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    return data;
  }
  
  
  //labs end here
  
  export async function getUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (error) throw error;
    return users;
  }
  
  export async function getStaff(labId: number): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('laboratory')
      .select(`
        manager_id,
        manager_name
      `)
      .eq('lab_id', labId);
  
    if (error) throw error;
  
    return data.map(lab => ({
      id: lab.manager_id,
      name: lab.manager_name,
      role: 'Manager',
    }));
  }
  
  
  
  