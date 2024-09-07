import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createLaboratory, createUser, getLaboratories, getUsers } from "@/actions/admin"
import { toast } from "@/hooks/use-toast"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Laboratory, UserRole, CreateUserParams, CreateLaboratoryParams } from "@/types"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const UserRolesChart: React.FC<{ users: User[] }> = ({ users }) => {
  const data = Object.entries(
    users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Roles Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const LaboratoriesByStateChart: React.FC<{ laboratories: Laboratory[] }> = ({ laboratories }) => {
  const data = Object.entries(
    laboratories.reduce((acc, lab) => {
      acc[lab.location_state] = (acc[lab.location_state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([state, count]) => ({ state, count }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laboratories by State</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="state" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default function AdminDashboard() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("lab_technician")
  const [name, setName] = useState("")
  const [labName, setLabName] = useState("")
  const [labState, setLabState] = useState("")
  const [labCity, setLabCity] = useState("")
  const [managerName, setManagerName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [email, setEmail] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchLaboratories()
  }, [])

  const fetchUsers = async () => {
    try {
      const supabaseUsers = await getUsers()
      
      const fetchedUsers: User[] = supabaseUsers.map((user: any) => ({
        id: user.id,
        name: user.user_metadata?.name || user.email.split('@')[0], // Fallback to email username if name is not available
        email: user.email,
        role: (user.user_metadata?.role || 'lab_technician') as UserRole
      }))
  
      setUsers(fetchedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive",
      })
    }
  }

  
  const fetchLaboratories = async () => {
    try {
      const fetchedLabs = await getLaboratories()
      setLaboratories(fetchedLabs)
    } catch (error) {
      console.error('Error fetching laboratories:', error)
      toast({
        title: "Error",
        description: "Failed to fetch laboratories. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const userParams: CreateUserParams = { email: username, password, role, name }
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
        setUsername("")
        setPassword("")
        setRole("lab_technician")
        setName("")
        fetchUsers()
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

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const labParams: CreateLaboratoryParams = {
        name: labName,
        location_state: labState,
        location_city: labCity,
        manager_name: managerName,
        contact_number: contactNumber,
        email
      }
      await createLaboratory(labParams)
      toast({
        title: "Success",
        description: "Laboratory created successfully",
      })
      setLabName("")
      setLabState("")
      setLabCity("")
      setManagerName("")
      setContactNumber("")
      setEmail("")
      fetchLaboratories()
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                    <SelectItem value="lab_manager">Lab Manager</SelectItem>
                    <SelectItem value="lab_technician">Lab Technician</SelectItem>
                    <SelectItem value="maintenance_staff">Maintenance Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Laboratory</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateLab} className="space-y-4">
              <div>
                <Label htmlFor="labName">Laboratory Name</Label>
                <Input 
                  id="labName" 
                  value={labName} 
                  onChange={(e) => setLabName(e.target.value)} 
                  required
                />
              </div>
              <div>
                <Label htmlFor="labState">State</Label>
                <Input 
                  id="labState" 
                  value={labState} 
                  onChange={(e) => setLabState(e.target.value)} 
                  required
                />
              </div>
              <div>
                <Label htmlFor="labCity">City</Label>
                <Input 
                  id="labCity" 
                  value={labCity} 
                  onChange={(e) => setLabCity(e.target.value)} 
                  required
                />
              </div>
              <div>
                <Label htmlFor="managerName">Manager Name</Label>
                <Input 
                  id="managerName" 
                  value={managerName} 
                  onChange={(e) => setManagerName(e.target.value)} 
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input 
                  id="contactNumber" 
                  value={contactNumber} 
                  onChange={(e) => setContactNumber(e.target.value)} 
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Laboratory"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <UserRolesChart users={users} />
        <LaboratoriesByStateChart laboratories={laboratories} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laboratories</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laboratories.map((lab) => (
                  <TableRow key={lab.lab_id}>
                    <TableCell>{lab.name}</TableCell>
                    <TableCell>{`${lab.location_city}, ${lab.location_state}`}</TableCell>
                    <TableCell>{lab.manager_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}