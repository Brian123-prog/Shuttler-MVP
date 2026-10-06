import type { ComponentType } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { ArrowDownIcon, ArrowRightIcon, DriverIcon, ScaleIcon, StudentIcon, UniversityIcon } from "./Icons";

type Node = { label: string; role: string; Icon?: ComponentType<{ className?: string }> };

const NODES: Node[] = [
  { label: "Student", role: "Records the fare and the cash paid", Icon: StudentIcon },
  { label: "Shuttler", role: "Keeps the record" },
  { label: "Driver", role: "Confirms the change", Icon: DriverIcon },
  { label: "University", role: "Verifies people and decides disputes", Icon: UniversityIcon },
];

const DISPUTE = ["The driver rejects a claim", "The student raises a dispute and explains why", "The university administrator reviews and decides", "The decision and the note are recorded"];

export function AccountabilitySection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">Accountability</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-4xl">One transportation platform. Better accountability.</h2>
      </div>

      <ol className="mt-10 flex flex-col items-stretch gap-2 lg:flex-row lg:items-center lg:gap-3">
        {NODES.map(({ label, role, Icon }, i) => (
          <li key={label} className="contents">
            <div className={`flex-1 rounded-3xl border p-5 text-center ${Icon ? "border-slate-200 bg-white" : "border-brand-700 bg-brand-800 text-white"}`}>
              <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${Icon ? "bg-brand-50 text-brand-700" : ""}`}>
                {Icon ? <Icon className="h-6 w-6" /> : <LogoMark size={44} />}
              </span>
              <p className={`mt-3 text-lg font-bold ${Icon ? "text-brand-900" : "text-white"}`}>{label}</p>
              <p className={`mt-1 text-sm ${Icon ? "text-slate-600" : "text-brand-100"}`}>{role}</p>
            </div>
            {i < NODES.length - 1 ? (
              <span aria-hidden="true" className="flex justify-center text-brand-400">
                <ArrowDownIcon className="h-6 w-6 lg:hidden" />
                <ArrowRightIcon className="hidden h-6 w-6 lg:block" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-3xl border border-brand-100 bg-brand-50 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700"><ScaleIcon className="h-6 w-6" /></span>
          <div>
            <h3 className="text-xl font-bold text-brand-900">Disagree with a rejection? Raise a dispute.</h3>
            <p className="mt-1 text-slate-700">If a driver rejects a change claim, the student can take it to their university instead of arguing on the shuttle.</p>
          </div>
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DISPUTE.map((step, i) => (
            <li key={step} className="rounded-2xl bg-white p-4 text-sm font-medium text-slate-800 shadow-sm">
              <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
