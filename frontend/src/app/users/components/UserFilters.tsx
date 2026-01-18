"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  roleOptions: string[];
  statusOptions: string[];
  canCreateUser: boolean;
  onAddUserClick: () => void;
}

export function UserFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  roleOptions,
  statusOptions,
  canCreateUser,
  onAddUserClick,
}: UserFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        {/* Role filter */}
        <div className="w-[200px]">
          <select
            className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? `${t("common", "all")} ${t("users", "roles")}` : r}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="w-[180px]">
          <select
            className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? `${t("common", "all")} ${t("users", "status")}`
                  : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <Input
          placeholder={t("common", "search")}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[300px]"
        />
      </div>

      {canCreateUser && (
        <Button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={onAddUserClick}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("users", "addNewUser")}
        </Button>
      )}
    </div>
  );
}

