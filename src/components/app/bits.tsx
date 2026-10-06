import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui";

export function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} action={action} />
      {children}
    </Card>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">{children}</p>;
}

export function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>;
}
