import type { ComponentType } from "react";
import { CheckIcon, ClockIcon, NairaIcon, QrIcon } from "./Icons";

type Step = { title: string; text: string; Icon: ComponentType<{ className?: string }>; soon?: boolean };

const STEPS: Step[] = [
  { title: "Scan", Icon: QrIcon, text: "Scan the QR code of an approved driver. You see their name, photo, route and fare." },
  { title: "Pay", Icon: NairaIcon, text: "See the fare and enter the amount you paid. Shuttler works out the change owed." },
  { title: "Confirm", Icon: CheckIcon, text: "The driver confirms they received the cash and owe you the change, or rejects the claim." },
  { title: "Carry your credit", Icon: ClockIcon, soon: true, text: "Confirmed change is recorded on your account. Using it as credit on later rides is planned." },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="mx-auto max-w-6xl px-4">
      <div className="rounded-[2rem] bg-linear-to-br from-brand-900 via-brand-800 to-brand-700 p-7 text-white shadow-xl sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-300">The Shuttler way</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Scan. Pay. Confirm. Carry your credit.</h2>
        <p className="mt-3 max-w-2xl text-brand-100">Cash stays the way you pay. Shuttler records what was paid and what is owed, and the driver has to confirm it.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ title, text, Icon, soon }, i) => (
            <li key={title} className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-700"><Icon className="h-6 w-6" /></span>
                <span className="text-sm font-bold text-brand-300">0{i + 1}</span>
              </div>
              <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-bold">
                {title}
                {soon ? <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-brand-800">Coming soon</span> : null}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
