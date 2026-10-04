import { processDueCommunications } from "./communication-service";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/** Polls queued WhatsApp rows. Tests call processDueCommunications directly. */
export function startCommunicationWorker(intervalMs = 5_000): void {
  if (timer) return;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    processDueCommunications()
      .catch((err) => {
        console.warn("[whatsapp] worker failed", err instanceof Error ? err.message : "error");
      })
      .finally(() => {
        running = false;
      });
  }, intervalMs);
}
