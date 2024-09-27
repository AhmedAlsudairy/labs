// components/laboratory/EquipmentUsageChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EquipmentUsage } from '@/types';

interface EquipmentUsageChartProps {
  equipmentUsage: EquipmentUsage[];
}

export const EquipmentUsageChart: React.FC<EquipmentUsageChartProps> = ({ equipmentUsage }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={equipmentUsage}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="usage" fill="#8884d8" name="Usage %" />
    </BarChart>
  </ResponsiveContainer>
);