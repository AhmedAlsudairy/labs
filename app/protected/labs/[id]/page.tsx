// app/protected/labs/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { toast } from "@/hooks/use-toast";
import {
  CreateEquipmentInput,
  Equipment,
  EquipmentUsage,
  Laboratory,
  MaintenanceRecord,
  Staff,
} from "@/types";
import { LaboratoryHeader } from "@/components/laboratory/LaboratoryHeader";
import { LaboratoryInfo } from "@/components/laboratory/LaboratoryInfo";
import { StatCards } from "@/components/laboratory/StatCards";
import { EquipmentStatusChart } from "@/components/laboratory/EquipmentStatusChart";
import { EquipmentUsageChart } from "@/components/laboratory/EquipmentUsageChart";
import { EquipmentSection } from "@/components/laboratory/EquipmentSection";
import { StaffSection } from "@/components/laboratory/StaffSection";
import { MaintenanceSection } from "@/components/laboratory/MaintenanceSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IdCard } from "lucide-react";
import { getLaboratoryById } from "@/actions/admin/lab";
import { addEquipment, deleteEquipment, getEquipmentUsage, updateEquipment } from "@/actions/admin/equipments";
import { addMaintenanceRecord, getMaintenanceRecords, getMaintenanceRecordsByState } from "@/actions/admin/maintenance-record";
import { getCalibrationRecords, getCalibrationRecordsByState } from "@/actions/admin/calibration";
import { getStaff } from "@/actions/admin/user";

type RecordWithType = MaintenanceRecord & { type: 'maintenance' | 'calibration' };

type FullLaboratoryDetails = Laboratory & {
  equipment: Equipment[];
  staff: Staff[];
  maintenanceRecords: RecordWithType[];
  calibrationRecords: RecordWithType[];
  equipmentUsage: EquipmentUsage[];
  maintenanceStates: any;
  calibrationStates: any;
  totalMaintenanceRecords: number;
  totalCalibrationRecords: number;
  totalRecords: number;
};

