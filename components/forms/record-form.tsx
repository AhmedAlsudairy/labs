// components/RecordForm.tsx
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ExternalControlState, Frequency, MaintenanceRole, MaintenanceState, CalibrationState } from "@/lib/types"
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
import { addMaintenanceRecord, updateMaintenanceRecord } from "@/actions/admin/maintenance-record"
import { addCalibrationRecord, updateCalibrationRecord } from "@/actions/admin/calibration"
import { addExternalControl, updateExternalControl } from "@/actions/admin/external-control"

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

const responsibleOptions: MaintenanceRole[] = [
  'lab in charge',
  'biomedical', 
  'company engineer',
  'lab technician'
]

const externalControlStates: ExternalControlState[] = [
  'Done',
  'Final Date',
  'E.Q.C Reception'
]

const maintenanceStates: MaintenanceState[] = [
  'done',
  'need maintance',
  'late maintance'
]

const calibrationStates: CalibrationState[] = [
  'calibrated',
  'need calibration',
  'late calibration'
]

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annually']),
  responsible: z.enum(['lab in charge', 'biomedical', 'company engineer', 'lab technician']),
  state: z.enum([
    'Done', 'Final Date', 'E.Q.C Reception',
    'done', 'need maintance', 'late maintance',
    'calibrated', 'need calibration', 'late calibration'
  ]).optional(),
})

type UpdatedBy = 'manual' | 'automatic';

type FormValues = z.infer<typeof formSchema>

type RecordFormProps = {
  mode: 'maintenance' | 'calibration' | 'external_control';
  equipment_id: number;
  initialData?: {
    id?: number;
    control_id?: number;
    date?: string;
    next_date?: string;
    description?: string;
    frequency?: Frequency;
    responsible?: MaintenanceRole;
    state?: MaintenanceState | CalibrationState | ExternalControlState;
  };
  onSuccess?: () => void;
}

export function RecordForm({ mode, equipment_id, initialData, onSuccess }: RecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditMode = !!initialData
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: initialData?.date || initialData?.next_date || new Date().toISOString().split('T')[0],
      description: initialData?.description || "",
      frequency: initialData?.frequency || "monthly",
      responsible: initialData?.responsible || "lab technician",
      state: initialData?.state,
    },
  })

  const getStateOptions = () => {
    switch (mode) {
      case 'maintenance':
        return maintenanceStates;
      case 'calibration':
        return calibrationStates;
      case 'external_control':
        return externalControlStates;
      default:
        return [];
    }
  }

  const getDefaultState = () => {
    switch (mode) {
      case 'maintenance':
        return 'done';
      case 'calibration':
        return 'calibrated';
      case 'external_control':
        return 'E.Q.C Reception';
      default:
        return undefined;
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true)
      const baseRecord = {
        date: values.date,
        description: values.description,
        frequency: values.frequency,
        responsible: values.responsible,
      }

      if (mode === 'maintenance') {
        if (isEditMode && initialData?.id) {
          await updateMaintenanceRecord(initialData.id, { 
            ...baseRecord,
            state: values.state as MaintenanceState || 'done',
            equipmentId: equipment_id
          })
        } else {
          await addMaintenanceRecord({
            ...baseRecord,
            state: values.state as MaintenanceState || 'done',
            equipmentId: equipment_id
          })
        }
      } else if (mode === 'calibration') {
        if (isEditMode && initialData?.id) {
          await updateCalibrationRecord(initialData.id, { 
            ...baseRecord,
            state: values.state as CalibrationState || 'calibrated',
            equipmentId: equipment_id
          })
        } else {
          await addCalibrationRecord({
            ...baseRecord,
            state: values.state as CalibrationState || 'calibrated',
            equipmentId: equipment_id
          })
        }
      } else if (mode === 'external_control') {
        if (isEditMode && initialData?.control_id) {
          const result = await updateExternalControl(initialData.control_id, {
            next_date: values.date,
            description: values.description,
            frequency: values.frequency,
            responsible: values.responsible,
            equipment_id,
            state: values.state as ExternalControlState || 'E.Q.C Reception',
            updated_by: 'manual' as UpdatedBy,
            last_updated: new Date().toISOString(),
          });
          if (!result) throw new Error("Failed to update external control");
        } else {
          const result = await addExternalControl({
            next_date: values.date,
            description: values.description,
            frequency: values.frequency,
            responsible: values.responsible,
            equipment_id,
            state: values.state as ExternalControlState || 'E.Q.C Reception',
            updated_by: 'manual' as UpdatedBy,
            last_updated: new Date().toISOString(),
          });
          if (!result) throw new Error("Failed to add external control");
        }
      }
      
      toast({
        title: "Success",
        description: `${mode.replace('_', ' ')} record ${isEditMode ? 'updated' : 'added'} successfully`,
      })
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error('Error submitting form:', error)
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'add'} ${mode} record`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formTitle = mode.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')

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
              <FormLabel>{mode === 'external_control' ? 'Next Date' : 'Date'}</FormLabel>
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
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || getDefaultState()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getStateOptions().map((state) => (
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={`Enter ${mode.replace('_', ' ')} details`}
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