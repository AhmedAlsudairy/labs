import { UUID } from "crypto";

export type UserRole = 'admin' | 'cordinator' | 'lab in charge' | 'maintance staff'| 'lab technician';
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  metadata?: {
    governorate?: string;
    labId?: string;
    user_category?: user_category;
  };
};
// Laboratory
export interface Laboratory {
  lab_id: number;
  name: string;
  location_city: string;
  location_state: string;
  manager_name: string;
  manager_id?: string;
  contact_number: string;
  email: string;
  lab_category: "food" | "animal" | "human";
  technician_lab_id?: string;
  maintenance_staff_id?: string;
  user?: User; // Optional user field
}

// Equipment
// Update this in your types file (e.g., @/types.ts)
// types.ts
export type Equipment = {
  id: number;
  name: string;
  status: 'Operational' | 'Under Maintenance' | 'Out of Service';
  model: string;
  serialNumber: string;
  description: string;
  labSection: string;
  manufacturer: string;
  manufactureDate: string;
  receiptDate: string;
  supplier: string;
  type: string;
  istherecotntrol?:boolean;
  calibrationState?: 'calibrated' | 'need calibration' | 'late calibration' |'none';
  maintenanceState?: 'done' | 'need maintance' | 'late maintance';
};

export interface DowntimeRecord {
  record_id?: number;
  equipment_id: number;
  start_date: string;
  end_date: string;
  type: string;
  reason: string;
  affected_tests: string;
}


// Add a new type for creating equipment
export type CreateEquipmentInput = Omit<Equipment, 'id'>;
// CreateLaboratoryParams

export enum OmanGovernorate {
  MUSCAT = "Muscat",
  DHOFAR = "Dhofar",
  MUSANDAM = "Musandam",
  AL_BURAIMI = "Al Buraimi",
  AD_DAKHILIYAH = "Ad Dakhiliyah",
  AL_BATINAH_NORTH = "Al Batinah North",
  AL_BATINAH_SOUTH = "Al Batinah South",
  AL_SHARQIYAH_NORTH = "Al Sharqiyah North",
  AL_SHARQIYAH_SOUTH = "Al Sharqiyah South",
  AD_DHAHIRAH = "Ad Dhahirah",
  AL_WUSTA = "Al Wusta"
}

// Update CreateLaboratoryParams to use the enum
export type CreateLaboratoryParams = {
  name: string;
  location_state: OmanGovernorate;
  location_city: string;
  manager_name: string;
  contact_number: string;
  email: string;
  lab_category: "food" | "animal" | "human";
  technician_lab_id?: string;
  maintenance_staff_id?: string;
  manager_id?: string;
};

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
};

// Maintenance Record


// Equipment Usage
export type EquipmentUsage = {
  id: number;
  model: string;
  serialNumber: string;
  status: 'Operational' | 'Out of Service';
  labSection: string;
  description: string;
  manufacturer: string;
  manufactureDate: string;
  receiptDate: string;
  supplier: string;
  type: string;
  name: string;
  usage: number;
  calibrationState?: 'calibrated' | 'need calibration' | 'late calibration';
  maintenanceState?: 'done' | 'need maintance' | 'late maintance';
};

// CreateUserParams
export type CreateUserParams = {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  metadata?: {
    governorate?: string;
    labId?: string;
    user_category?: user_category;
  };
};



export type ExternalControl = {
  id?: number;          // Optional because some records might not have it
  control_id?: number;  // This is the actual ID used in the database
  date?: string;        // Making these optional based on your log data
  result?: number;
  equipmentId?: number;
  description?: string;
  state?: maintanace_state;
  responsible?: maintanace_role;
  frequency?: Frequency; // Changed from FrequencyEnum to Frequency
  equipment_id?: number; // Some records seem to have this instead of equipmentId
  next_date?: string;   // Some records have this based on your logs
  last_updated?: string; // Some records have this based on your logs
  updated_by?: string;  // Some records have this based on your logs
};

// Rename this type to avoid conflict
export type CalibrationSchedule = {
  id: number;
  date?: string;
  equipmentId: number;
  description: string;
  frequency: Frequency;
  state?:maintanace_state
  responsible?: maintanace_role;
};

