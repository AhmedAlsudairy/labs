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
import { addEquipment, addMaintenanceRecord, deleteEquipment, getEquipmentUsage, getLaboratoryById, getMaintenanceRecords, getStaff, updateEquipment } from "@/actions/admin/index";

type FullLaboratoryDetails = Laboratory & {
  equipment: Equipment[];
  staff: Staff[];
  maintenanceRecords: MaintenanceRecord[];
  equipmentUsage: EquipmentUsage[];
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
      const [lab, equipmentUsage, maintenanceRecords, staff] =
        await Promise.all([
          getLaboratoryById(labId),
          getEquipmentUsage(labId),
          getMaintenanceRecords(labId),
          getStaff(labId),
        ]);

      setLabData({
        ...lab,
        equipmentUsage,
        maintenanceRecords,
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
      maintenanceState: eu.maintenanceState ||'done',
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

  if (isLoading) {
    return  <Skeleton className="w-[100px] h-[20px] rounded-full" />
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchLabData} />;
  }

  if (!labData) {
    return <div>Laboratory not found</div>;
  }

  return (
    <div className="relative w-full min-h-screen bg-background">
      {/* Remove default page margins and add viewport control */}
      <div className="w-full h-full overflow-x-hidden">
        {/* Main content container with controlled width and padding */}
        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-4 lg:px-6">
          {/* Content wrapper with proper spacing */}
          <div className="w-full py-4 space-y-4 sm:space-y-6">
            {/* Rest of your components */}
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

            <StatCards
              equipmentCount={labData.equipment.length}
              staffCount={labData.staff.length}
              activeEquipmentCount={
                labData.equipment.filter((eq) => eq.status === "Operational").length
              }
              maintenanceRecordCount={labData.maintenanceRecords.length}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              <Card className="overflow-hidden">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-base sm:text-lg">Equipment Status</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  <EquipmentStatusChart equipment={labData.equipment} />
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className="p-3 sm:p-4">
                  <CardTitle className="text-base sm:text-lg">Equipment Usage</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  <EquipmentUsageChart equipmentUsage={labData.equipmentUsage} />
                </CardContent>
              </Card>
            </div>

            <EquipmentSection
              labId={labId}
              equipment={labData.equipment}
              onAddEquipment={handleEquipmentSubmit}
              onEditEquipment={handleEquipmentEdit}
              onDeleteEquipment={handleEquipmentDelete}
            />

            <StaffSection staff={labData.staff} />

            <MaintenanceSection
              maintenanceRecords={labData.maintenanceRecords}
              equipment={labData.equipment}
              onAddMaintenanceRecord={handleMaintenanceSubmit}
            />
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
