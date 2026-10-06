import type { FieldErrors } from "@/lib/validation";

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};
