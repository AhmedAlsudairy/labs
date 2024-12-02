import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, UserRole, Laboratory, user_category } from "@/types"
import { toast } from "@/hooks/use-toast"
import { getLaboratories, getLaboratoryUserId } from "@/actions/admin/lab"
import { deleteUser, updateUserRole } from "@/actions/admin/user"

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
  const [editingGovernorate, setEditingGovernorate] = useState<string>("none")
  const [editingLabId, setEditingLabId] = useState<string>("none")
  const [laboratories, setLaboratories] = useState<Laboratory[]>([])
  const [oldRole, setOldRole] = useState<UserRole | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<user_category | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  useEffect(() => {
    if (editingUserId) {
      const user = users.find(u => u.id === editingUserId);
      if (user) {
        setOldRole(user.role as UserRole);
      }
    }
  }, [editingUserId]);

  useEffect(() => {
    fetchLaboratories();
  }, []);

  const fetchLaboratories = async () => {
    try {
      const labs = await getLaboratories();
      setLaboratories(labs);
    } catch (error) {
      console.error('Error fetching laboratories:', error);
    }
  };

  const handleEdit = async (userId: string) => {
    setIsLoadingEdit(true);
    const user = users.find(u => u.id === userId);
    if (user) {
      try {
        // Ensure laboratories are loaded
        if (laboratories.length === 0) {
          await fetchLaboratories();
        }

        // Check laboratory association for any role
        try {
          const userLab = await getLaboratoryUserId(userId);
          if (userLab) {
            setEditingLabId(userLab.lab_id.toString());
            console.log('Found lab for user:', userLab);
          } else {
            setEditingLabId("none");
          }
        } catch (error) {
          console.log('No laboratory found for this user');
          setEditingLabId("none");
        }

        // Set all the editing states
        setEditingUserId(userId);
        setEditingUserRole(user.role as UserRole);
        setOldRole(user.role as UserRole);
        setEditingGovernorate(user.metadata?.governorate || "none");
        setSelectedCategory((user.metadata?.user_category as user_category) || null);
      } catch (error) {
        console.error('Error in handleEdit:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setIsLoadingEdit(false);
      }
    }
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setEditingUserRole("lab in charge");
    setEditingGovernorate("none");
    setEditingLabId("none");
    setSelectedCategory(null);
    setOldRole(null);
    setIsLoadingEdit(false);
  };

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

  const handleSave = async () => {
    if (!oldRole) {
      toast({
        title: "Error",
        description: "Could not determine current role",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCategory) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    const metadata = {
      ...(editingUserRole === 'cordinator' ? { 
        governorate: editingGovernorate === 'none' ? undefined : editingGovernorate 
      } : {}),
      ...(editingUserRole === 'lab in charge' ? { 
        labId: editingLabId === 'none' ? undefined : editingLabId 
      } : {}),
      user_category: selectedCategory,
    };

    updateUserRole(
      editingUserId as string,
      editingUserRole,
      oldRole as UserRole,
      metadata
    ).then(() => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      // Reset states
      setEditingUserId(null);
      setEditingUserRole("lab in charge");
      setEditingGovernorate("none");
      setEditingLabId("none");
      setSelectedCategory(null);
      setOldRole(null);
      // Refresh user list
      onUserUpdated();
    }).catch((error) => {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    });
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
                    {user.metadata?.governorate && (
                      <span>Governorate: {user.metadata.governorate}</span>
                    )}
                    {user.metadata?.labId && (
                      <span>Laboratory: {getLaboratoryName(user.metadata.labId)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      onClick={() => handleEdit(user.id)} 
                      className="mr-2"
                      disabled={isLoadingEdit}
                    >
                      {isLoadingEdit && editingUserId === user.id ? "Loading..." : "Edit"}
                    </Button>
                    <Button onClick={() => handleDelete(user.id)} variant="destructive">Delete</Button>
                  </TableCell>
                </TableRow>
                {editingUserId === user.id && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      {isLoadingEdit ? (
                        <div className="py-4 text-center">Loading user data...</div>
                      ) : (
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">Role:</Label>
                            <div className="col-span-3">
                              <Select 
                                onValueChange={(value: UserRole) => {
                                  console.log('Selected role:', value);
                                  setEditingUserRole(value);
                                  // Reset values when changing role
                                  setEditingGovernorate("none");
                                  setEditingLabId("none");
                                }} 
                                defaultValue={editingUserRole}
                                value={editingUserRole}
                              >
                                <SelectTrigger className="w-[280px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="cordinator">Coordinator</SelectItem>
                                  <SelectItem value="lab in charge">Lab In Charge</SelectItem>
                                  <SelectItem value="maintance staff">Maintenance Staff</SelectItem>
                                  <SelectItem value="lab technician">Lab Technician</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {editingUserRole === "cordinator" && (
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="governorate" className="text-right">Governorate:</Label>
                              <div className="col-span-3">
                                <Select 
                                  onValueChange={(value) => {
                                    console.log('Selected governorate:', value);
                                    setEditingGovernorate(value);
                                  }}
                                  defaultValue={editingGovernorate}
                                  value={editingGovernorate}
                                >
                                  <SelectTrigger className="w-[280px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Select Governorate</SelectItem>
                                    {omanGovernorates.map((gov) => (
                                      <SelectItem key={gov} value={gov}>
                                        {gov}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {(editingUserRole === "lab in charge" || editingUserRole === "lab technician" || editingUserRole === "maintance staff") && (
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="laboratory" className="text-right">Laboratory:</Label>
                              <div className="col-span-3">
                                <Select 
                                  onValueChange={(value) => {
                                    console.log('Selected lab:', value);
                                    setEditingLabId(value);
                                  }}
                                  defaultValue={editingLabId}
                                  value={editingLabId}
                                >
                                  <SelectTrigger className="w-[280px]">
                                    <SelectValue defaultValue={editingLabId}>
                                      {editingLabId === "none" 
                                        ? "Select Laboratory" 
                                        : getLaboratoryName(editingLabId)}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Select Laboratory</SelectItem>
                                    {laboratories.map((lab) => (
                                      <SelectItem key={lab.lab_id} value={lab.lab_id.toString()}>
                                        {lab.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-4 gap-4 pt-4">
                            <div className="col-start-2 col-span-2 flex justify-end gap-2">
                              <Button onClick={handleSave} className="mr-2">Save</Button>
                              <Button onClick={handleCancel} variant="outline">Cancel</Button>
                            </div>
                          </div>
                        </div>
                      )}
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