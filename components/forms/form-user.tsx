// File: app/protected/admin/components/CreateUserForm.tsx
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createUser, getLaboratories } from "@/actions/admin"
import { toast } from "@/hooks/use-toast"
import { UserRole, Laboratory, user_category } from "@/types"

// Oman governorates list
const omanGovernorates = [
  "Muscat",
  "Dhofar",
  "Musandam",
  "Al Buraimi",
  "Ad Dakhiliyah",
  "Al Batinah North",
  "Al Batinah South",
  "Al Sharqiyah North",
  "Al Sharqiyah South",
  "Ad Dhahirah",
  "Al Wusta"
];

interface CreateUserFormProps {
  onUserCreated: () => void;
}

export default function CreateUserForm({ onUserCreated }: CreateUserFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("lab in charge")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [selectedGovernorate, setSelectedGovernorate] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  const [userCategory, setUserCategory] = useState<user_category>('food')

  useEffect(() => {
    if (role === "lab in charge") {
      fetchLaboratories();
    }
  }, [role]);

  const fetchLaboratories = async () => {
    try {
      const labs = await getLaboratories();
      setLaboratories(labs);
    } catch (error) {
      console.error('Error fetching laboratories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch laboratories",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const userParams = { 
        email: username, 
        password, 
        role, 
        name,
        metadata: {
          ...(role === "cordinator" && { governorate: selectedGovernorate }),
          ...(role === "lab in charge" && { labId: selectedLab }),
          user_category: userCategory
        }
      }
      const result = await createUser(userParams)
      if ('error' in result) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "User created successfully",
        })
        resetForm()
        onUserCreated()
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setUsername("")
    setPassword("")
    setRole("lab in charge")
    setName("")
    setSelectedGovernorate("")
    setSelectedLab("")
    setUserCategory("food")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <Label htmlFor="username">Email</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value: UserRole) => setRole(value)} value={role}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="cordinator">Coordinator</SelectItem>
                <SelectItem value="lab in charge">Lab In Charge</SelectItem>
                <SelectItem value="maintance staff">Maintenance Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Governorate selection for coordinators */}
          {role === "cordinator" && (
            <div>
              <Label htmlFor="governorate">Governorate</Label>
              <Select 
                onValueChange={setSelectedGovernorate} 
                value={selectedGovernorate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a governorate" />
                </SelectTrigger>
                <SelectContent>
                  {omanGovernorates.map((gov) => (
                    <SelectItem key={gov} value={gov}>
                      {gov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Laboratory selection for lab in charge */}
          {role === "lab in charge" && (
            <div>
              <Label htmlFor="laboratory">Laboratory</Label>
              <Select 
                onValueChange={setSelectedLab} 
                value={selectedLab}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a laboratory" />
                </SelectTrigger>
                <SelectContent>
                  {laboratories.map((lab) => (
                    <SelectItem key={lab.lab_id} value={lab.lab_id.toString()}>
                      {lab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {role === "cordinator" && (
            <div>
              <Label>User Category</Label>
              <Select
                value={userCategory}
                onValueChange={(value: user_category) => setUserCategory(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="animal">Animal</SelectItem>
                  <SelectItem value="human">Human</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create User"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}