"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

type SuccessModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  /** auto close in ms (e.g., 3000). If omitted, stays until user closes. */
  autoCloseMs?: number;
  /** Optional primary button label (default: "OK") */
  buttonLabel?: string;
};

export function SuccessModal({
  open,
  onClose,
  title = "Success",
  message,
  autoCloseMs,
  buttonLabel = "OK",
}: SuccessModalProps) {
  React.useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="s-backdrop"
            className="fixed inset-0 z-[110] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            key="s-panel"
            className="fixed inset-0 z-[111] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-green-300 bg-green-50 p-6 text-green-900 shadow-xl dark:border-green-800/40 dark:bg-green-900/30 dark:text-green-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{title}</h3>
                <button
                  type="button"
                  className="rounded p-1 text-green-700 hover:bg-green-100 dark:text-green-200 dark:hover:bg-green-800/40"
                  onClick={onClose}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
                  ✓
                </span>
                <p className="text-sm leading-6">{message}</p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  {buttonLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
