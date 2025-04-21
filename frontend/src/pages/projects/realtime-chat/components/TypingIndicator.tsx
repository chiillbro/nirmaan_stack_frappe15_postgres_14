// src/components/project/chat/TypingIndicator.tsx
import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-100" />
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-200" />
    </div>
  );
};