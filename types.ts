export type UserRole = 'admin' | 'lab_manager' | 'lab_technician' | 'maintenance_staff';

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
export type Equipment = {
  id: number;
  name: string;
  status: 'Operational' | 'Under Maintenance' | 'Out of Service';
};

// Staff
export type Staff = {
  id: number;
  name: string;
  role: string;
};

// Maintenance Record
export type MaintenanceRecord = {
  id: number;
  date: string;
  equipment: string;
  description: string;
};

// Equipment Usage
export type EquipmentUsage = {
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