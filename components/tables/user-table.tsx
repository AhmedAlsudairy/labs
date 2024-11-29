import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, UserRole, Laboratory, user_category } from "@/types"
import { updateUserRole, deleteUser, getLaboratories } from "@/actions/admin"
import { toast } from "@/hooks/use-toast"

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

interface UsersTableProps {
  users: User[];
  onUserUpdated: () => void;
}

export default function UsersTable({ users, onUserUpdated }: UsersTableProps) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingUserRole, setEditingUserRole] = useState<UserRole>("lab in charge")
  const [editingGovernorate, setEditingGovernorate] = useState<string>("")
  const [editingLabId, setEditingLabId] = useState<string>("")
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [oldRole, setOldRole] = useState<UserRole | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<user_category>('food');

  useEffect(() => {
    fetchLaboratories();
  }, []);

  useEffect(() => {
    if (editingUserId) {
      const user = users.find(u => u.id === editingUserId);
      if (user) {
        setOldRole(user.role as UserRole);
      }
    }
  }, [editingUserId]);

  const fetchLaboratories = async () => {
    try {
      const labs = await getLaboratories();
      setLaboratories(labs);
    } catch (error) {
      console.error('Error fetching laboratories:', error);
    }
  };

  const handleEdit = async (userId: string) => {
    try {
      if (!oldRole) {
        toast({
          title: "Error",
          description: "Could not determine current role",
          variant: "destructive",
        });
        return;
      }

      const metadata = {
        ...(editingUserRole === 'cordinator' ? { governorate: editingGovernorate } : {}),
        ...(editingUserRole === 'lab in charge' ? { labId: editingLabId } : {}),
        user_category: selectedCategory,
      };

      await updateUserRole(
        userId,
        editingUserRole,
        oldRole,
        metadata
      );
console.log(userId, editingUserRole, oldRole, metadata)
      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      // Reset states
      setEditingUserId("");
      setEditingUserRole("lab in charge");
      setEditingGovernorate("");
      setEditingLabId("");
      setOldRole(null);
      
      // Refresh user list if needed
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
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

  const getLaboratoryName = (labId: string) => {
    const lab = laboratories.find(l => l.lab_id.toString() === labId);
    return lab ? lab.name : 'Unknown Laboratory';
  };

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
              <TableHead>Assignment</TableHead>
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
                    {user.role === 'cordinator' && user.metadata?.governorate && (
                      <span>Governorate: {user.metadata.governorate}</span>
                    )}
                    {user.role === 'lab in charge' && user.metadata?.labId && (
                      <span>Laboratory: {getLaboratoryName(user.metadata.labId)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => setEditingUserId(user.id)} className="mr-2">Edit</Button>
                    <Button onClick={() => handleDelete(user.id)} variant="destructive">Delete</Button>
                  </TableCell>
                </TableRow>
                {editingUserId === user.id && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="role">New Role:</Label>
                        <Select 
                          onValueChange={(value: UserRole) => {
                            setEditingUserRole(value);
                            setEditingGovernorate("");
                            setEditingLabId("");
                          }} 
                          value={editingUserRole}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="cordinator">Coordinator</SelectItem>
                            <SelectItem value="lab in charge">Lab In Charge</SelectItem>
                            <SelectItem value="maintance staff">Maintenance Staff</SelectItem>
                          </SelectContent>
                        </Select>

                        {editingUserRole === "cordinator" && (
                          <>
                            <Label htmlFor="governorate">Governorate:</Label>
                            <Select 
                              onValueChange={setEditingGovernorate} 
                              value={editingGovernorate}
                            >
                              <SelectTrigger className="w-[180px]">
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
                          </>
                        )}

                        {editingUserRole === "lab in charge" && (
                          <>
                            <Label htmlFor="laboratory">Laboratory:</Label>
                            <Select 
                              onValueChange={setEditingLabId} 
                              value={editingLabId}
                            >
                              <SelectTrigger className="w-[180px]">
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
                          </>
                        )}

                        <Label htmlFor="category">Category:</Label>
                        <Select
                          value={selectedCategory}
                          onValueChange={(value: user_category) => setSelectedCategory(value)}
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