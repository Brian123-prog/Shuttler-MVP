"use client";

import { useActionState } from "react";
import { Alert, Field, SelectField, TextAreaField } from "@/components/ui";
import { SubmitButton } from "@/app/(auth)/SubmitButton";
import type { FormState } from "@/app/(auth)/state";
import { DAY_OPTIONS } from "@/lib/transport/format";
import type { RouteRow, StopRow } from "@/lib/transport/queries";
import { saveRouteAction, saveScheduleAction, saveSettingsAction, saveStopAction } from "./transport-actions";

const initial: FormState = {};
const STATUS_OPTIONS = [{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }];

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <Alert tone="danger" title="Could not save">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

function DayPicker({ selected, error }: { selected: number[]; error?: string }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium text-slate-800">Days</legend>
      <div className="flex flex-wrap gap-2">
        {DAY_OPTIONS.map(([value, label]) => (
          <label key={value} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm">
            <input type="checkbox" name="days" value={value} defaultChecked={selected.includes(value)} className="h-4 w-4" />
            {label}
          </label>
        ))}
      </div>
      {error ? <p role="alert" className="text-xs font-medium text-danger-700">{error}</p> : null}
    </fieldset>
  );
}

const toDays = (csv: string | undefined, fallback: number[]) => (csv === undefined ? fallback : csv.split(",").filter(Boolean).map(Number));

export function RouteForm({ route }: { route?: RouteRow }) {
  const [state, action] = useActionState(saveRouteAction, initial);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="max-w-xl space-y-4" noValidate>
      <Feedback state={state} />
      <input type="hidden" name="id" value={route?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="code" name="code" label="Code" defaultValue={v.code ?? route?.code} error={e.code} hint="For example: R1" required />
        <div className="sm:col-span-2"><Field id="name" name="name" label="Route name" defaultValue={v.name ?? route?.name} error={e.name} required /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="origin" name="origin" label="Origin" defaultValue={v.origin ?? route?.origin} error={e.origin} required />
        <Field id="destination" name="destination" label="Destination" defaultValue={v.destination ?? route?.destination} error={e.destination} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="start" name="start" type="time" label="First departure window opens" defaultValue={v.start ?? route?.operating_start.slice(0, 5) ?? "06:00"} error={e.start} required />
        <Field id="end" name="end" type="time" label="Service ends" defaultValue={v.end ?? route?.operating_end.slice(0, 5) ?? "20:00"} error={e.end} required />
      </div>
      <DayPicker selected={toDays(v.days, route?.operating_days ?? [1, 2, 3, 4, 5])} error={e.days} />
      <SelectField id="status" name="status" label="Status" options={STATUS_OPTIONS} defaultValue={v.status ?? route?.status ?? "ACTIVE"} error={e.status} />
      <SubmitButton>{route ? "Save route" : "Create route"}</SubmitButton>
    </form>
  );
}

export function StopForm({ stop }: { stop?: StopRow }) {
  const [state, action] = useActionState(saveStopAction, initial);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="max-w-xl space-y-4" noValidate>
      <Feedback state={state} />
      <input type="hidden" name="id" value={stop?.id ?? ""} />
      <Field id="stop-name" name="name" label="Stop name" defaultValue={v.name ?? stop?.name} error={e.name} required />
      <TextAreaField id="stop-description" name="description" label="Description (optional)" defaultValue={v.description ?? stop?.description ?? ""} error={e.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="latitude" name="latitude" inputMode="decimal" label="Latitude (optional)" defaultValue={v.latitude ?? stop?.latitude?.toString() ?? ""} error={e.latitude} />
        <Field id="longitude" name="longitude" inputMode="decimal" label="Longitude (optional)" defaultValue={v.longitude ?? stop?.longitude?.toString() ?? ""} error={e.longitude} />
      </div>
      {stop ? <SelectField id="stop-status" name="status" label="Status" options={STATUS_OPTIONS} defaultValue={v.status ?? stop.status} error={e.status} /> : null}
      <SubmitButton>{stop ? "Save stop" : "Add stop"}</SubmitButton>
    </form>
  );
}

export function ScheduleForm({ routeId }: { routeId: string }) {
  const [state, action] = useActionState(saveScheduleAction, initial);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-xl space-y-4" noValidate>
      <Feedback state={state} />
      <input type="hidden" name="routeId" value={routeId} />
      <Field id="time" name="time" type="time" label="Departure time" defaultValue={state.values?.time} error={e.time} required />
      <DayPicker selected={toDays(state.values?.days, [1, 2, 3, 4, 5])} error={e.days} />
      <SubmitButton>Add departure</SubmitButton>
    </form>
  );
}

export function SettingsForm({ email, phone }: { email: string; phone: string }) {
  const [state, action] = useActionState(saveSettingsAction, initial);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="max-w-md space-y-4" noValidate>
      <Feedback state={state} />
      <Field id="support-email" name="email" type="email" label="Transport office email" defaultValue={v.email ?? email} error={e.email} />
      <Field id="support-phone" name="phone" type="tel" label="Transport office phone" defaultValue={v.phone ?? phone} error={e.phone} />
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
