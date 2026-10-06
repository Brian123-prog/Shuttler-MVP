"use client";
import type { ReactNode } from "react";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export function SubmitButton({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className={className}>
      {pending ? "Please wait" : children}
    </Button>
  );
}
