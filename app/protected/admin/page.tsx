"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createLaboratory, createUser, getLaboratories, getUsers } from "@/actions/admin"

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
}

type Laboratory = {
  lab_id: number;
  name: string;
  location_city: string;
  location_state: string;
  manager_name: string;
}

export default function AdminDashboard() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("")
  const [name, setName] = useState("")
  const [labName, setLabName] = useState("")
  const [labState, setLabState] = useState("")
  const [labCity, setLabCity] = useState("")
  const [managerName, setManagerName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [email, setEmail] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])

  useEffect(() => {
    fetchUsers()
    fetchLaboratories()
  }, [])

  const fetchUsers = async () => {
    const fetchedUsers = await getUsers()
    setUsers(fetchedUsers as User[])
  }

  const fetchLaboratories = async () => {
    const fetchedLabs = await getLaboratories()
    setLaboratories(fetchedLabs)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    await createUser({ email: username, password, role, name })
    setUsername("")
    setPassword("")
    setRole("")
    setName("")
    fetchUsers()
  }

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault()
    await createLaboratory({
      name: labName,
      location_state: labState,
      location_city: labCity,
      manager_name: managerName,
      contact_number: contactNumber,
      email
    })
    setLabName("")
    setLabState("")
    setLabCity("")
    setManagerName("")
    setContactNumber("")
    setEmail("")
    fetchLaboratories()
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
                <Select onValueChange={setRole} value={role}>
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
              <Button type="submit">Create User</Button>
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
              <Button type="submit">Create Laboratory</Button>
            </form>
          </CardContent>
        </Card>
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