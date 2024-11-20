import { MaintenanceRecord } from "@/types";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { AddMaintenanceRecordForm } from "../forms/maintanance-record-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { MaintenanceRecordRow } from "./maintenance-record-row";
import { DeleteConfirmationDialog } from "../ui/delete-confirmation-dialog";

interface MaintenanceRecordsProps {
  mode: "maintenance" | "calibration";
  records: MaintenanceRecord[];
  equipmentId: number;
  onDelete: (id: number) => Promise<void>;
  onSuccess: () => void;
}

export function MaintenanceRecords({
  mode,
  records,
  equipmentId,
  onDelete,
  onSuccess,
}: MaintenanceRecordsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    await onDelete(id);
    setRecordToDelete(null);
  };

  return (
    <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="bg-gray-50 dark:bg-gray-700 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold dark:text-white">
          Maintenance Records
        </CardTitle>
        <Button variant="outline" onClick={() => setShowForm(!showForm)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {showForm ? "Close Form" : "Add Record"}
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg dark:border-gray-700">
            <AddMaintenanceRecordForm
              equipmentId={equipmentId}
              onSuccess={() => {
                onSuccess();
                setShowForm(false);
              }}
            />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="dark:border-gray-700">
              <TableHead className="dark:text-gray-300">Date</TableHead>
              <TableHead className="dark:text-gray-300">Frequency</TableHead>
              <TableHead className="dark:text-gray-300">Responsible</TableHead>
              <TableHead className="dark:text-gray-300">State</TableHead>
              <TableHead className="dark:text-gray-300">Description</TableHead>
              <TableHead className="dark:text-gray-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <React.Fragment key={record.id}>
                <MaintenanceRecordRow
                  mode={mode}
                  record={record}
                  onEdit={(id) => setEditingId(id === editingId ? null : id)}
                  onDelete={(id) => setRecordToDelete(id)}
                  isEditing={editingId === record.id}
                />
                {editingId === record.id && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="p-4 bg-gray-50 dark:bg-gray-800"
                    >
                      <AddMaintenanceRecordForm
                        equipmentId={equipmentId}
                        initialData={record}
                        onSuccess={() => {
                          setEditingId(null);
                          onSuccess();
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

        <DeleteConfirmationDialog
          open={!!recordToDelete}
          onClose={() => setRecordToDelete(null)}
          onConfirm={() => recordToDelete && handleDelete(recordToDelete)}
        />
      </CardContent>
    </Card>
  );
}
