// components/laboratory/StaffSection.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from './DataTable';
import { Staff } from '@/types';

interface StaffSectionProps {
  staff: Staff[];
}

export const StaffSection: React.FC<StaffSectionProps> = ({ staff }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Staff</CardTitle>
    </CardHeader>
    <CardContent>
      <DataTable 
        data={staff} 
        columns={['Name', 'Role']} 
      />
    </CardContent>
  </Card>
);