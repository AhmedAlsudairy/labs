// File: components/forms/MaintenanceForm.tsx

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Equipment, MaintenanceRecord } from '@/types'; // Import the types

interface MaintenanceFormProps {
  onSubmit: (formData: Omit<MaintenanceRecord, 'id'>) => void;
  equipment: Equipment[];
}

export function MaintenanceForm({ onSubmit, equipment }: MaintenanceFormProps) {
  const [formData, setFormData] = useState<Omit<MaintenanceRecord, 'id'>>({
    date: '',
    equipment: '',
    description: ''
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input 
        type="date" 
        name="date" 
        value={formData.date} 
        onChange={handleChange} 
      />
      <Select 
        name="equipment" 
        value={formData.equipment} 
        onValueChange={(value) => setFormData(prevData => ({ ...prevData, equipment: value }))}
      >
        {equipment.map(eq => (
          <option key={eq.id} value={eq.name}>{eq.name}</option>
        ))}
      </Select>
      <Textarea 
        name="description" 
        value={formData.description} 
        onChange={handleChange} 
        placeholder="Maintenance Description" 
      />
      <Button type="submit">Add Maintenance Record</Button>
    </form>
  );
}