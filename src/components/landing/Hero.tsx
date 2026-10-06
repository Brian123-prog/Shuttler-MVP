import Link from "next/link";
import { CheckIcon } from "./Icons";
import { HeroIllustration } from "./HeroIllustration";

const FACTS = ["Students and approved campus drivers", "Change confirmed by the driver", "Your university stays in charge"];

export function Hero() {
  return (
    <section id="top" className="mx-auto max-w-6xl px-4 pt-5 sm:pt-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-brand-900 via-brand-800 to-brand-600 px-6 py-10 shadow-xl sm:px-10 lg:px-14 lg:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-400/40 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">University transportation platform</p>
            <h1 className="mt-4 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              <span className="block text-white">Campus rides.</span>
              <span className="block text-brand-300">Clear payments.</span>
              <span className="block text-white">No lost change.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
              Shuttler connects students and approved campus shuttle drivers, so the fare and any change owed are recorded, confirmed by the driver and kept on file.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-500 px-7 text-base font-semibold text-white shadow-lg shadow-brand-900/40 hover:bg-brand-400">Get started</Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-7 text-base font-semibold text-brand-800 hover:bg-brand-50">Sign in</Link>
            </div>
            <ul className="mt-7 space-y-2 text-sm text-brand-100">
              {FACTS.map((f) => (
                <li key={f} className="flex items-center gap-2"><CheckIcon className="h-4 w-4 shrink-0 text-brand-300" />{f}</li>
              ))}
            </ul>
          </div>
          <HeroIllustration className="mx-auto w-full max-w-xl" />
        </div>
      </div>
    </section>
  );
}
