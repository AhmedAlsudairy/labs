// components/MaintenanceHistoryForm.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { calculateNextDate } from "@/utils/date-utils";
import { Frequency, maintanace_state } from "@/types";
import { CalibrationState, MaintenanceState, ExternalControlState } from "@/lib/types";

// Updated imports from history actions - removed toast import
import { 
  addMaintenanceHistory, 
  addCalibrationHistory,
  addExternalControlHistory 
} from "@/actions/admin/history";

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
const externalControlStates = ["Done", "Final Date", "E.Q.C  Reception"] as const;

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
  frequency: Frequency; // Keep frequency for calculations
  calibration_schedule_id?: never;
  external_control_id?: never;
};

// Calibration history type with calibration_schedule_id
type CalibrationData = BaseHistory & {
  calibration_results: string;
  next_calibration_date: Date;
  calibration_schedule_id: number;
  state: CalibrationState;
  frequency: Frequency; // Keep frequency for calculations
  schedule_id?: never;
  work_performed?: never;
  parts_used?: never;
  next_maintenance_date?: never;
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
  frequency: Frequency; // Keep frequency for calculations
  schedule_id?: never;
  calibration_schedule_id?: never;
  next_maintenance_date?: never;
  next_calibration_date?: never;
  calibration_results?: never;
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
  const [error, setError] = useState<string | null>(null);
  
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
        : "Done",
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

  // When the performed_date or completed_date changes, update the next date
  useEffect(() => {
    const performed_date = form.getValues('performed_date');
    const completed_date = form.getValues('completed_date');
    
    // Only calculate if both dates are set
    if (performed_date && completed_date) {
      // Use completed_date as the base for next date calculation
      const nextDate = calculateNextDate(frequency, completed_date);
      
      const dateFieldName = mode === 'maintenance' 
        ? 'next_maintenance_date' 
        : mode === 'calibration'
        ? 'next_calibration_date'
        : 'next_date';
      
      form.setValue(dateFieldName, nextDate);
    }
  }, [form.watch('performed_date'), form.watch('completed_date'), frequency, mode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      setIsSubmitting(true);
      console.log(`Submitting ${mode} history form with values:`, values);
      
      // Reduce timeout to 10 seconds, since our optimizations should make it complete faster
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Submission timed out after 10 seconds')), 10000)
      );
      
      // Calculate next date based on the completed date
      let nextDate;
      if (values.completed_date) {
        if ((mode === 'maintenance' && values.state === 'done') || 
            (mode === 'calibration' && values.state === 'calibrated') ||
            (mode === 'external_control' && values.state === 'Done')) {
          nextDate = calculateNextDate(frequency, values.completed_date);
          console.log(`Calculated next date: ${nextDate} based on completed date: ${values.completed_date}`);
        } else {
          // For other states, still use completed date for consistency
          nextDate = calculateNextDate(frequency, values.completed_date);
        }
      } else {
        // Fallback to current date if somehow completed_date is missing
        nextDate = calculateNextDate(frequency);
        console.log("No completed date provided, using current date to calculate next date");
      }
      
      let result;
      
      try {
        console.log(`Submitting ${mode} data to server...`);
        const submitStartTime = Date.now();
        
        if (mode === 'maintenance') {
          const maintenanceData: MaintenanceData = {
            performed_date: values.performed_date,
            completed_date: values.completed_date,
            description: values.description,
            technician_notes: values.technician_notes,
            schedule_id: scheduleId,
            next_maintenance_date: nextDate,
            work_performed: (values as any).work_performed || '',
            parts_used: (values as any).parts_used || '',
            state: values.state as MaintenanceState,
            frequency: frequency,
          };
          
          console.log("Sending maintenance data:", maintenanceData);
          result = await Promise.race([
            addMaintenanceHistory(maintenanceData, lab_id, equipment_id),
            timeoutPromise
          ]);
        } else if (mode === 'calibration') {
          const calibrationData: CalibrationData = {
            performed_date: values.performed_date,
            completed_date: values.completed_date,
            description: values.description,
            technician_notes: values.technician_notes,
            calibration_schedule_id: scheduleId,
            next_calibration_date: nextDate,
            calibration_results: (values as any).calibration_results || '',
            state: values.state as CalibrationState,
            frequency: frequency, // Keep frequency for calculations
          };
          
          console.log("Sending calibration data:", calibrationData);
          result = await Promise.race([
            addCalibrationHistory(calibrationData, lab_id, equipment_id),
            timeoutPromise
          ]);
        } else {
          const externalControlData: ExternalControlData = {
            performed_date: values.performed_date,
            completed_date: values.completed_date,
            description: values.description,
            technician_notes: values.technician_notes,
            external_control_id: scheduleId,
            next_date: nextDate,
            work_performed: (values as any).work_performed || '',
            parts_used: (values as any).parts_used || '',
            state: values.state as maintanace_state,
            external_control_state: values.state as maintanace_state,
            frequency: frequency, // Keep frequency for calculations
          };
          
          console.log("Sending external control data:", externalControlData);
          result = await Promise.race([
            addExternalControlHistory(externalControlData, lab_id, equipment_id),
            timeoutPromise
          ]);
        }
        
        console.log(`Server responded in ${Date.now() - submitStartTime}ms`);
      } catch (submitError) {
        console.error("Error during server action:", submitError);
        throw submitError;
      }
      
      // Fix error handling with proper type check before using 'in' operator
      if (result && typeof result === 'object' && 'error' in result) {
        console.error("Error submitting form:", result.error);
        const errorMessage = result.error instanceof Error 
          ? result.error.message 
          : "Failed to submit form";
          
        setError(errorMessage);
        return;
      }
      
      // Success handling - no toast notification
      console.log(`${mode.charAt(0).toUpperCase() + mode.slice(1)} history added successfully`);
      
      // Reset the form right away to give immediate user feedback
      form.reset({
        description: "",
        technician_notes: "",
        state: mode === 'maintenance' 
          ? "done" 
          : mode === 'calibration'
          ? "calibrated"
          : "Done",
        ...(mode === 'maintenance' ? {
          work_performed: "",
          parts_used: "",
        } : mode === 'calibration' ? {
          calibration_results: "",
        } : {
          work_performed: "",
          parts_used: "",
        }),
      });
      
      // Explicitly call the success callback
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      // Ensure we always reset the isSubmitting state
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
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
                      <SelectItem value="E.Q.C  Reception">E.Q.C  Reception</SelectItem>
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
          <LoadingButton type="submit" loading={isSubmitting}>
            Submit
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}