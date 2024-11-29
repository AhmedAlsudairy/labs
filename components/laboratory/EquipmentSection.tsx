// components/laboratory/EquipmentSection.tsx
"use client";

import { useState } from "react";
import { Equipment, CreateEquipmentInput } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Edit, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import DeviceMaintenanceForm from "../main-form/device-form";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EquipmentSectionProps {
  labId: number;
  equipment: Equipment[];
  onAddEquipment: (equipmentData: CreateEquipmentInput) => Promise<void>;
  onEditEquipment: (
    equipmentId: number,
    equipmentData: Partial<Equipment>
  ) => Promise<void>;
  onDeleteEquipment: (equipmentId: number) => Promise<void>;
}

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({
  labId,
  equipment,
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
}) => {
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  console.log(equipment);
  const handleAdd = () => {
    setEditingEquipment(null);
    setShowEquipmentForm(true);
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setShowEquipmentForm(true);
  };

  const handleDelete = async (equipmentId: number) => {
    if (window.confirm("Are you sure you want to delete this equipment?")) {
      try {
        await onDeleteEquipment(equipmentId);
        toast({
          title: "Success",
          description: "Equipment deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting equipment:", error);
        toast({
          title: "Error",
          description: "Failed to delete equipment",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (values: CreateEquipmentInput) => {
    setIsLoading(true);
    try {
      if (editingEquipment) {
        await onEditEquipment(editingEquipment.id, values);
        toast({
          title: "Success",
          description: "Equipment updated successfully",
        });
      } else {
        await onAddEquipment(values);
        toast({
          title: "Success",
          description: "Equipment added successfully",
        });
      }
      setShowEquipmentForm(false);
      setEditingEquipment(null);
    } catch (error) {
      console.error("Error saving equipment:", error);
      toast({
        title: "Error",
        description: "Failed to save equipment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Operational":
        return "success";
      case "Under Maintenance":
        return "warning";
      case "Out of Service":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Add helper function for state badge variants
  const getCalibrationBadgeVariant = (state: string | undefined) => {
    switch (state) {
      case 'calibrated':
        return 'success';
      case 'need calibration':
        return 'warning';
      case 'late calibration':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getMaintenanceBadgeVariant = (state: string | undefined) => {
    switch (state) {
      case 'done':
        return 'success';
      case 'need maintance':
        return 'warning';
      case 'late maintance':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Equipment Management</CardTitle>
            <CardDescription>Click equipment name for details</CardDescription>
          </div>
          <Button 
            onClick={handleAdd}
            disabled={isLoading}
            className="shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {showEquipmentForm && !editingEquipment && (
          <div className="border-b p-6 bg-muted/50">
            <DeviceMaintenanceForm
              labId={labId}
              onSubmit={handleSubmit}
              onCancel={() => setShowEquipmentForm(false)}
            />
          </div>
        )}

        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lab Section</TableHead>
                <TableHead>Calibration</TableHead>
                <TableHead>Maintenance</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((item) => (
                <>
                  <TableRow 
                    key={item.id}
                    className={cn(
                      "group hover:bg-muted/50 transition-colors",
                      editingEquipment?.id === item.id && "bg-muted"
                    )}
                  >
                    <TableCell>
                      <Link
                        className="text-primary hover:underline font-medium"
                        href={`/protected/labs/${labId}/${item.id}`}
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>{item.model}</TableCell>
                    <TableCell>{item.serialNumber}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.labSection}</TableCell>
                    <TableCell>
                      {item.calibrationState && (
                        <Badge variant={getCalibrationBadgeVariant(item.calibrationState)}>
                          {item.calibrationState}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.maintenanceState && (
                        <Badge variant={getMaintenanceBadgeVariant(item.maintenanceState)}>
                          {item.maintenanceState}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          disabled={isLoading}
                        >
                          {editingEquipment?.id === item.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <Edit className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {editingEquipment?.id === item.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <div className="border-t bg-muted/50 p-6">
                          <DeviceMaintenanceForm
                            labId={labId}
                            onSubmit={handleSubmit}
                            onCancel={() => {
                              setShowEquipmentForm(false);
                              setEditingEquipment(null);
                            }}
                            initialData={editingEquipment}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
