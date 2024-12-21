// components/laboratory/StatCards.tsx
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Microscope, ClipboardList, AlertCircle, AlertTriangle } from 'lucide-react';

interface StatCardsProps {
  equipmentCount: number;
  staffCount: number;
  activeEquipmentCount: number;
  maintenanceRecordCount: number;
  needMaintenance: number;
  lateMaintenance: number;
  needCalibration: number;
  lateCalibration: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  equipmentCount,
  staffCount,
  activeEquipmentCount,
  maintenanceRecordCount,
  needMaintenance,
  lateMaintenance,
  needCalibration,
  lateCalibration
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
    <StatCard 
      icon={<Building2 size={48} className="text-blue-500 mb-2" />} 
      value={equipmentCount} 
      label="Total Equipment" 
    />
    <StatCard 
      icon={<Users size={48} className="text-green-500 mb-2" />} 
      value={staffCount} 
      label="Staff Members" 
    />
    <StatCard 
      icon={<Microscope size={48} className="text-yellow-500 mb-2" />} 
      value={activeEquipmentCount} 
      label="Active Equipment" 
    />
    <StatCard 
      icon={<ClipboardList size={48} className="text-purple-500 mb-2" />} 
      value={maintenanceRecordCount} 
      label="Total Records" 
    />
    <StatCard 
      icon={<AlertCircle size={48} className="text-orange-500 mb-2" />} 
      value={needMaintenance} 
      label="Need Maintenance" 
    />
    <StatCard 
      icon={<AlertTriangle size={48} className="text-red-500 mb-2" />} 
      value={lateMaintenance} 
      label="Late Maintenance" 
    />
    <StatCard 
      icon={<AlertCircle size={48} className="text-orange-500 mb-2" />} 
      value={needCalibration} 
      label="Need Calibration" 
    />
    <StatCard 
      icon={<AlertTriangle size={48} className="text-red-500 mb-2" />} 
      value={lateCalibration} 
      label="Late Calibration" 
    />
  </div>
);

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label }) => (
  <Card>
    <CardContent className="flex flex-col items-center justify-center p-6">
      {icon}
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-gray-500 text-center">{label}</p>
    </CardContent>
  </Card>
);