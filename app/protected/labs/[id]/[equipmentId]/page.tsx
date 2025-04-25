"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Equipment,
  MaintenanceRecord,
  ExternalControl,
  CalibrationData,
  maintanace_state,
  Frequency,
  maintanace_role,
} from "@/types";
import { useTheme } from "next-themes";
import { formatDeviceAge } from "@/utils/utils";
import { differenceInDays } from "date-fns";

import { Badge } from "@/components/ui/badge";

import { MaintenanceRecords } from "@/components/tables/maintanance-record-table";
import { DowntimeRecords } from "@/components/tables/downtime-record-table";
import { getEquipmentById } from "@/actions/admin/equipments";
import { deleteMaintenanceRecord, getMaintenanceRecords } from "@/actions/admin/maintenance-record";
import { deleteCalibrationRecord, getCalibrationRecords } from "@/actions/admin/calibration";
import { deleteDowntimeRecord, getDowntimeRecords } from "@/actions/admin/down-time";
import { deleteExternalControl, getExternalControlRecords } from "@/actions/admin/external-control";
import { mapToCalibrationData, mapCalibrationToRecord } from "@/utils/type-mappers";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div
      role="alert"
      className="p-4 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      <h2 className="text-lg font-semibold mb-2">Something went wrong:</h2>
      <pre className="text-sm overflow-auto">{error.message}</pre>
    </div>
  );
}

