"use client";

import { AnimatedModal } from "@/components/ui/animated-modal";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { UserRow } from "../types";

interface DeleteUserModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: UserRow | null;
  deleting: boolean;
  error?: string;
}

export function DeleteUserModal({
  open,
  onClose,
  onConfirm,
  user,
  deleting,
  error,
}: DeleteUserModalProps) {
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      title={t("users", "deleteUser")}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("users", "deleteUserConfirm").replace("{name}", user.name)}
        </p>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
          >
            {t("common", "cancel")}
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? t("common", "loading") : t("common", "delete")}
          </Button>
        </div>
      </div>
    </AnimatedModal>
  );
}

