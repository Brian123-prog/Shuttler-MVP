import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { listActiveUniversities } from "@/lib/universities";
import { StudentRegisterForm } from "../../forms";
import { NotConfigured } from "../../NotConfigured";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register as Student" };

export default async function Page() {
  const list = await listActiveUniversities();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Register as Student</h1>
      <p className="mb-5 mt-1 text-sm text-slate-600">Your university administrator will verify your details before you can use all features.</p>
      {list.state === "unconfigured" ? (
        <NotConfigured />
      ) : list.state === "error" ? (
        <Alert tone="danger" title="Could not load universities">Please refresh the page and try again.</Alert>
      ) : list.universities.length === 0 ? (
        <Alert tone="warning" title="No universities available">No university is accepting registrations yet.</Alert>
      ) : (
        <StudentRegisterForm universities={list.universities} />
      )}
      <p className="mt-6 text-center text-sm text-slate-700">
        Already registered? <Link href="/login" className="font-medium text-brand-700 underline">Log in</Link>
      </p>
    </>
  );
}
