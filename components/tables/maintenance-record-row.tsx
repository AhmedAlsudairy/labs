// components/MaintenanceRecords/MaintenanceRecordRow.tsx
import { maintanace_state, MaintenanceRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { EditIcon, Trash2, ChevronUp, ChevronDown, Search, History } from "lucide-react";
import { TableCell, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { useState } from "react";
import { MaintenanceHistoryTable } from "./maintenance-history-table";

interface MaintenanceRecordRowProps {
  equipment_id: number;
  lab_id: number;
  mode: "maintenance" | "calibration";
  record: MaintenanceRecord;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onDescriptionClick: () => void;
  isEditing: boolean;
}

export function MaintenanceRecordRow({
  equipment_id,
  lab_id,
  mode,
  record,
  onEdit,
  onDelete,
  onDescriptionClick,
  isEditing,
}: MaintenanceRecordRowProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <TableRow className="dark:border-gray-700">
        <TableCell className="dark:text-gray-300">
          {record.date
            ? new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              }).format(new Date(record.date))
            : "N/A"}
        </TableCell>
        <TableCell className="dark:text-gray-300">{record.frequency}</TableCell>
        <TableCell className="dark:text-gray-300">
          {record.responsible}
        </TableCell>
        <TableCell className="dark:text-gray-300">
          {record.state && <StateIndicator state={record.state} />}
        </TableCell>
        <TableCell 
          className="dark:text-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group"
          onClick={onDescriptionClick}
        >
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[300px]">{record.description}</span>
            <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <ActionButtons
              recordId={record.id}
              onEdit={onEdit}
              onDelete={onDelete}
              isEditing={isEditing}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1"
            >
              <History className="h-4 w-4" />
              {showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {showHistory && (
        <TableRow>
          <TableCell colSpan={6} className="p-4 bg-gray-50 dark:bg-gray-800">
            <MaintenanceHistoryTable
              equipment_id={equipment_id}
              mode={mode}
              lab_id={lab_id}
              scheduleId={record.id}
              frequency={record.frequency}
              onRefresh={() => {
                // Add refresh logic if needed
              }}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export const StateIndicator = ({ state }: { state: maintanace_state }) => {
  const variants: Record<
    maintanace_state,
    "success" | "warning" | "destructive"
  > = {
    "done": "success",
    "need maintance": "warning",
    "late maintance": "destructive",
    "calibrated": "success",
    "need calibration": "warning",
    "late calibration": "destructive",
  };

  return (
    <Badge variant={variants[state]} className="capitalize">
      {state}
    </Badge>
  );
};

// Add ActionButtons component
interface ActionButtonsProps {
  recordId: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isEditing: boolean;
}

export function ActionButtons({
  recordId,
  onEdit,
  onDelete,
  isEditing,
}: ActionButtonsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(recordId)}
        className={isEditing ? "text-primary" : ""}
      >
        <EditIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(recordId)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </>
  );
}
