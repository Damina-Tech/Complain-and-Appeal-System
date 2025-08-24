"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

type AnimatedModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** If true, clicking the backdrop will NOT close the modal */
  disableBackdropClose?: boolean;
  /** Optional max width (e.g., "max-w-xl"). Defaults to max-w-xl */
  maxWidthClassName?: string;
};

export function AnimatedModal({
  open,
  onClose,
  title,
  children,
  disableBackdropClose = false,
  maxWidthClassName = "max-w-xl",
}: AnimatedModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[100] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !disableBackdropClose && onClose()}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div
              className={`w-full ${maxWidthClassName} rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-dark-3 dark:bg-gray-dark`}
              onClick={(e) => e.stopPropagation()}
            >
              {(title || onClose) && (
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    {title}
                  </h3>
                  <button
                    type="button"
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-dark-6 dark:hover:bg-dark-2"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
