"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_DATA } from "./data";
import { defaultRouteForRole, slugFromRole } from "@/lib/role";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";

export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));

    // Uncomment the following line to enable multiple expanded items
    // setExpandedItems((prev) =>
    //   prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    // );
  };

  useEffect(() => {
    // Keep collapsible open, when it's subpage is active
    NAV_DATA.some((section) => {
      return section.items.some((item) => {
        return item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title);
            }

            // Break the loop
            return true;
          }
        });
      });
    });
  }, [pathname]);

  // Get user groups from localStorage (dynamic role checking)
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  useEffect(() => {
    const loadUserGroups = async () => {
      if (typeof window === "undefined") {
        setIsLoadingGroups(false);
        return;
      }

      // Always fetch from API to ensure we have the latest groups
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL;
          const res = await fetch(`${API_URL}/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const groups = (data.user_groups || []).map((g: string) => g).filter(Boolean);
            setUserGroups(groups);
            localStorage.setItem("user_groups", JSON.stringify(groups));
            console.log("✅ Sidebar loaded user groups from API:", groups);
            setIsLoadingGroups(false);
            return;
          } else {
            console.error("❌ Failed to fetch user groups:", res.status, res.statusText);
          }
        } catch (e) {
          console.error("❌ Failed to load user groups:", e);
        }
      }

      // Fallback to localStorage if API fails
      try {
        const raw = localStorage.getItem("user_groups");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const groups = parsed
              .map((g) => (typeof g === "string" ? g : g?.name))
              .filter(Boolean) as string[];
            setUserGroups(groups);
          }
        }
      } catch {
        // Ignore errors
      }
      
      setIsLoadingGroups(false);
    };

    loadUserGroups();
    
    // Reload when pathname changes (e.g., after login redirect)
    const handleFocus = () => {
      loadUserGroups();
    };
    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [pathname]);

  // Fallback: also check role from localStorage if user_groups not loaded
  const roleFromStorage =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;

  // Check if user has Admin role (full system access)
  const hasAdmin = userGroups.includes("Admin");
  
  // Check if user has Mayor Office role (highest level - should have all access)
  const hasMayorOffice = userGroups.includes("Mayor Office");
  
  // Check if user has any staff role (non-citizen)
  const hasStaffRole = userGroups.some((role) => role !== "Citizen") || 
    (roleFromStorage && roleFromStorage !== "Citizen");

  // Debug: Log user groups for troubleshooting
  useEffect(() => {
    if (userGroups.length > 0) {
      console.log("Sidebar - User Groups:", userGroups);
      console.log("Sidebar - Has Admin:", hasAdmin);
      console.log("Sidebar - Has Mayor Office:", hasMayorOffice);
    }
  }, [userGroups, hasAdmin, hasMayorOffice]);

  // Dynamic filter: Admin and Mayor Office get all access, others check allowedRoles
  const filterByRole = (
    items: Array<{ allowedRoles?: string[] } & Record<string, any>>,
  ) => {
    // Admin gets full access - bypass all checks
    if (hasAdmin) {
      return items;
    }
    
    // Mayor Office also gets full access
    if (hasMayorOffice) {
      return items;
    }
    
    return items.filter((it) => {
      // If no allowedRoles specified, allow access
      if (!it.allowedRoles || it.allowedRoles.length === 0) {
        return true;
      }
      
      // Check if user has any of the allowed roles
      const hasAllowedRole = userGroups.some((userRole) =>
        it.allowedRoles!.includes(userRole)
      );
      
      // Fallback: check roleFromStorage if userGroups is empty
      if (!hasAllowedRole && roleFromStorage) {
        return it.allowedRoles.includes(roleFromStorage);
      }
      
      return hasAllowedRole;
    });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "max-w-[290px] overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? "w-full" : "w-0",
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-full flex-col py-10 pl-[25px] pr-[7px]">
          <div className="relative pr-4.5">
            <Link
              href={"/"}
              onClick={() => isMobile && toggleSidebar()}
              className="px-0 py-2.5 min-[850px]:py-0"
            >
              <Logo />
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2 text-right"
              >
                <span className="sr-only">Close Menu</span>

                <ArrowLeftIcon className="ml-auto size-7" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3 min-[850px]:mt-10">
            {isLoadingGroups ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-dark-6 dark:text-dark-6">Loading...</div>
              </div>
            ) : (
              NAV_DATA.map((section) => (
                <div key={section.label} className="mb-6">
                  <h2 className="mb-5 text-sm font-medium text-dark-4 dark:text-dark-6">
                    {section.label}
                  </h2>

                  <nav role="navigation" aria-label={section.label}>
                    <ul className="space-y-2">
                      {filterByRole(section.items).map((item) => (
                      <li key={item.title}>
                        {item.items.length ? (
                          <div>
                            <MenuItem
                              isActive={item.items.some(
                                (subItem: { url?: string }) =>
                                  subItem.url === pathname,
                              )}
                              onClick={() => toggleExpanded(item.title)}
                            >
                              <item.icon
                                className="size-6 shrink-0"
                                aria-hidden="true"
                              />

                              <span>{item.title}</span>

                              <ChevronUp
                                className={cn(
                                  "ml-auto rotate-180 transition-transform duration-200",
                                  expandedItems.includes(item.title) &&
                                    "rotate-0",
                                )}
                                aria-hidden="true"
                              />
                            </MenuItem>

                            {expandedItems.includes(item.title) && (
                              <ul
                                className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                role="menu"
                              >
                                {filterByRole(item.items).map((subItem) => (
                                  <li key={subItem.title} role="none">
                                    <MenuItem
                                      as="link"
                                      href={
                                        subItem.url === "/dashboard" && (userGroups.length > 0 || roleFromStorage)
                                          ? defaultRouteForRole(userGroups[0] || roleFromStorage)
                                          : subItem.url
                                      }
                                      isActive={pathname === subItem.url}
                                    >
                                      <span>{subItem.title}</span>
                                    </MenuItem>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          (() => {
                            const href =
                              "url" in item
                                ? item.url + ""
                                : "/" +
                                  item.title.toLowerCase().split(" ").join("-");
                            const finalHref =
                              href === "/dashboard" && (userGroups.length > 0 || roleFromStorage)
                                ? defaultRouteForRole(userGroups[0] || roleFromStorage)
                                : href;

                            return (
                              <MenuItem
                                className="flex items-center gap-3 py-3"
                                as="link"
                                href={finalHref}
                                isActive={pathname === href}
                              >
                                <item.icon
                                  className="size-6 shrink-0"
                                  aria-hidden="true"
                                />

                                <span>{item.title}</span>
                              </MenuItem>
                            );
                          })()
                        )}
                      </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

