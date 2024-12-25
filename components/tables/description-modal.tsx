'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function DescriptionModal({
  isOpen,
  onClose,
  title,
  description,
}: DescriptionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] max-h-[90vh] flex flex-col gap-4">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-semibold text-center sm:text-left">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed min-h-[100px] max-h-[60vh] overflow-y-auto">
              {description}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
