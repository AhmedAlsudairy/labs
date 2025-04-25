import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ExternalControl } from "@/lib/types";
import { ExternalControlHistoryTable } from "./external-control-history-table";
import { Badge } from "../ui/badge";
import { CalendarIcon, InfoIcon, HistoryIcon } from "lucide-react";

interface ExternalControlDetailProps {
  control: ExternalControl;
  lab_id: number;
  onRefresh: () => void;
}

export function ExternalControlDetail({
  control,
  lab_id,
  onRefresh
}: ExternalControlDetailProps) {
  const [activeTab, setActiveTab] = useState("details");

  // Function to determine badge color based on state
  const getStateColor = (state: string) => {
    switch(state) {
      case 'Done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Final Date':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'E.Q.C  Reception':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium">
            External Control
          </CardTitle>
          <Badge className={getStateColor(control.state)}>
            {control.state}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="flex items-center gap-1">
              <InfoIcon className="h-4 w-4" />
              <span>Details</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <HistoryIcon className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="pt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Frequency</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{control.frequency}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Responsible</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{control.responsible}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Next Date</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {control.next_date ? new Date(control.next_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-md whitespace-pre-wrap">
                  {control.description || 'No description available'}
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="pt-4">
            <ExternalControlHistoryTable 
              equipment_id={control.equipment_id}
              controlId={control.control_id}
              frequency={control.frequency}
              lab_id={lab_id}
              onRefresh={onRefresh}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}