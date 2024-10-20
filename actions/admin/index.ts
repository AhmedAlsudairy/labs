
'use server';

import { Equipment, EquipmentUsage, MaintenanceRecord, Staff, Laboratory, UserRole, CreateUserParams, CalibrationData, ExternalControl, } from '@/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);


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

export async function getLaboratoryById(labId: number): Promise<Laboratory> {
  const { data, error } = await supabase.from('laboratory').select('*').eq('lab_id', labId).single();
  if (error) throw error;
  return data;
}

export async function getUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) throw error;
  return users;
}

export async function getEquipmentUsage(labId: number): Promise<EquipmentUsage[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      equipment_id,
      type,
      device (name)
    `)
    .eq('lab_id', labId);

  if (error) throw error;

  return data.map(eq => ({
    id: eq.equipment_id,
    name: eq.device[0]?.name || eq.type, // Fix: Access the first element of the device array
    usage: 100, // You might want to calculate this based on your actual data
  }));
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
export async function addEquipment(labId: number, equipmentData: Omit<Equipment, 'id'>): Promise<Equipment> {
  const { data, error } = await supabase
    .from('equipment')
    .insert({ 
      lab_id: labId,
      type: equipmentData.name,
      status: equipmentData.status,
      model: equipmentData.model,
      serial_number: equipmentData.serialNumber,
      description: equipmentData.description,
      lab_section: equipmentData.labSection,
      manufacturer: equipmentData.manufacturer,
      manufacture_date: equipmentData.manufactureDate,
      receipt_date: equipmentData.receiptDate,
      supplier: equipmentData.supplier,
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.equipment_id,
    name: data.type,
    status: data.status as 'Operational' | 'Under Maintenance' | 'Out of Service',
    model: data.model,
    serialNumber: data.serial_number,
    description: data.description,
    labSection: data.lab_section,
    manufacturer: data.manufacturer,
    manufactureDate: data.manufacture_date,
    receiptDate: data.receipt_date,
    supplier: data.supplier,
    type: data.type,
  };
}






export async function updateMaintenanceRecord(recordId: number, recordData: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .update({
      next_date: recordData.date,
      equipment_id: recordData.equipmentId,
    })
    .eq('schedule_id', recordId)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.schedule_id,
    date: data.next_date,
    equipmentId: data.equipment_id,
    description: recordData.description || 'Scheduled maintenance',
  };
}

export async function deleteMaintenanceRecord(recordId: number): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('maintenance_schedule')
    .delete()
    .eq('schedule_id', recordId);

  if (error) throw error;
  return { success: true };
}






export async function getMaintenanceRecords(equipmentId: number): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .select('*')
    .eq('equipment_id', equipmentId);

  if (error) throw error;
  return data.map(record => ({
    id: record.schedule_id,
    date: record.next_date,
    equipmentId: record.equipment_id,
    description: 'Scheduled maintenance',
  }));
}

export async function getExternalControls(equipmentId: number): Promise<ExternalControl[]> {
  const { data, error } = await supabase
    .from('external_control')
    .select('*')
    .eq('device_id', equipmentId);

  if (error) throw error;
  return data.map(control => ({
    id: control.control_id,
    date: control.date,
    result: control.result,
    equipmentId: control.device_id,
  }));
}

export async function getCalibrationData(equipmentId: number): Promise<CalibrationData[]> {
  const { data, error } = await supabase
    .from('calibration_schedule')
    .select('*')
    .eq('equipment_id', equipmentId);

  if (error) throw error;
  return data.map(calibration => ({
    id: calibration.schedule_id,
    date: calibration.next_date,
    value: Math.random() * 100, // Replace this with actual calibration value when available
    equipmentId: calibration.equipment_id,
  }));
}

export async function addMaintenanceRecord(recordData: Omit<MaintenanceRecord, 'id'>): Promise<MaintenanceRecord> {
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .insert({
      equipment_id: recordData.equipmentId,
      next_date: recordData.date,
      frequency: 'One-time', // You might want to add this as a parameter
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.schedule_id,
    date: data.next_date,
    equipmentId: data.equipment_id,
    description: recordData.description,
  };
}


// actions/admin.ts



export async function getEquipmentById(equipmentId: number): Promise<Equipment> {
  console.log(`[getEquipmentById] Fetching equipment with ID: ${equipmentId}`);

  if (typeof equipmentId !== 'number' || isNaN(equipmentId) || equipmentId <= 0) {
    const error = new Error(`Invalid equipment ID: ${equipmentId}`);
    console.error('[getEquipmentById] Error:', error);
    throw error;
  }

  try {
    console.time(`[getEquipmentById] Database query for equipment ${equipmentId}`);
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        device (*)
      `)
      .eq('equipment_id', equipmentId)
      .single();
    console.timeEnd(`[getEquipmentById] Database query for equipment ${equipmentId}`);

    if (error) {
      console.error('[getEquipmentById] Supabase error:', error);
      throw new Error(`Failed to fetch equipment: ${error.message}`);
    }

    if (!data) {
      console.error(`[getEquipmentById] No equipment found with ID: ${equipmentId}`);
      throw new Error(`Equipment not found for ID: ${equipmentId}`);
    }

    console.log('[getEquipmentById] Raw data from database:', JSON.stringify(data, null, 2));

    // Extract device data (assuming there's only one device per equipment)
    const deviceData = Array.isArray(data.device) && data.device.length > 0 ? data.device[0] : {};

    // Helper function to get a string value or undefined
    const getStringOrUndefined = (value: any): string | undefined => 
      typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

    // Helper function to get a date string or undefined
    const getDateOrUndefined = (value: any): string | undefined => 
      value instanceof Date ? value.toISOString() : getStringOrUndefined(value);

    // Combine equipment and device data
    const equipment: Equipment = {
      id: data.equipment_id,
      name: getStringOrUndefined(deviceData.name || data.type) || 'Unknown Equipment',
      status: (['Operational', 'Under Maintenance', 'Out of Service'].includes(data.status) ? data.status : 'Unknown Status') as 'Operational' | 'Under Maintenance' | 'Out of Service',
      model: getStringOrUndefined(deviceData.model) || 'Unknown Model',
      serialNumber: getStringOrUndefined(deviceData.serial_number) || 'Unknown Serial Number',
      description: getStringOrUndefined(data.description || deviceData.description) || 'No description available',
      labSection: getStringOrUndefined(data.lab_section || deviceData.lab_section) || 'Unassigned',
      manufacturer: getStringOrUndefined(deviceData.manufacturer) || 'Unknown Manufacturer',
      manufactureDate: getDateOrUndefined(deviceData.manufacture_date) || 'Unknown Date',
      receiptDate: getDateOrUndefined(deviceData.receipt_date) || 'Unknown Date',
      supplier: getStringOrUndefined(deviceData.supplier) || 'Unknown Supplier',
      type: getStringOrUndefined(data.type) || 'Unknown Type',
    };

    console.log('[getEquipmentById] Processed equipment data:', JSON.stringify(equipment, null, 2));

    return equipment;
  } catch (error) {
    console.error('[getEquipmentById] Unexpected error:', error);
    throw new Error(`Failed to fetch equipment data: ${(error as Error).message}`);
  }
}

export async function updateEquipment(equipmentId: number, equipmentData: Partial<Equipment>): Promise<Equipment> {
  const { data, error } = await supabase
    .from('equipment')
    .update({ 
      type: equipmentData.name,
      status: equipmentData.status,
      model: equipmentData.model,
      serial_number: equipmentData.serialNumber,
      description: equipmentData.description,
      lab_section: equipmentData.labSection,
      manufacturer: equipmentData.manufacturer,
      manufacture_date: equipmentData.manufactureDate,
      receipt_date: equipmentData.receiptDate,
      supplier: equipmentData.supplier,
    })
    .eq('equipment_id', equipmentId)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.equipment_id,
    name: data.type,
    status: data.status as 'Operational' | 'Under Maintenance' | 'Out of Service',
    model: data.model,
    serialNumber: data.serial_number,
    description: data.description,
    labSection: data.lab_section,
    manufacturer: data.manufacturer,
    manufactureDate: data.manufacture_date,
    receiptDate: data.receipt_date,
    supplier: data.supplier,
    type: data.type,
  };
}

export async function deleteEquipment(equipmentId: number): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('equipment_id', equipmentId);

  if (error) throw error;
  return { success: true };
}