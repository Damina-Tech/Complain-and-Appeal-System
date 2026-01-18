/**
 * Application constants and configuration
 * All constants are loaded from environment variables
 */

// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Demo user credentials (optional, for development)
export const DEMO_USER_EMAIL = process.env.NEXT_PUBLIC_DEMO_USER_MAIL || "";
export const DEMO_USER_PASSWORD = process.env.NEXT_PUBLIC_DEMO_USER_PASS || "";

// Application Settings
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Complaint and Appeal System";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Error Messages
export const ERROR_MESSAGES = {
  SERVER_UNREACHABLE: "Cannot reach the server. Please check your connection or try again later.",
  NETWORK_ERROR: "Network error. Please check your internet connection.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  SERVER_ERROR: "An error occurred on the server. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
} as const;

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Check error code first (Axios network errors)
  const errorCode = error.code || error.message;
  if (
    errorCode === "ERR_NETWORK" || 
    errorCode === "ECONNREFUSED" || 
    errorCode === "ETIMEDOUT" ||
    errorCode === "ERR_CONNECTION_REFUSED" ||
    String(errorCode).includes("CONNECTION_REFUSED") ||
    String(errorCode).includes("ERR_NETWORK")
  ) {
    return true;
  }
  
  // Check error message for network-related keywords
  const errorMessage = String(error.message || "").toLowerCase();
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("connection refused") ||
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("net::err_connection_refused")
  ) {
    return true;
  }
  
  // Axios: no response from server (server is down)
  if (!error.response && error.request) {
    return true;
  }
  
  // Fetch API: no response (network error)
  if (!error.response && errorMessage.includes("fetch")) {
    return true;
  }
  
  return false;
}

/**
 * Get a user-friendly error message from an error object
 */
export function getErrorMessage(error: any): string {
  if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR;
  
  // Network/connectivity errors
  if (isNetworkError(error)) {
    return ERROR_MESSAGES.SERVER_UNREACHABLE;
  }
  
  // HTTP error responses
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Try to extract a meaningful error message from the response
    if (data?.detail) {
      return typeof data.detail === "string" ? data.detail : String(data.detail);
    }
    
    if (data?.message) {
      return typeof data.message === "string" ? data.message : String(data.message);
    }
    
    if (data?.error) {
      return typeof data.error === "string" ? data.error : String(data.error);
    }
    
    // Status-specific messages
    if (status === 401) {
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    }
    if (status === 403) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    if (status === 404) {
      return ERROR_MESSAGES.NOT_FOUND;
    }
    if (status >= 500) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
  }
  
  // Error message from error object
  if (error.message) {
    return error.message;
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

