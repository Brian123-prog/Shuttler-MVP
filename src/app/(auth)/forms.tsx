"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Field, SelectField } from "@/components/ui";
import { AvatarInput } from "@/components/app/AvatarInput";
import type { UniversityOption } from "@/lib/universities";
import {
  forgotPasswordAction, loginAction, registerDriverAction, registerStudentAction, resetPasswordAction,
} from "./actions";
import { SubmitButton } from "./SubmitButton";
import type { FormState } from "./state";

const initial: FormState = {};

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="danger" title="Could not continue">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" defaultValue={state.values?.email} required />
      <Field id="password" name="password" type="password" label="Password" autoComplete="current-password" required />
      <SubmitButton className="w-full">Log in</SubmitButton>
      <p className="text-center text-sm"><Link href="/forgot-password" className="font-medium text-brand-700 underline">Forgot your password?</Link></p>
    </form>
  );
}

function CommonFields({ state, universities }: { state: FormState; universities: UniversityOption[] }) {
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <>
      <Field id="fullName" name="fullName" label="Full name" autoComplete="name" defaultValue={v.fullName} error={e.fullName} required />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" defaultValue={v.email} error={e.email} required />
      <Field id="phone" name="phone" type="tel" label="Phone (optional)" autoComplete="tel" defaultValue={v.phone} error={e.phone} />
      <SelectField
        id="universityId" name="universityId" label="University" defaultValue={v.universityId ?? ""}
        options={universities.map((u) => ({ value: u.id, label: u.short_name ? `${u.name} (${u.short_name})` : u.name }))}
        placeholder="Select your university" error={e.universityId} required
      />
    </>
  );
}

function PasswordFields({ state }: { state: FormState }) {
  const e = state.fieldErrors ?? {};
  return (
    <>
      <Field id="password" name="password" type="password" label="Password" autoComplete="new-password"
        hint="At least 10 characters, with a letter and a number." error={e.password} required />
      <Field id="confirmPassword" name="confirmPassword" type="password" label="Confirm password" autoComplete="new-password" error={e.confirmPassword} required />
    </>
  );
}

export function StudentRegisterForm({ universities }: { universities: UniversityOption[] }) {
  const [state, action] = useActionState(registerStudentAction, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <CommonFields state={state} universities={universities} />
      <Field id="studentNumber" name="studentNumber" label="Student ID" defaultValue={state.values?.studentNumber} error={e.studentNumber}
        hint="Your university will use this to verify you." required />
      <PasswordFields state={state} />
      <SubmitButton className="w-full">Create student account</SubmitButton>
    </form>
  );
}

export function DriverRegisterForm({ universities }: { universities: UniversityOption[] }) {
  const [state, action] = useActionState(registerDriverAction, initial);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <CommonFields state={state} universities={universities} />
      <Field id="licenseNumber" name="licenseNumber" label="Driver licence number" defaultValue={v.licenseNumber} error={e.licenseNumber} required />
      <Field id="vehiclePlate" name="vehiclePlate" label="Vehicle plate number (optional)" defaultValue={v.vehiclePlate} error={e.vehiclePlate} />
      <Field id="vehicleDescription" name="vehicleDescription" label="Vehicle description (optional)" defaultValue={v.vehicleDescription} error={e.vehicleDescription}
        hint="For example: make, model and colour." />
      <AvatarInput name="photo" label="Profile picture (optional)" error={e.photo} />
      <PasswordFields state={state} />
      <SubmitButton className="w-full">Create driver account</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <Field id="email" name="email" type="email" label="Email" autoComplete="email" defaultValue={state.values?.email} error={state.fieldErrors?.email} required />
      <SubmitButton className="w-full">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <PasswordFields state={state} />
      <SubmitButton className="w-full">Set new password</SubmitButton>
    </form>
  );
}
