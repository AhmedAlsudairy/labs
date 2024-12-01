"use client";

import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Laboratory } from "@/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Cog, WrenchIcon } from "lucide-react";
import { getEquipmentStatusByGovernorate, getUsersByLaboratories, updateUserLabAssignment } from "@/actions/admin/index";

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-[250px]" />
    <Skeleton className="h-[200px] w-full" />
  </div>
);

const Page = () => {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [equipmentStatus, setEquipmentStatus] = useState<{ operational: number; outOfService: number }>({ operational: 0, outOfService: 0 });
  const [error, setError] = useState<string | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleLabUpdate = async () => {
    if (!selectedLabId || !user) return;
    
    setIsUpdating(true);
    setUpdateError(null);
    
    const result = await updateUserLabAssignment(user.id, selectedLabId);
    
    if (result.error) {
      setUpdateError(result.error);
    }
    
    setIsUpdating(false);
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // Check if user is coordinator
        if (user.user_metadata.role !== "cordinator") {
          router.push("/unauthorized");
          return;
        }

        setUser(user);

        // Get labs using the action function
        const labsData = await getUsersByLaboratories(
          user.user_metadata.governorate,
          user.user_metadata.user_category
        );

        setLaboratories(labsData || []);

        // Get equipment status
        const statusData = await getEquipmentStatusByGovernorate(
          user.user_metadata.governorate,
          user.user_metadata.user_category
        );
        setEquipmentStatus(statusData);

      } catch (error) {
        console.error("Error:", error);
        setError("Failed to load laboratories");
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [router, supabase]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-8 p-8">
      {user && (
        <>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Welcome, {user.user_metadata.name}
            </h1>
            <h2 className="text-xl text-muted-foreground">
              {user.user_metadata.governorate} Coordinator - {" "}
              {user.user_metadata.user_category} Labs
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Laboratories</CardTitle>
                <Badge variant="default" className="bg-primary hover:bg-primary/90">
                  <Building2 className="mr-2 h-4 w-4" />
                  {laboratories.length}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{laboratories.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active laboratories in your governorate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  <Users className="mr-2 h-4 w-4" />
                  {laboratories.filter(lab => lab.user).length}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {laboratories.filter(lab => lab.user).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total laboratory staff members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipment Status</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                    <Cog className="mr-2 h-4 w-4" />
                    {equipmentStatus.operational}
                  </Badge>
                  <Badge variant="default" className="bg-red-600 hover:bg-red-700">
                    <WrenchIcon className="mr-2 h-4 w-4" />
                    {equipmentStatus.outOfService}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-emerald-600">Operational</div>
                    <div className="text-2xl font-bold">{equipmentStatus.operational}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-red-600">Out of Service</div>
                    <div className="text-2xl font-bold">{equipmentStatus.outOfService}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Equipment status across all laboratories
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Laboratories Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Location (City)</TableHead>
                      <TableHead>Location (State)</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laboratories.map((lab) => (
                      <TableRow key={lab.lab_id}>
                        <TableCell className="font-medium">{lab.name}</TableCell>
                        <TableCell>{lab.location_city}</TableCell>
                        <TableCell>{lab.location_state}</TableCell>
                        <TableCell>{lab.lab_category}</TableCell>
                        <TableCell>
                          {lab.user ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              {lab.manager_name}
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-red-600 hover:bg-red-700">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link 
                            href={`/protected/labs/${lab.lab_id}`}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                          >
                            View Details →
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Laboratory Staff Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage staff assignments and view their details
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned Lab</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laboratories.map(
                      (lab) =>
                        lab.user && (
                          <TableRow key={lab.user.id}>
                            <TableCell className="font-medium">{lab.user.name}</TableCell>
                            <TableCell>{lab.user.email}</TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-primary/90 hover:bg-primary font-normal">
                                {lab.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => lab.user && setEditingUserId(lab.user.id)}
                                className="mr-2"
                              >
                                Reassign
                              </Button>
                              
                              {editingUserId === lab.user.id && (
                                <div className="flex items-center justify-end gap-2 mt-2">
                                  <Select 
                                    value={selectedLabId} 
                                    onValueChange={setSelectedLabId}
                                  >
                                    <SelectTrigger className="w-[200px]">
                                      <SelectValue placeholder="Select new lab" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {laboratories?.map((selectLab) => (
                                        <SelectItem 
                                          key={selectLab.lab_id} 
                                          value={selectLab.lab_id.toString()}
                                        >
                                          {selectLab.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      await handleLabUpdate();
                                      setEditingUserId(null);
                                    }}
                                    disabled={isUpdating || !selectedLabId}
                                  >
                                    Save
                                  </Button>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUserId(null);
                                      setSelectedLabId('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                    )}
                  </TableBody>
                </Table>
              </div>
              {updateError && (
                <p className="text-sm text-red-500 mt-2">{updateError}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Page;
