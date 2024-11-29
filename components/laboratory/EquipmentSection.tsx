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
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredEquipment = equipment.filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl md:text-2xl">Equipment Management</CardTitle>
            <CardDescription className="text-sm md:text-base">Click equipment name for details</CardDescription>
          </div>
          <Button 
            onClick={handleAdd}
            disabled={isLoading}
            className="shadow-sm w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {showEquipmentForm && !editingEquipment && (
          <div className="border-b p-4 md:p-6 bg-muted/50">
            <DeviceMaintenanceForm
              labId={labId}
              onSubmit={handleSubmit}
              onCancel={() => setShowEquipmentForm(false)}
            />
          </div>
        )}

        <div className="relative w-full">
          <div className="w-full overflow-auto">
            <div className="min-w-[650px] md:min-w-[900px] lg:min-w-[1100px]">
              <div className="relative">
                {/* Fixed Header */}
                <div className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-w-[180px] h-12 border-r">
                          Name
                        </TableHead>
                        <TableHead className="hidden md:table-cell min-w-[120px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12">
                          Model
                        </TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[140px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12">
                          Serial Number
                        </TableHead>
                        <TableHead className="min-w-[100px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12">
                          Status
                        </TableHead>
                        <TableHead className="hidden md:table-cell min-w-[120px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12">
                          Lab Section
                        </TableHead>
                        <TableHead className="min-w-[110px] whitespace-nowrap bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12">
                          Calibration
                        </TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[110px] whitespace-nowrap bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-12">
                          Maintenance
                        </TableHead>
                        <TableHead className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-w-[90px] h-12 border-l">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                </div>

                {/* Scrollable Body */}
                <ScrollArea className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[800px] w-full">
                  <Table>
                    <TableBody>
                      {filteredEquipment.map((item) => (
                        <>
                          <TableRow 
                            key={item.id}
                            className={cn(
                              "group hover:bg-muted/50 transition-colors",
                              editingEquipment?.id === item.id && "bg-muted"
                            )}
                          >
                            <TableCell className="font-medium sticky left-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                              <Link
                                className="text-primary hover:underline"
                                href={`/protected/labs/${labId}/${item.id}`}
                              >
                                {item.name}
                                <span className="md:hidden text-xs text-muted-foreground block">
                                  {item.model} • {item.serialNumber}
                                </span>
                                <span className="sm:hidden text-xs text-muted-foreground block mt-1">
                                  <span className="inline-block mr-2">Maintenance:</span>
                                  {item.maintenanceState && (
                                    <Badge 
                                      variant={getMaintenanceBadgeVariant(item.maintenanceState)} 
                                      className="text-xs"
                                    >
                                      {item.maintenanceState}
                                    </Badge>
                                  )}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{item.model}</TableCell>
                            <TableCell className="hidden lg:table-cell">{item.serialNumber}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs md:text-sm">
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{item.labSection}</TableCell>
                            <TableCell className="min-w-[110px]">
                              {item.calibrationState && (
                                <Badge 
                                  variant={getCalibrationBadgeVariant(item.calibrationState)} 
                                  className="text-xs md:text-sm whitespace-nowrap w-full justify-center"
                                >
                                  {item.calibrationState}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell min-w-[110px]">
                              {item.maintenanceState && (
                                <Badge 
                                  variant={getMaintenanceBadgeVariant(item.maintenanceState)} 
                                  className="text-xs md:text-sm whitespace-nowrap w-full justify-center"
                                >
                                  {item.maintenanceState}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 min-w-[90px]">
                              <div className="flex items-center justify-end space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
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
                                  className="h-8 w-8"
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
                                <div className="border-t bg-muted/50 p-4 md:p-6">
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
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
        {filteredEquipment.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No equipment found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
