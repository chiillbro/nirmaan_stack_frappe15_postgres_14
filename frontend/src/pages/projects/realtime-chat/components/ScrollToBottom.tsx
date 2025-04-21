// src/components/project/chat/ScrollToBottom.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { cn } from '@/lib/utils'; // Assuming you have a cn utility

interface ScrollToBottomProps {
    onClick: () => void;
    className?: string;
}

export const ScrollToBottom: React.FC<ScrollToBottomProps> = ({ onClick, className }) => {
  return (
      <Button
        variant="outline"
        size="icon"
        className={cn(
            "rounded-full shadow-lg h-8 w-8", // Slightly smaller maybe
            "animate-bounce", // Optional: only bounce when new message arrives? Requires state.
            className
        )}
        onClick={onClick}
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
  );
};