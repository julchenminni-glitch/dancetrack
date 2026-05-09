import { confirm as confirmFallback } from './confirmFallback';

// Module-level slot. ConfirmProvider registers its in-app modal confirm here at mount time.
// All callers just import { confirm } and call it like a function - no hook needed.
let activeConfirm = confirmFallback;

export const _registerConfirm = (fn) => { activeConfirm = fn || confirmFallback; };

export const confirm = (title, message, onConfirm, confirmLabel = 'Löschen') =>
  activeConfirm(title, message, onConfirm, confirmLabel);
