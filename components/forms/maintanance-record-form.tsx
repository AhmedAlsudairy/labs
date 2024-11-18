// components/AddMaintenanceRecordForm.tsx
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Frequency, maintanace_role, maintanace_state } from "@/types"
import { addMaintenanceRecord, updateMaintenanceRecord } from "@/actions/admin"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { DatePicker } from "../ui/date-picker"

const frequencies: Frequency[] = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'biannual',
  'annually'
]

const responsibleOptions = [
  'lab in charge',
  'biomedical', 
  'company engineer',
  'lab technician'
] as const;

const formSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annually']),
  responsible: z.enum(['lab in charge', 'biomedical', 'company engineer', 'lab technician']),
})

type FormValues = z.infer<typeof formSchema>

// Add interface for initial data
interface MaintenanceRecordData {
  id?: number; // Add id field
  date?: string;
  description?: string;
  frequency?: Frequency;
  responsible?: maintanace_role;
  state?: maintanace_state;
}

interface AddMaintenanceRecordFormProps {
  equipmentId: number;
  initialData?: MaintenanceRecordData; // Should include id if editing
  onSuccess?: () => void;
}

export function AddMaintenanceRecordForm({ 
  equipmentId, 
  initialData, 
  onSuccess 
}: AddMaintenanceRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      description: initialData?.description || "",
      frequency: initialData?.frequency || "monthly",
      responsible: initialData?.responsible || "biomedical",
    },
  });

  // Add form state watch
  const watchedValues = form.watch();
  console.log('Form values:', watchedValues);

  // Add effect to monitor form changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => 
      console.log('Form updated:', { name, type, value })
    );
    return () => subscription.unsubscribe();
  }, [form]);

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      if (isEditMode) {
        if (!initialData?.id) {
          throw new Error("Record ID is required for updates");
        }
        await updateMaintenanceRecord(
          initialData.id, // Add the record ID as first argument
          {
            ...values,
            equipmentId,
          }
        );
        toast({
          title: "Success",
          description: "Maintenance record updated successfully",
        });
      } else {
        await addMaintenanceRecord({
          ...values,
          equipmentId,
        });
        toast({
          title: "Success",
          description: "Maintenance record added successfully",
        });
      }
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} maintenance record`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <DatePicker
                date={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frequencies.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsible"
          render={({ field }) => {
            console.log('Responsible field value:', field.value); // Debug current value
            return (
              <FormItem>
                <FormLabel>Responsible</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    console.log('New responsible value:', value); // Debug new value
                    field.onChange(value);
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select responsible person" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {responsibleOptions.map((responsible) => (
                      <SelectItem key={responsible} value={responsible}>
                        {responsible.split(' ').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter maintenance details"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding..." : "Add Maintenance Record"}
        </Button>
      </form>
    </Form>
  )
}