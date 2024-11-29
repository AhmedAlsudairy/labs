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
import { getUsersByLaboratories, updateUserLabAssignment } from "@/actions/admin";
import { Laboratory } from "@/types";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

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
              {user.user_metadata.governorate} -{" "}
              {user.user_metadata.user_category} Labs
            </h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Laboratories</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location (City)</TableHead>
                    <TableHead>Location (State)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laboratories.map((lab) => (
               
               <TableRow key={lab.lab_id}>
               <TableCell className="font-medium">{lab.name}</TableCell>
               <TableCell>{lab.location_city}</TableCell>
               <TableCell>{lab.location_state}</TableCell>
               <TableCell>{lab.lab_category}</TableCell>
               <TableCell>{lab.manager_name}</TableCell>
               <TableCell>
                 <Link 
                   href={`/protected/labs/${lab.lab_id}`}
                   className="text-blue-600 hover:underline"
                 >
                   View Details →
                 </Link>
               </TableCell>
             </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Laboratory Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Lab</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laboratories.map(
                    (lab) =>
                      lab.user && (
                        <TableRow key={lab.user.id}>
                          <TableCell>{lab.user.name}</TableCell>
                          <TableCell>{lab.user.email}</TableCell>
                          <TableCell>{lab.name}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => lab.user && setEditingUserId(lab.user.id)}
                            >
                              Edit
                            </Button>
                            
                            {editingUserId === lab.user.id && (
                              <div className="flex items-center gap-2 mt-2">
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
            
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Page;
