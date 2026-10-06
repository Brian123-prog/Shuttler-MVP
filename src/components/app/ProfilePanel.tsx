"use client";

import { useActionState } from "react";
import { Alert, Field } from "@/components/ui";
import { SubmitButton } from "@/app/(auth)/SubmitButton";
import type { FormState } from "@/app/(auth)/state";
import { updateProfileAction } from "@/app/profile-actions";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, {} as FormState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-md space-y-4" noValidate>
      {state.error ? <Alert tone="danger" title="Could not save">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field id="email" label="Email" value={email} readOnly />
      <Field id="fullName" name="fullName" label="Full name" defaultValue={state.values?.fullName ?? fullName} error={e.fullName} required />
      <Field id="phone" name="phone" type="tel" label="Phone" defaultValue={state.values?.phone ?? phone} error={e.phone} />
      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
