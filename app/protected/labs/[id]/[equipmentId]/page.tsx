'use client'
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEquipmentById, getMaintenanceRecords, getExternalControls, getCalibrationData } from '@/actions/admin';
import { Equipment, MaintenanceRecord, ExternalControl, CalibrationData } from '@/types';
import { useTheme } from 'next-themes';

export default function EquipmentPage() {
  const params = useParams();
  const labId = parseInt(params.id as string);
  const equipmentId = parseInt(params.equipmentId as string);
  const { theme } = useTheme();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [externalControls, setExternalControls] = useState<ExternalControl[]>([]);
  const [calibrationData, setCalibrationData] = useState<CalibrationData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [equipmentData, maintenanceData, controlData, calibrationData] = await Promise.all([
          getEquipmentById(equipmentId),
          getMaintenanceRecords(equipmentId),
          getExternalControls(equipmentId),
          getCalibrationData(equipmentId)
        ]);

        setEquipment(equipmentData);
        setMaintenanceRecords(maintenanceData);
        setExternalControls(controlData);
        setCalibrationData(calibrationData);
      } catch (error) {
        console.error('Error fetching equipment data:', error);
      }
    };

    fetchData();
  }, [equipmentId]);

  if (!equipment) {
    return <div className="flex items-center justify-center h-screen dark:text-white">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-7xl dark:bg-gray-900 dark:text-white transition-colors duration-200">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 text-center">{equipment.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="bg-gray-50 dark:bg-gray-700">
            <CardTitle className="text-xl font-semibold dark:text-white">Equipment Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Model" value={equipment.model} />
              <InfoItem label="Serial Number" value={equipment.serialNumber} />
              <InfoItem label="Manufacturer" value={equipment.manufacturer} />
              <InfoItem label="Status" value={equipment.status} />
              <InfoItem label="Lab Section" value={equipment.labSection} />
              <InfoItem label="Type" value={equipment.type} />
              <InfoItem label="Manufacture Date" value={equipment.manufactureDate} />
              <InfoItem label="Receipt Date" value={equipment.receiptDate} />
              <InfoItem label="Supplier" value={equipment.supplier} />
            </div>
            <p className="mt-4"><strong>Description:</strong> {equipment.description}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="bg-gray-50 dark:bg-gray-700">
            <CardTitle className="text-xl font-semibold dark:text-white">Equipment Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Maintenance', value: maintenanceRecords.length },
                { name: 'Controls', value: externalControls.length },
                { name: 'Calibrations', value: calibrationData.length }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#ccc'} />
                <XAxis dataKey="name" stroke={theme === 'dark' ? '#9CA3AF' : '#666'} />
                <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#666'} />
                <Tooltip contentStyle={theme === 'dark' ? { backgroundColor: '#1F2937', border: 'none' } : undefined} />
                <Bar dataKey="value" fill={theme === 'dark' ? '#60A5FA' : '#8884d8'} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="maintenance" className="mb-8">
        <TabsList className="justify-center mb-4">
          <TabsTrigger value="maintenance" className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Maintenance</TabsTrigger>
          <TabsTrigger value="controls" className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">External Controls</TabsTrigger>
          <TabsTrigger value="calibration" className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white">Calibration</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance">
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-700">
              <CardTitle className="text-xl font-semibold dark:text-white">Maintenance Records</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="dark:text-gray-300">Date</TableHead>
                    <TableHead className="dark:text-gray-300">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRecords.map((record) => (
                    <TableRow key={record.id} className="dark:border-gray-700">
                      <TableCell className="dark:text-gray-300">{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell className="dark:text-gray-300">{record.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls">
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-700">
              <CardTitle className="text-xl font-semibold dark:text-white">External Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={externalControls}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#ccc'} />
                  <XAxis dataKey="date" stroke={theme === 'dark' ? '#9CA3AF' : '#666'} />
                  <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#666'} />
                  <Tooltip contentStyle={theme === 'dark' ? { backgroundColor: '#1F2937', border: 'none' } : undefined} />
                  <Legend />
                  <Bar dataKey="result" fill={theme === 'dark' ? '#60A5FA' : '#8884d8'} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calibration">
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-700">
              <CardTitle className="text-xl font-semibold dark:text-white">Calibration Data</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={calibrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#ccc'} />
                  <XAxis dataKey="date" stroke={theme === 'dark' ? '#9CA3AF' : '#666'} />
                  <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#666'} />
                  <Tooltip contentStyle={theme === 'dark' ? { backgroundColor: '#1F2937', border: 'none' } : undefined} />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke={theme === 'dark' ? '#60A5FA' : '#8884d8'} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <strong className="dark:text-gray-300">{label}:</strong> <span className="dark:text-gray-400">{value}</span>
  </div>
);