"use client";

import { useActionState } from "react";
import { Alert, Button, TextAreaField } from "@/components/ui";
import type { FormState } from "@/app/(auth)/state";
import { reviewAction } from "../../actions";

export type ReviewOption = { decision: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED"; label: string; variant: "primary" | "secondary" | "danger" };

export function ReviewForm({ membershipId, returnTo, options }: { membershipId: string; returnTo: string; options: ReviewOption[] }) {
  const [state, action, pending] = useActionState(reviewAction, {} as FormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert tone="danger" title="Could not save">{state.error}</Alert> : null}
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <TextAreaField
        id="note" name="note" label="Note to the applicant" defaultValue={state.values?.note}
        error={state.fieldErrors?.note} hint="Required when rejecting or suspending. The applicant can see this note."
      />
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <Button key={o.decision} type="submit" name="decision" value={o.decision} variant={o.variant} disabled={pending}>{o.label}</Button>
        ))}
      </div>
    </form>
  );
}
