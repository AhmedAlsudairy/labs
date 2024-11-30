'use server';

import { Equipment, EquipmentUsage, MaintenanceRecord, Staff, Laboratory, UserRole, CreateUserParams, CalibrationData, ExternalControl, CreateEquipmentInput, CreateLaboratoryParams, EquipmentHistory, OmanGovernorate, user_category, DowntimeRecord } from '@/types';
import { sendEmail } from '@/utils/resend/email';
import { calculateNextDate } from '@/utils/utils';
import { createClient } from '@supabase/supabase-js';
import { Result } from 'postcss';
import { updateCalibrationSchedules, updateMaintenanceSchedules } from './scheduleUpdates';
import { CloudCog } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
//labs end here

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
      ),
      calibration_schedule (
        state,
        next_date
      ),
      maintenance_schedule (
        state,
        next_date
      )
    `)
    .eq('lab_id', labId);

  if (error) {
    console.error('Error fetching equipment usage:', error);
    throw error;
  }

  return data.map(eq => {
    const deviceData = eq.device?.[0] || {};
    const calibrationData = eq.calibration_schedule?.[0] || {};
    const maintenanceData = eq.maintenance_schedule?.[0] || {};
    
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
      usage: 100,
      calibrationState: calibrationData.state,
      maintenanceState: maintenanceData.state,
      nextCalibrationDate: calibrationData.next_date,
      nextMaintenanceDate: maintenanceData.next_date
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
//TODO: this will help you
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
      status: equipmentData.status,
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
    status: deviceData.status as 'Operational' | 'Under Maintenance' | 'Out of Service',
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

export async function updateMaintenanceRecord(
  recordId: number, 
  recordData: Partial<MaintenanceRecord>
): Promise<MaintenanceRecord> {
  // If date and frequency provided, calculate next date
  let nextDate = recordData.date;
  if (recordData.date && recordData.frequency) {
    nextDate = calculateNextDate( recordData.frequency,recordData.date ?? new Date());
  }

  const { data, error } = await supabase
    .from('maintenance_schedule')
    .update({
      next_date: nextDate,
      equipment_id: recordData.equipmentId,
      frequency: recordData.frequency,
      description: recordData.description,
      state: recordData.state,
      responsible: recordData.responsible,
    })
    .eq('schedule_id', recordId)
    .select()
    .single();

  if (error) throw error;
  console.log(data)
  console.log(error)
  return {
    id: data.schedule_id,
    date: data.next_date,
    equipmentId: data.equipment_id,
    state: data.state,
 responsible: data.responsible,
    description: data.description || 'Scheduled maintenance',
    frequency: data.frequency
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

export async function addMaintenanceRecord(
  recordData: Omit<MaintenanceRecord, 'id'>
): Promise<MaintenanceRecord> {
  const nextDate = calculateNextDate( recordData.frequency,recordData.date ?? new Date());
  
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .insert({
      equipment_id: recordData.equipmentId,
      next_date: nextDate,
      frequency: recordData.frequency,
      description: recordData.description,
      responsible: recordData.responsible,

    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.schedule_id,
    date: data.next_date,
    equipmentId: data.equipment_id,
    description: data.description,
    responsible: data.responsible,
    state: data.state,

    frequency: data.frequency
  };
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
    state: record.state,
    responsible: record.responsible,
    description: record.description || 'Scheduled maintenance', // Fallback if description is null
    frequency: record.frequency
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

export async function addCalibrationRecord(
  recordData: Omit<MaintenanceRecord, 'id'>
): Promise<MaintenanceRecord> {
  const nextDate = calculateNextDate( recordData.frequency,recordData.date ?? new Date());
  
  const { data, error } = await supabase
    .from('calibration_schedule')
    .insert({
      equipment_id: recordData.equipmentId,
      next_date: nextDate,
      frequency: recordData.frequency,
      description: recordData.description,
      state: recordData.state,
      responsible: recordData.responsible,

    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.schedule_id,
    date: data.next_date,
    equipmentId: data.equipment_id,
    description: data.description,
    state: data.state,
responsible: data.responsible,
    frequency: data.frequency
  };
}

export async function getCalibrationRecords(equipmentId: number): Promise<MaintenanceRecord[]> {
  const { data, error } = await supabase
    .from('calibration_schedule')
    .select('*')
    .eq('equipment_id', equipmentId);

  if (error) throw error;
  console.log(data)
  return data.map(record => ({
    id: record.calibration_schedule_id,
    date: record.next_date,
    equipmentId: record.equipment_id,
    state: record.state,
responsible: record.responsible,
    description: record.description || 'Scheduled maintenance', // Fallback if description is null
    frequency: record.frequency
  }));
}

// Update calibration record
export async function updateCalibrationRecord(
  recordId: number, 
  recordData: Partial<MaintenanceRecord>
): Promise<MaintenanceRecord> {
  // If date and frequency provided, calculate next date
  let nextDate = recordData.date;
  if (recordData.date && recordData.frequency) {
    nextDate = calculateNextDate(recordData.frequency, recordData.date ?? new Date());
  }

  const { data, error } = await supabase
    .from('calibration_schedule')
    .update({
      next_date: nextDate,
      equipment_id: recordData.equipmentId,
      frequency: recordData.frequency,
      description: recordData.description,
      state: recordData.state,
      responsible: recordData.responsible,
    })
    .eq('schedule_id', recordId)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.calibration_schedule_id,
    date: data.next_date,
    equipmentId: data.equipment_id,
    state: data.state,
    responsible: data.responsible,
    description: data.description || 'Scheduled calibration',
    frequency: data.frequency
  };
}
// Delete calibration record

export async function deleteCalibrationRecord(recordId: number): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('calibration_schedule')
    .delete()
    .eq('calibration_schedule_id', recordId);
console.log(error)
  if (error) throw error;
  return { success: true };
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
console.log(data)
    // Combine equipment and device data
    const equipment: Equipment = {
      id: data.equipment_id,
      name: getStringOrUndefined(deviceData.name || data.type) || 'Unknown Equipment',
      status: (['Operational', 'Under Maintenance', 'Out of Service'].includes(deviceData.status) ? deviceData.status : 'Unknown Status') as 'Operational' | 'Under Maintenance' | 'Out of Service',
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

// TODO::this need fixing
export async function updateEquipment(equipmentId: number, equipmentData: Partial<Equipment>): Promise<Equipment> {
  console.log('Updating equipment:', { equipmentId, equipmentData });
  
  try {
    // Update equipment table only if type is provided
    let equipmentData_; 
    if (equipmentData.type) {
      const { data, error: equipmentError } = await supabase
        .from('equipment')
        .update({ type: equipmentData.type })
        .eq('equipment_id', equipmentId)
        .select()
        .single();
        
      if (equipmentError) throw equipmentError;
      equipmentData_ = data;
    } else {
      const { data, error } = await supabase
        .from('equipment')
        .select()
        .eq('equipment_id', equipmentId)
        .single();
      if (error) throw error;
      equipmentData_ = data;
    }

    // Build device update object with only defined fields
    const deviceUpdate: any = {};
    if (equipmentData.name) deviceUpdate.name = equipmentData.name;
    if (equipmentData.model) deviceUpdate.model = equipmentData.model;
    if (equipmentData.serialNumber) deviceUpdate.serial_number = equipmentData.serialNumber;
    if (equipmentData.description) deviceUpdate.description = equipmentData.description;
    if (equipmentData.labSection) deviceUpdate.lab_section = equipmentData.labSection;
    if (equipmentData.manufacturer) deviceUpdate.manufacturer = equipmentData.manufacturer;
    if (equipmentData.manufactureDate) deviceUpdate.manufacture_date = equipmentData.manufactureDate;
    if (equipmentData.receiptDate) deviceUpdate.receipt_date = equipmentData.receiptDate;
    if (equipmentData.supplier) deviceUpdate.supplier = equipmentData.supplier;
    if (equipmentData.status) deviceUpdate.status = equipmentData.status;

    // Only update device if there are fields to update
    if (Object.keys(deviceUpdate).length > 0) {
      const { data: deviceData, error: deviceError } = await supabase
        .from('device')
        .update(deviceUpdate)
        .eq('equipment_id', equipmentId)
        .select()
        .single();

      if (deviceError) throw deviceError;

      // Return combined data
      return {
        id: equipmentData_.equipment_id,
        name: deviceData.name,
        status: deviceData.status as 'Operational' | 'Under Maintenance' | 'Out of Service',
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

    // If no device updates, fetch current device data
    const { data: currentDevice, error: fetchError } = await supabase
      .from('device')
      .select()
      .eq('equipment_id', equipmentId)
      .single();
    
    if (fetchError) throw fetchError;

    return {
      id: equipmentData_.equipment_id,
      name: currentDevice.name,
      status: currentDevice.status as 'Operational' | 'Under Maintenance' | 'Out of Service',
      model: currentDevice.model,
      serialNumber: currentDevice.serial_number,
      description: currentDevice.description,
      labSection: currentDevice.lab_section,
      manufacturer: currentDevice.manufacturer,
      manufactureDate: currentDevice.manufacture_date,
      receiptDate: currentDevice.receipt_date,
      supplier: currentDevice.supplier,
      type: equipmentData_.type,
    };

  } catch (err) {
    console.error('Error updating equipment:', err);
    throw err;
  }
}

export async function deleteEquipment(equipmentId: number): Promise<{ success: boolean }> {
  try {
    
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

// Helper function to filter out undefined emails
function filterValidEmails(emails: (string | undefined)[]): string[] {
  return emails.filter((email): email is string => !!email);
}

// Modified addMaintenanceHistory function
export async function addMaintenanceHistory(
  data: Omit<EquipmentHistory, 'history_id' | 'calibration_schedule_id'>, 
  lab_id: number,
  equipment_id: number
) {
  // Insert history record
  const { data: result, error } = await supabase
    .from('equipment_history')
    .insert([{ ...data }])
    .select()
    .single();

  if (error) return { error };
  // Update schedule
  const { error: updateError } = await supabase
    .from('maintenance_schedule')
    .update({ 
      state: data.state,
      next_date: data.next_maintenance_date, 
      updated_by: 'manual'

    })
    .eq('schedule_id', data.schedule_id);

  if (updateError) return { error: updateError };
console.log("herrrrrree",updateError)

  const { data: cordinator } = await supabase
    .rpc('get_lab_matched_users', {
      p_lab_id: lab_id
    });
    const lab = await getLaboratoryById(lab_id);
    if (!isValidManagerId(lab?.manager_id)) {
      console.warn('Invalid or missing manager_id');
      return { error: new Error('Invalid manager_id') };
    }

    const { data: userData, error: userError } = await supabase.auth
    .admin.getUserById(lab.manager_id);

  const cordinator_email = cordinator?.[0]?.email;
  const manager_email = userData?.user?.email;

  const validEmails = filterValidEmails([
    manager_email,
    'micronboy632@gmail.com',
    cordinator_email
  ]);

  if (validEmails.length === 0) {
    console.warn('No valid email addresses found for notification');
    return { data: result };
  }

  const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;

  const emailContent = {
    to: validEmails,
    title: `Equipment Maintenance Status Update: ${data.state}`,
    body: `
      Equipment maintenance status has been updated to: ${data.state}<br/>
      Description: ${data.description}<br/>
      Next maintenance date: ${data.next_maintenance_date}<br/>
      <br/>
      View equipment details: <a href="${equipmentUrl}">Click here</a>
    `
  };

  await updateMaintenanceSchedules();
  await sendEmail(emailContent);

  return { data: result };
}
function isValidManagerId(id: string | undefined): id is string {
  return id !== undefined && id !== '';
}

// Similar changes for addCalibrationHistory function
export async function addCalibrationHistory(
  data: Omit<EquipmentHistory, 'history_id' | 'schedule_id'>,  
  lab_id: number,
  equipment_id: number
) {

  // Insert history record
  const { data: result, error } = await supabase
    .from('equipment_history')
    .insert([{ 
      ...data,
      
    }])
    .select()
    .single();

  if (error) return { error };
  // Update schedule
  const { error: updateError } = await supabase
    .from('calibration_schedule')
    .update({ 
      state: data.state,
      next_date: data.next_calibration_date ,
      updated_by: 'manual'

    })
    .eq('calibration_schedule_id', data.calibration_schedule_id);
console.log('Adding calibration history:iodfshh',updateError)

  if (updateError) return { error: updateError };

  const { data: cordinator } = await supabase
    .rpc('get_lab_matched_users', {
      p_lab_id: lab_id
    });

  
  const lab = await getLaboratoryById(lab_id);
if (!isValidManagerId(lab?.manager_id)) {
  console.warn('Invalid or missing manager_id');
  return { error: new Error('Invalid manager_id') };
}
  const { data: userData, error: userError } = await supabase.auth
    .admin.getUserById(lab.manager_id);
  const cordinator_email = cordinator?.[0]?.email;
  const manager_email = userData?.user?.email;

  const validEmails = filterValidEmails([
    manager_email,
    'micronboy632@gmail.com',
    cordinator_email
  ]);

  if (validEmails.length === 0) {
    console.warn('No valid email addresses found for notification');
    return { data: result };
  }

  const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;

  const emailContent = {
    to: validEmails,
    title: `Equipment Calibration Status Update: ${data.state}`,
    body: `
      Equipment calibration status has been updated to: ${data.state}<br/>
      Description: ${data.description}<br/>
      Next calibration date: ${data.next_maintenance_date}<br/>
      <br/>
      View equipment details: <a href="${equipmentUrl}">Click here</a>
    `
  };

  await updateCalibrationSchedules();
  await sendEmail(emailContent);

  return { data: result };
}
// Get history by maintenance schedule
export async function getHistoryByScheduleId(scheduleId: number) {
  const { data, error } = await supabase
    .from('equipment_history')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('performed_date', { ascending: false });

  if (error) return { error };
  return { data };
}

// export async function addCalibrationHistory(
//   data: Omit<EquipmentHistory, 'history_id' | 'schedule_id'>,  
//   lab_id: number,
//   equipment_id: number
// ) {
//   console.log('=== Starting addCalibrationHistory ===');
//   console.log('Input data:', { data, lab_id, equipment_id });

//   // Insert history record
//   const { data: result, error } = await supabase
//     .from('equipment_history')
//     .insert([{ 
//       ...data,
//     }])
//     .select()
//     .single();
  
//   console.log('Insert history result:', { result, error });

//   if (error) {
//     console.error('Failed to insert equipment history:', error);
//     return { error };
//   }

//   // Update schedule
//   const updateData = { 
//     state: data.state,
//     next_date: data.next_calibration_date 
//   };
//   console.log('Updating calibration schedule with:', updateData);
  
//   const { error: updateError } = await supabase
//     .from('calibration_schedule')
//     .update(updateData)
//     .eq('calibration_schedule_id', data.calibration_schedule_id);

//   if (updateError) {
//     console.error('Failed to update calibration schedule:', updateError);
//     return { error: updateError };
//   }

//   const equipmentUrl = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/protected/labs/${lab_id}/${equipment_id}`;
  
