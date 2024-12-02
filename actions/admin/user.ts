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
      user_category: user_category;
    }
  ) {
    console.log('Starting updateUserRole with:', { userId, newRole, oldRole, metadata });
  
    const validRoles: UserRole[] = ['admin', 'cordinator', 'lab in charge', 'maintance staff', 'lab technician'];
    if (!validRoles.includes(newRole)) {
      return { error: 'Invalid role specified.' };
    }
  
    // Validate metadata based on role
    if (newRole === 'cordinator' && !metadata.governorate) {
      return { error: 'Governorate must be specified for coordinator role.' };
    }
  
    if (['lab in charge', 'maintance staff', 'lab technician'].includes(newRole) && !metadata.labId) {
      return { error: 'Laboratory must be specified for laboratory staff roles.' };
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
            user_category: metadata.user_category,
            ...(newRole === 'cordinator' && { governorate: metadata.governorate }),
            ...((['lab in charge', 'maintance staff', 'lab technician'].includes(newRole)) && { labId: metadata.labId }),
          }
        }
      );
  
      console.log('Auth update result:', { data, error });
  
      if (error) {
        console.error('Error updating user role:', error);
        return { error: 'Failed to update user role.' };
      }
  
      // Clear old role assignments
      if (oldRole === 'lab in charge') {
        console.log('Clearing old lab manager_id for user:', userId);
        await supabase
          .from('laboratory')
          .update({ manager_id: null })
          .eq('manager_id', userId);
      } else if (oldRole === 'lab technician') {
        console.log('Clearing old lab technician_lab_id for user:', userId);
        await supabase
          .from('laboratory')
          .update({ technician_lab_id: null })
          .eq('technician_lab_id', userId);
      } else if (oldRole === 'maintance staff') {
        console.log('Clearing old lab maintenance_staff_id for user:', userId);
        await supabase
          .from('laboratory')
          .update({ maintenance_staff_id: null })
          .eq('maintenance_staff_id', userId);
      }
  
      // Set new role assignments
      if (metadata.labId) {
        const updateData: any = {};
        
        switch (newRole) {
          case 'lab in charge':
            updateData.manager_id = userId;
            updateData.manager_name = data.user.user_metadata?.name || ''; 
            break;
          case 'lab technician':
            updateData.technician_lab_id = userId;
            break;
          case 'maintance staff':
            updateData.maintenance_staff_id = userId;
            break;
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('laboratory')
            .update(updateData)
            .eq('lab_id', metadata.labId);
  
          if (updateError) {
            console.error('Error updating laboratory staff:', updateError);
            return { error: 'Failed to update laboratory staff assignment.' };
          }
        }
      }
  
      return { success: true, message: `User role updated to ${newRole}` };
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      return { error: 'Failed to update user role.' };
    }
  }
  
  export async function createUser({ email, password, role, name, metadata }: CreateUserParams) {
    console.log('Creating user:', { email, role, name, metadata });
  
    const validRoles: UserRole[] = ['admin', 'cordinator', 'lab in charge', 'maintance staff', 'lab technician'];
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
      
      // Handle lab assignments for different roles
      if (metadata?.labId && newUser?.user) {
        try {
          const updateData: any = {};
          
          switch (role) {
            case 'lab in charge':
              updateData.manager_id = newUser.user.id;
              break;
            case 'lab technician':
              updateData.technician_lab_id = newUser.user.id;
              break;
            case 'maintance staff':
              updateData.maintenance_staff_id = newUser.user.id;
              break;
          }
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('laboratory')
              .update(updateData)
              .eq('lab_id', metadata.labId);
          }
        } catch (error) {
          console.error('Error updating laboratory staff:', error);
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
  
  export async function getUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (error) throw error;
    return users;
  }
  
  export async function listUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
    if (error) {
      throw error;
    }

    return users;
  }

  export async function getStaff(labId: number): Promise<Staff[]> {
    // First, get the laboratory with all staff IDs
    const { data: lab, error: labError } = await supabase
      .from('laboratory')
      .select(`
        manager_id,
        manager_name,
        technician_lab_id,
        maintenance_staff_id
      `)
      .eq('lab_id', labId)
      .single();

    if (labError) throw labError;

    // Collect all staff IDs (filtering out null values)
    const staffIds = [
      lab.manager_id,
      lab.technician_lab_id,
      lab.maintenance_staff_id
    ].filter(id => id !== null);

    if (staffIds.length === 0) return [];

    // Get user details for all staff members
    const { data: users, error: usersError } = await supabase.auth.admin
      .listUsers();

    if (usersError) throw usersError;

    // Create staff array with role mapping
    const staffMembers: Staff[] = [];

    // Add manager if exists
    if (lab.manager_id) {
      const managerUser = users.users.find(user => user.id === lab.manager_id);
      if (managerUser) {
        staffMembers.push({
          id: managerUser.id,
          name: lab.manager_name || managerUser.user_metadata?.name || 'Unknown',
          email: managerUser.email || '',
          role: 'lab in charge'
        });
      }
    }

    // Add technician if exists
    if (lab.technician_lab_id) {
      const techUser = users.users.find(user => user.id === lab.technician_lab_id);
      if (techUser) {
        staffMembers.push({
          id: techUser.id,
          name: techUser.user_metadata?.name || 'Unknown',
          email: techUser.email || '',
          role: 'lab technician'
        });
      }
    }

    // Add maintenance staff if exists
    if (lab.maintenance_staff_id) {
      const maintUser = users.users.find(user => user.id === lab.maintenance_staff_id);
      if (maintUser) {
        staffMembers.push({
          id: maintUser.id,
          name: maintUser.user_metadata?.name || 'Unknown',
          email: maintUser.email || '',
          role: 'maintance staff'
        });
      }
    }

    return staffMembers;
  }