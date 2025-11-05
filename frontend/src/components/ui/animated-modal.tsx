"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { createPortal } from "react-dom";

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

  const modalContent = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[9999] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !disableBackdropClose && onClose()}
            aria-hidden="true"
          />
          {/* Panel */}
          <motion.div
            key="panel"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div
              className={`w-full ${maxWidthClassName} rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-dark-3 dark:bg-gray-dark relative`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button - always visible */}
              <button
                type="button"
                className="absolute top-3 right-3 rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
              
              {title && (
                <div className="mb-3 pr-8">
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    {title}
                  </h3>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal outside the main layout
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
