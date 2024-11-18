"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getEquipmentById,
  getMaintenanceRecords,
  getExternalControls,
  getCalibrationRecords,
  deleteMaintenanceRecord,
} from "@/actions/admin";
import {
  Equipment,
  MaintenanceRecord,
  ExternalControl,
  CalibrationData,
  maintanace_state,
} from "@/types";
import { useTheme } from "next-themes";
import { formatDeviceAge } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { EditIcon, PlusCircle } from "lucide-react";
import { AddMaintenanceRecordForm } from "@/components/forms/maintanance-record-form";
import { AddCalibrationRecordForm } from "@/components/forms/calibration-form";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react"; // for delete icon

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div
      role="alert"
      className="p-4 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      <h2 className="text-lg font-semibold mb-2">Something went wrong:</h2>
      <pre className="text-sm overflow-auto">{error.message}</pre>
    </div>
  );
}

export default function EquipmentPage() {
  const params = useParams();
  const labId = parseInt(params.id as string);
  const equipmentId = parseInt(params.equipmentId as string);
  const { theme } = useTheme();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [externalControls, setExternalControls] = useState<ExternalControl[]>(
    []
  );
  const [calibrationData, setCalibrationData] = useState<CalibrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

  console.log("URL params:", { labId, equipmentId });

  const fetchDataWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to fetch data (attempt ${i + 1})`);
        const [equipmentData, maintenanceData, controlData, calibrationData] =
          await Promise.all([
            getEquipmentById(equipmentId),
            getMaintenanceRecords(equipmentId),
            getExternalControls(equipmentId),
            getCalibrationRecords(equipmentId),
          ]);

        console.log("Fetched equipment data:", equipmentData);
        setEquipment(equipmentData);
        setMaintenanceRecords(maintenanceData);
        setExternalControls(controlData);
        setCalibrationData(calibrationData);
        return;
      } catch (error) {
        console.error(`Error fetching data (attempt ${i + 1}):`, error);
        if (i === retries - 1) throw error;
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMaintenanceRecord(id);
      fetchDataWithRetry(); // Refresh the list
      setRecordToDelete(null); // Close dialog
    } catch (error) {
      console.error("Failed to delete record:", error);
      // Add toast notification here if you have one
    }
  };

  useEffect(() => {
    if (!equipmentId || isNaN(equipmentId)) {
      console.error("Invalid equipment ID:", equipmentId);
      setError("Invalid equipment ID");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchDataWithRetry()
      .catch((error) => {
        console.error("Failed to fetch data after retries:", error);
        setError("Failed to load equipment data. Please try again later.");
      })
      .finally(() => setIsLoading(false));
  }, [equipmentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen dark:text-white">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen dark:text-white">
        {error}
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-screen dark:text-white">
        Equipment not found
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="container mx-auto p-4 lg:p-8 max-w-7xl dark:bg-gray-900 dark:text-white transition-colors duration-200">
        <h1 className="text-3xl lg:text-4xl font-bold mb-8 text-center">
          {equipment.name}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-700">
              <CardTitle className="text-xl font-semibold dark:text-white">
                Equipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Model" value={equipment.model} />
                <InfoItem
                  label="Serial Number"
                  value={equipment.serialNumber}
                />
                <InfoItem label="Manufacturer" value={equipment.manufacturer} />

                <InfoItem label="Status" value={equipment.status} />
                <InfoItem label="Lab Section" value={equipment.labSection} />
                <InfoItem label="Type" value={equipment.type} />
                <InfoItem
                  label="Manufacture Date"
                  value={equipment.manufactureDate}
                />
                <InfoItem label="Receipt Date" value={equipment.receiptDate} />
                <InfoItem label="Supplier" value={equipment.supplier} />
                <InfoItem
                  label="Device Age"
                  value={
                    equipment.receiptDate
                      ? formatDeviceAge(
                          new Date(equipment.receiptDate),
                          new Date()
                        )
                      : "N/A"
                  }
                />
              </div>
              <p className="mt-4">
                <strong>Description:</strong> {equipment.description}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="bg-gray-50 dark:bg-gray-700">
              <CardTitle className="text-xl font-semibold dark:text-white">
                Equipment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: "Maintenance", value: maintenanceRecords.length },
                    { name: "Controls", value: externalControls.length },
                    { name: "Calibrations", value: calibrationData.length },
                  ]}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme === "dark" ? "#374151" : "#ccc"}
                  />
                  <XAxis
                    dataKey="name"
                    stroke={theme === "dark" ? "#9CA3AF" : "#666"}
                  />
                  <YAxis stroke={theme === "dark" ? "#9CA3AF" : "#666"} />
                  <Tooltip
                    contentStyle={
                      theme === "dark"
                        ? { backgroundColor: "#1F2937", border: "none" }
                        : undefined
                    }
                  />
                  <Bar
                    dataKey="value"
                    fill={theme === "dark" ? "#60A5FA" : "#8884d8"}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="maintenance" className="mb-8">
          <TabsList className="justify-center mb-4">
            <TabsTrigger
              value="maintenance"
              className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Maintenance
            </TabsTrigger>

            <TabsTrigger
              value="calibration"
              className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Calibration
            </TabsTrigger>
            <TabsTrigger
              value="controls"
              className="px-6 py-2 dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              External Controls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maintenance">
            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="bg-gray-50 dark:bg-gray-700 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold dark:text-white">
                  Maintenance Records
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(!showForm)}
                >
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
                        fetchDataWithRetry();
                        setShowForm(false); // Close form after success
                      }}
                    />
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-gray-700">
                      <TableHead className="dark:text-gray-300">Date</TableHead>
                      <TableHead className="dark:text-gray-300">
                        Frequency
                      </TableHead>
                      <TableHead className="dark:text-gray-300">
                        responsible
                      </TableHead>
                      <TableHead className="dark:text-gray-300">
                        State
                      </TableHead>
                      <TableHead className="dark:text-gray-300">
                        Description
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRecords.map((record) => (
                      <React.Fragment key={record.id}>
                        <TableRow className="dark:border-gray-700">
                          <TableCell className="dark:text-gray-300">
                            {record.date
                              ? new Date(record.date).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {record.frequency}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {record.responsible}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {record.state && (
                              <StateIndicator state={record.state} />
                            )}
                          </TableCell>
                          <TableCell className="dark:text-gray-300 px-4 py-2">
                            <div className="relative">
                              {record.description && (
                                <details className="cursor-pointer">
                                  <summary className="text-sm font-medium hover:text-blue-600">
                                    {record.description.slice(0, 50)}
                                    {record.description.length > 50 && "..."}
                                  </summary>
                                  <div className="mt-2 whitespace-pre-wrap">
                                    {record.description}
                                  </div>
                                </details>
                              )}
                              {!record.description && (
                                <div className="text-center text-gray-500">
                                  -
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEditingId(
                                    editingId === record.id ? null : record.id
                                  )
                                }
                              >
                                <EditIcon className="h-4 w-4 mr-2" />
                                {editingId === record.id ? "Cancel" : "Edit"}
                              </Button>

                              <Dialog
                                open={recordToDelete === record.id}
                                onOpenChange={(open) =>
                                  !open && setRecordToDelete(null)
                                }
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => setRecordToDelete(record.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Confirm Deletion</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this
                                      maintenance record? This action cannot be
                                      undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        setRecordToDelete(null)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        record.id && handleDelete(record.id)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
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
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls">
            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="bg-gray-50 dark:bg-gray-700">
                <CardTitle className="text-xl font-semibold dark:text-white">
                  External Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={externalControls}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme === "dark" ? "#374151" : "#ccc"}
                    />
                    <XAxis
                      dataKey="date"
                      stroke={theme === "dark" ? "#9CA3AF" : "#666"}
                    />
                    <YAxis stroke={theme === "dark" ? "#9CA3AF" : "#666"} />
                    <Tooltip
                      contentStyle={
                        theme === "dark"
                          ? { backgroundColor: "#1F2937", border: "none" }
                          : undefined
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="result"
                      fill={theme === "dark" ? "#60A5FA" : "#8884d8"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calibration">
            <Card className="shadow-lg dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="bg-gray-50 dark:bg-gray-700 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-semibold dark:text-white">
                  Calibration Records
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(!showForm)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {showForm ? "Close Form" : "Add Record"}
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {showForm && (
                  <div className="mb-6 p-4 border rounded-lg dark:border-gray-700">
                    <AddCalibrationRecordForm
                      equipmentId={equipmentId}
                      onSuccess={() => {
                        fetchDataWithRetry();
                        setShowForm(false); // Close form after success
                      }}
                    />
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-gray-700">
                      <TableHead className="dark:text-gray-300">Date</TableHead>
                      <TableHead className="dark:text-gray-300">
                        Frequency
                      </TableHead>
                      <TableHead className="dark:text-gray-300">
                        Description
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calibrationData.map((record) => (
                      <TableRow
                        key={record.id}
                        className="dark:border-gray-700"
                      >
                        <TableCell className="dark:text-gray-300">
                          {record.date
                            ? new Date(record.date).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {record.frequency}
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {record.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <strong className="dark:text-gray-300">{label}:</strong>{" "}
    <span className="dark:text-gray-400">{value}</span>
  </div>
);

const StateIndicator = ({ state }: { state: maintanace_state }) => {
  const variants: Record<
    maintanace_state,
    "success" | "warning" | "destructive"
  > = {
    done: "success",
    "need maintance": "warning",
    "late maintance": "destructive",
  };

  return <Badge variant={variants[state]}>{state}</Badge>;
};
