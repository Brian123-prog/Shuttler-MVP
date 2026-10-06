import { Logo } from "@/components/brand/Logo";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-16">
      <Logo />
      <EmptyState title="Page not found" description="The page you are looking for does not exist or you do not have access to it." action={<ButtonLink href="/">Go to home</ButtonLink>} />
    </main>
  );
}
