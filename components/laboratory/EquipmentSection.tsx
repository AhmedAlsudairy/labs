// components/laboratory/EquipmentSection.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Equipment } from '@/types';
import DeviceMaintenanceForm from '../table/device-form';
import { EditEquipmentForm } from './EditEquipmentForm';
import { toast } from "@/hooks/use-toast";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../ui/pagination';

interface EquipmentSectionProps {
  labId: number;
  equipment: Equipment[];
  onAddEquipment: (equipmentData: Partial<Equipment>) => Promise<void>;
  onEditEquipment: (equipmentId: number, equipmentData: Partial<Equipment>) => Promise<void>;
  onDeleteEquipment: (equipmentId: number) => Promise<void>;
}

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({ 
  labId, 
  equipment, 
  onAddEquipment, 
  onEditEquipment,
  onDeleteEquipment 
}) => {
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleEdit = (equipmentId: number) => {
    setEditingEquipmentId(equipmentId);
  };

  const handleDelete = async (equipmentId: number) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      setIsLoading(true);
      try {
        await onDeleteEquipment(equipmentId);
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
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditSubmit = async (equipmentData: Partial<Equipment>) => {
    if (editingEquipmentId !== null) {
      setIsLoading(true);
      try {
        await onEditEquipment(editingEquipmentId, equipmentData);
        setEditingEquipmentId(null);
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
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddEquipment = async (equipmentData: Partial<Equipment>) => {
    setIsLoading(true);
    try {
      await onAddEquipment(equipmentData);
      setShowEquipmentForm(false);
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
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(equipment.length / itemsPerPage);
  const paginatedEquipment = equipment.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Equipment</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => setShowEquipmentForm(!showEquipmentForm)} 
          className="mb-4"
          disabled={isLoading}
        >
          {showEquipmentForm ? 'Hide Form' : 'Add New Equipment'}
        </Button>
        {showEquipmentForm && (
          <DeviceMaintenanceForm  />
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEquipment.map((eq) => (
              <React.Fragment key={eq.id}>
                <TableRow>
                  <TableCell>{eq.name}</TableCell>
                  <TableCell>{eq.status}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/protected/labs/${labId}/${eq.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Button 
                        onClick={() => handleEdit(eq.id)} 
                        variant="outline" 
                        size="sm"
                        disabled={isLoading}
                      >
                        Edit
                      </Button>
                      <Button 
                        onClick={() => handleDelete(eq.id)} 
                        variant="destructive" 
                        size="sm"
                        disabled={isLoading}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {editingEquipmentId === eq.id && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <EditEquipmentForm 
                        equipment={eq} 
                        onSubmit={handleEditSubmit} 
                        onCancel={() => setEditingEquipmentId(null)} 
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious 
        href="#" 
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
      />
    </PaginationItem>
    {[...Array(totalPages)].map((_, index) => (
      <PaginationItem key={index}>
        <PaginationLink 
          href="#" 
          onClick={() => setCurrentPage(index + 1)}
          isActive={currentPage === index + 1}
        >
          {index + 1}
        </PaginationLink>
      </PaginationItem>
    ))}
    <PaginationItem>
      <PaginationNext 
        href="#" 
        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
      />
    </PaginationItem>
  </PaginationContent>
</Pagination>
      </CardContent>
    </Card>
  );
};