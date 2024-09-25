import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Equipment } from '@/types'; // Import the Equipment type

type EquipmentFormProps = {
  onSubmit: (data: Partial<Equipment>) => void;
  initialData?: Partial<Equipment>;
};

export function EquipmentForm({ onSubmit, initialData }: EquipmentFormProps) {
  const [formData, setFormData] = useState<Partial<Equipment>>(initialData || {});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<Equipment>) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Equipment Name</Label>
        <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Equipment Name" />
      </div>
      {/* ... other form fields ... */}
      <div>
        <Label htmlFor="type">Equipment Type</Label>
        <Select name="type" value={formData.status || ''} onValueChange={(value) => handleChange({ target: { name: 'type', value } } as React.ChangeEvent<HTMLInputElement>)}>
          <option value="">Select Equipment Type</option>
          <option value="Operational">Operational</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Out of Service">Out of Service</option>
        </Select>
      </div>
      <Button type="submit">Submit</Button>
    </form>
  );
}