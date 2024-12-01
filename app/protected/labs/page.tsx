"use client"

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, Users, Microscope, ClipboardList } from 'lucide-react';

// Define all necessary types
type UserRole = 'admin' | 'lab_manager' | 'lab_technician' | 'maintenance_staff';

type Laboratory = {
  lab_id: number;
  name: string;
  location_city: string;
  location_state: string;
  manager_name: string;
  contact_number: string;
  email: string;
};

type Equipment = {
  id: number;
  name: string;
  model: string;
  serialNumber: string;
  status: 'Operational' | 'Under Maintenance' | 'Out of Service';
};

type Staff = {
  id: number;
  name: string;
  role: string;
  email: string;
};

type MaintenanceRecord = {
  id: number;
  date: string;
  equipmentId: number;
  equipmentName: string;
  description: string;
  performedBy: string;
};

type EquipmentUsage = {
  equipmentId: number;
  name: string;
  usagePercentage: number;
};

type FullLaboratoryDetails = Laboratory & {
  equipment: Equipment[];
  staff: Staff[];
  maintenanceRecords: MaintenanceRecord[];
  equipmentUsage: EquipmentUsage[];
};

// Mock data
const mockLabData: FullLaboratoryDetails = {
  lab_id: 1,
  name: "Central Research Laboratory",
  location_city: "New York",
  location_state: "NY",
  manager_name: "Dr. Jane Smith",
  contact_number: "+1 (555) 123-4567",
  email: "jane.smith@centrallab.com",
  equipment: [
    { id: 1, name: "Mass Spectrometer", model: "MS2000", serialNumber: "MS2000-001", status: "Operational" },
    { id: 2, name: "DNA Sequencer", model: "DNAS500", serialNumber: "DNAS500-002", status: "Under Maintenance" },
    { id: 3, name: "Electron Microscope", model: "EM1000", serialNumber: "EM1000-003", status: "Operational" },
  ],
  staff: [
    { id: 1, name: "John Doe", role: "Lab Technician", email: "john.doe@centrallab.com" },
    { id: 2, name: "Alice Johnson", role: "Research Scientist", email: "alice.johnson@centrallab.com" },
    { id: 3, name: "Bob Williams", role: "Maintenance Staff", email: "bob.williams@centrallab.com" },
  ],
  maintenanceRecords: [
    { id: 1, date: "2024-08-15", equipmentId: 2, equipmentName: "DNA Sequencer", description: "Annual calibration", performedBy: "Bob Williams" },
    { id: 2, date: "2024-07-22", equipmentId: 1, equipmentName: "Mass Spectrometer", description: "Replace ion source", performedBy: "External Technician" },
    { id: 3, date: "2024-06-10", equipmentId: 3, equipmentName: "Electron Microscope", description: "Software update", performedBy: "Alice Johnson" },
  ],
  equipmentUsage: [
    { equipmentId: 1, name: "Mass Spectrometer", usagePercentage: 75 },
    { equipmentId: 2, name: "DNA Sequencer", usagePercentage: 60 },
    { equipmentId: 3, name: "Electron Microscope", usagePercentage: 85 },
  ],
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const EquipmentStatusChart: React.FC<{ equipment: Equipment[] }> = ({ equipment }) => {
  const statusCount = equipment.reduce((acc, eq) => {
    acc[eq.status] = (acc[eq.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

const EquipmentUsageChart: React.FC<{ equipmentUsage: EquipmentUsage[] }> = ({ equipmentUsage }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={equipmentUsage}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="usagePercentage" fill="#8884d8" name="Usage %" />
    </BarChart>
  </ResponsiveContainer>
);

const DataTable: React.FC<{ data: any[], columns: string[] }> = ({ data, columns }) => (
  <Table>
    <TableHeader>
      <TableRow>
        {columns.map((column, index) => (
          <TableHead key={index}>{column}</TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((item, rowIndex) => (
        <TableRow key={rowIndex}>
          {columns.map((column, colIndex) => (
            <TableCell key={colIndex}>{item[column.toLowerCase()]}</TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default function LaboratoryPage() {
  const params = useParams();
  const labId = params.id;

  // In a real application, you would fetch the lab data here based on the labId
  const labData = mockLabData;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg shadow-lg mb-6">
        <h1 className="text-4xl font-bold mb-2">{labData.name}</h1>
        <p className="text-xl">{labData.location_city}, {labData.location_state}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Building2 size={48} className="text-blue-500 mb-2" />
            <p className="text-xl font-semibold">{labData.equipment.length}</p>
            <p className="text-gray-500">Equipment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Users size={48} className="text-green-500 mb-2" />
            <p className="text-xl font-semibold">{labData.staff.length}</p>
            <p className="text-gray-500">Staff Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Microscope size={48} className="text-yellow-500 mb-2" />
            <p className="text-xl font-semibold">{labData.equipmentUsage.length}</p>
            <p className="text-gray-500">Active Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <ClipboardList size={48} className="text-red-500 mb-2" />
            <p className="text-xl font-semibold">{labData.maintenanceRecords.length}</p>
            <p className="text-gray-500">Recent Maintenances</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentStatusChart equipment={labData.equipment} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Equipment Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <EquipmentUsageChart equipmentUsage={labData.equipmentUsage} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={labData.equipment} 
              columns={['Name', 'Model', 'SerialNumber', 'Status']} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={labData.staff} 
              columns={['Name', 'Role', 'Email']} 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance History</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              data={labData.maintenanceRecords} 
              columns={['Date', 'EquipmentName', 'Description', 'PerformedBy']} 
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome, {labData.manager_name}
        </h1>
        <h2 className="text-xl text-muted-foreground">
          {labData.location_city} coordinator - {labData.name} Labs
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="bg-white/50 dark:bg-gray-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Labs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Active laboratories under management
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/50 dark:bg-gray-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labData.staff.length}</div>
            <p className="text-xs text-muted-foreground">
              Active laboratory staff members
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/50 dark:bg-gray-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Equipment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{labData.equipment.length}</div>
            <p className="text-xs text-muted-foreground">
              Total equipment under supervision
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}