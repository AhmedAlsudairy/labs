// components/MaintenanceHistoryForm.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateNextDate } from "@/utils/utils";
import { Frequency, maintanace_state } from "@/types";
import { addCalibrationHistory, addExternalControlHistory, addMaintenanceHistory } from "@/actions/admin/history";
import { CalibrationState, MaintenanceState, ExternalControlState } from "@/lib/types";

interface MaintenanceHistoryFormProps {
  equipment_id: number;
  lab_id: number;
  mode: 'maintenance' | 'calibration' | 'external_control';
  scheduleId: number;
  frequency: Frequency;
  onSuccess: () => void;
}

const maintainanceStates = ["done", "need maintance", "late maintance"] as const;
const calibrationStates = ["calibrated", "need calibration", "late calibration"] as const;
const externalControlStates = ["Done", "Final Date", "E.Q.C Reception"] as const;

const baseSchema = (mode: 'maintenance' | 'calibration' | 'external_control') => ({
  performed_date: z.date(),
  completed_date: z.date(),
  state: mode === 'maintenance' 
    ? z.enum(maintainanceStates)
    : mode === 'calibration'
    ? z.enum(calibrationStates)
    : z.enum(externalControlStates),
  description: z.string().min(1, "Description is required"),
  technician_notes: z.string(),
});

const maintenanceSchema = z.object({
  ...baseSchema('maintenance'),
  work_performed: z.string().min(1, "Work performed is required"),
  parts_used: z.string(),
  next_maintenance_date: z.date(),
});

const calibrationSchema = z.object({
  ...baseSchema('calibration'),
  calibration_results: z.string().min(1, "Calibration results are required"),
  next_calibration_date: z.date(),
});

const externalControlSchema = z.object({
  ...baseSchema('external_control'),
  work_performed: z.string().min(1, "Work performed is required"),
  parts_used: z.string(),
  next_date: z.date(),
});

// Base history type without schedule IDs
type BaseHistory = {
  performed_date: Date;
  completed_date: Date;
  description: string;
  technician_notes: string;
};

// Maintenance history type with schedule_id
type MaintenanceData = BaseHistory & {
  work_performed: string;
  parts_used: string;
  next_maintenance_date: Date;
  schedule_id: number;
  state: MaintenanceState;
  calibration_schedule_id?: never;
  external_control_id?: never;
};

// Calibration history type with calibration_schedule_id
type CalibrationData = BaseHistory & {
  calibration_results: string;
  next_calibration_date: Date;
  calibration_schedule_id: number;
  state: CalibrationState;
  schedule_id?: never;
  external_control_id?: never;
};

// External control history type
type ExternalControlData = BaseHistory & {
  work_performed: string;
  parts_used: string;
  next_date: Date;
  external_control_id: number;
  external_control_state: maintanace_state;
  state: maintanace_state;
  schedule_id?: never;
  calibration_schedule_id?: never;
};

export function MaintenanceHistoryForm({ 
  equipment_id,
  lab_id,
  mode,
  scheduleId, 
  frequency,
  onSuccess 
}: MaintenanceHistoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const formSchema = mode === 'maintenance' 
    ? maintenanceSchema 
    : mode === 'calibration'
    ? calibrationSchema.extend({
        state: z.enum(calibrationStates)
      })
    : externalControlSchema.extend({
        state: z.enum(externalControlStates)
      });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      technician_notes: "",
      state: mode === 'maintenance' 
        ? "done" 
        : mode === 'calibration'
        ? "calibrated"
        : "E.Q.C Reception",
      ...(mode === 'maintenance' ? {
        work_performed: "",
        parts_used: "",
      } : mode === 'calibration' ? {
        calibration_results: "",
      } : {
        work_performed: "",
        parts_used: "",
      }),
    },
  });

  useEffect(() => {
    const performed_date = form.getValues('performed_date');
    if (performed_date) {
      const nextDate = new Date(calculateNextDate(frequency, performed_date));
      const dateFieldName = mode === 'maintenance' 
        ? 'next_maintenance_date' 
        : mode === 'calibration'
        ? 'next_calibration_date'
        : 'next_date';
      
      // Ensure the next date is always at least one day after performed date
      if (frequency === 'daily') {
        const next = new Date(performed_date);
        next.setDate(next.getDate() + 1);
        form.setValue(dateFieldName, next);
      } else {
        form.setValue(dateFieldName, nextDate);
      }
    }
  }, [form.watch('performed_date'), frequency, mode]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      const nextDate = calculateNextDate(frequency, values.performed_date);
      
      if (mode === 'maintenance') {
        const maintenanceData: MaintenanceData = {
          ...values,
          schedule_id: scheduleId,
          next_maintenance_date: new Date(nextDate),
          work_performed: (values as any).work_performed || '',
          parts_used: (values as any).parts_used || '',
          state: values.state as MaintenanceState,
        };
        await addMaintenanceHistory(maintenanceData, lab_id, equipment_id);
      } else if (mode === 'calibration') {
        const calibrationData: CalibrationData = {
          ...values,
          calibration_schedule_id: scheduleId,
          next_calibration_date: new Date(nextDate),
          calibration_results: (values as any).calibration_results || '',
          state: values.state as CalibrationState,
        };
        await addCalibrationHistory(calibrationData, lab_id, equipment_id);
      } else {
        const externalControlData: ExternalControlData = {
          ...values,
          external_control_id: scheduleId,
          next_date: new Date(nextDate),
          work_performed: (values as any).work_performed || '',
          parts_used: (values as any).parts_used || '',
          state: values.state as maintanace_state,
          external_control_state: values.state as maintanace_state,
        };
        await addExternalControlHistory(externalControlData, lab_id, equipment_id);
      }

      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="performed_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Performed Date</FormLabel>
                <FormControl>
                  <DatePicker date={field.value} onSelect={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="completed_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Completed Date</FormLabel>
                <FormControl>
                  <DatePicker date={field.value} onSelect={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mode === 'maintenance' ? (
                    <>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="need maintance">Need Maintenance</SelectItem>
                      <SelectItem value="late maintance">Late Maintenance</SelectItem>
                    </>
                  ) : mode === 'calibration' ? (
                    <>
                      <SelectItem value="calibrated">Calibrated</SelectItem>
                      <SelectItem value="need calibration">Need Calibration</SelectItem>
                      <SelectItem value="late calibration">Late Calibration</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="Final Date">Final Date</SelectItem>
                      <SelectItem value="E.Q.C Reception">E.Q.C Reception</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mode Specific Fields */}
        {mode === 'maintenance' || mode === 'external_control' ? (
          <>
            <FormField
              control={form.control}
              name="work_performed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Performed</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parts_used"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parts Used</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : mode === 'calibration' ? (
          <FormField
            control={form.control}
            name="calibration_results"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calibration Results</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="technician_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Technician Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={
            mode === 'maintenance' 
              ? 'next_maintenance_date' 
              : mode === 'calibration'
              ? 'next_calibration_date'
              : 'next_date'
          }
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Next {mode === 'maintenance' ? 'Maintenance' : mode === 'calibration' ? 'Calibration' : 'Control'} Date
              </FormLabel>
              <FormControl>
                <DatePicker date={field.value} onSelect={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}