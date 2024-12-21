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
import { addMaintenanceRecord, getMaintenanceRecords, getMaintenanceRecordCount, getNeedMaintenanceCount } from "@/actions/admin/maintenance-record";
import { addCalibrationRecord, getCalibrationRecords, getCalibrationRecordCount, getNeedCalibrationCount } from "@/actions/admin/calibration";
import { getStaff } from "@/actions/admin/user";

type FullLaboratoryDetails = Laboratory & {
  equipment: Equipment[];
  staff: Staff[];
  maintenanceRecords: MaintenanceRecord[];
  calibrationRecords: MaintenanceRecord[];
  equipmentUsage: EquipmentUsage[];
  maintenanceCount: number;
  calibrationCount: number;
  needMaintenanceCount: number;
  needCalibrationCount: number;
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
      const [
        lab,
        equipmentUsage,
        maintenanceRecords,
        calibrationRecords,
        staff,
        maintenanceCount,
        calibrationCount,
        needMaintenanceCount,
        needCalibrationCount
      ] = await Promise.all([
        getLaboratoryById(labId),
        getEquipmentUsage(labId),
        getMaintenanceRecords(labId),
        getCalibrationRecords(labId),
        getStaff(labId),
        getMaintenanceRecordCount(labId),
        getCalibrationRecordCount(labId),
        getNeedMaintenanceCount(labId),
        getNeedCalibrationCount(labId)
      ]);

      setLabData({
        ...lab,
        equipmentUsage,
        maintenanceRecords,
        calibrationRecords,
        maintenanceCount,
        calibrationCount,
        needMaintenanceCount,
        needCalibrationCount,
        staff,
        equipment: equipmentUsage.map((eu) => ({
          id: eu.id,
          name: eu.name,
          status: eu.status,
          model: eu.model || '',
          serialNumber: eu.serialNumber || '',
          description: eu.description || '',
          labSection: eu.labSection || '',
          manufacturer: eu.manufacturer || '',
          manufactureDate: eu.manufactureDate || '',
          receiptDate: eu.receiptDate || '',
          supplier: eu.supplier || '',
          type: eu.type || '',
          calibrationState: eu.calibrationState || 'none',
          maintenanceState: eu.maintenanceState || 'done',
        })),
      });
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

  const handleCalibrationSubmit = async (
    calibrationData: Omit<MaintenanceRecord, "id">
  ): Promise<void> => {
    try {
      await addCalibrationRecord(calibrationData);
      await fetchLabData();
      toast({
        title: "Success",
        description: "Calibration record added successfully.",
      });
    } catch (error) {
      console.error("Error adding calibration record:", error);
      toast({
        title: "Error",
        description: "Failed to add calibration record. Please try again.",
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
                maintenanceRecordCount={labData.maintenanceCount}
                calibrationRecordCount={labData.calibrationCount}
                needMaintenanceCount={labData.needMaintenanceCount}
                needCalibrationCount={labData.needCalibrationCount}
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
              <MaintenanceSection
                maintenanceRecords={labData.maintenanceRecords}
                calibrationRecords={labData.calibrationRecords}
                equipment={labData.equipment}
                onAddMaintenanceRecord={handleMaintenanceSubmit}
                onAddCalibrationRecord={handleCalibrationSubmit}
              />
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

// Add these types if not already defined
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string[];
  }[];
}
