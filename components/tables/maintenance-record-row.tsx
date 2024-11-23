// components/MaintenanceRecords/MaintenanceRecordRow.tsx
import { maintanace_state, MaintenanceRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { EditIcon, Trash2, ChevronUp, ChevronDown } from "lucide-react";
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
  isEditing: boolean;
}

export function MaintenanceRecordRow({
  equipment_id,
  lab_id,
  mode,
  record,
  onEdit,
  onDelete,
  isEditing,
}: MaintenanceRecordRowProps) {
  const [showHistory, setShowHistory] = useState(false);
  console.log(record);

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
        <TableCell className="dark:text-gray-300 px-4 py-2">
          <CellDescription description={record.description} />
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
            >
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
    done: "success",
    "need maintance": "warning",
    "late maintance": "destructive",
    calibrated: "success",
    "need calibration": "warning",
    "late calibration": "destructive",
  };

  return <Badge variant={variants[state]}>{state}</Badge>;
};

// Add CellDescription component
const CellDescription = ({ description }: { description: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!description) {
    return <div className="text-center text-gray-500">-</div>;
  }

  return (
    <div className="relative">
      <details 
        className="cursor-pointer"
        onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="text-sm font-medium hover:text-blue-600">
          {!isOpen && (
            <>
              {description.slice(0, 50)}
              {description.length > 50 && "..."}
            </>
          )}
        </summary>
        <div className="mt-2 whitespace-pre-wrap">{description}</div>
      </details>
    </div>
  );
};

// Add ActionButtons component
interface ActionButtonsProps {
  recordId: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isEditing: boolean;
}

const ActionButtons = ({
  recordId,
  onEdit,
  onDelete,
  isEditing,
}: ActionButtonsProps) => {
  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => onEdit(recordId)}>
        <EditIcon className="h-4 w-4 mr-2" />
        {isEditing ? "Cancel" : "Edit"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-100"
        onClick={() => onDelete(recordId)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    </div>
  );
};
