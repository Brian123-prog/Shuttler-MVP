"use client";

import { useRef, useState, type ChangeEvent } from "react";

const MAX_SIDE = 512;

/**
 * File picker for a profile photo. The chosen picture is shrunk to at most 512 pixels and re-saved as JPEG in the browser,
 * which keeps uploads small and removes camera metadata. The server still checks the file itself.
 */
export function AvatarInput({ name = "photo", label = "Profile photo", error }: { name?: string; label?: string; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setProblem("Choose a JPEG, PNG or WebP picture.");
      input.value = "";
      setPreview(null);
      return;
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no canvas");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error("no blob");
      const shrunk = new File([blob], "photo.jpg", { type: "image/jpeg" });
      const transfer = new DataTransfer();
      transfer.items.add(shrunk);
      input.files = transfer.files;
      setPreview(URL.createObjectURL(shrunk));
      setProblem(null);
    } catch {
      setProblem("That picture could not be read. Try another one.");
      input.value = "";
      setPreview(null);
    }
  }

  const shown = problem ?? error;
  return (
    <div className="space-y-1.5">
      <label htmlFor={`${name}-input`} className="block text-sm font-medium text-slate-800">{label}</label>
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo preview" className="h-16 w-16 rounded-full object-cover" />
        ) : null}
        <input
          ref={ref} id={`${name}-input`} name={name} type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange}
          className="block w-full text-sm text-slate-700 file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:font-semibold file:text-brand-800"
        />
      </div>
      {shown ? <p role="alert" className="text-xs font-medium text-danger-700">{shown}</p> : null}
    </div>
  );
}
