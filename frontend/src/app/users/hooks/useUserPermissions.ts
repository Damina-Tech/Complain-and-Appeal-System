import { useCallback, useMemo, useState, useEffect } from "react";
import { UserRow } from "../types";
import { hierarchyLevels } from "../constants";

export function useUserPermissions() {
  const [currentUserGroups, setCurrentUserGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("user_groups");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((g) => (typeof g === "string" ? g : g?.name)).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const loadUserInfo = async () => {
      if (!API_URL || !token) return;
      try {
        const res = await fetch(`${API_URL}/auth/me/`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          console.log("User info from /auth/me:", data);
          
          // Update user groups if returned from API
          if (data.user_groups && Array.isArray(data.user_groups)) {
            const groups = data.user_groups.map((g: string) => g).filter(Boolean);
            localStorage.setItem("user_groups", JSON.stringify(groups));
            setCurrentUserGroups(groups);
            console.log("Updated user groups from API:", groups);
          }
        } else {
          console.error("Failed to load user info:", res.status, await res.text());
        }
      } catch (e) {
        console.error("Failed to load user info:", e);
      }
    };
    loadUserInfo();
  }, [API_URL, token]);

  const isAdmin = currentUserGroups.includes("Admin");
  const isDirector = currentUserGroups.includes("Director");
  const isMayorOffice = currentUserGroups.includes("Mayor Office");
  const isFocalPerson = currentUserGroups.some((g) => g.includes("Focal Person"));

  // Debug: Log current user groups
  useEffect(() => {
    if (currentUserGroups.length > 0) {
      console.log("Current user groups:", currentUserGroups);
      console.log("isAdmin:", isAdmin, "isDirector:", isDirector, "isMayorOffice:", isMayorOffice, "isFocalPerson:", isFocalPerson);
    }
  }, [currentUserGroups, isAdmin, isDirector, isMayorOffice, isFocalPerson]);

  // Create permissions:
  // - Admin: Can create users with any role
  // - Director and Mayor Office: Can only create Focal Person and Citizen
  // - Focal Person: Cannot create users
  const canCreateUser = isAdmin || isDirector || isMayorOffice;

  // Permission checks: Admin, Director, and Mayor Office can edit/delete (with hierarchy restrictions)
  const canEditUser = isAdmin || isDirector || isMayorOffice;
  const canDeleteUser = isAdmin || isDirector || isMayorOffice;

  // Helper function to check if a user can edit/delete another user based on hierarchy
  // Returns false if target user has same or higher hierarchy level
  // Rule: Can only modify users with LOWER hierarchy level (strictly less than)
  const canModifyUser = useCallback((targetUser: UserRow): boolean => {
    console.log('=== canModifyUser called ===', {
      targetUserName: targetUser.name,
      targetUserRoles: targetUser.roles,
      canEditUser,
      isAdmin,
      isDirector,
      isMayorOffice,
      currentUserGroups,
    });
    
    // If user doesn't have edit permissions, return false
    if (!canEditUser) {
      console.log('Cannot modify: canEditUser is false');
      return false;
    }
    
    // Admin can modify everyone (highest level = 5)
    if (isAdmin) {
      console.log('Can modify: User is Admin');
      return true;
    }
    
    // Determine current user's level
    // Hierarchy: Citizen (1) < Focal Person (2) < Director (3) < Mayor Office (4) < Admin (5)
    let currentUserLevel = 0;
    if (isDirector) {
      currentUserLevel = 3;
    } else if (isMayorOffice) {
      currentUserLevel = 4;
    }
    
    console.log('Current user level:', currentUserLevel, isDirector ? '(Director)' : isMayorOffice ? '(Mayor Office)' : '(Unknown)');
    
    // If current user level is 0 (not Director or Mayor Office), they can't modify
    if (currentUserLevel === 0) {
      console.log('Cannot modify: Current user level is 0');
      return false;
    }
    
    // Get target user's highest role level
    // Normalize role names (trim whitespace, handle variations)
    const targetRoleLevels = targetUser.roles
      .filter((r) => r && r !== "—" && r.trim() !== "") // Filter out placeholder and empty
      .map((r) => {
        const normalizedRole = r.trim();
        console.log('Checking target role:', normalizedRole, 'against hierarchyLevels:', Object.keys(hierarchyLevels));
        // Try exact match first
        if (hierarchyLevels[normalizedRole] !== undefined) {
          console.log('Found exact match:', normalizedRole, '=', hierarchyLevels[normalizedRole]);
          return hierarchyLevels[normalizedRole];
        }
        // Try case-insensitive match
        const roleKey = Object.keys(hierarchyLevels).find(
          (key) => key.toLowerCase() === normalizedRole.toLowerCase()
        );
        if (roleKey) {
          console.log('Found case-insensitive match:', normalizedRole, '->', roleKey, '=', hierarchyLevels[roleKey]);
          return hierarchyLevels[roleKey];
        }
        console.log('No match found for role:', normalizedRole);
        return 0;
      })
      .filter((level) => level > 0); // Only keep valid levels
    
    console.log('Target role levels found:', targetRoleLevels);
    
    // If no valid roles found, we can't determine the user's level
    // Default to current user's level to be safe - this disables buttons
    const targetUserLevel = targetRoleLevels.length > 0 
      ? Math.max(...targetRoleLevels) 
      : currentUserLevel;
    
    console.log('Target user highest level:', targetUserLevel, 'Current user level:', currentUserLevel);
    
    // Can only modify users with LOWER hierarchy level (strictly less than)
    // CANNOT modify users with same or higher level
    // Rule: targetUserLevel must be < currentUserLevel
    // If targetUserLevel >= currentUserLevel, return false (disabled)
    const canModify = targetUserLevel < currentUserLevel;
    
    console.log('Final result:', {
      targetUserLevel,
      currentUserLevel,
      comparison: `${targetUserLevel} < ${currentUserLevel}`,
      canModify,
      shouldBeDisabled: !canModify
    });
    
    return canModify;
  }, [canEditUser, isAdmin, isDirector, isMayorOffice, currentUserGroups]);

  // Available roles for creation based on current user's role
  const getAvailableRolesForCreation = useCallback((roles: string[]) => {
    if (isAdmin) {
      return roles; // Admin can create any role
    } else if (isDirector || isMayorOffice) {
      // Director and Mayor Office can only create Focal Person and Citizen
      return roles.filter((r) => r === "Focal Person" || r === "Citizen");
    }
    return []; // Focal Person cannot create users
  }, [isAdmin, isDirector, isMayorOffice]);

  return {
    currentUserGroups,
    isAdmin,
    isDirector,
    isMayorOffice,
    isFocalPerson,
    canCreateUser,
    canEditUser,
    canDeleteUser,
    canModifyUser,
    getAvailableRolesForCreation,
  };
}

