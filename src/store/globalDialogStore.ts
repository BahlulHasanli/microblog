import { atom } from "nanostores";

export type ConfirmVariant = "danger" | "neutral";

export interface ConfirmDialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export type AlertVariant = "info" | "danger" | "success";

export interface AlertDialogOptions {
  title: string;
  message?: string;
  okLabel?: string;
  variant?: AlertVariant;
}

export type GlobalDialogPayload =
  | {
      kind: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      variant: ConfirmVariant;
    }
  | {
      kind: "alert";
      title: string;
      message: string;
      okLabel: string;
      variant: AlertVariant;
    };

export const globalDialogState = atom<GlobalDialogPayload | null>(null);

let pendingConfirmResolve: ((value: boolean) => void) | null = null;
let pendingAlertResolve: (() => void) | null = null;

function clearPending(reason: boolean) {
  if (pendingConfirmResolve) {
    pendingConfirmResolve(reason);
    pendingConfirmResolve = null;
  }
}

function clearPendingAlert() {
  if (pendingAlertResolve) {
    pendingAlertResolve();
    pendingAlertResolve = null;
  }
}

/** Problemlərin qarşısını almaq üçün növbədə ikinci dialoq gələndə köhnəsinə avtomatik "ləğv". */
export function confirmDialog(opts: ConfirmDialogOptions): Promise<boolean> {
  if (pendingConfirmResolve) clearPending(false);
  clearPendingAlert();
  globalDialogState.set(null);

  return new Promise((resolve) => {
    pendingConfirmResolve = resolve;
    globalDialogState.set({
      kind: "confirm",
      title: opts.title,
      message: opts.message ?? "",
      confirmLabel: opts.confirmLabel ?? "Təsdiq et",
      cancelLabel: opts.cancelLabel ?? "Ləğv et",
      variant: opts.variant ?? "neutral",
    });
  });
}

export function alertDialog(opts: AlertDialogOptions): Promise<void> {
  if (pendingConfirmResolve) clearPending(false);
  if (pendingAlertResolve) pendingAlertResolve();
  pendingAlertResolve = null;
  globalDialogState.set(null);

  return new Promise((resolve) => {
    pendingAlertResolve = resolve;
    globalDialogState.set({
      kind: "alert",
      title: opts.title,
      message: opts.message ?? "",
      okLabel: opts.okLabel ?? "Tamam",
      variant: opts.variant ?? "info",
    });
  });
}

export function resolveGlobalDialog(ok: boolean) {
  const s = globalDialogState.get();
  globalDialogState.set(null);
  if (s?.kind === "confirm" && pendingConfirmResolve) {
    pendingConfirmResolve(ok);
    pendingConfirmResolve = null;
    return;
  }
  if (s?.kind === "alert") {
    clearPendingAlert();
  }
}
