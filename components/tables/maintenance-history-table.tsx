import { addCalibrationHistory, addMaintenanceHistory, getHistoryByCalibrationScheduleId, getHistoryByScheduleId } from "@/actions/admin";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { MaintenanceHistoryForm } from "../forms/maintenance-history-form";
import { Frequency, EquipmentHistory, MaintenanceEquipmentHistory, CalibrationEquipmentHistory } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

// Types

interface MaintenanceHistoryTableProps {
  mode: 'maintenance' | 'calibration';
  scheduleId: number;
  frequency: Frequency;
  onRefresh: () => void;
}

// MaintenanceHistoryTable Component
export function MaintenanceHistoryTable({ mode, scheduleId, frequency, onRefresh }: MaintenanceHistoryTableProps) {
  const [histories, setHistories] = useState<EquipmentHistory[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchHistories = async () => {
      const { data } = mode === 'calibration' 
        ? await getHistoryByCalibrationScheduleId(scheduleId)
        : await getHistoryByScheduleId(scheduleId);
      if (data) setHistories(data);
    };
    fetchHistories();
  }, [mode, scheduleId]);

  const handleSubmit = async (formData: Omit<EquipmentHistory, 'history_id'>) => {
    const addHistory = mode === 'calibration' 
      ? addCalibrationHistory 
      : addMaintenanceHistory;

    await addHistory({
      ...formData,
      [mode === 'calibration' ? 'calibration_schedule_id' : 'schedule_id']: scheduleId
    });
    
    setShowForm(false);
    onRefresh();
  };

  const isCalibrationHistory = (history: EquipmentHistory): history is CalibrationEquipmentHistory => {
    return 'calibration_results' in history;
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">
          {mode === 'calibration' ? 'Calibration History' : 'Maintenance History'}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Hide Form" : `Add ${mode} History`}
        </Button>
      </div>

      {showForm && (
        <MaintenanceHistoryForm
          mode={mode}
          scheduleId={scheduleId}
          frequency={frequency}
          onSuccess={() => {
            setShowForm(false);
            onRefresh();
          }}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Performed Date</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Description</TableHead>
            {mode === 'maintenance' ? (
              <TableHead>Work Performed</TableHead>
            ) : (
              <TableHead>Calibration Results</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {histories.map((history) => (
            <TableRow key={history.history_id}>
              <TableCell>
                {new Date(history.performed_date).toLocaleDateString()}
              </TableCell>
              <TableCell>{history.state}</TableCell>
              <TableCell>{history.description}</TableCell>
              <TableCell>
                {isCalibrationHistory(history) 
                  ? history.calibration_results 
                  : history.work_performed}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
