// File: app/protected/admin/page.tsx
'use client'
import React, { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { getUsers, getLaboratories } from "@/actions/admin"
import { User, Laboratory, UserRole } from "@/types"
import CreateUserForm from "@/components/forms/form-user"
import LaboratoriesTable from "@/components/tables/lab-table"
import LaboratoriesByStateChart from "@/components/charts/lab-chart-reg"
import UsersTable from "@/components/tables/user-table"
import UserRolesChart from "@/components/charts/user-role-chart"
import CreateLabForm from "@/components/forms/form-lab-create"

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchLaboratories()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const fetchedUsers = await getUsers()
      setUsers(fetchedUsers.map((user: any) => ({
        id: user.id,
        name: user.user_metadata?.name || user.email.split('@')[0],
        email: user.email,
        role: (user.user_metadata?.role || 'lab in charge') as UserRole
      })))
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch users. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLaboratories = async () => {
    setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <CreateUserForm onUserCreated={fetchUsers} />
        <CreateLabForm onLabCreated={fetchLaboratories} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <UserRolesChart users={users} />
        <LaboratoriesByStateChart laboratories={laboratories} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <UsersTable users={users} onUserUpdated={fetchUsers} />
        <LaboratoriesTable laboratories={laboratories} onLabUpdated={fetchLaboratories} />
      </div>
    </div>
  )
}