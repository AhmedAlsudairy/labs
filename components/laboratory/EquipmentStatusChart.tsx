// components/laboratory/EquipmentStatusChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Equipment } from '@/types';
import { updateUserRole } from '@/actions/admin';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface EquipmentStatusChartProps {
  equipment: Equipment[];
}

export const EquipmentStatusChart: React.FC<EquipmentStatusChartProps> = ({ equipment }) => {
  const statusCount = equipment.reduce((acc, eq) => {
    acc[eq.status] = (acc[eq.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

updateUserRole