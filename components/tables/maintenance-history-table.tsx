import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { MaintenanceHistoryForm } from "../forms/maintenance-history-form";
import { Frequency, EquipmentHistory, MaintenanceEquipmentHistory, CalibrationEquipmentHistory } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { StateIndicator } from "./maintenance-record-row";
import { Search } from "lucide-react";
import { DescriptionModal } from "../ui/description-modal";
import { getHistoryByCalibrationScheduleId, getHistoryByScheduleId } from "@/actions/admin/history";

// Types

interface MaintenanceHistoryTableProps {
  equipment_id: number;
  mode: 'maintenance' | 'calibration';
  scheduleId: number;
  frequency: Frequency;
  lab_id: number;
  onRefresh: () => void;
}

// MaintenanceHistoryTable Component
export function MaintenanceHistoryTable({equipment_id,lab_id, mode, scheduleId, frequency, onRefresh }: MaintenanceHistoryTableProps) {
  const [histories, setHistories] = useState<EquipmentHistory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<{
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    const fetchHistories = async () => {
      const { data } = mode === 'calibration' 
        ? await getHistoryByCalibrationScheduleId(scheduleId)
        : await getHistoryByScheduleId(scheduleId);
      if (data) setHistories(data);
    };
    fetchHistories();
  }, [mode, scheduleId]);

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
          equipment_id={equipment_id}
          lab_id={lab_id}
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
                {history.performed_date
                  ? new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                  }).format(new Date(history.performed_date))
                  : "N/A"}
              </TableCell>
              <TableCell>
                {history.state && <StateIndicator state={history.state} />}
              </TableCell>
              <TableCell 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group"
                onClick={() => setSelectedDescription({
                  title: `${mode === 'calibration' ? 'Calibration' : 'Maintenance'} Description`,
                  description: history.description
                })}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[200px]">{history.description}</span>
                  <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableCell>
              <TableCell 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group"
                onClick={() => setSelectedDescription({
                  title: mode === 'calibration' ? 'Calibration Results' : 'Work Performed',
                  description: isCalibrationHistory(history) 
                    ? history.calibration_results 
                    : history.work_performed
                })}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[200px]">
                    {isCalibrationHistory(history) 
                      ? history.calibration_results 
                      : history.work_performed}
                  </span>
                  <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DescriptionModal
        open={!!selectedDescription}
        onClose={() => setSelectedDescription(null)}
        title={selectedDescription?.title || ""}
        description={selectedDescription?.description || ""}
      />
    </div>
  );
}
