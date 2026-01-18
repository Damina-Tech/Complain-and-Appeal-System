"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import { UserRow } from "../types";
import { statusBadge } from "../constants";
import { UserActions } from "./UserActions";

interface UsersTableProps {
  users: UserRow[];
  loading: boolean;
  pageError: string;
  canModifyUser: (user: UserRow) => boolean;
  onView: (user: UserRow) => void;
  onEdit: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
}

export function UsersTable({
  users,
  loading,
  pageError,
  canModifyUser,
  onView,
  onEdit,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation();

  return (
    <Table>
      <TableHeader>
        <TableRow className="[&>th]:text-center">
          <TableHead className="!text-left">{t("users", "name")}</TableHead>
          <TableHead>{t("users", "email")}</TableHead>
          <TableHead>{t("users", "phone")}</TableHead>
          <TableHead>{t("users", "nationalId")}</TableHead>
          <TableHead>{t("users", "roles")}</TableHead>
          <TableHead>{t("users", "status")}</TableHead>
          <TableHead>{t("common", "actions")}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-300">
              {t("common", "loading")}
            </TableCell>
          </TableRow>
        )}

        {!loading && pageError && (
          <TableRow>
            <TableCell colSpan={7} className="py-4 text-center text-red-500">
              {pageError}
            </TableCell>
          </TableRow>
        )}

        {!loading && !pageError && users.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-300">
              {t("users", "noUsersFound")}
            </TableCell>
          </TableRow>
        )}

        {!loading &&
          !pageError &&
          users.map((u) => {
            // Pre-compute canModify to avoid multiple function calls
            // This determines if Edit/Delete buttons should be enabled
            // Returns false if target user has same or higher role level than current user
            const canModify = canModifyUser(u);
            
            // Debug log for each user
            console.log(`[UsersTable] User: ${u.name}, Roles: [${u.roles.join(', ')}], canModify: ${canModify}, disabled: ${!canModify}`);
            
            return (
              <TableRow
                key={u.id}
                className="text-center text-base font-medium text-dark dark:text-white"
              >
                <TableCell className="!text-left">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone}</TableCell>
                <TableCell>{u.nationalId}</TableCell>
                <TableCell>{u.roles.join(", ")}</TableCell>
                <TableCell>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      statusBadge[(u.status || "").toLowerCase()] ||
                      "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {u.status[0].toUpperCase() + u.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <UserActions
                    user={u}
                    canModify={canModify}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}

