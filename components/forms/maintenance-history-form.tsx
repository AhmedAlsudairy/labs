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
import { Frequency } from "@/types";
import { addCalibrationHistory, addMaintenanceHistory } from "@/actions/admin/history";

interface MaintenanceHistoryFormProps {
  equipment_id: number;
  lab_id: number;
  mode: 'maintenance' | 'calibration';
  scheduleId: number;
  frequency: Frequency;
  onSuccess: () => void;
}

const maintainanceStates = ["done", "need maintance", "late maintance"] as const;
const calibrationStates = ["calibrated", "need calibration", "late calibration"] as const;

const baseSchema = (mode: 'maintenance' | 'calibration') => ({
  performed_date: z.date(),
  completed_date: z.date(),
  state: mode === 'maintenance' 
    ? z.enum(maintainanceStates)
    : z.enum(calibrationStates),
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

// Base history type without schedule IDs
type BaseHistory = {
  performed_date: Date;
  completed_date: Date;
  state: "done" | "need maintance" | "late maintance" | "calibrated" | "need calibration" | "late calibration";
  description: string;
  technician_notes: string;
};

// Maintenance history type with schedule_id
type MaintenanceData = BaseHistory & {
  work_performed: string;
  parts_used: string;
  next_maintenance_date: Date;
  schedule_id: number;
  calibration_schedule_id?: never; // Ensure this is never set for maintenance
};

// Calibration history type with calibration_schedule_id
type CalibrationData = BaseHistory & {
  calibration_results: string;
  next_calibration_date: Date;
  calibration_schedule_id: number;
  schedule_id?: never; // Ensure this is never set for calibration
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
    : calibrationSchema.extend({
        state: z.enum(calibrationStates)
      });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      technician_notes: "",
      state: mode === 'maintenance' ? "done" : "calibrated",
      ...(mode === 'maintenance' ? {
        work_performed: "",
        parts_used: "",
      } : {
        calibration_results: "",
      }),
    },
  });

  useEffect(() => {
    const performed_date = form.getValues('performed_date');
    if (performed_date) {
      const nextDate = calculateNextDate(frequency, performed_date);
      const dateFieldName = mode === 'maintenance' ? 'next_maintenance_date' : 'next_calibration_date';
      form.setValue(dateFieldName, new Date(nextDate));
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
          work_performed: (values as MaintenanceData).work_performed || '',
          parts_used: (values as MaintenanceData).parts_used || '',
        };
        console.log('Submitting maintenance data:', {
          data: maintenanceData,
          lab_id,
          equipment_id
        });
        await addMaintenanceHistory(maintenanceData, lab_id, equipment_id);
      } else {
        const calibrationData: CalibrationData = {
          ...values,
          calibration_schedule_id: scheduleId,
          next_calibration_date: new Date(nextDate),
          calibration_results: (values as CalibrationData).calibration_results || '',
        };
        console.log('Submitting calibration data:', {
          data: calibrationData,
          lab_id,
          equipment_id,
          scheduleId,
          frequency,
          values
        });
        await addCalibrationHistory(calibrationData, lab_id, equipment_id);
      }

      console.log('Form submission successful');
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

        {/* Common Fields */}
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
                  ) : (
                    <>
                      <SelectItem value="calibrated">Calibrated</SelectItem>
                      <SelectItem value="need calibration">Need Calibration</SelectItem>
                      <SelectItem value="late calibration">Late Calibration</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mode Specific Fields */}
        {mode === 'maintenance' ? (
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
        ) : (
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
        )}

        {/* Common Fields */}
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
          name={mode === 'maintenance' ? 'next_maintenance_date' : 'next_calibration_date'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next {mode === 'maintenance' ? 'Maintenance' : 'Calibration'} Date</FormLabel>
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