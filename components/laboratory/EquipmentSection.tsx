// components/laboratory/EquipmentSection.tsx

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Equipment } from '@/types';
import DeviceMaintenanceForm from '../table/device-form';

interface EquipmentSectionProps {
  labId: number;
  equipment: Equipment[];
  onAddEquipment: (equipmentData: Partial<Equipment>) => Promise<void>;
}

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({ labId, equipment, onAddEquipment }) => {
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Equipment</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setShowEquipmentForm(!showEquipmentForm)} className="mb-4">
          {showEquipmentForm ? 'Hide Form' : 'Add New Equipment'}
        </Button>
        {showEquipmentForm && (
          <DeviceMaintenanceForm />
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipment.map((eq) => (
              <TableRow key={eq.id}>
                <TableCell>{eq.name}</TableCell>
                <TableCell>{eq.status}</TableCell>
                <TableCell>
                  <Link href={`/protected/labs/${labId}/${eq.id}`} className="text-blue-500 hover:underline">
                    View Details
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};