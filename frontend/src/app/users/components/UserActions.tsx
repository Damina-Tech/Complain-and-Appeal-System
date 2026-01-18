"use client";

import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { UserRow } from "../types";

interface UserActionsProps {
  user: UserRow;
  canModify: boolean;
  onView: (user: UserRow) => void;
  onEdit: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
}

export function UserActions({
  user,
  canModify,
  onView,
  onEdit,
  onDelete,
}: UserActionsProps) {
  const { t } = useTranslation();

  // Debug log
  console.log(`[UserActions] User: ${user.name}, canModify: ${canModify}, disabled: ${!canModify}`);

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => onView(user)}
        title={t("common", "view")}
      >
        <Eye className="h-4 w-4 text-blue-500" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          // Prevent action if button is disabled - double check
          if (!canModify) {
            console.warn('[UserActions] Edit button clicked but canModify is false for:', user.name);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onEdit(user);
        }}
        disabled={!canModify}
        className={!canModify ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
        style={!canModify ? { pointerEvents: 'none' } : undefined}
        title={
          canModify
            ? t("common", "edit")
            : "You cannot edit users with the same or higher role level"
        }
        aria-disabled={!canModify}
        tabIndex={!canModify ? -1 : 0}
      >
        <Pencil
          className={`h-4 w-4 ${
            canModify ? "text-green-500" : "text-gray-400 cursor-not-allowed"
          }`}
        />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          // Prevent action if button is disabled - double check
          if (!canModify) {
            console.warn('[UserActions] Delete button clicked but canModify is false for:', user.name);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onDelete(user);
        }}
        disabled={!canModify}
        className={!canModify ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
        style={!canModify ? { pointerEvents: 'none' } : undefined}
        title={
          canModify
            ? t("common", "delete")
            : "You cannot delete users with the same or higher role level"
        }
        aria-disabled={!canModify}
        tabIndex={!canModify ? -1 : 0}
      >
        <Trash2
          className={`h-4 w-4 ${
            canModify ? "text-red-500" : "text-gray-400 cursor-not-allowed"
          }`}
        />
      </Button>
    </div>
  );
}

