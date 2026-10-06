"use client";

import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/app/(auth)/SubmitButton";
import type { FormState } from "@/app/(auth)/state";
import { setFareAction } from "./fare-actions";

export function FareForm({ routes }: { routes: { id: string; code: string; name: string }[] }) {
  const [state, action] = useActionState(setFareAction, {} as FormState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="max-w-md space-y-4" noValidate>
      {state.error ? <Alert tone="danger" title="Could not save">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <SelectField
        id="fare-route" name="routeId" label="Applies to" placeholder="All routes (default fare)" defaultValue={v.routeId ?? ""} error={e.routeId}
        options={routes.map((r) => ({ value: r.id, label: `${r.code} - ${r.name}` }))}
        hint="A route fare overrides the default fare for that route."
      />
      <Field id="fare-amount" name="amount" inputMode="decimal" label="Fare (naira)" defaultValue={v.amount} error={e.amount} placeholder="150" required />
      <Field
        id="fare-from" name="effectiveFrom" type="datetime-local" label="Starts (optional)" defaultValue={v.effectiveFrom} error={e.effectiveFrom}
        hint="Leave empty to start now. Times are West Africa Time. The previous fare ends when this one starts."
      />
      <SubmitButton>Save fare</SubmitButton>
    </form>
  );
}
