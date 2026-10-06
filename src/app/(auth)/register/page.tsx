import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Create an account</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">Choose how you will use Shuttler. Your university verifies every account.</p>
      <div className="space-y-3">
        <ButtonLink href="/register/student" size="lg" className="w-full">Register as Student</ButtonLink>
        <ButtonLink href="/register/driver" size="lg" variant="secondary" className="w-full">Register as Driver</ButtonLink>
      </div>
      <p className="mt-6 text-center text-sm text-slate-700">
        Already registered? <Link href="/login" className="font-medium text-brand-700 underline">Log in</Link>
      </p>
    </>
  );
}
