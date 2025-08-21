export function slugFromRole(role: string): string {
  return role
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function defaultRouteForRole(role?: string | null): string {
  if (!role) return "/dashboard";
  const normalized = role.toLowerCase();
  if (normalized.includes("citizen")) return "/cases";
  return `/dashboard/${slugFromRole(role)}`;
}


