import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createDowntimeRecord, updateDowntimeRecord } from "@/actions/admin/index";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, CalendarIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { DescriptionModal } from "@/components/ui/description-modal";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const formSchema = z.object({
  start_date: z.date({
    required_error: "Start date is required",
  }),
  end_date: z.date({
    required_error: "End date is required",
  }),
  type: z.string().min(1, "Type is required"),
  reason: z.string().min(1, "Reason is required"),
  affected_tests: z.string().min(1, "Affected tests are required"),
});

interface DowntimeRecord {
  record_id: number;
  equipment_id: number;
  start_date: string;
  end_date: string;
  type: string;
  reason: string;
  affected_tests: string;
}

interface DowntimeRecordsProps {
  records: DowntimeRecord[];
  equipmentId: number;
  lab_id: number;
  onDelete: (id: number) => void;
  onSuccess: () => void;
}

export function DowntimeRecords({
  records,
  equipmentId,
  lab_id,
  onDelete,
  onSuccess,
}: DowntimeRecordsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DowntimeRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDescription, setSelectedDescription] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const itemsPerPage = 5;
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "",
      reason: "",
      affected_tests: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const requestData = {
        equipment_id: Number(equipmentId),
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: format(values.end_date, 'yyyy-MM-dd'),
        type: values.type,
        reason: values.reason,
        affected_tests: values.affected_tests,
      };

      if (editingRecord) {
        await updateDowntimeRecord(editingRecord.record_id, requestData);
        toast({
          title: "Success",
          description: "Downtime record updated successfully",
        });
      } else {
        await createDowntimeRecord(requestData);
        toast({
          title: "Success",
          description: "Downtime record created successfully",
        });
      }

      setShowForm(false);
      setEditingRecord(null);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Error saving downtime record:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save downtime record",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record: DowntimeRecord) => {
    form.reset({
      start_date: new Date(record.start_date),
      end_date: new Date(record.end_date),
      type: record.type,
      reason: record.reason,
      affected_tests: record.affected_tests,
    });
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    form.reset();
  };

  const handleDeleteClick = (recordId: number) => {
    setRecordToDelete(recordId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      onDelete(recordToDelete);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      toast({
        title: "Success",
        description: "Record deleted successfully",
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  const filteredRecords = records.filter((record) =>
    Object.values(record).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Downtime Records</h2>
        <Button onClick={() => setShowForm(!showForm)} disabled={isSubmitting}>
          {showForm ? 'Cancel' : 'Add New Record'}
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingRecord ? 'Edit Downtime Record' : 'Add New Downtime Record'}
          </h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Maintenance, Breakdown, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed reason for downtime"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="affected_tests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affected Tests</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List all affected tests"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRecord ? 'Update' : 'Submit'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Duration (Days)</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Affected Tests</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!paginatedRecords || paginatedRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                {searchQuery ? 'No matching records found' : 'No downtime records found'}
              </TableCell>
            </TableRow>
          ) : (
            paginatedRecords.map((record) => {
              const startDate = new Date(record.start_date);
              const endDate = new Date(record.end_date);
              const downtimeDays = differenceInDays(endDate, startDate) + 1;

              return (
                <TableRow key={record.record_id}>
                  <TableCell>{format(startDate, 'PP')}</TableCell>
                  <TableCell>{format(endDate, 'PP')}</TableCell>
                  <TableCell className="font-medium">
                    {downtimeDays} {downtimeDays === 1 ? 'day' : 'days'}
                  </TableCell>
                  <TableCell>{record.type}</TableCell>
                  <TableCell 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group"
                    onClick={() => setSelectedDescription({
                      title: "Downtime Reason",
                      description: record.reason
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{record.reason}</span>
                      <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group"
                    onClick={() => setSelectedDescription({
                      title: "Affected Tests",
                      description: record.affected_tests
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">{record.affected_tests}</span>
                      <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(record)}
                        disabled={isSubmitting}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteClick(record.record_id)}
                        disabled={isSubmitting}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
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
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

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
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />

      <DescriptionModal
        open={!!selectedDescription}
        onClose={() => setSelectedDescription(null)}
        title={selectedDescription?.title || ""}
        description={selectedDescription?.description || ""}
      />
    </div>
  );
}
