import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function FinalCta() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
        <div className="rounded-[2rem] bg-linear-to-br from-brand-900 via-brand-800 to-brand-600 px-6 py-12 text-center text-white shadow-xl sm:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Ready for campus rides with less hassle?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">Create your account, get verified by your university and start recording your rides.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-500 px-7 text-base font-semibold text-white hover:bg-brand-400">Create an account</Link>
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-7 text-base font-semibold text-brand-800 hover:bg-brand-50">Sign in</Link>
          </div>
          <p className="mt-5 text-sm text-brand-100">
            Or register directly as a <Link href="/register/student" className="font-semibold underline">student</Link> or a <Link href="/register/driver" className="font-semibold underline">driver</Link>.
          </p>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row">
          <Logo size={28} />
          <p>University transportation platform</p>
        </div>
      </footer>
    </>
  );
}
