// File: app/protected/admin/components/EditLabForm.tsx
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { CreateLaboratoryParams, Laboratory, OmanGovernorate } from "@/types" // Make sure to import Laboratory type
import { getLaboratoryById, updateLaboratory } from "@/actions/admin/lab"

interface EditLabFormProps {
  labId: number;
  onLabUpdated: () => void;
}

export default function EditLabForm({ labId, onLabUpdated }: EditLabFormProps) {
  const [lab, setLab] = useState<CreateLaboratoryParams>({
    name: "",
    location_state: OmanGovernorate.MUSCAT, // Set default value from enum
    location_city: "",
    manager_name: "",
    contact_number: "",
    email: "",
    lab_category: "human",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchLab = async () => {
      try {
        const labData = await getLaboratoryById(labId)
        // Convert string to enum value and ensure type safety
        setLab({
          name: labData.name,
          location_state: labData.location_state as OmanGovernorate,
          location_city: labData.location_city,
          manager_name: labData.manager_name,
          contact_number: labData.contact_number,
          email: labData.email,
          lab_category: labData.lab_category,
        });
      } catch (error) {
        console.error('Error fetching laboratory:', error)
        toast({
          title: "Error",
          description: "Failed to fetch laboratory details. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchLab()
  }, [labId])

  const handleUpdateLab = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await updateLaboratory(labId, lab)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Laboratory</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateLab} className="space-y-4">
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
            <Input 
              id="location_state" 
              name="location_state"
              value={lab.location_state} 
              onChange={handleInputChange} 
              required
            />
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Laboratory"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}