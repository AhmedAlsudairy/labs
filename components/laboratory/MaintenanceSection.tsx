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

  console.log('MaintenanceSection - Received records:', maintenanceRecords);
  console.log('MaintenanceSection - Received equipment:', equipment);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Maintenance Records ({maintenanceRecords?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setShowMaintenanceForm(!showMaintenanceForm)} className="mb-4">
          {showMaintenanceForm ? 'Hide Form' : 'Add New Maintenance Record'}
        </Button>
        {/* {showMaintenanceForm && (
          <MaintenanceForm onSubmit={onAddMaintenanceRecord} equipment={equipment} />
        )} */}
        <div className="mt-4">
          {maintenanceRecords && maintenanceRecords.length > 0 ? (
            <div>
              {maintenanceRecords.map((record, index) => (
                <div key={record.id || index} className="mb-2">
                  <pre>{JSON.stringify(record, null, 2)}</pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No maintenance records found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};