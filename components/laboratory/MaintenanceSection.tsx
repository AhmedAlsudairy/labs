// components/laboratory/MaintenanceSection.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Equipment, MaintenanceRecord } from '@/types';
import { DataTable } from './DataTable';

interface MaintenanceSectionProps {
  maintenanceRecords: MaintenanceRecord[];
  equipment: Equipment[];
  onAddMaintenanceRecord: (maintenanceData: Omit<MaintenanceRecord, 'id'>) => Promise<void>;
}

export const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({ maintenanceRecords, equipment, onAddMaintenanceRecord }) => {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Maintenance Records</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setShowMaintenanceForm(!showMaintenanceForm)} className="mb-4">
          {showMaintenanceForm ? 'Hide Form' : 'Add New Maintenance Record'}
        </Button>
        {/* {showMaintenanceForm && (
          <MaintenanceForm onSubmit={onAddMaintenanceRecord} equipment={equipment} />
        )}
        <DataTable 
          data={maintenanceRecords} 
          columns={['Date', 'Equipment', 'Description']} 
        /> */}
      </CardContent>
    </Card>
  );
};