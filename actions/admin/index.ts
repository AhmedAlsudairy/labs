'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export type UserRole = 'admin' | 'cordinator' | 'lab in charge' | 'maintance staff';

type CreateUserParams = {
  email: string;
  password: string;
  role: UserRole;
  name: string;
};

export async function updateUserRole(userId: string, newRole: UserRole) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.role !== 'admin') {
    return { error: 'Unauthorized. Only admins can update user roles.' };
  }

  const validRoles: UserRole[] = ['admin', 'cordinator', 'lab in charge', 'maintance staff'];
  if (!validRoles.includes(newRole)) {
    return { error: 'Invalid role specified.' };
  }

  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { user_metadata: { role: newRole } }
  );

  if (error) {
    console.error('Error updating user role:', error);
    return { error: 'Failed to update user role.' };
  }

  return { success: true, message: `User role updated to ${newRole}` };
}

export async function createUser({ email, password, role, name }: CreateUserParams) {
  console.log('Creating user:', { email, role, name });

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
      user_metadata: { name, role }
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

export type CreateLaboratoryParams = {
  name: string;
  location_state: string;
  location_city: string;
  manager_name: string;
  contact_number: string;
  email: string;
};

export async function createLaboratory(laboratory: CreateLaboratoryParams) {
  const { data, error } = await supabase.from('laboratory').insert(laboratory);
  if (error) throw error;
  return data;
}

export async function getLaboratories() {
  const { data, error } = await supabase.from('laboratory').select('*');
  if (error) throw error;
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

export async function getLaboratoryById(labId: number) {
  const { data, error } = await supabase.from('laboratory').select('*').eq('lab_id', labId).single();
  if (error) throw error;
  return data;
}

export async function getUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) throw error;
  return users;
}