// File: app/protected/admin/components/CreateUserForm.tsx
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { UserRole, Laboratory, user_category } from "@/types"
import { getLaboratories } from "@/actions/admin/lab"
import { createUser } from "@/actions/admin/user"

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
  currentUserRole?: UserRole;
  restrictRoles?: UserRole[];
  defaultLabId?: string;
}

export default function CreateUserForm({ 
  onUserCreated, 
  currentUserRole = "admin",
  restrictRoles = [],
  defaultLabId
}: CreateUserFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>(restrictRoles[0] || "lab in charge")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [selectedGovernorate, setSelectedGovernorate] = useState("")
  const [selectedLab, setSelectedLab] = useState(defaultLabId || "")
  const [userCategory, setUserCategory] = useState<user_category>('food')

  useEffect(() => {
    if (["lab in charge", "lab technician", "maintance staff"].includes(role)) {
      fetchLaboratories();
    }
  }, [role]);

  useEffect(() => {
    if (defaultLabId) {
      setSelectedLab(defaultLabId);
    }
  }, [defaultLabId]);

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
      // If we have restrictRoles and defaultLabId, this means we're creating staff for a specific lab
      const labIdToUse = restrictRoles.length > 0 ? defaultLabId : selectedLab;

      const userParams = { 
        email: username, 
        password, 
        role, 
        name,
        metadata: {
          ...(role === "cordinator" && { governorate: selectedGovernorate }),
          ...(["lab in charge", "lab technician", "maintance staff"].includes(role) && 
              { labId: labIdToUse }),
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
    setRole(restrictRoles[0] || "lab in charge")
    setName("")
    setSelectedGovernorate("")
    setSelectedLab(defaultLabId || "")
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
            <Select
              value={role}
              onValueChange={(value: UserRole) => setRole(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {restrictRoles.length > 0 ? (
                  restrictRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="cordinator">Coordinator</SelectItem>
                    <SelectItem value="lab in charge">Lab In Charge</SelectItem>
                    <SelectItem value="lab technician">Lab Technician</SelectItem>
                    <SelectItem value="maintance staff">Maintenance Staff</SelectItem>
                  </>
                )}
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

          {/* Laboratory selection for lab staff - only show if not restricted roles */}
          {["lab in charge", "lab technician", "maintance staff"].includes(role) && 
           !restrictRoles.length && (
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