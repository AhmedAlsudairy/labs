'use server';

;
import { CreateEquipmentInput, Equipment, EquipmentUsage, OmanGovernorate } from '@/types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function getEquipmentStatusByGovernorate(
    state: OmanGovernorate,
    lab_category: 'food' | 'animal' | 'human'
  ) {
    try {
      const { data: labs } = await supabase
        .from('laboratory')
        .select('lab_id')
        .eq('location_state', state)
        .eq('lab_category', lab_category);
  
      if (!labs?.length) return { operational: 0, outOfService: 0 };
  
      const labIds = labs.map(lab => lab.lab_id);
  
      const { data: devices } = await supabase
        .from('device')
        .select('status, equipment!inner(lab_id)')
        .in('equipment.lab_id', labIds);
  
      if (!devices) return { operational: 0, outOfService: 0 };
  
      const operational = devices.filter(d => d.status === 'Operational').length;
      const outOfService = devices.filter(d => d.status === 'Out of Service').length;
  
      return { operational, outOfService };
    } catch (error) {
      console.error('Error:', error);
      return { operational: 0, outOfService: 0 };
    }
  }
  
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
        istherecotntrol: equipmentData.istherecotntrol, // Add default value or make it part of CreateEquipmentInput
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