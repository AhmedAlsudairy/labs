// components/forms/external-control-form.tsx
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ExternalControlState, Frequency, MaintenanceRole } from "@/lib/types"

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
import { toast } from "@/hooks/use-toast"
import { DatePicker } from "../ui/date-picker"
import { addExternalControl } from "@/actions/admin/external-control"

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

const states: ExternalControlState[] = [
  'Done',
  'Final Date',
  'E.Q.C Reception'
]

const roles: MaintenanceRole[] = [
  'lab in charge',
  'biomedical',
  'company engineer',
  'lab technician'
]

const formSchema = z.object({
  next_date: z.string().min(1, "Next date is required"),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annually']),
  state: z.enum(['Done', 'Final Date', 'E.Q.C Reception']),
  responsible: z.enum(['lab in charge', 'biomedical', 'company engineer', 'lab technician']),
  description: z.string().min(1, "Description is required"),
})

type FormValues = z.infer<typeof formSchema>

type UpdatedBy = 'manual' | 'automatic';

interface ExternalControlFormProps {
  equipment_id: number;
  initialData?: {
    control_id: number;
    next_date: string;
    frequency: Frequency;
    state: ExternalControlState;
    responsible: MaintenanceRole;
    description: string;
  };
  onSuccess?: () => void;
}

export function ExternalControlForm({ 
  equipment_id, 
  initialData,
  onSuccess 
}: ExternalControlFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      next_date: initialData?.next_date || new Date().toISOString().split('T')[0],
      frequency: initialData?.frequency || "monthly",
      state: initialData?.state || "E.Q.C Reception",
      responsible: initialData?.responsible || "lab technician",
      description: initialData?.description || "",
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true)
      await addExternalControl({
        equipment_id: equipment_id,
        updated_by: 'manual' as UpdatedBy,
        last_updated: new Date().toISOString(),
        description: values.description,
        frequency: values.frequency,
        state: values.state,
        next_date: values.next_date,
        responsible: values.responsible,
      })
      toast({
        title: "Success",
        description: "External control record added successfully",
      })
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Error submitting external control:', error)
      toast({
        title: "Error",
        description: "Failed to add external control record",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="next_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Next Date</FormLabel>
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
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsible</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select responsible person" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter control details"
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
          {isSubmitting ? "Saving..." : initialData ? "Update Record" : "Add Record"}
        </Button>
      </form>
    </Form>
  )
}
