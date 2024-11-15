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
import { Edit, Trash2, Plus } from "lucide-react";
import DeviceMaintenanceForm from "../main-form/device-form";
import Link from "next/link";

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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Equipment</CardTitle>
            <CardDescription>click to equipment name to go specific equipment</CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showEquipmentForm && (
          <div className="mb-6">
            <div className="bg-background p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">
                {editingEquipment ? "Edit Equipment" : "Add New Equipment"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {editingEquipment
                  ? "Update the equipment details below."
                  : "Fill in the equipment details below."}
              </p>
              {/* TODO:here the edit form */}
              <DeviceMaintenanceForm
                labId={labId}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowEquipmentForm(false);
                  setEditingEquipment(null);
                }}
                initialData={editingEquipment || undefined}
              />
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lab Section</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    className="w-full block px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 rounded-md cursor-pointer font-medium text-primary hover:underline"
                    href={`/protected/labs/${labId}/${item.id}`}
                    passHref
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
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

{
//1-done maintance form today
//2-add description show manu fac note notes
//3-then only show late or under maintanace eqs
//4-then if maintance done set eq to oprational


}









        {/* <Dialog open={showEquipmentForm} onOpenChange={setShowEquipmentForm}>
          <DialogContent className="max-w-4xl z-50">
            <DialogHeader>
              <DialogTitle>
                {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </DialogTitle>
              <DialogDescription>
                {editingEquipment 
                  ? 'Update the equipment details below.' 
                  : 'Fill in the equipment details below.'}
              </DialogDescription>
            </DialogHeader>
            <DeviceMaintenanceForm
              labId={labId}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowEquipmentForm(false);
                setEditingEquipment(null);
              }}
              initialData={editingEquipment || undefined}
            />
          </DialogContent>
        </Dialog> */}
      </CardContent>
    </Card>
  );
};
