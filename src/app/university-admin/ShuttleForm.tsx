"use client";

import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/app/(auth)/SubmitButton";
import type { FormState } from "@/app/(auth)/state";
import type { ShuttleRow } from "@/lib/shuttles/queries";
import { saveShuttleAction } from "./shuttle-actions";

export function ShuttleForm({ shuttle, routes }: { shuttle?: ShuttleRow; routes: { id: string; code: string; name: string }[] }) {
  const [state, action] = useActionState(saveShuttleAction, {} as FormState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="max-w-xl space-y-4" noValidate>
      {state.error ? <Alert tone="danger" title="Could not save">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={shuttle?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="code" name="code" label="Shuttle code" defaultValue={v.code ?? shuttle?.code} error={e.code} hint="For example: SH-01" required />
        <Field id="plate" name="plate" label="Registration plate" defaultValue={v.plate ?? shuttle?.plate} error={e.plate} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="model" name="model" label="Vehicle make and model (optional)" defaultValue={v.model ?? shuttle?.model ?? ""} error={e.model} />
        <Field id="capacity" name="capacity" inputMode="numeric" label="Seating capacity" defaultValue={v.capacity ?? shuttle?.capacity?.toString()} error={e.capacity} required />
      </div>
      <SelectField
        id="routeId" name="routeId" label="Route (optional)" defaultValue={v.routeId ?? shuttle?.routeId ?? ""} error={e.routeId} placeholder="No route"
        options={routes.map((r) => ({ value: r.id, label: `${r.code} - ${r.name}` }))}
      />
      {shuttle ? (
        <SelectField id="status" name="status" label="Status" defaultValue={v.status ?? shuttle.status} error={e.status}
          options={[{ value: "ACTIVE", label: "In service" }, { value: "INACTIVE", label: "Out of service" }]} placeholder="Select a status" />
      ) : null}
      <SubmitButton>{shuttle ? "Save shuttle" : "Add shuttle"}</SubmitButton>
    </form>
  );
}
