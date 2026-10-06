const CONSEQUENCES = ["Confusion", "Delays", "Disputes", "Forgotten change"];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">The everyday problem</p>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-4xl">Paid with a bigger note. Where does your change go?</h2>
          <p className="mt-4 text-lg text-slate-700">Campus fares are often simple. Getting the right change is not. When the driver has no change, riders and drivers are left to remember and trust.</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="What goes wrong">
            {CONSEQUENCES.map((c) => (<li key={c} className="rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-800">{c}</li>))}
          </ul>
          <p className="mt-6 text-base font-semibold text-brand-900">Shuttler gives students and drivers one clear record of what was paid and what is owed.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Example ride</p>
          <dl className="mt-4 divide-y divide-slate-100 text-base">
            <div className="flex justify-between py-3"><dt className="text-slate-600">Fare</dt><dd className="font-bold text-slate-900">{"\u20A6"}200</dd></div>
            <div className="flex justify-between py-3"><dt className="text-slate-600">You paid</dt><dd className="font-bold text-slate-900">{"\u20A6"}500</dd></div>
            <div className="flex justify-between py-3"><dt className="text-slate-600">Change owed</dt><dd className="font-extrabold text-success-700">{"\u20A6"}300</dd></div>
          </dl>
          <p className="mt-2 rounded-xl bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700">The driver has no change right now.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-700">Without a record</p><p className="mt-1 text-sm text-slate-600">Forgotten, argued over, or lost.</p></div>
            <div className="rounded-2xl bg-success-50 p-4"><p className="text-sm font-bold text-success-700">With Shuttler</p><p className="mt-1 text-sm text-slate-700">Recorded, confirmed by the driver, kept on file.</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
