import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { MaintenanceHistoryForm } from "../forms/maintenance-history-form";
import { Frequency, EquipmentHistory, ExternalControlHistory } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Search, Plus } from "lucide-react";
import { DescriptionModal } from "../ui/description-modal";
import { getHistoryByExternalControlId } from "@/actions/admin/history";
import { Card, CardContent } from "../ui/card";

// Helper function to check if a history item is an external control history
function isExternalControlHistory(history: EquipmentHistory): history is ExternalControlHistory {
  return 'external_control_id' in history && history.external_control_id !== undefined;
}

interface ExternalControlHistoryTableProps {
  equipment_id: number;
  controlId: number;
  frequency: Frequency;
  lab_id: number;
  onRefresh: () => void;
}

export function ExternalControlHistoryTable({
  equipment_id,
  lab_id,
  controlId,
  frequency,
  onRefresh
}: ExternalControlHistoryTableProps) {
  const [histories, setHistories] = useState<EquipmentHistory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<{
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    const fetchHistories = async () => {
      const { data } = await getHistoryByExternalControlId(controlId);
      if (data) setHistories(data);
    };
    fetchHistories();
  }, [controlId]);

  // Function to get display content for the work performed column
  const getHistoryDisplayContent = (history: EquipmentHistory): string => {
    if (isExternalControlHistory(history)) {
      return history.work_performed || 'No work recorded';
    }
    return 'No work recorded';
  };

  // Function to format the external control state for display
  const formatExternalControlState = (state: string | null): JSX.Element => {
    if (!state) return <span>N/A</span>;
    
    const stateColors: Record<string, string> = {
      'Done': 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      'Final Date': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
      'E.Q.C  Reception': 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
    };
    
    const bgColor = stateColors[state] || 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {state}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          External Control History
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
              mode="external_control"
              scheduleId={controlId}
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
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Work Performed</TableHead>
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
                      ? (() => {
                          // Normalize date to noon to prevent timezone issues
                          const dateObj = new Date(history.performed_date);
                          // Set to noon to avoid timezone shifts
                          dateObj.setHours(12, 0, 0, 0);
                          return new Intl.DateTimeFormat("en-GB", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                          }).format(dateObj);
                        })()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {/* Check if this is an external control history before accessing external_control_state */}
                    {isExternalControlHistory(history) && history.external_control_state && 
                      formatExternalControlState(history.external_control_state)}
                  </TableCell>
                  <TableCell 
                    className="cursor-pointer group"
                    onClick={() => setSelectedDescription({
                      title: "External Control Description",
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
                      title: "Work Performed",
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