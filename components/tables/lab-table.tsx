// File: app/protected/admin/components/LaboratoriesTable.tsx
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Laboratory } from "@/types"
import { deleteLaboratory } from "@/actions/admin"
import { toast } from "@/hooks/use-toast"
import EditLabForm from "../forms/form-lab-edit"
import Link from "next/link"

interface LaboratoriesTableProps {
  laboratories: Laboratory[];
  onLabUpdated: () => void;
}

export default function LaboratoriesTable({ laboratories, onLabUpdated }: LaboratoriesTableProps) {
  const [editingLabId, setEditingLabId] = useState<number | null>(null)

  const handleDelete = async (labId: number) => {
    if (window.confirm("Are you sure you want to delete this laboratory?")) {
      try {
        await deleteLaboratory(labId)
        toast({
          title: "Success",
          description: "Laboratory deleted successfully",
        })
        onLabUpdated()
      } catch (error) {
        console.error('Error deleting laboratory:', error)
        toast({
          title: "Error",
          description: "Failed to delete laboratory. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

console.log(laboratories)
  return (
    <Card>
    <CardHeader>
      <CardTitle>Laboratories</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
             <TableHead>Category</TableHead>

            <TableHead>Location</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Actions</TableHead>
           
          </TableRow>
        </TableHeader>
        <TableBody>
          {laboratories.map((lab) => (
            <React.Fragment key={lab.lab_id}>
              <TableRow>
                <TableCell>
                  <Link href={`/protected/labs/${lab.lab_id}`} className="text-blue-600 hover:underline">
                    {lab.name}
                  </Link>
                </TableCell>
                  <TableCell>{lab.lab_category}</TableCell>
                <TableCell>{`${lab.location_city}, ${lab.location_state}`}</TableCell>
                <TableCell>{lab.manager_name}</TableCell>
                <TableCell>
                
                  <Button onClick={() => setEditingLabId(lab.lab_id)} className="mr-2">Edit</Button>
                  <Button onClick={() => handleDelete(lab.lab_id)} variant="destructive">Delete</Button>
                </TableCell>
              </TableRow>
              {editingLabId === lab.lab_id && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EditLabForm 
                      labId={lab.lab_id} 
                      onLabUpdated={() => {
                        setEditingLabId(null)
                        onLabUpdated()
                      }} 
                    />
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