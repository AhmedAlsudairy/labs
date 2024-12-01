// File: app/protected/admin/components/CreateLabForm.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { OmanGovernorate, CreateLaboratoryParams } from "@/types";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLaboratory } from "@/actions/admin/lab";

// Add lab categories constant
const labCategories = [
  { value: "human", label: "Human" },
  { value: "animal", label: "Animal" },
  { value: "food", label: "Food" },
];
interface CreateLabFormProps {
  onLabCreated: () => void;
}

export default function CreateLabForm({ onLabCreated }: CreateLabFormProps) {
  const [lab, setLab] = useState<CreateLaboratoryParams>({
    name: "",
    location_state: OmanGovernorate.MUSCAT, // Using enum value
    location_city: "",
    manager_name: "",
    contact_number: "",
    email: "",
    lab_category: "human",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createLaboratory(lab);
      toast({
        title: "Success",
        description: "Laboratory created successfully",
      });
      setLab({
        name: "",
        location_state: OmanGovernorate.MUSCAT, // Using enum value
        location_city: "",
        manager_name: "",
        contact_number: "",
        email: "",
        lab_category: "human",
      });
      onLabCreated();
    } catch (error) {
      console.error("Error creating laboratory:", error);
      toast({
        title: "Error",
        description: "Failed to create laboratory. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLab((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Laboratory</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateLab} className="space-y-4">
          <div>
            <Label htmlFor="name">Laboratory Name</Label>
            <Input
              id="name"
              name="name"
              value={lab.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="location_state">State</Label>
            <Select
              value={lab.location_state}
              onValueChange={(value: OmanGovernorate) =>
                setLab((prev) => ({ ...prev, location_state: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select governorate" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Governorates</SelectLabel>
                  {Object.values(OmanGovernorate).map((governorate) => (
                    <SelectItem key={governorate} value={governorate}>
                      {governorate}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="location_city">City</Label>
            <Input
              id="location_city"
              name="location_city"
              value={lab.location_city}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="manager_name">Manager Name</Label>
            <Input
              id="manager_name"
              name="manager_name"
              value={lab.manager_name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="contact_number">Contact Number</Label>
            <Input
              id="contact_number"
              name="contact_number"
              value={lab.contact_number}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={lab.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="lab_category">Laboratory Category</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {lab.lab_category
                    ? labCategories.find(
                        (cat) => cat.value === lab.lab_category
                      )?.label
                    : "Select category..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search category..."
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {labCategories.map((category) => (
                        <CommandItem
                          key={category.value}
                          value={category.value}
                          onSelect={(currentValue) => {
                            setLab((prev) => ({
                              ...prev,
                              lab_category: currentValue as
                                | "food"
                                | "animal"
                                | "human",
                            }));
                            setOpen(false);
                          }}
                        >
                          {category.label}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              lab.lab_category === category.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Laboratory"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
