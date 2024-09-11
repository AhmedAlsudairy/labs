import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Laboratory } from "@/types"

interface LaboratoriesByStateChartProps {
  laboratories: Laboratory[];
}

export default function LaboratoriesByStateChart({ laboratories }: LaboratoriesByStateChartProps) {
  const data = Object.entries(
    laboratories.reduce((acc, lab) => {
      acc[lab.location_state] = (acc[lab.location_state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([state, count]) => ({ state, count }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laboratories by State</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="state" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}