// types.ts
export enum FrequencyEnum {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  BIMONTHLY = 'bimonthly',
  QUARTERLY = 'quarterly',
  BIANNUAL = 'biannual',
  ANNUALLY = 'annually'
}

export enum MaintenanceStateEnum {
  DONE = 'done',
  NEED_MAINTENANCE = 'need maintance',
  LATE_MAINTENANCE = 'late maintance'
}

export enum CalibrationStateEnum {
  CALIBRATED = 'calibrated',
  NEED_CALIBRATION = 'need calibration',
  LATE_CALIBRATION = 'late calibration'
}

export enum ExternalControlStateEnum {
  DONE = 'Done',
  FINAL_DATE = 'Final Date',
  EQC_RECEPTION = 'E.Q.C Reception'
}

export enum MaintenanceRoleEnum {
  LAB_IN_CHARGE = 'lab in charge',
  BIOMEDICAL = 'biomedical',
  COMPANY_ENGINEER = 'company engineer',
  LAB_TECHNICIAN = 'lab technician'
}

// Keep the old types for backward compatibility
export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annually';
export type maintanace_state = 'done' | 'need maintance' | 'late maintance' | 'calibrated' | 'need calibration' | 'late calibration' | 'Done' | 'Final Date' | 'E.Q.C Reception';
export type maintanace_role = 'lab in charge' | 'biomedical' | 'company engineer' | 'lab technician';

export type user_category= "food" | "animal" | "human"


export type MaintenanceRecord = {
  id: number;
  date?: string;
  equipmentId: number;
  description: string;
  state?:maintanace_state
  responsible?: maintanace_role;
  frequency: Frequency;
};




// Base interface for common fields
interface BaseEquipmentHistory {
  history_id?: number;
  performed_date: Date;
  completed_date: Date;
  state?: maintanace_state;
  description: string;
  technician_notes: string;
  frequency?: Frequency; // Add frequency to base type
}

// Maintenance specific interface
export interface MaintenanceEquipmentHistory extends BaseEquipmentHistory {
  schedule_id: number;
  work_performed: string;
  parts_used: string;
  next_maintenance_date: Date;
  frequency: Frequency; // Make it required for maintenance
  calibration_schedule_id?: never;
  calibration_results?: never;
  next_calibration_date?: never;
  external_control_id?: never;
}

// Calibration specific interface
export interface CalibrationEquipmentHistory extends BaseEquipmentHistory {
  calibration_schedule_id: number;
  calibration_results: string;
  next_calibration_date: Date;
  frequency: Frequency; // Make it required for calibration
  schedule_id?: never;
  work_performed?: never;
  parts_used?: never;
  next_maintenance_date?: never;
  external_control_id?: never;
}

// External control specific interface
export interface ExternalControlHistory extends BaseEquipmentHistory {
  control_id?: number | null; // Allow null or undefined for temporary records
  work_performed: string;
  parts_used: string;
  next_date: Date;
  frequency: Frequency; // Make it required for external control
  external_control_state: maintanace_state;
  schedule_id?: never;
  calibration_schedule_id?: never;
  next_maintenance_date?: never;
  next_calibration_date?: never;
  calibration_results?: never;
}

// Types for form data submission
export type MaintenanceData = Omit<MaintenanceEquipmentHistory, 'history_id'>;
export type CalibrationData = Omit<CalibrationEquipmentHistory, 'history_id'>;
export type ExternalControlData = Omit<ExternalControlHistory, 'history_id'>; // Uses control_id instead of external_control_id

// Union type for all types of histories
export type EquipmentHistory = MaintenanceEquipmentHistory | CalibrationEquipmentHistory | ExternalControlHistory;

// History Input Types
export type MaintenanceHistoryInput = Omit<MaintenanceEquipmentHistory, 'history_id'>;
export type CalibrationHistoryInput = Omit<CalibrationEquipmentHistory, 'history_id'>;
// External control history input type - must include control_id field
export type ExternalControlHistoryInput = Omit<ExternalControlHistory, 'history_id'>;