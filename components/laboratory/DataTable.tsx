// components/laboratory/DataTable.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DataTableProps {
  data: any[];
  columns: string[];
}

export const DataTable: React.FC<DataTableProps> = ({ data, columns }) => (
  <Table>
    <TableHeader>
      <TableRow>
        {columns.map((column, index) => (
          <TableHead key={index}>{column}</TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((item, rowIndex) => (
        <TableRow key={rowIndex}>
          {columns.map((column, colIndex) => (
            <TableCell key={colIndex}>{item[column.toLowerCase()]}</TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);