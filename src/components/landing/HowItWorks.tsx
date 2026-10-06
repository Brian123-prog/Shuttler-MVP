const STEPS = [
  ["01", "Register", "Create a student or driver account and choose your university."],
  ["02", "Get verified", "Your university administrator reviews your details and approves your account."],
  ["03", "Ride and record", "Scan a driver QR code, enter what you paid, and the driver confirms any change owed."],
  ["04", "Track and dispute", "Follow your claims and their status. If a claim is rejected, dispute it with your university."],
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 sm:pb-20">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">How Shuttler works</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-900 sm:text-4xl">From sign-up to a confirmed record.</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, title, text]) => (
            <li key={n} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-3xl font-extrabold text-brand-300">{n}</p>
              <h3 className="mt-2 text-lg font-bold text-brand-900">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