export default function LaboratoryPage() {
  const params = useParams();
  const labId = parseInt(params.id as string);
  const [labData, setLabData] = useState<FullLaboratoryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLabData();
  }, [labId]);

  const fetchLabData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching data for lab ID:', labId);

      // Fetch all required data
      const [lab, equipmentUsage, maintenanceRecords, staff, calibrationRecords] =
        await Promise.all([
          getLaboratoryById(labId),
          getEquipmentUsage(labId),
          getMaintenanceRecords(labId, 'lab'),
          getStaff(labId),
          getCalibrationRecords(labId, 'lab'),
        ]);

      console.log('Lab data:', lab);
      console.log('Equipment usage:', equipmentUsage);
      console.log('Maintenance records:', maintenanceRecords);
      console.log('Staff:', staff);
      console.log('Calibration records:', calibrationRecords);

      // First set basic data
      const equipmentList: Equipment[] = equipmentUsage.map((eu) => ({
        id: eu.id,
        name: eu.name,
        status: eu.status === 'Operational' ? 'Operational' : 'Out of Service',
        model: eu.model || '',
        serialNumber: eu.serialNumber || '',
        description: eu.description || '',
        labSection: eu.labSection || '',
        manufacturer: eu.manufacturer || '',
        manufactureDate: eu.manufactureDate || '',
        receiptDate: eu.receiptDate || '',
        supplier: eu.supplier || '',
        type: eu.type || '',
        calibrationState: (eu.calibrationState as Equipment['calibrationState']) || 'none',
        maintenanceState: (eu.maintenanceState as Equipment['maintenanceState']) || 'done',
      }));

      console.log('Processed equipment list:', equipmentList);

      // Get all equipment IDs
      const equipmentIds = equipmentList.map(eq => eq.id);
      console.log('Equipment IDs for state fetch:', equipmentIds);

      // Fetch states for all equipment in one go
      const [maintenanceStates, calibrationStates] = await Promise.all([
        getMaintenanceRecordsByState(equipmentIds),
        getCalibrationRecordsByState(equipmentIds),
      ]);

      console.log('Maintenance states:', maintenanceStates);
      console.log('Calibration states:', calibrationStates);

      // Calculate totals
      const totalMaintenanceStates = {
        needMaintenance: Object.values(maintenanceStates).reduce((acc, curr) => acc + curr.needMaintenance, 0),
        lateMaintenance: Object.values(maintenanceStates).reduce((acc, curr) => acc + curr.lateMaintenance, 0)
      };

      const totalCalibrationStates = {
        needCalibration: Object.values(calibrationStates).reduce((acc, curr) => acc + curr.needCalibration, 0),
        lateCalibration: Object.values(calibrationStates).reduce((acc, curr) => acc + curr.lateCalibration, 0)
      };

      console.log('Total maintenance states:', totalMaintenanceStates);
      console.log('Total calibration states:', totalCalibrationStates);

      // Calculate total records for each type
      const totalMaintenanceRecords = maintenanceRecords.length;
      const totalCalibrationRecords = calibrationRecords.length;

      console.log('Total maintenance records:', totalMaintenanceRecords);
      console.log('Total calibration records:', totalCalibrationRecords);
      console.log('Combined total records:', totalMaintenanceRecords + totalCalibrationRecords);

      const processedMaintenanceRecords = maintenanceRecords.map(record => ({
        ...record,
        type: 'maintenance' as const
      }));
      const processedCalibrationRecords = calibrationRecords.map(record => ({
        ...record,
        type: 'calibration' as const
      }));

      console.log('Processed maintenance records:', processedMaintenanceRecords);
      console.log('Processed calibration records:', processedCalibrationRecords);

      const labDataToSet = {
        ...lab,
        equipmentUsage,
        maintenanceRecords: processedMaintenanceRecords,
        calibrationRecords: processedCalibrationRecords,
        staff,
        equipment: equipmentList,
        maintenanceStates: totalMaintenanceStates,
        calibrationStates: totalCalibrationStates,
        totalMaintenanceRecords,
        totalCalibrationRecords,
        totalRecords: totalMaintenanceRecords + totalCalibrationRecords,
      };

      console.log('Setting lab data:', labDataToSet);
      setLabData(labDataToSet);
    } catch (error) {
      console.error("Error fetching laboratory data:", error);
      setError("Failed to fetch laboratory data. Please try again.");
      toast({
        title: "Error",
        description: "Failed to fetch laboratory data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEquipmentSubmit = async (equipmentData: CreateEquipmentInput): Promise<void> => {
    try {
      await addEquipment(labId, equipmentData);
      await fetchLabData();
      toast({
        title: "Success",
        description: "Equipment added successfully.",
      });
    } catch (error) {
      console.error("Error adding equipment:", error);
      toast({
        title: "Error",
        description: "Failed to add equipment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEquipmentEdit = async (
    equipmentId: number,
    equipmentData: Partial<Equipment>
  ): Promise<void> => {
    try {
      await updateEquipment(equipmentId, equipmentData);
      await fetchLabData();
      toast({
        title: "Success",
        description: "Equipment updated successfully.",
      });
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast({
        title: "Error",
        description: "Failed to update equipment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleEquipmentDelete = async (equipmentId: number): Promise<void> => {
    try {
      await deleteEquipment(equipmentId);
      await fetchLabData();
      toast({
        title: "Success",
        description: "Equipment deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast({
        title: "Error",
        description: "Failed to delete equipment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleMaintenanceSubmit = async (
    maintenanceData: Omit<MaintenanceRecord, "id">
  ): Promise<void> => {
    try {
      await addMaintenanceRecord(maintenanceData);
      await fetchLabData();
      toast({
        title: "Success",
        description: "Maintenance record added successfully.",
      });
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      toast({
        title: "Error",
        description: "Failed to add maintenance record. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="w-[200px] h-[20px] rounded-full" />
          <Skeleton className="w-[300px] h-[150px] rounded-lg" />
          <Skeleton className="w-[250px] h-[20px] rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchLabData} />;
  }

  if (!labData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <IdCard className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold">Laboratory not found</h2>
          <p className="text-gray-500">The requested laboratory could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-background">
      <div className="w-full h-full">
        <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 space-y-6 sm:space-y-8">
            {/* Header Section */}
            <div className="space-y-6">
              <LaboratoryHeader
                name={labData.name}
                locationCity={labData.location_city}
                locationState={labData.location_state}
              />
              <LaboratoryInfo
                managerName={labData.manager_name}
                contactNumber={labData.contact_number}
                email={labData.email}
              />
            </div>

            {/* Stats Section */}
            <div className="py-4">
              <StatCards
                equipmentCount={labData.equipment.length}
                staffCount={labData.staff.length}
                activeEquipmentCount={
                  labData.equipment.filter((eq) => eq.status === "Operational").length
                }
                maintenanceRecordCount={labData.totalMaintenanceRecords}
                calibrationRecordCount={labData.totalCalibrationRecords}
                needMaintenance={labData.maintenanceStates.needMaintenance}
                lateMaintenance={labData.maintenanceStates.lateMaintenance}
                needCalibration={labData.calibrationStates.needCalibration}
                lateCalibration={labData.calibrationStates.lateCalibration}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-lg font-semibold">Equipment Status</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <EquipmentStatusChart equipment={labData.equipment} />
                </CardContent>
              </Card>

              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardHeader className="p-4 border-b">
                  <CardTitle className="text-lg font-semibold">Equipment Usage</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <EquipmentUsageChart equipmentUsage={labData.equipmentUsage} />
                </CardContent>
              </Card>
            </div>

            {/* Equipment Section */}
            <div className="space-y-6">
              <EquipmentSection
                labId={labId}
                equipment={labData.equipment}
                onAddEquipment={handleEquipmentSubmit}
                onEditEquipment={handleEquipmentEdit}
                onDeleteEquipment={handleEquipmentDelete}
              />

              {/* Staff Section */}
              <StaffSection 
                staff={labData.staff} 
                labId={labId}
                onStaffUpdated={fetchLabData}
              />

              {/* Maintenance Section */}
              {/* <MaintenanceSection
                maintenanceRecords={labData.maintenanceRecords}
                equipment={labData.equipment}
                onAddMaintenanceRecord={handleMaintenanceSubmit}
              /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error State Component
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="container mx-auto p-4 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Error</h2>
        <p className="text-gray-600">{error}</p>
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      </div>
    </div>
  );
}
