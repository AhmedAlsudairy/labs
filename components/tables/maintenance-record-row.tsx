// components/MaintenanceRecords/MaintenanceRecordRow.tsx
import { maintanace_state, MaintenanceRecord } from "@/types";
import { ExternalControlState, MaintenanceRole, Frequency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, EditIcon, Trash2, Info } from "lucide-react";
import { TableCell, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { useState } from "react";
import { MaintenanceHistoryTable } from "./maintenance-history-table";
import { DescriptionModal } from "./description-modal";
import { format } from 'date-fns';
import { ExternalControlDetail } from "./external-control-detail";

export type RecordMode = 'maintenance' | 'calibration' | 'external_control';

interface MaintenanceRecordRowProps {
  record: MaintenanceRecord;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  mode: RecordMode;
  equipment_id: number;
  lab_id: number;
  isEditing?: boolean;
}

export default function MaintenanceRecordRow({
  record,
  onDelete,
  onEdit,
  mode,
  equipment_id,
  lab_id,
  isEditing = false
}: MaintenanceRecordRowProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showExternalControlDetail, setShowExternalControlDetail] = useState(false);

  const getStateColor = (state: string): "success" | "warning" | "destructive" | "default" => {
    if (mode === 'external_control') {
      switch (state) {
        case 'Done':
          return 'success';
        case 'Final Date':
          return 'warning';
        case 'E.Q.C  Reception':
          return 'destructive';
        default:
          return 'default';
      }
    } else {
      const variants: Record<string, "success" | "warning" | "destructive"> = {
        "done": "success",
        "need maintance": "warning",
        "late maintance": "destructive",
        "calibrated": "success",
        "need calibration": "warning",
        "late calibration": "destructive",
      };

      return variants[state] || 'default';
    }
  };

  // Default values for external control properties
  const getExternalControlNextDate = (): string => {
    return record.date || new Date().toISOString().split('T')[0];
  };

  const getExternalControlState = (): ExternalControlState => {
    // Convert any maintenance state to appropriate external control state
    if (record.state === 'done') {
      return 'Done';
    } else if (record.state === 'Final Date' || record.state === 'need maintance' || record.state === 'need calibration') {
      return 'Final Date';
    } else {
      return 'E.Q.C  Reception';
    }
  };

  const getResponsible = (): MaintenanceRole => {
    // Ensure we have a valid MaintenanceRole value
    const validRoles: MaintenanceRole[] = ['lab in charge', 'biomedical', 'company engineer', 'lab technician'];
    return validRoles.includes(record.responsible as MaintenanceRole) 
      ? (record.responsible as MaintenanceRole) 
      : 'lab technician';
  };

  const getFrequency = (): Frequency => {
    const validFrequencies: Frequency[] = ['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annually'];
    return validFrequencies.includes(record.frequency as Frequency)
      ? (record.frequency as Frequency)
      : 'monthly';
  };

  return (
    <>
      <TableRow className="dark:border-gray-700 group">
        <TableCell className="dark:text-gray-300">
          {record.date && (() => {
            // Normalize date to noon to prevent timezone issues
            const dateObj = new Date(record.date);
            // Set to noon to avoid timezone shifts
            dateObj.setHours(12, 0, 0, 0);
            return format(dateObj, 'dd/MM/yyyy');
          })()}
        </TableCell>
        <TableCell className="dark:text-gray-300">
          {record.frequency}
        </TableCell>
        <TableCell className="dark:text-gray-300">
          {record.responsible}
        </TableCell>
        <TableCell className="dark:text-gray-300">
          {record.state && (
            <Badge variant={getStateColor(record.state)} className="capitalize">
              {record.state}
            </Badge>
          )}
        </TableCell>
        <TableCell 
          className="dark:text-gray-300 px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => setShowDescription(true)}
        >
          <div className="flex items-center">
            <span className="truncate max-w-[200px]">{record.description}</span>
            <Info className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </TableCell>
        <TableCell className="space-x-2">
          <div className="flex items-center">
            <ActionButtons
              recordId={record.id}
              onEdit={onEdit}
              onDelete={onDelete}
              isEditing={isEditing}
            />
            {mode === 'external_control' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExternalControlDetail(!showExternalControlDetail)}
                className="ml-2"
              >
                {showExternalControlDetail ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="ml-2"
              >
                {showHistory ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Show external control detail and history */}
      {mode === 'external_control' && showExternalControlDetail && (
        <TableRow>
          <TableCell colSpan={6} className="p-0 border-t-0">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg m-2">
              {/* Convert record to ExternalControl format with proper type handling */}
              <ExternalControlDetail
                control={{
                  control_id: record.id,
                  equipment_id: record.equipmentId,
                  next_date: getExternalControlNextDate(),
                  frequency: getFrequency(),
                  state: getExternalControlState(),
                  responsible: getResponsible(),
                  description: record.description || 'External control record',
                  updated_by: 'manual',
                  last_updated: new Date().toISOString()
                }}
                lab_id={lab_id}
                onRefresh={() => {}}
              />
            </div>
          </TableCell>
        </TableRow>
      )}

      {/* Existing maintenance/calibration history display */}
      {mode !== 'external_control' && showHistory && (
        <TableRow>
          <TableCell colSpan={6} className="p-0 border-t-0">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg m-2">
              <MaintenanceHistoryTable
                equipment_id={equipment_id}
                mode={mode}
                lab_id={lab_id}
                scheduleId={record.id}
                frequency={getFrequency()}
                onRefresh={() => {}}
              />
            </div>
          </TableCell>
        </TableRow>
      )}

      <DescriptionModal
        isOpen={showDescription}
        onClose={() => setShowDescription(false)}
        title={`${mode === 'maintenance' ? 'Maintenance' : mode === 'calibration' ? 'Calibration' : 'External Control'} Description`}
        description={record.description || 'No description available'}
      />
    </>
  );
}

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
  isEditing
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
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
}
