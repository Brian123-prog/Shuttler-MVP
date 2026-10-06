"use client";

import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { SubmitButton } from "@/app/(auth)/SubmitButton";
import type { FormState } from "@/app/(auth)/state";
import { assignAdminAction, saveUniversityAction } from "./actions";

export type UniversityValues = { id?: string; name: string; short_name: string | null; slug: string; status: "ONBOARDING" | "ACTIVE" | "SUSPENDED" };

export function UniversityForm({ university }: { university?: UniversityValues }) {
  const [state, action] = useActionState(saveUniversityAction, {} as FormState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="max-w-lg space-y-4" noValidate>
      {state.error ? <Alert tone="danger" title="Could not save">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={university?.id ?? ""} />
      <Field id="name" name="name" label="University name" defaultValue={v.name ?? university?.name} error={e.name} required />
      <Field id="shortName" name="shortName" label="Short name (optional)" defaultValue={v.shortName ?? university?.short_name ?? ""} error={e.shortName} hint="For example: FUTA" />
      <Field id="slug" name="slug" label="Slug" defaultValue={v.slug ?? university?.slug} error={e.slug} hint="Lowercase letters, numbers and hyphens. Used in URLs." required />
      <SelectField
        id="status" name="status" label="Status" defaultValue={v.status ?? university?.status ?? "ONBOARDING"} error={e.status}
        options={[{ value: "ONBOARDING", label: "Onboarding (not open for registration)" }, { value: "ACTIVE", label: "Active (open for registration)" }, { value: "SUSPENDED", label: "Suspended" }]}
        placeholder="Select a status"
      />
      <SubmitButton>{university ? "Save changes" : "Create university"}</SubmitButton>
    </form>
  );
}

export function AssignAdminForm({ universityId }: { universityId: string }) {
  const [state, action] = useActionState(assignAdminAction, {} as FormState);
  return (
    <form action={action} className="max-w-lg space-y-4" noValidate>
      {state.error ? <Alert tone="danger" title="Could not add">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="universityId" value={universityId} />
      <Field id="adminEmail" name="email" type="email" label="Administrator email" defaultValue={state.values?.email} error={state.fieldErrors?.email} required />
      <SubmitButton>Add administrator</SubmitButton>
    </form>
  );
}
