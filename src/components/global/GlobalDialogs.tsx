import { useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import {
  globalDialogState,
  resolveGlobalDialog,
  confirmDialog,
  alertDialog,
} from "@/store/globalDialogStore";

const confirmAccent: Record<
  "danger" | "neutral",
  string
> = {
  danger:
    "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 dark:focus:ring-offset-base-950",
  neutral:
    "bg-slate-900 hover:bg-slate-800 dark:bg-base-100 dark:text-base-900 dark:hover:bg-white focus:ring-slate-500 dark:focus:ring-offset-base-950",
};

const alertAccent: Record<
  "info" | "danger" | "success",
  string
> = {
  info: "bg-slate-900 hover:bg-slate-800 dark:bg-base-100 dark:text-base-900 focus:ring-slate-500",
  danger: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500",
  success: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
};

export default function GlobalDialogs() {
  const state = useStore(globalDialogState);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as Window & { microblogDialogs?: unknown }).microblogDialogs = {
      confirm: confirmDialog,
      alert: alertDialog,
    };
    return () => {
      delete (window as Window & { microblogDialogs?: unknown }).microblogDialogs;
    };
  }, []);

  useEffect(() => {
    if (!state) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (state.kind === "confirm") resolveGlobalDialog(false);
        else resolveGlobalDialog(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  useEffect(() => {
    if (!state || !panelRef.current) return;
    const primary = panelRef.current.querySelector<HTMLElement>(
      "button[data-global-dialog-primary='true']",
    );
    primary?.focus();
  }, [state]);

  if (!state) return null;

  function backdropClick(e: React.MouseEvent) {
    if (e.target !== e.currentTarget) return;
    if (state.kind === "confirm") resolveGlobalDialog(false);
    else resolveGlobalDialog(true);
  }

  return (
    <>
      <div
        className="gd-overlay fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/55 dark:bg-black/65 backdrop-blur-[2px]"
        role="presentation"
        onClick={backdropClick}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-dialog-title"
          className="gd-panel relative w-full max-w-md rounded-2xl border border-base-200/80 dark:border-base-700 bg-white dark:bg-base-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.28)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-5 pb-4 sm:px-6 sm:pt-6 flex gap-4">
            <div
              className={`shrink-0 size-11 rounded-2xl flex items-center justify-center ${
                state.kind === "confirm"
                  ? state.variant === "danger"
                    ? "bg-rose-100 dark:bg-rose-950/50"
                    : "bg-slate-100 dark:bg-base-800"
                  : state.variant === "danger"
                    ? "bg-rose-100 dark:bg-rose-950/50"
                    : state.variant === "success"
                      ? "bg-emerald-100 dark:bg-emerald-950/40"
                      : "bg-sky-100 dark:bg-sky-950/35"
              }`}
            >
              {state.kind === "confirm" && state.variant === "danger" ? (
                <svg
                  className="size-6 text-rose-600 dark:text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              ) : state.kind === "confirm" ? (
                <svg
                  className="size-6 text-slate-600 dark:text-base-400"
                  fill="none"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : state.variant === "success" ? (
                <svg
                  className="size-6 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : state.variant === "danger" ? (
                <svg
                  className="size-6 text-rose-600 dark:text-rose-400"
                  fill="none"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              ) : (
                <svg
                  className="size-6 text-sky-600 dark:text-sky-400"
                  fill="none"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="global-dialog-title"
                className="text-[1.0625rem] font-semibold text-slate-900 dark:text-base-50 tracking-tight"
              >
                {state.title}
              </h2>
              {state.message ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-base-400 leading-relaxed whitespace-pre-wrap">
                  {state.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end border-t border-base-100 dark:border-base-800 bg-base-50/50 dark:bg-base-950/30 pt-3">
            {state.kind === "confirm" ? (
              <>
                <button
                  type="button"
                  onClick={() => resolveGlobalDialog(false)}
                  className="cursor-pointer px-4 py-2.5 rounded-xl text-sm font-medium border border-base-300 dark:border-base-600 bg-white dark:bg-base-900 text-base-700 dark:text-base-200 hover:bg-base-50 dark:hover:bg-base-800 transition-colors"
                >
                  {state.cancelLabel}
                </button>
                <button
                  type="button"
                  data-global-dialog-primary="true"
                  onClick={() => resolveGlobalDialog(true)}
                  className={`cursor-pointer px-4 py-2.5 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-base-900 transition-colors ${confirmAccent[state.variant]}`}
                >
                  {state.confirmLabel}
                </button>
              </>
            ) : (
              <button
                type="button"
                data-global-dialog-primary="true"
                onClick={() => resolveGlobalDialog(true)}
                className={`cursor-pointer px-5 py-2.5 rounded-xl text-sm font-medium text-white sm:min-w-[7rem] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-base-900 transition-colors ${alertAccent[state.variant]}`}
              >
                {state.okLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gd-overlay-in {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes gd-panel-in {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .gd-overlay { animation: gd-overlay-in 0.2s ease-out both; }
        .gd-panel { animation: gd-panel-in 0.26s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </>
  );
}