export default function EquipmentPage() {
  const params = useParams();
  const labId = parseInt(params.id as string);
  const equipmentId = parseInt(params.equipmentId as string);
  const { theme } = useTheme();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [externalControls, setExternalControls] = useState<ExternalControl[]>([]);
  const [calibrationData, setCalibrationData] = useState<CalibrationData[]>([]);
  const [downtimeRecords, setDowntimeRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

  console.log("URL params:", { labId, equipmentId });

  const fetchDataWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to fetch data (attempt ${i + 1})`);
        const [
          equipmentData,
          maintenanceData,
          controlData,
          calibrationData,
          downtimeData,
        ] = await Promise.all([
          getEquipmentById(equipmentId),
          getMaintenanceRecords(equipmentId, 'equipment'),
          getExternalControlRecords(equipmentId),
          getCalibrationRecords(equipmentId, 'equipment'),
          getDowntimeRecords(equipmentId),
        ]);

        console.log("Fetched equipment data:", equipmentData);
        setEquipment(equipmentData);
        setMaintenanceRecords(maintenanceData);
        setExternalControls(controlData);
        
        // Store the raw calibration data or convert it as needed
        const convertedCalibrationData = mapToCalibrationData(calibrationData);
        setCalibrationData(convertedCalibrationData);
        
        setDowntimeRecords(downtimeData);
        return;
      } catch (error) {
        console.error(`Error fetching data (attempt ${i + 1}):`, error);
        if (i === retries - 1) throw error;
      }
    }
  };

  const handleDelete = async (id: number, mode: 'maintenance' | 'calibration' | 'external_control') => {
    try {
      if (mode === 'maintenance') {
        await deleteMaintenanceRecord(id);
      } else if (mode === 'calibration') {
        await deleteCalibrationRecord(id);
      } else if (mode === 'external_control') {
        await deleteExternalControl(id);
      }
      fetchDataWithRetry();
    } catch (error) {
      console.error(`Failed to delete ${mode} record:`, error);
    }
  };

  useEffect(() => {
    if (!equipmentId || isNaN(equipmentId)) {
      console.error("Invalid equipment ID:", equipmentId);
      setError("Invalid equipment ID");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchDataWithRetry()
      .catch((error) => {
        console.error("Failed to fetch data after retries:", error);
        setError("Failed to load equipment data. Please try again later.");
      })
      .finally(() => setIsLoading(false));
  }, [equipmentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen dark:text-white">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen dark:text-white">
        {error}
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen dark:text-white">
        Equipment not found
      </div>
    );
  }

  const calculateTotalDowntime = () => {
    return downtimeRecords.reduce((total, record) => {
      const startDate = new Date(record.start_date);
      const endDate = new Date(record.end_date);
      const downtimeDays = differenceInDays(endDate, startDate) + 1;
      return total + downtimeDays;
    }, 0);
  };

  const totalDowntimeDays = calculateTotalDowntime();

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="container mx-auto p-4 lg:p-8 max-w-7xl dark:bg-gray-900 dark:text-white transition-colors duration-200">
        <h1 className="text-3xl lg:text-4xl font-bold mb-8 text-center">
          {equipment.name}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-700">
              <CardTitle className="text-xl font-semibold dark:text-white">
                Equipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Model" value={equipment.model} />
                <InfoItem
                  label="Serial Number"
                  value={equipment.serialNumber}
                />
                <InfoItem label="Manufacturer" value={equipment.manufacturer} />

                <InfoItem label="Status" value={equipment.status} />
                <InfoItem label="Lab Section" value={equipment.labSection} />
                <InfoItem label="Type" value={equipment.type} />
                <InfoItem
                  label="Manufacture Date"
                  value={equipment.manufactureDate}
                />
                <InfoItem label="Receipt Date" value={equipment.receiptDate} />
                <InfoItem label="Supplier" value={equipment.supplier} />
                <InfoItem
                  label="Device Age"
                  value={
                    equipment.receiptDate
                      ? formatDeviceAge(
                          new Date(equipment.receiptDate),
                          new Date()
                        )
                      : "N/A"
                  }
                />
                <InfoItem
                  label="Total Downtime"
                  value={`${totalDowntimeDays} ${totalDowntimeDays === 1 ? 'day' : 'days'}`}
                />
              </div>
              <p className="mt-4">
                <strong>Description:</strong> {equipment.description}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-700">
              <CardTitle className="text-xl font-semibold dark:text-white">
                Equipment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: "Maintenance", value: maintenanceRecords.length },
                    { name: "Controls", value: externalControls.length },
                    { name: "Calibrations", value: calibrationData.length },
                  ]}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme === "dark" ? "#374151" : "#ccc"}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={theme === "dark" ? "#9CA3AF" : "#666"}
                  />
                  <YAxis stroke={theme === "dark" ? "#9CA3AF" : "#666"} />
                  <Tooltip
                    contentStyle={
                      theme === "dark"
                        ? { backgroundColor: "#1F2937", border: "none" }
                        : undefined
                    }
                  />
                  <Bar
                    dataKey="value"
                    fill={theme === "dark" ? "#60A5FA" : "#8884d8"}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="maintenance" className="mb-8">
          <TabsList className="justify-center mb-4">
            <TabsTrigger
              value="maintenance"
              className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Maintenance
            </TabsTrigger>

            <TabsTrigger
              value="calibration"
              className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Calibration
            </TabsTrigger>
            <TabsTrigger
              value="controls"
              className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              External Controls
            </TabsTrigger>
            <TabsTrigger
              value="downtime"
              className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Down-time Records
            </TabsTrigger>
         
          </TabsList>

          <TabsContent value="maintenance">
            <MaintenanceRecords
              mode="maintenance"
              lab_id={labId}
              equipment_id={equipmentId}
              records={maintenanceRecords}
              onDelete={(id) => handleDelete(id, 'maintenance')}
              onSuccess={fetchDataWithRetry}
            />
          </TabsContent>

          <TabsContent value="controls">
            <MaintenanceRecords
              mode="external_control"
              lab_id={labId}
              equipment_id={equipmentId}
              records={externalControls.map(control => ({
                id: control.id,
                date: control.date || control.next_date, // Use next_date as fallback
                result: control.result,
                equipmentId: control.equipmentId,
                description: control.description || `External Control Result: ${control.result}`,
                frequency: control.frequency || 'monthly' as Frequency,
                responsible: control.responsible || 'lab technician' as maintanace_role,
                state: control.state || (control.result >= 0 ? 'done' : 'need maintance')
              }))}
              onDelete={(id) => handleDelete(id, 'external_control')}
              onSuccess={fetchDataWithRetry}
            />
          </TabsContent>

          <TabsContent value="calibration">
            <MaintenanceRecords
              mode="calibration"
              lab_id={labId}
              equipment_id={equipmentId}
              records={mapCalibrationToRecord(calibrationData)}
              onDelete={(id) => handleDelete(id, 'calibration')}
              onSuccess={fetchDataWithRetry}
            />
          </TabsContent>

          <TabsContent value="downtime">
            <DowntimeRecords
              lab_id={labId}
              records={downtimeRecords}
              equipmentId={equipmentId}
              onDelete={async (id) => {
                try {
                  await deleteDowntimeRecord(id);
                  fetchDataWithRetry();
                } catch (error) {
                  console.error('Failed to delete downtime record:', error);
                }
              }}
              onSuccess={fetchDataWithRetry}
            />
          </TabsContent>

          
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <strong className="dark:text-gray-300">{label}:</strong>{" "}
    <span className="dark:text-gray-400">{value}</span>
  </div>
);

const StateIndicator = ({ state }: { state: string }) => {
  // Handle all possible state values without relying on the type
  const getVariant = (stateValue: string): "success" | "warning" | "destructive" | "default" => {
    // Maintenance & calibration states
    if (stateValue === "done" || stateValue === "calibrated") {
      return "success";
    }
    if (stateValue === "need maintance" || stateValue === "need calibration" || stateValue === "Final Date") {
      return "warning";
    }
    if (stateValue === "late maintance" || stateValue === "late calibration" || stateValue === "E.Q.C  Reception") {
      return "destructive";
    }
    return "default";
  };

  return <Badge variant={getVariant(state)}>{state}</Badge>;
};
