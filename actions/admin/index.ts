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
  role: string;
  name: string;
};

export async function createUser({ email, password, role, name }: CreateUserParams) {
  // First, check if the current user is an admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser?.role !== 'admin') {
    return { error: 'Unauthorized. Only admins can create new users.' };
  }

  // Validate the role
  const validRoles = ['admin', 'lab_manager', 'lab_technician', 'maintenance_staff'];
  if (!validRoles.includes(role)) {
    return { error: 'Invalid role specified.' };
  }

  try {
    // Create the new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      role,
      email_confirm: true, // This automatically confirms the email
      user_metadata: { name, role }
    });

    if (createError) {


      console.log(createError)
    };

    if (!newUser?.user) {
      throw new Error('User creation failed');
    }

    // Set the user's role using the auth.users table
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      newUser.user.id,
      { role: role }
    );

    if (updateError) throw updateError;

    return { success: true, message: `User created successfully with role: ${role}` };
  } catch (error) {
    console.error('Error creating user:', error);
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