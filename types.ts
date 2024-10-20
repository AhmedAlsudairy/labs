export type UserRole = 'admin' | 'cordinator' | 'lab in charge' | 'maintance staff';
export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
// Laboratory
export type Laboratory = {
  lab_id: number;
  name: string;
  location_city: string;
  location_state: string;
  manager_name: string;
  contact_number: string;
  email: string;
};

// Equipment
// Update this in your types file (e.g., @/types.ts)
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

  name: string;
  usage: number;
};

// CreateUserParams
export type CreateUserParams = {
  email: string;
  password: string;
  role: UserRole;
  name: string;
};

// CreateLaboratoryParams
export type CreateLaboratoryParams = {
  name: string;
  location_state: string;
  location_city: string;
  manager_name: string;
  contact_number: string;
  email: string;
};



export type ExternalControl = {
  id: number;
  date: string;
  result: number;
  equipmentId: number;
};

export type CalibrationData = {
  id: number;
  date: string;
  value: number;
  equipmentId: number;
};

// types.ts
export type MaintenanceRecord = {
  id: number;
  date: string;
  equipmentId: number;
  description: string;
};