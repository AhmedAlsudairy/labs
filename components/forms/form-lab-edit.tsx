// File: app/protected/admin/components/EditLabForm.tsx
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { CreateLaboratoryParams, Laboratory, OmanGovernorate, Staff } from "@/types"
import { getLaboratoryById, updateLaboratory } from "@/actions/admin/lab"
import { listUsers } from "@/actions/admin/user"

interface EditLabFormProps {
  labId: number;
  onLabUpdated: () => void;
}

export default function EditLabForm({ labId, onLabUpdated }: EditLabFormProps) {
  const [lab, setLab] = useState<CreateLaboratoryParams>({
    name: "",
    location_state: OmanGovernorate.MUSCAT,
    location_city: "",
    manager_name: "",
    contact_number: "",
    email: "",
    lab_category: "human",
    technician_lab_id: undefined,
    maintenance_staff_id: undefined,
    manager_id: undefined,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [availableStaff, setAvailableStaff] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch lab data
        const labData = await getLaboratoryById(labId)
        setLab({
          name: labData.name,
          location_state: labData.location_state as OmanGovernorate,
          location_city: labData.location_city,
          manager_name: labData.manager_name,
          contact_number: labData.contact_number,
          email: labData.email,
          lab_category: labData.lab_category,
          technician_lab_id: labData.technician_lab_id || undefined,
          maintenance_staff_id: labData.maintenance_staff_id || undefined,
          manager_id: labData.manager_id || undefined,
        });

        // Fetch available staff
        const users = await listUsers();
        setAvailableStaff(users);
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to fetch data. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [labId])

  const handleUpdateLab = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Convert empty string IDs to undefined to match type
      const labData = {
        ...lab,
        technician_lab_id: lab.technician_lab_id || undefined,
        maintenance_staff_id: lab.maintenance_staff_id || undefined,
        manager_id: lab.manager_id || undefined,
      };
      await updateLaboratory(labId, labData)
      toast({
        title: "Success",
        description: "Laboratory updated successfully",
      })
      onLabUpdated()
    } catch (error) {
      console.error('Error updating laboratory:', error)
      toast({
        title: "Error",
        description: "Failed to update laboratory. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setLab(prev => ({ ...prev, [name]: value }))
  }

  const getStaffByRole = (role: string) => {
    return availableStaff.filter(user => 
      user.user_metadata?.role === role
    );
  };

  const handleStaffSelect = (value: string, type: 'technician' | 'maintenance' | 'manager') => {
    if (type === 'manager') {
      const selectedManager = getStaffByRole('lab in charge').find(
        (user) => user.id === value
      );
      if (selectedManager) {
        setLab(prev => ({
          ...prev,
          manager_name: selectedManager.user_metadata?.name || '',
          email: selectedManager.email || '',
          manager_id: selectedManager.id,
        }));
      }
    } else {
      setLab(prev => ({
        ...prev,
        [type === 'technician' ? 'technician_lab_id' : 'maintenance_staff_id']: 
          value === 'none' ? undefined : value
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Laboratory</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateLab} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Laboratory Name</Label>
              <Input 
                id="name" 
                name="name"
                value={lab.name} 
                onChange={handleInputChange} 
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lab_category">Laboratory Category</Label>
              <Select
                value={lab.lab_category}
                onValueChange={(value: "food" | "animal" | "human") =>
                  setLab((prev) => ({ ...prev, lab_category: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="animal">Animal</SelectItem>
                  <SelectItem value="human">Human</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location_state">State</Label>
              <Select
                value={lab.location_state}
                onValueChange={(value: OmanGovernorate) =>
                  setLab((prev) => ({ ...prev, location_state: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select governorate" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(OmanGovernorate).map((governorate) => (
                    <SelectItem key={governorate} value={governorate}>
                      {governorate}
                    </SelectItem>
                  ))}
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
                className="mt-1"
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
                className="mt-1"
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
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold">Staff Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="manager">Lab Manager</Label>
                <Select
                  value={getStaffByRole('lab in charge').find(
                    (user) => user.email === lab.email
                  )?.id || "none"}
                  onValueChange={(value) => handleStaffSelect(value, 'manager')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select lab manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {getStaffByRole('lab in charge').map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.user_metadata?.name || 'Unknown'} ({manager.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="technician_lab_id">Lab Technician</Label>
                <Select
                  value={lab.technician_lab_id || "none"}
                  onValueChange={(value) => handleStaffSelect(value, 'technician')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a lab technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Technician</SelectItem>
                    {getStaffByRole('lab technician').map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.user_metadata?.name || 'Unknown'} ({tech.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maintenance_staff_id">Maintenance Staff</Label>
                <Select
                  value={lab.maintenance_staff_id || "none"}
                  onValueChange={(value) => handleStaffSelect(value, 'maintenance')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select maintenance staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Maintenance Staff</SelectItem>
                    {getStaffByRole('maintance staff').map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.user_metadata?.name || 'Unknown'} ({staff.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Laboratory"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}