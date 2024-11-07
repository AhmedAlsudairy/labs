
'use server';

import { Equipment, EquipmentUsage, MaintenanceRecord, Staff, Laboratory, UserRole, CreateUserParams, CalibrationData, ExternalControl, CreateEquipmentInput, } from '@/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// async function updateUserAdminAndPassword() {
//   const userId = '4db7586b-d73e-4357-aa79-799b6e70f7dd';
  
//   try {
//     // Update role to admin
//     const roleResult = await supabase.auth.admin.updateUserById(
//       userId,
//       { 
//         user_metadata: { 
//           role: 'admin'
//         },
//         role: 'admin'
//       }
//     );

//     if (roleResult.error) {
//       throw roleResult.error;
//     }

//     console.log('User updated successfully:', {
//       role: 'admin',
//       passwordUpdated: true
//     });

//   } catch (error) {
//     console.error('Error updating user:', error);
//   }
// }

// updateUserAdminAndPassword().catch(console.error);




export async function updateUserRole(
  userId: string, 
  newRole: UserRole, 
  metadata: { 
    governorate?: string; 
    labId?: string; 
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.role !== 'admin') {
    return { error: 'Unauthorized. Only admins can update user roles.' };
  }

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

  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      {
        role: newRole, 
        user_metadata: { 
          ...(newRole === 'cordinator' && { governorate: metadata.governorate }),
          ...(newRole === 'lab in charge' && { labId: metadata.labId }),
        } 
      }
    );

    if (error) {
      console.error('Error updating user role:', error);
      return { error: 'Failed to update user role.' };
    }

    return { 
      success: true, 
      message: `User role updated to ${newRole}${
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
      device (
        name,
        model,
        serial_number,
        lab_section,
        description,
        manufacturer,
        manufacture_date,
        receipt_date,
        supplier,
        status
      )
    `)
    .eq('lab_id', labId);

  if (error) {
    console.error('Error fetching equipment usage:', error);
    throw error;
  }

  console.log('Raw equipment data:', data); // Debug log

  return data.map(eq => {
    const deviceData = eq.device?.[0] || {};
    
    return {
      id: eq.equipment_id,
      name: deviceData.name || eq.type,
      model: deviceData.model || '',
      serialNumber: deviceData.serial_number || '',
      status: deviceData.status || 'Operational',
      labSection: deviceData.lab_section || '',
      description: deviceData.description || '',
      manufacturer: deviceData.manufacturer || '',
      manufactureDate: deviceData.manufacture_date || '',
      receiptDate: deviceData.receipt_date || '',
      supplier: deviceData.supplier || '',
      type: eq.type || '',
      usage: 100 // You might want to calculate this based on your actual data
    };
  });
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
// actions/admin.ts
export async function addEquipment(labId: number, equipmentData: CreateEquipmentInput): Promise<Equipment> {
  // Start a Supabase transaction
  const { data: equipmentData_, error: equipmentError } = await supabase
    .from('equipment')
    .insert({ 
      lab_id: labId,
      type: equipmentData.type,
    })
    .select()
    .single();

  if (equipmentError) throw equipmentError;

  // Insert into device table
  const { data: deviceData, error: deviceError } = await supabase
    .from('device')
    .insert({ 
      equipment_id: equipmentData_.equipment_id,
      name: equipmentData.name,
      model: equipmentData.model,
      serial_number: equipmentData.serialNumber,
      description: equipmentData.description,
      lab_section: equipmentData.labSection,

      manufacturer: equipmentData.manufacturer,
      manufacture_date: equipmentData.manufactureDate,
      receipt_date: equipmentData.receiptDate,
      supplier: equipmentData.supplier,
      istherecotntrol: false, // Add default value or make it part of CreateEquipmentInput
    })
    .select()
    .single();

  if (deviceError) {
    // If device insertion fails, we should ideally delete the equipment entry
    await supabase
      .from('equipment')
      .delete()
      .eq('equipment_id', equipmentData_.equipment_id);
    
    throw deviceError;
  }

  // Return combined data
  return {
    id: equipmentData_.equipment_id,
    name: deviceData.name,
    status: equipmentData_.status as 'Operational' | 'Under Maintenance' | 'Out of Service',
    model: deviceData.model,
    serialNumber: deviceData.serial_number,
    description: deviceData.description,
    labSection: deviceData.lab_section,
    manufacturer: deviceData.manufacturer,
    manufactureDate: deviceData.manufacture_date,
    receiptDate: deviceData.receipt_date,
    supplier: deviceData.supplier,
    type: equipmentData_.type,
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
  try {
    // Start a transaction
    const { error: transactionError } = await supabase.rpc('begin');
    if (transactionError) throw transactionError;

    try {
      // Delete from calibration_schedule
      const { error: calibrationError } = await supabase
        .from('calibration_schedule')
        .delete()
        .eq('equipment_id', equipmentId);
      if (calibrationError) throw calibrationError;

      // Delete from maintenance_schedule
      const { error: maintenanceError } = await supabase
        .from('maintenance_schedule')
        .delete()
        .eq('equipment_id', equipmentId);
      if (maintenanceError) throw maintenanceError;

      // Delete from external_control
      const { error: controlError } = await supabase
        .from('external_control')
        .delete()
        .eq('device_id', equipmentId);
      if (controlError) throw controlError;

      // Delete from device
      const { error: deviceError } = await supabase
        .from('device')
        .delete()
        .eq('equipment_id', equipmentId);
      if (deviceError) throw deviceError;

      // Finally, delete the equipment
      const { error: equipmentError } = await supabase
        .from('equipment')
        .delete()
        .eq('equipment_id', equipmentId);
      if (equipmentError) throw equipmentError;

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit');
      if (commitError) throw commitError;

      return { success: true };
    } catch (error) {
      // Rollback on any error
      const { error: rollbackError } = await supabase.rpc('rollback');
      if (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error deleting equipment:', error);
    throw new Error(`Failed to delete equipment: ${(error as Error).message}`);
  }
}