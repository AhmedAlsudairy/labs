import { 
  FrequencyEnum, 
  MaintenanceStateEnum, 
  CalibrationStateEnum, 
  ExternalControlStateEnum, 
  MaintenanceRoleEnum 
} from "@/types";

// Keep existing types for compatibility
export type MaintenanceState = 'done' | 'need maintance' | 'late maintance';
export type CalibrationState = 'calibrated' | 'need calibration' | 'late calibration';
export type ExternalControlState = 'Done' | 'Final Date' | 'E.Q.C  Reception';
export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annually';
export type MaintenanceRole = 'lab in charge' | 'biomedical' | 'company engineer' | 'lab technician';

export type RecordType = 'maintenance' | 'calibration' | 'external_control' | 'downtime';

// Use the enums in new type definitions
export type MaintenanceRecord = {
  id: number;
  date: string;
  frequency: FrequencyEnum;
  responsible: MaintenanceRoleEnum;
  description: string;
  state: MaintenanceStateEnum;
  equipmentId: number;
};

export type CalibrationRecord = {
  id: number;
  date: string;
  frequency: FrequencyEnum;
  responsible: MaintenanceRoleEnum;
  description: string;
  state: CalibrationStateEnum;
  equipmentId: number;
};

export type DowntimeRecord = {
  id: number;
  start_date: string;
  end_date: string | null;
  description: string;
  equipment_id: number;
};

export type ExternalControl = {
  control_id: number;
  equipment_id: number;
  next_date: string;
  frequency: Frequency; // Changed from FrequencyEnum to Frequency
  state: ExternalControlState;
  responsible: MaintenanceRole;
  description: string;
  updated_by: string;
  last_updated: string;
};

export interface ExternalControlHistory {
  history_id: number;
  external_control_id: number;
  performed_date: Date;
  completed_date?: Date;
  state: string;
  description: string;
  work_performed?: string;
  technician_notes?: string;
  parts_used?: string;
  external_control_state: ExternalControlStateEnum;
  created_at: Date;
  updated_at: Date;
}
