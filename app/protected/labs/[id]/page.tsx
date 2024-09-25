// File: app/protected/labs/[id]/page.tsx

"use client"

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, Users, Microscope, ClipboardList } from 'lucide-react';
import { getLaboratoryById, getEquipmentUsage, getMaintenanceRecords, getStaff, addEquipment, updateEquipment, deleteEquipment, addMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord } from '@/actions/admin';
import { toast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Equipment, EquipmentUsage, Laboratory, MaintenanceRecord, Staff } from '@/types';
import { EquipmentForm } from '@/components/table/device-form';
import { MaintenanceForm } from '@/components/table/maintain-form';

type FullLaboratoryDetails = Laboratory & {
  equipment: Equipment[];
  staff: Staff[];
  maintenanceRecords: MaintenanceRecord[];
  equipmentUsage: EquipmentUsage[];
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
      <Bar dataKey="usage" fill="#8884d8" name="Usage %" />
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
  const labId = parseInt(params.id as string);
  const [labData, setLabData] = useState<FullLaboratoryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  useEffect(() => {
    fetchLabData();
  }, [labId]);

  const fetchLabData = async () => {
    setIsLoading(true);
    try {
      const [lab, equipmentUsage, maintenanceRecords, staff] = await Promise.all([
        getLaboratoryById(labId),
        getEquipmentUsage(labId),
        getMaintenanceRecords(labId),
        getStaff(labId)
      ]);

      setLabData({
        ...lab,
        equipmentUsage,
        maintenanceRecords,
        staff,
        equipment: equipmentUsage.map(eu => ({
          id: eu.name,
          name: eu.name,
          status: eu.usage > 0 ? 'Operational' : 'Out of Service',
          model: '',
          serialNumber: '',
          description: '',
          labSection: '',
          manufacturer: '',
          manufactureDate: '',
          receiptDate: '',
          supplier: '',
          type: ''
        }))
      });
    } catch (error) {
      console.error('Error fetching laboratory data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch laboratory data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEquipmentSubmit = async (equipmentData: Partial<Equipment>): Promise<void> => {
    try {
      await addEquipment(labId, {
        name: equipmentData.name || '',
        status: equipmentData.status as 'Operational' | 'Out of Service' | 'Under Maintenance' || 'Operational',
        model: equipmentData.model || '',
        serialNumber: equipmentData.serialNumber || '',
        description: equipmentData.description || '',
        labSection: equipmentData.labSection || '',
        manufacturer: equipmentData.manufacturer || '',
        manufactureDate: equipmentData.manufactureDate || '',
        receiptDate: equipmentData.receiptDate || '',
        supplier: equipmentData.supplier || '',
        type: equipmentData.type || ''
      });
      await fetchLabData();
      setShowEquipmentForm(false);
      toast({
        title: "Success",
        description: "Equipment added successfully.",
      });
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast({
        title: "Error",
        description: "Failed to add equipment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMaintenanceSubmit = async (maintenanceData: Omit<MaintenanceRecord, 'id'>): Promise<void> => {
    try {
      await addMaintenanceRecord(maintenanceData);
      await fetchLabData();
      setShowMaintenanceForm(false);
      toast({
        title: "Success",
        description: "Maintenance record added successfully.",
      });
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      toast({
        title: "Error",
        description: "Failed to add maintenance record. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!labData) {
    return <div>Laboratory not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg shadow-lg mb-6">
        <h1 className="text-4xl font-bold mb-2">{labData.name}</h1>
        <p className="text-xl">{labData.location_city}, {labData.location_state}</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Laboratory Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Manager:</strong> {labData.manager_name}</p>
          <p><strong>Contact:</strong> {labData.contact_number}</p>
          <p><strong>Email:</strong> {labData.email}</p>
        </CardContent>
      </Card>

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
            <p className="text-gray-500">Active Equipment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <ClipboardList size={48} className="text-red-500 mb-2" />
            <p className="text-xl font-semibold">{labData.maintenanceRecords.length}</p>
            <p className="text-gray-500">Maintenance Records</p>
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowEquipmentForm(!showEquipmentForm)} className="mb-4">
            {showEquipmentForm ? 'Hide Form' : 'Add New Equipment'}
          </Button>
          {showEquipmentForm && (
            <EquipmentForm onSubmit={handleEquipmentSubmit} />
          )}
          <DataTable 
            data={labData.equipment} 
            columns={['Name', 'Status']} 
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={labData.staff} 
            columns={['Name', 'Role']} 
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Maintenance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowMaintenanceForm(!showMaintenanceForm)} className="mb-4">
            {showMaintenanceForm ? 'Hide Form' : 'Add New Maintenance Record'}
          </Button>
          {showMaintenanceForm && (
            <MaintenanceForm onSubmit={handleMaintenanceSubmit} equipment={labData.equipment} />
          )}
          <DataTable 
            data={labData.maintenanceRecords} 
            columns={['Date', 'Equipment', 'Description']} 
          />
        </CardContent>
      </Card>
    </div>
  );
}