"use client";

import { Button, ErrorState } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <ErrorState action={<Button onClick={reset}>Try again</Button>} />
    </main>
  );
}
