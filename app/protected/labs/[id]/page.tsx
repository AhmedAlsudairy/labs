// app/protected/labs/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getLaboratoryById,
  getEquipmentUsage,
  getMaintenanceRecords,
  getStaff,
  addEquipment,
  updateEquipment,
  deleteEquipment,
  addMaintenanceRecord,
} from "@/actions/admin";
import { toast } from "@/hooks/use-toast";
import {
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

  useEffect(() => {
    fetchLabData();
  }, [labId]);

  const fetchLabData = async () => {
    setIsLoading(true);
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
          status: eu.usage > 0 ? "Operational" : "Out of Service",
          model: "",
          serialNumber: "",
          description: "",
          labSection: "",
          manufacturer: "",
          manufactureDate: "",
          receiptDate: "",
          supplier: "",
          type: "",
        })),
      });
    } catch (error) {
      console.error("Error fetching laboratory data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch laboratory data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEquipmentSubmit = async (
    equipmentData: Partial<Equipment>
  ): Promise<void> => {
    try {
      await addEquipment(labId, {
        name: equipmentData.name || "",
        status:
          (equipmentData.status as
            | "Operational"
            | "Out of Service"
            | "Under Maintenance") || "Operational",
        model: equipmentData.model || "",
        serialNumber: equipmentData.serialNumber || "",
        description: equipmentData.description || "",
        labSection: equipmentData.labSection || "",
        manufacturer: equipmentData.manufacturer || "",
        manufactureDate: equipmentData.manufactureDate || "",
        receiptDate: equipmentData.receiptDate || "",
        supplier: equipmentData.supplier || "",
        type: equipmentData.type || "",
      });
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
        activeEquipmentCount={labData.equipmentUsage.length}
        maintenanceRecordCount={labData.maintenanceRecords.length}
      />

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
  );
}