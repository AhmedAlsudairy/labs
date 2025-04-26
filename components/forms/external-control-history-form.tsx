import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { addExternalControlHistory } from "@/actions/admin/history";

// Use capitalized values to match database enum values
const externalControlStates = ["Done", "Final Date", "E.Q.C Reception"] as const;

// Form validation schema
const formSchema = z.object({
  performed_date: z.date(),
  completed_date: z.date(),
  state: z.enum(externalControlStates),
  description: z.string().min(1, "Description is required"),
  technician_notes: z.string(),
  work_performed: z.string().min(1, "Work performed is required"),
  parts_used: z.string(),
  next_date: z.date()
});

// Form data type
type FormData = z.infer<typeof formSchema>;

// External control history data type
type ExternalControlData = {
  performed_date: Date;
  completed_date: Date;
  description: string;
  technician_notes: string;
  work_performed: string;
  parts_used: string;
  next_date: Date;
  external_control_id: number;
  external_control_state: maintanace_state;
  state: maintanace_state;
  frequency: Frequency;
};

// Function to map external control state values between formats
// The form and external_control_state use capitalized values ("Done", "Final Date")
// But the state field requires lowercase values ("done")
function mapExternalControlState(state: string): maintanace_state {
  // Map capitalized to lowercase
  const stateMap: Record<string, maintanace_state> = {
    "Done": "done" as maintanace_state,
    "Final Date": "final date" as maintanace_state,
    "E.Q.C Reception": "e.q.c reception" as maintanace_state,
  };
  
  return stateMap[state] || state as maintanace_state;
}

interface ExternalControlHistoryFormProps {
  equipment_id: number;
  lab_id: number;
  controlId: number;
  frequency: Frequency;
  onSuccess: () => void;
}

export function ExternalControlHistoryForm({
  equipment_id,
  lab_id,
  controlId,
  frequency,
  onSuccess
}: ExternalControlHistoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate next date based on frequency
  const nextDate = calculateNextDate(frequency);

  const defaultValues: Partial<FormData> = {
    performed_date: new Date(),
    completed_date: new Date(),
    state: 'Done', // Use capitalized value to match database enum
    description: "",
    technician_notes: "",
    work_performed: "",
    parts_used: "",
    next_date: nextDate,
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (values: FormData) => {
    console.log(`[DEBUG][${new Date().toISOString()}] Form submission starting with controlId:`, controlId, typeof controlId);
    
    if (!controlId) {
      console.error(`[DEBUG][${new Date().toISOString()}] Error: Control ID is undefined`);
      setError("Control ID is undefined. Please try again or contact support.");
      return;
    }
    
    // Log the form values
    console.log(`[DEBUG][${new Date().toISOString()}] Form values:`, values);
    console.log(`[DEBUG][${new Date().toISOString()}] Selected state:`, values.state, typeof values.state);
    console.log(`[DEBUG][${new Date().toISOString()}] Mapped state:`, mapExternalControlState(values.state));
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Detailed debugging of the control ID
      console.log(`[DEBUG][${new Date().toISOString()}] Control ID details:`);
      console.log(`  • Value:`, controlId);
      console.log(`  • Type:`, typeof controlId);
      console.log(`  • Is negative:`, typeof controlId === 'number' && controlId < 0);
      console.log(`  • Is valid:`, controlId !== undefined && controlId !== null);
      
      // Create the history data object with all properties logged
      const historyData = {
        performed_date: values.performed_date,
        completed_date: values.completed_date,
        description: values.description,
        technician_notes: values.technician_notes,
        work_performed: values.work_performed,
        parts_used: values.parts_used,
        next_date: values.next_date,
        // Always include the actual control ID
        control_id: controlId,
        // State handling
        state: mapExternalControlState(values.state), 
        external_control_state: values.state as maintanace_state,
        frequency: frequency,
      };
      
      // Log each property individually for clarity
      console.log(`[DEBUG][${new Date().toISOString()}] HISTORY DATA DETAILS:`);
      console.log(`  • control_id:`, historyData.control_id, typeof historyData.control_id);
      console.log(`  • state:`, historyData.state);
      console.log(`  • external_control_state:`, historyData.external_control_state);
      console.log(`  • frequency:`, historyData.frequency);
      console.log(`  • performed_date:`, historyData.performed_date);
      console.log(`  • completed_date:`, historyData.completed_date);
      
      // Full data log
      console.log(`[DEBUG][${new Date().toISOString()}] COMPLETE historyData:`, historyData);

      // Pass the data to the API function
      const result = await addExternalControlHistory(
        historyData,
        lab_id,
        equipment_id
      );

      if (result.error) {
        throw result.error;
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting external control history:", error);
      setError("Failed to create history record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Performed Date */}
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

          {/* Completed Date */}
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
          
          {/* State */}
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Final Date">Final Date</SelectItem>
                    <SelectItem value="E.Q.C Reception">E.Q.C Reception</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Work Performed */}
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
        
        {/* Parts Used */}
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

        {/* Description */}
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

        {/* Technician Notes */}
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

        {/* Next Date */}
        <FormField
          control={form.control}
          name="next_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Control Date</FormLabel>
              <FormControl>
                <DatePicker date={field.value} onSelect={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <LoadingButton type="submit" loading={isSubmitting}>
            Submit
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
