import type { ComponentType } from "react";
import { CheckIcon, DriverIcon, StudentIcon, UniversityIcon } from "./Icons";

type Audience = { id: string; title: string; headline: string; Icon: ComponentType<{ className?: string }>; points: string[] };

const AUDIENCES: Audience[] = [
  {
    id: "students", title: "For students", headline: "Your campus ride, with less hassle.", Icon: StudentIcon,
    points: ["Register with your university and get verified", "Scan a driver QR code to see their name, photo, route and fare", "Record the cash you paid and the change you are owed", "Follow the status of every claim", "Dispute a rejected claim with your university"],
  },
  {
    id: "drivers", title: "For drivers", headline: "Simple tools for approved campus shuttle drivers.", Icon: DriverIcon,
    points: ["Register, add your photo and get verified by your university", "Receive your own personal QR code from the university", "Confirm or reject change claims in one inbox", "See your shuttle, route and recent rides", "Keep a clearer record of what riders paid"],
  },
  {
    id: "universities", title: "For universities", headline: "Better visibility and accountability for campus transportation.", Icon: UniversityIcon,
    points: ["Verify students and drivers", "Manage shuttles, routes, stops and fares", "Issue driver QR codes and assign shuttles", "Decide disputes with a recorded note", "Keep an audit trail of key actions, separate from other universities"],
  },
];

export function PlatformCards() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">One platform, three sides</p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-4xl">More than a way to settle change.</h2>
        <p className="mt-3 text-lg text-slate-700">Shuttler is a university transportation platform. Solving change is where it starts.</p>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {AUDIENCES.map(({ id, title, headline, Icon, points }) => (
          <article key={id} id={id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></span>
            <p className="mt-5 text-sm font-bold uppercase tracking-wider text-brand-500">{title}</p>
            <h3 className="mt-1 text-xl font-bold leading-snug text-brand-900">{headline}</h3>
            <ul className="mt-4 space-y-2.5">
              {points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-slate-700"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{p}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
