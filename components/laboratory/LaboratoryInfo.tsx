// components/laboratory/LaboratoryInfo.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LaboratoryInfoProps {
  managerName: string;
  contactNumber: string;
  email: string;
}

export const LaboratoryInfo: React.FC<LaboratoryInfoProps> = ({ managerName, contactNumber, email }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Laboratory Information</CardTitle>
    </CardHeader>
    <CardContent>
      <p><strong>Manager:</strong> {managerName}</p>
      <p><strong>Contact:</strong> {contactNumber}</p>
      <p><strong>Email:</strong> {email}</p>
    </CardContent>
  </Card>
);