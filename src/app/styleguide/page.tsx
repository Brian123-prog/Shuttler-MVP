import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo, LogoMark } from "@/components/brand/Logo";
import {
  Alert, Badge, Button, Card, CardHeader, DataTable, EmptyState, ErrorState, Field, LoadingState, StatCard, VerificationBadge,
} from "@/components/ui";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Styleguide" };

const rows = [
  { id: "1", name: "Example Route A", status: "APPROVED" as const },
  { id: "2", name: "Example Route B", status: "PENDING" as const },
];

export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <h1 className="text-2xl font-bold text-brand-900">Shuttler styleguide</h1>

      <Card>
        <CardHeader title="Logo" />
        <div className="flex items-center gap-6"><Logo /><LogoMark size={56} /></div>
      </Card>

      <Card>
        <CardHeader title="Buttons" />
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Form" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sg-name" label="Full name" placeholder="Enter your name" />
          <Field id="sg-err" label="Email" defaultValue="not-an-email" error="Enter a valid email address." />
        </div>
      </Card>

      <Card>
        <CardHeader title="Badges" description="Status uses text and a shape, not colour alone." />
        <div className="flex flex-wrap gap-2">
          <VerificationBadge status="PENDING" /><VerificationBadge status="APPROVED" /><VerificationBadge status="REJECTED" />
          <VerificationBadge status="SUSPENDED" /><Badge tone="info">Info</Badge>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fare (formatted from kobo)" value={formatKobo(15000)} hint="Stored as 15000 kobo" />
        <StatCard label="Change example" value={formatKobo(35000)} />
        <StatCard label="Empty metric" value="0" hint="Real data arrives with the database" />
      </div>

      <Card>
        <CardHeader title="Alerts" />
        <div className="space-y-3">
          <Alert tone="info">Informational message.</Alert>
          <Alert tone="success">Operation completed.</Alert>
          <Alert tone="warning">Action needed.</Alert>
          <Alert tone="danger">Something failed.</Alert>
        </div>
      </Card>

      <Card>
        <CardHeader title="Table" />
        <DataTable
          caption="Example table"
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "n", header: "Name", render: (r) => r.name },
            { key: "s", header: "Status", render: (r) => <VerificationBadge status={r.status} /> },
          ]}
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <EmptyState title="Nothing here yet" description="Empty states explain what will appear and what to do next." />
        <div className="space-y-4"><LoadingState /><ErrorState /></div>
      </div>
    </main>
  );
}
