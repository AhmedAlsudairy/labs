import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { MaintenanceHistoryForm } from "../forms/maintenance-history-form";
import { Frequency, EquipmentHistory, MaintenanceEquipmentHistory, CalibrationEquipmentHistory } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { StateIndicator } from "../ui/state-indicator";
import { Search, Plus } from "lucide-react";
import { DescriptionModal } from "../ui/description-modal";
import { getHistoryByCalibrationScheduleId, getHistoryByScheduleId } from "@/actions/admin/history";
import { Card, CardContent } from "../ui/card";

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
export function MaintenanceHistoryTable({equipment_id, lab_id, mode, scheduleId, frequency, onRefresh }: MaintenanceHistoryTableProps) {
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
    return history.calibration_schedule_id !== null && history.calibration_schedule_id !== undefined;
  };

  // Ensure history has necessary fields for display
  const getHistoryDisplayContent = (history: EquipmentHistory): string => {
    if (isCalibrationHistory(history)) {
      return history.calibration_results || 'No results recorded';
    } else {
      return history.work_performed || 'No work recorded';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {mode === 'calibration' ? 'Calibration History' : 'Maintenance History'}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add History
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
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
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Performed Date</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">State</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {mode === 'maintenance' ? 'Work Performed' : 'Calibration Results'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {histories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No history records found
                </TableCell>
              </TableRow>
            ) : (
              histories.map((history) => (
                <TableRow 
                  key={history.history_id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {history.performed_date
                      ? new Intl.DateTimeFormat("en-GB", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                      }).format(new Date(history.performed_date))
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {history.state && <StateIndicator state={history.state} mode={mode} />}
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer group"
                    onClick={() => setSelectedDescription({
                      title: `${mode === 'calibration' ? 'Calibration' : 'Maintenance'} Description`,
                      description: history.description
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px] text-sm text-gray-600 dark:text-gray-300">
                        {history.description}
                      </span>
                      <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                    </div>
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer group"
                    onClick={() => setSelectedDescription({
                      title: mode === 'calibration' ? 'Calibration Results' : 'Work Performed',
                      description: getHistoryDisplayContent(history)
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px] text-sm text-gray-600 dark:text-gray-300">
                        {getHistoryDisplayContent(history)}
                      </span>
                      <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DescriptionModal
        open={!!selectedDescription}
        onClose={() => setSelectedDescription(null)}
        title={selectedDescription?.title || ""}
        description={selectedDescription?.description || ""}
      />
    </div>
  );
}
