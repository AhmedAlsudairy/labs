'use server';

import { createClient } from '@supabase/supabase-js';

// Make sure these environment variables are set in your deployment environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  // auth: {
  //   autoRefreshToken: false,
  //   persistSession: false
  // }
});

export async function updateUserRole(userId: string, newRole: string) {
  // First, check if the current user is an admin
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.role !== 'admin') {
    return { error: 'Unauthorized. Only admins can update user roles.' };
  }

  // Validate the new role
  const validRoles = ['admin', 'authenticated', 'lab_manager', 'lab_technician', 'maintenance_staff'];
  if (!validRoles.includes(newRole)) {
    return { error: 'Invalid role specified.' };
  }

  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { role: newRole }
  );

  if (error) {
    console.error('Error updating user role:', error);
    return { error: 'Failed to update user role.' };
  }

  return { success: true, message: `User role updated to ${newRole}` };
}

type CreateUserParams = {
  email: string;
  password: string;
  role: user_role;
  name: string;
};

type user_role = 'admin' | 'lab_manager' | 'lab_technician' | 'maintenance_staff';

export async function createUser({ email, password, role, name }: CreateUserParams) {
  console.log('Creating user:', { email, role, name });

  const validRoles: user_role[] = ['admin', 'lab_manager', 'lab_technician', 'maintenance_staff'];
  if (!validRoles.includes(role)) {
    console.error('Invalid role specified:', role);
    return { error: 'Invalid role specified.' };
  }

  try {
    // Create the new user without specifying a role
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name } // Don't store role in metadata
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

    // Insert user's role into the user_roles table
  

    console.log('User role assigned successfully');

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

export async function createLaboratory(laboratory: Record<string, any>) {
  const { data, error } = await supabase.from('laboratory').insert(laboratory);
  if (error) throw error;
  return data;
}

export async function getLaboratories() {
  const { data, error } = await supabase.from('laboratory').select('*');
  if (error) throw error;
  return data;
}

export async function updateLaboratory(labId: number, updates: Record<string, any>) {
  const { data, error } = await supabase.from('laboratory').update(updates).eq('lab_id', labId);
  if (error) throw error;
  return data;
}

export async function deleteLaboratory(labId: number) {
  const { data, error } = await supabase.from('laboratory').delete().eq('lab_id', labId);
  if (error) throw error;
  return data;
}

export async function getUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()


  if (error) throw error;
  return users;
}