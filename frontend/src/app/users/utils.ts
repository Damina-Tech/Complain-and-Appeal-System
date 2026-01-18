import { ApiUser, UserRow } from "./types";

export const mapUser = (u: ApiUser): UserRow => {
  const roles = (u.groups || [])
    .map((g) => (typeof g === "string" ? g : g?.name))
    .filter(Boolean) as string[];

  const name =
    [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
    u.email ||
    u.username ||
    `User #${u.id}`;

  return {
    id: u.id,
    name,
    firstName: u.first_name || "",
    lastName: u.last_name || "",
    email: u.email || u.username || "—",
    phone: u.phone_number || "—",
    nationalId: u.national_id || "—",
    roles: roles.length ? roles : ["—"],
    status: (u.status || "active").toLowerCase(),
  };
};

export const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const responseText = await response.text();
    let errorData: any = {};
    
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { detail: responseText || response.statusText };
    }
    
    // Extract error message from various possible formats
    if (errorData.detail) {
      const detail = Array.isArray(errorData.detail) ? errorData.detail[0] : errorData.detail;
      // Convert technical messages to user-friendly ones
      if (typeof detail === "string") {
        // Handle hierarchy level errors (new clean format)
        if (detail.includes("cannot edit users with the same or higher role level")) {
          return "You cannot edit users with the same or higher role level.";
        }
        if (detail.includes("cannot delete users with the same or higher role level")) {
          return "You cannot delete users with the same or higher role level.";
        }
        // Handle old format with hierarchy level (for backward compatibility)
        if (detail.includes("cannot edit users with the same or higher hierarchy level")) {
          return "You cannot edit users with the same or higher role level.";
        }
        if (detail.includes("cannot delete users with the same or higher hierarchy level")) {
          return "You cannot delete users with the same or higher role level.";
        }
        if (detail.includes("cannot create users")) {
          return "You do not have permission to create users.";
        }
        // Remove technical details like level numbers for better readability
        return detail.replace(/Your level: \d+, Target user level: \d+/g, "").trim();
      }
      return String(detail);
    }
    
    if (errorData.message) {
      return Array.isArray(errorData.message) ? errorData.message[0] : String(errorData.message);
    }
    
    if (errorData.error) {
      return Array.isArray(errorData.error) ? errorData.error[0] : String(errorData.error);
    }
    
    return responseText || response.statusText || "An error occurred";
  } catch {
    return "An error occurred";
  }
};

export const getErrorMessage = (fieldError: any): string => {
  if (Array.isArray(fieldError)) {
    return fieldError[0] || "Invalid value";
  }
  if (typeof fieldError === 'object' && fieldError !== null) {
    if (fieldError.non_field_errors) {
      return Array.isArray(fieldError.non_field_errors) ? fieldError.non_field_errors[0] : String(fieldError.non_field_errors);
    }
    if (fieldError.message) {
      return String(fieldError.message);
    }
    const keys = Object.keys(fieldError);
    if (keys.length > 0) {
      return String(fieldError[keys[0]]);
    }
    return "Invalid value";
  }
  return String(fieldError);
};

