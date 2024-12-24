import { MaintenanceRecord } from "@/types";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
import { RecordForm } from "../forms/record-form";
import { Input } from "../ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "../ui/pagination";

interface MaintenanceRecordsProps {
  mode: "maintenance" | "calibration";
  records: MaintenanceRecord[];
  lab_id: number;
  equipmentId: number;
  onDelete: (id: number) => Promise<void>;
  onSuccess: () => void;
}

export function MaintenanceRecords({
  lab_id,
  mode,
  records,
  equipmentId,
  onDelete,
  onSuccess,
}: MaintenanceRecordsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleDelete = async (id: number) => {
    await onDelete(id);
    setRecordToDelete(null);
  };

  // Filter records based on search query
  const filteredRecords = records.filter((record) =>
    Object.values(record).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="bg-gray-50 dark:bg-gray-700 flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold dark:text-white">
          {mode === "maintenance"
            ? "Maintenance Records"
            : "Calibration Records"}
        </CardTitle>
        <Button variant="outline" onClick={() => setShowForm(!showForm)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {showForm ? "Close Form" : "Add Record"}
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg dark:border-gray-700">
            <RecordForm
              mode={mode}
              equipmentId={equipmentId}
              onSuccess={() => {
                onSuccess();
                setShowForm(false);
              }}
            />
          </div>
        )}

        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${mode} records...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

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
            {paginatedRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-4 dark:text-gray-400"
                >
                  {searchQuery
                    ? "No matching records found"
                    : `No ${mode} records found`}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRecords.map((record) => (
                <React.Fragment key={record.id}>
                  <MaintenanceRecordRow
                    equipment_id={equipmentId}
                    lab_id={lab_id}
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
                        <RecordForm
                          mode={mode}
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
              ))
            )}
          </TableBody>
        </Table>

        {filteredRecords.length > 0 && (
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <DeleteConfirmationDialog
          open={!!recordToDelete}
          onClose={() => setRecordToDelete(null)}
          onConfirm={() => recordToDelete && handleDelete(recordToDelete)}
        />
      </CardContent>
    </Card>
  );
}
