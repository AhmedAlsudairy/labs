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
import { addCalibrationHistory, addMaintenanceHistory } from "@/actions/admin";
import { calculateNextDate } from "@/utils/utils";
import { Frequency } from "@/types";

interface MaintenanceHistoryFormProps {
  mode: 'maintenance' | 'calibration';
  scheduleId: number;
  frequency: Frequency;
  onSuccess: () => void;
}

const baseSchema = {
  performed_date: z.date(),
  completed_date: z.date(),
  state: z.enum(["done", "need maintance", "late maintance"]),
  description: z.string().min(1, "Description is required"),
  technician_notes: z.string(),
};

const maintenanceSchema = z.object({
  ...baseSchema,
  work_performed: z.string().min(1, "Work performed is required"),
  parts_used: z.string(),
  next_maintenance_date: z.date(),
});

const calibrationSchema = z.object({
  ...baseSchema,
  calibration_results: z.string().min(1, "Calibration results are required"),
  next_calibration_date: z.date(),
});

// First define the base types
type BaseHistory = {
  performed_date: Date;
  completed_date: Date;
  state: "done" | "need maintance" | "late maintance";
  description: string;
  technician_notes: string;
};

type MaintenanceData = BaseHistory & {
  work_performed: string;
  parts_used: string;
  next_maintenance_date: Date;
  schedule_id: number;
};

type CalibrationData = BaseHistory & {
  calibration_results: string;
  next_calibration_date: Date;
  calibration_schedule_id: number;
};

export function MaintenanceHistoryForm({ 
  mode,
  scheduleId, 
  frequency,
  onSuccess 
}: MaintenanceHistoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSchema = mode === 'maintenance' ? maintenanceSchema : calibrationSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      technician_notes: "",
      state: "done",
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
        await addMaintenanceHistory(maintenanceData);
      } else {
        const calibrationData: CalibrationData = {
          ...values,
          calibration_schedule_id: scheduleId,
          next_calibration_date: new Date(nextDate),
          calibration_results: (values as CalibrationData).calibration_results || '',
        };
        await addCalibrationHistory(calibrationData);
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
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="need maintance">Need Maintenance</SelectItem>
                  <SelectItem value="late maintance">Late Maintenance</SelectItem>
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