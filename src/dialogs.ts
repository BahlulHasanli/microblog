/**
 * Sayt üzrə vahid təsdiq / xəbərdarlıq dialoqları.
 *
 * React / TS komponentlərində birbaşa import:
 *   import { confirmDialog, alertDialog } from "@/dialogs";
 *
 * Adi inline skriptdə (fallback ilə):
 *   window.microblogDialogs?.confirm({ ... }).then(...)
 */
export type {
  ConfirmDialogOptions,
  AlertDialogOptions,
  ConfirmVariant,
  AlertVariant,
} from "./store/globalDialogStore";
export {
  confirmDialog,
  alertDialog,
  globalDialogState,
} from "./store/globalDialogStore";
