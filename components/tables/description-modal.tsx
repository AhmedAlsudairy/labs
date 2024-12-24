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
      <DialogContent className="max-w-[90vw] w-full md:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{description}</div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
