import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Frequency, EquipmentHistory } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Search, Plus, RefreshCw } from "lucide-react";
import { DescriptionModal } from "../ui/description-modal";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { ExternalControlHistoryForm } from "../forms/external-control-history-form";
import { getHistoryByExternalControlId } from "@/actions/admin/history";

// Types
interface ExternalControlHistory {
  history_id: number;
  external_control_id: number;
  performed_date: string;
  state: 'Done' | 'Final Date' | 'E.Q.C Reception';
  description: string;
  updated_by: string;
  last_updated: string;
}

interface ExternalControlHistoryTableProps {
  equipment_id: number;
  controlId: number;
  frequency: Frequency;
  lab_id: number;
  onRefresh: () => void;
}

// State Indicator for External Control
function ExternalControlStateIndicator({ state }: { state: string }) {
  const getVariant = (state: string): "success" | "warning" | "destructive" | "default" => {
    switch (state) {
      case 'Done':
        return 'success';
      case 'Final Date':
        return 'warning';
      case 'E.Q.C Reception':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return <Badge variant={getVariant(state)}>{state}</Badge>;
}

// ExternalControlHistoryTable Component
export function ExternalControlHistoryTable({
  equipment_id,
  lab_id,
  controlId,
  frequency,
  onRefresh
}: ExternalControlHistoryTableProps) {
  const [histories, setHistories] = useState<ExternalControlHistory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<{
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    console.log("ExternalControlHistoryTable useEffect running with controlId:", controlId);
    console.log("ControlId type:", typeof controlId);
    console.log("Is valid number:", !isNaN(Number(controlId)));

    const fetchHistories = async () => {
      try {
        // Validate controlId is a valid number before making the API call
        if (controlId === undefined || controlId === null) {
          console.log("ControlId is undefined or null:", controlId);
          return;
        }
        
        if (isNaN(Number(controlId))) {
          console.log("ControlId is not a valid number:", controlId);
          return;
        }

        // Ensure controlId is a positive number for database query
        if (Number(controlId) <= 0) {
          console.log("Using a synthetic control ID will not fetch real data:", controlId);
          // Even though we're not fetching, don't return so we can still render the form
        }
        
        if (Number(controlId) > 0) {
          console.log("Attempting to fetch history for controlId:", controlId);
          const { data, error } = await getHistoryByExternalControlId(controlId);
          
          if (error) {
            console.error("Error from database when fetching histories:", error);
            return;
          }
          
          if (data) {
            console.log("Received history data:", data);
            // Map the response data to the component's expected structure
            const formattedData: ExternalControlHistory[] = data.map(item => ({
              history_id: item.history_id || 0,
              external_control_id: item.external_control_id || 0,
              performed_date: item.performed_date || '',
              state: (item.external_control_state || item.state) as 'Done' | 'Final Date' | 'E.Q.C Reception',
              description: item.description || '',
              updated_by: item.updated_by || 'System',
              last_updated: item.last_updated || ''
            }));
            setHistories(formattedData);
          }
        }
      } catch (error) {
        console.error("Exception during fetchHistories:", error);
      }
    };
    fetchHistories();
  }, [controlId]);
  
  const refreshData = async () => {
    console.log("refreshData called with controlId:", controlId);
    try {
      // Similar validation as in useEffect
      if (controlId === undefined || controlId === null) {
        console.log("ControlId is undefined or null during refresh:", controlId);
        return;
      }
      
      if (isNaN(Number(controlId))) {
        console.log("ControlId is not a valid number during refresh:", controlId);
        return;
      }

      // Only try to fetch data for positive IDs
      if (Number(controlId) <= 0) {
        console.log("Using a synthetic control ID will not fetch real data during refresh:", controlId);
        return;
      }
      
      console.log("Attempting to refresh history for controlId:", controlId);
      const { data, error } = await getHistoryByExternalControlId(controlId);
      
      if (error) {
        console.error("Error from database when refreshing histories:", error);
        return;
      }
      
      if (data) {
        console.log("Received refreshed history data:", data);
        const formattedData: ExternalControlHistory[] = data.map(item => ({
          history_id: item.history_id || 0,
          external_control_id: item.external_control_id || 0,
          performed_date: item.performed_date || '',
          state: (item.external_control_state || item.state) as 'Done' | 'Final Date' | 'E.Q.C Reception',
          description: item.description || '',
          updated_by: item.updated_by || 'System',
          last_updated: item.last_updated || ''
        }));
        setHistories(formattedData);
      }
      onRefresh(); // Call the parent's onRefresh callback
    } catch (error) {
      console.error("Exception during refreshData:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            External Control History
          </h4>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshData}
            className="h-8 w-8"
            title="Refresh history"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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
            <ExternalControlHistoryForm
              equipment_id={equipment_id}
              lab_id={lab_id}
              controlId={controlId}
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
              <TableHead className="text-xs font-medium text-gray-500 dark:text-gray-400">Updated By</TableHead>
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
                    {history.state && <ExternalControlStateIndicator state={history.state} />}
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
                  <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                    {history.updated_by || "System"}
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
