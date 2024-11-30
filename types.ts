import { UUID } from "crypto";

export type UserRole = 'admin' | 'cordinator' | 'lab in charge' | 'maintance staff';
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  metadata?: {
    governorate?: string;
    labId?: string;
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
  lab_category: "food" | "animal" | "human"
};

export type Staff = {
  id: number;
  name: string;
  role: string;
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
  };
};



export type ExternalControl = {
  id: number;
  date: string;
  result: number;
  equipmentId: number;
};

export type CalibrationData = {
  id: number;
  date?: string;
  equipmentId: number;
  description: string;
  frequency: Frequency;
  state?:maintanace_state
  responsible?: maintanace_role;
};

// types.ts
export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annually';
export type maintanace_state= 'done' | 'need maintance' | 'late maintance'|'calibrated'|'need calibration'|'late calibration';

export type user_category= "food" | "animal" | "human"


export type maintanace_role= 'lab in charge' | 'biomedical' | 'company engineer' | 'lab technician';

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
}

// Maintenance specific interface
export interface MaintenanceEquipmentHistory extends BaseEquipmentHistory {
  schedule_id: number;
  work_performed: string;
  parts_used: string;
  next_maintenance_date: Date;
  calibration_schedule_id?: never;
  calibration_results?: never;
  next_calibration_date?: never;
}

// Calibration specific interface
export interface CalibrationEquipmentHistory extends BaseEquipmentHistory {
  calibration_schedule_id: number;
  calibration_results: string;
  next_calibration_date: Date;
  schedule_id?: never;
  work_performed?: never;
  parts_used?: never;
  next_maintenance_date?: never;
}

// Union type for both types of histories
export type EquipmentHistory = MaintenanceEquipmentHistory | CalibrationEquipmentHistory;