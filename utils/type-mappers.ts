import { 
  MaintenanceRecord, 
  CalibrationData, 
  MaintenanceData, 
  ExternalControlData,
  maintanace_state
} from "@/types";

// Helper function to convert any state to maintanace_state
function normalizeState(state: string | undefined): maintanace_state {
  if (!state) return 'done';
  
  // Handle case differences
  if (state.toLowerCase() === 'done' || state === 'Done') return 'done';
  return state as maintanace_state;
}

/**
 * Maps CalibrationData to MaintenanceRecord format for the UI
 */
export function mapCalibrationToRecord(data: CalibrationData[]): MaintenanceRecord[] {
  return data.map(item => ({
    id: item.calibration_schedule_id,
    date: item.next_calibration_date.toString(),
    equipmentId: 0, // This will be filled in by the component
    description: item.description,
    state: item.state as maintanace_state,
    responsible: 'lab technician',
    frequency: item.frequency
  }));
}

/**
 * Maps maintenance records from API format to CalibrationData format
 */
export function mapToCalibrationData(records: MaintenanceRecord[]): CalibrationData[] {
  return records.map(record => ({
    calibration_schedule_id: record.id,
    calibration_results: record.description || '',
    next_calibration_date: record.date ? new Date(record.date) : new Date(),
    performed_date: record.date ? new Date(record.date) : new Date(),
    completed_date: record.date ? new Date(record.date) : new Date(),
    description: record.description || '',
    technician_notes: '',
    state: normalizeState(record.state),
    frequency: record.frequency,
  }));
}

/**
 * Maps maintenance records to MaintenanceData format 
 */
export function mapToMaintenanceData(records: MaintenanceRecord[]): MaintenanceData[] {
  return records.map(record => ({
    schedule_id: record.id,
    work_performed: record.description || '',
    parts_used: '',
    next_maintenance_date: record.date ? new Date(record.date) : new Date(),
    performed_date: record.date ? new Date(record.date) : new Date(),
    completed_date: record.date ? new Date(record.date) : new Date(),
    description: record.description || '',
    technician_notes: '',
    state: normalizeState(record.state),
    frequency: record.frequency,
  }));
}

/**
 * Maps maintenance records to ExternalControlData format
 */
export function mapToExternalControlData(records: MaintenanceRecord[]): ExternalControlData[] {
  return records.map(record => ({
    external_control_id: record.id,
    work_performed: record.description || '',
    parts_used: '',
    next_date: record.date ? new Date(record.date) : new Date(),
    performed_date: record.date ? new Date(record.date) : new Date(),
    completed_date: record.date ? new Date(record.date) : new Date(),
    description: record.description || '',
    technician_notes: '',
    state: normalizeState(record.state),
    external_control_state: normalizeState(record.state),
    frequency: record.frequency,
  }));
}
