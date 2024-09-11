// File: app/protected/admin/components/CreateLabForm.tsx
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createLaboratory, CreateLaboratoryParams } from "@/actions/admin"
import { toast } from "@/hooks/use-toast"

interface CreateLabFormProps {
  onLabCreated: () => void;
}

export default function CreateLabForm({ onLabCreated }: CreateLabFormProps) {
  const [lab, setLab] = useState<CreateLaboratoryParams>({
    name: "",
    location_state: "",
    location_city: "",
    manager_name: "",
    contact_number: "",
    email: ""
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await createLaboratory(lab)
      toast({
        title: "Success",
        description: "Laboratory created successfully",
      })
      setLab({
        name: "",
        location_state: "",
        location_city: "",
        manager_name: "",
        contact_number: "",
        email: ""
      })
      onLabCreated()
    } catch (error) {
      console.error('Error creating laboratory:', error)
      toast({
        title: "Error",
        description: "Failed to create laboratory. Please try again.",
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
            {isLoading ? "Creating..." : "Create Laboratory"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}