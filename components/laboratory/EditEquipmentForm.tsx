// components/laboratory/EditEquipmentForm.tsx

import React from 'react';
import { useForm } from 'react-hook-form';
import { Equipment } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface EditEquipmentFormProps {
  equipment: Equipment;
  onSubmit: (data: Partial<Equipment>) => Promise<void>;
  onCancel: () => void;
}

export const EditEquipmentForm: React.FC<EditEquipmentFormProps> = ({ equipment, onSubmit, onCancel }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<Equipment>>({
    defaultValues: equipment,
  });

  const onSubmitForm = async (data: Partial<Equipment>) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <Input {...register('name', { required: 'Name is required' })} placeholder="Name" />
        {errors.name && <span className="text-red-500">{errors.name.message}</span>}
      </div>
      <div>
        <Select {...register('status', { required: 'Status is required' })}>
          <option value="Operational">Operational</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Out of Service">Out of Service</option>
        </Select>
        {errors.status && <span className="text-red-500">{errors.status.message}</span>}
      </div>
      <div>
        <Input {...register('model')} placeholder="Model" />
      </div>
      <div>
        <Input {...register('serialNumber')} placeholder="Serial Number" />
      </div>
      <div>
        <Input {...register('description')} placeholder="Description" />
      </div>
      <div>
        <Input {...register('labSection')} placeholder="Lab Section" />
      </div>
      <div>
        <Input {...register('manufacturer')} placeholder="Manufacturer" />
      </div>
      <div>
        <Input {...register('manufactureDate')} type="date" placeholder="Manufacture Date" />
      </div>
      <div>
        <Input {...register('receiptDate')} type="date" placeholder="Receipt Date" />
      </div>
      <div>
        <Input {...register('supplier')} placeholder="Supplier" />
      </div>
      <div>
        <Input {...register('type')} placeholder="Type" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
};