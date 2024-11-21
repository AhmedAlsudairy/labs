// components/RecordForm.tsx
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Frequency, maintanace_role, maintanace_state } from "@/types"
import { addMaintenanceRecord, updateMaintenanceRecord, addCalibrationRecord, updateCalibrationRecord } from "@/actions/admin"
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
import { DatePicker } from "@/components/ui/date-picker"

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
] as const

const formSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annually']),
  responsible: z.enum(['lab in charge', 'biomedical', 'company engineer', 'lab technician']),
})

type FormValues = z.infer<typeof formSchema>

interface RecordFormProps {
  mode: 'maintenance' | 'calibration'
  equipmentId: number
  initialData?: {
    id?: number
    date?: string
    description?: string
    frequency?: Frequency
    responsible?: maintanace_role
    state?: maintanace_state
  }
  onSuccess?: () => void
}

export function RecordForm({ mode, equipmentId, initialData, onSuccess }: RecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditMode = !!initialData
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date || new Date().toISOString().split('T')[0],
      description: initialData?.description || "",
      frequency: initialData?.frequency || "monthly",
      responsible: initialData?.responsible || "biomedical",
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true)
      if (mode === 'maintenance') {
        if (isEditMode && initialData?.id) {
          await updateMaintenanceRecord(initialData.id, { ...values, equipmentId })
        } else {
          await addMaintenanceRecord({ ...values, equipmentId })
        }
      } else { // Calibration mode
        if (isEditMode && initialData?.id) {
          await updateCalibrationRecord(initialData.id, { ...values, equipmentId })
        } else {
          await addCalibrationRecord({ ...values, equipmentId })
        }
      }
      
      toast({
        title: "Success",
        description: `${mode === 'maintenance' ? 'Maintenance' : 'Calibration'} record ${isEditMode ? 'updated' : 'added'} successfully`,
      })
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} ${mode} record`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formTitle = mode === 'maintenance' ? 'Maintenance' : 'Calibration'
  const buttonText = isSubmitting 
    ? `${isEditMode ? 'Updating' : 'Adding'}...` 
    : `${isEditMode ? 'Update' : 'Add'} ${formTitle} Record`

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
                  placeholder={`Enter ${mode} details`}
                  className="min-h-[100px]"
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
          {buttonText}
        </Button>
      </form>
    </Form>
  )
}