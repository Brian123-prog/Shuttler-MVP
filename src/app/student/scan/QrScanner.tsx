"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";

type Stoppable = { stop: () => Promise<void>; clear: () => void };

export function QrScanner() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanner = useRef<Stoppable | null>(null);

  useEffect(() => {
    if (!active) return;
    let done = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const instance = new Html5Qrcode("qr-reader");
        scanner.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            if (done) return;
            done = true;
            instance.stop().catch(() => undefined).finally(() => router.push(`/student/scan?c=${encodeURIComponent(decoded)}`));
          },
          () => undefined,
        );
      } catch (e) {
        const denied = String(e).toLowerCase().includes("permission");
        setError(denied ? "Camera access was denied. Allow camera access in your browser settings, or enter the code below." : "The camera could not be started. Enter the code below instead.");
        setActive(false);
      }
    })();
    return () => {
      done = true;
      const s = scanner.current;
      scanner.current = null;
      if (s) s.stop().then(() => s.clear()).catch(() => undefined);
    };
  }, [active, router]);

  return (
    <div className="space-y-3">
      {error ? <Alert tone="warning" title="Camera unavailable">{error}</Alert> : null}
      {active ? <div id="qr-reader" className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl" /> : null}
      {active ? (
        <Button variant="secondary" onClick={() => setActive(false)}>Stop camera</Button>
      ) : (
        <Button size="lg" onClick={() => { setError(null); setActive(true); }}>Open camera</Button>
      )}
    </div>
  );
}