//   const emailContent = {
//     to: ['micronboy632@gmail.com'],
//     title: `Equipment Calibration Status Update: ${data.state}`,
//     body: `
//       Equipment calibration status has been updated to: ${data.state}<br/>
//       Description: ${data.description}<br/>
//       Next calibration date: ${data.next_maintenance_date}<br/>
//       <br/>
//       View equipment details: <a href="${equipmentUrl}">Click here</a>
//     `
//   };

//   try {
//     await sendEmail(emailContent);
//     console.log('Email notification sent successfully');
//   } catch (emailError) {
//     console.error('Failed to send email notification:', emailError);
//   }

//   console.log('=== Completed addCalibrationHistory successfully ===');
//   return { data: result };
// }

// Get history by calibration schedule
export async function getHistoryByCalibrationScheduleId(calibrationScheduleId: number) {
  const { data, error } = await supabase
    .from('equipment_history')
    .select('*')
    .eq('calibration_schedule_id', calibrationScheduleId)
    .order('performed_date', { ascending: false });

  if (error) return { error };
  return { data };
}

// Update history record
export async function updateHistory(
  historyId: number, 
  updates: Partial<Omit<EquipmentHistory, 'history_id'>>
) {
  const { data, error } = await supabase
    .from('equipment_history')
    .update(updates)
    .eq('history_id', historyId)
    .select()
    .single();

  if (error) return { error };
  return { data };
}

// Delete history record
export async function deleteHistory(historyId: number) {
  const { error } = await supabase
    .from('equipment_history')
    .delete()
    .eq('history_id', historyId);

  if (error) return { error };
  return { success: true };
}

// Get single history record
export async function getHistoryById(historyId: number) {
  const { data, error } = await supabase
    .from('equipment_history')
    .select('*')
    .eq('history_id', historyId)
    .single();

  if (error) return { error };
  return { data };
}


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