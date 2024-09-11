import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, UserRole } from "@/types"
import { updateUserRole, deleteUser } from "@/actions/admin"
import { toast } from "@/hooks/use-toast"

interface UsersTableProps {
  users: User[];
  onUserUpdated: () => void;
}

export default function UsersTable({ users, onUserUpdated }: UsersTableProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingUserRole, setEditingUserRole] = useState<UserRole>("lab in charge")

  const handleEdit = async (userId: string) => {
    try {
      await updateUserRole(userId, editingUserRole)
      toast({
        title: "Success",
        description: "User role updated successfully",
      })
      onUserUpdated()
      setEditingUserId(null)
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(userId)
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
        onUserUpdated()
      } catch (error) {
        console.error('Error deleting user:', error)
        toast({
          title: "Error",
          description: "Failed to delete user. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  return (
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <React.Fragment key={user.id}>
                <TableRow>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Button onClick={() => setEditingUserId(user.id)} className="mr-2">Edit</Button>
                    <Button onClick={() => handleDelete(user.id)} variant="destructive">Delete</Button>
                  </TableCell>
                </TableRow>
                {editingUserId === user.id && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="role">New Role:</Label>
                        <Select onValueChange={(value: UserRole) => setEditingUserRole(value)} value={editingUserRole}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="cordinator">Cordinator</SelectItem>
                            <SelectItem value="lab in charge">Lab In Charge</SelectItem>
                            <SelectItem value="maintance staff">Maintance Staff</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={() => handleEdit(user.id)}>Update Role</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}