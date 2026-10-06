"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { SubmitButton } from "@/app/(auth)/SubmitButton";
import type { FormState } from "@/app/(auth)/state";
import { removeAvatarAction, uploadAvatarAction } from "@/app/profile-actions";
import { Avatar } from "./Avatar";
import { AvatarInput } from "./AvatarInput";

export function AvatarUploader({ currentUrl, name, hasPhoto }: { currentUrl: string | null; name: string; hasPhoto: boolean }) {
  const [state, action] = useActionState(uploadAvatarAction, {} as FormState);
  return (
    <div className="space-y-4">
      <Avatar url={currentUrl} name={name} size={80} />
      {state.error ? <Alert tone="danger" title="Could not save">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <form action={action} className="max-w-md space-y-3">
        <AvatarInput name="photo" label={hasPhoto ? "Choose a new picture" : "Choose a picture"} />
        <SubmitButton>Save picture</SubmitButton>
      </form>
      {hasPhoto ? <form action={removeAvatarAction}><Button type="submit" variant="ghost">Remove picture</Button></form> : null}
    </div>
  );
}
