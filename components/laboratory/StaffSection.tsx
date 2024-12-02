// components/laboratory/StaffSection.tsx
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DataTable } from './DataTable';
import { Staff } from '@/types';
import { toast } from "@/hooks/use-toast";
import CreateUserForm from '../forms/form-user';
import { assignStaffToLaboratory } from '@/actions/admin/lab';

interface StaffSectionProps {
  staff: Staff[];
  labId: number;
  onStaffUpdated: () => void;
}

export const StaffSection: React.FC<StaffSectionProps> = ({ staff, labId, onStaffUpdated }) => {
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);

  const handleUserCreated = async () => {
    setShowAddStaffForm(false);
    onStaffUpdated();
    toast({
      title: "Success",
      description: "Staff member added successfully",
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Staff</CardTitle>
        <Button 
          onClick={() => setShowAddStaffForm(!showAddStaffForm)}
          className="shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </CardHeader>
      <CardContent>
        {showAddStaffForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <CreateUserForm 
              onUserCreated={handleUserCreated}
              currentUserRole="lab in charge"
              restrictRoles={['lab technician', 'maintance staff']}
              defaultLabId={labId.toString()}
            />
          </div>
        )}
        <DataTable 
          data={staff} 
          columns={['Name', 'Role', 'Email']} 
        />
      </CardContent>
    </Card>
  );
};