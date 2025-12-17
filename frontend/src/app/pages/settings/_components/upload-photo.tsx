"use client";

import { UploadIcon } from "@/assets/icons";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import { X } from "lucide-react";

export function UploadPhotoForm() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [userId, setUserId] = useState<string | number | null>(null);
  const hasLoadedRef = useRef(false);

  // Generate avatar from initials
  const getAvatarUrl = (imageUrl: string | null, firstName: string, lastName: string, username: string) => {
    if (imageUrl) {
      return imageUrl;
    }
    const name = `${firstName} ${lastName}`.trim() || username || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200&bold=true`;
  };

  const [userData, setUserData] = useState<{
    first_name: string;
    last_name: string;
    username: string;
  }>({
    first_name: "",
    last_name: "",
    username: "",
  });

  useEffect(() => {
    // Prevent multiple loads
    if (hasLoadedRef.current || !API_URL || !token) return;
    
    const loadUserData = async () => {
      hasLoadedRef.current = true;
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      
      try {
        setLoading(true);
        // First get current user info to get the user ID
        const meRes = await fetch(`${API_URL}/auth/me/`, {
          headers,
          cache: "no-store",
        });
        if (!meRes.ok) throw new Error(`Failed to load user info: ${meRes.status}`);
        const meData = await meRes.json();
        const currentUserId = meData.id;
        
        if (!currentUserId) throw new Error("User ID not found");
        setUserId(currentUserId);
        
        const res = await fetch(`${API_URL}/users/${currentUserId}/`, {
          headers,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const data = await res.json();
        setProfileImage(data.profile_image_url || null);
        setUserData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          username: data.username || "",
        });
      } catch (e: any) {
        setError(e?.message || "Failed to load profile image");
        hasLoadedRef.current = false; // Reset on error to allow retry
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [API_URL, token]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !API_URL || !token || !userId) {
      setError("User ID not available. Please refresh the page.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("profile_image", file);

      const res = await fetch(`${API_URL}/users/${userId}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Upload failed: ${res.status}`);
      }

      const updated = await res.json();
      setProfileImage(updated.profile_image_url || null);
      setSuccessMsg("Profile image updated successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!API_URL || !token || !userId) {
      setError("User ID not available. Please refresh the page.");
      return;
    }

    try {
      setDeleting(true);
      setError("");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      
      const res = await fetch(`${API_URL}/users/${userId}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ profile_image: null }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Delete failed: ${res.status}`);
      }

      setProfileImage(null);
      setSuccessMsg("Profile image deleted successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to delete image");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ShowcaseSection title="Your Photo" className="!p-7">
        <div className="py-8 text-center text-gray-500">Loading...</div>
      </ShowcaseSection>
    );
  }

  return (
    <ShowcaseSection title="Your Photo" className="!p-7">
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
          {error}
        </div>
      )}
      <form>
        <div className="mb-4 flex items-center gap-3">
          <Image
            src={getAvatarUrl(
              profileImage,
              userData.first_name,
              userData.last_name,
              userData.username
            )}
            width={55}
            height={55}
            alt="User"
            className="size-14 rounded-full object-cover"
            quality={90}
            unoptimized={profileImage?.startsWith("http")}
          />

          <div>
            <span className="mb-1.5 block font-medium text-dark dark:text-white">
              Edit your photo
            </span>
            <span className="flex gap-3">
              {profileImage && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  disabled={deleting}
                  className="text-body-sm hover:text-red disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </span>
          </div>
        </div>

        <div className="mb-4 rounded-lg border-2 border-dashed border-stroke p-4 dark:border-dark-3">
          <input
            type="file"
            name="profilePhoto"
            id="profilePhoto"
            accept="image/png, image/jpg, image/jpeg, image/webp"
            onChange={handleImageUpload}
            hidden
            disabled={uploading}
          />

          <label
            htmlFor="profilePhoto"
            className="flex cursor-pointer flex-col items-center justify-center py-7.5"
          >
            <div className="flex size-13.5 items-center justify-center rounded-full border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
              <UploadIcon />
            </div>

            <p className="mt-2.5 text-body-sm font-medium">
              <span className="text-primary">Click to upload</span> or drag and drop
            </p>

            <p className="mt-1 text-body-xs">
              SVG, PNG, JPG or GIF (max, 800 X 800px)
            </p>
            {uploading && (
              <p className="mt-2 text-sm text-gray-500">Uploading...</p>
            )}
          </label>
        </div>
      </form>

      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        message={successMsg}
        autoCloseMs={3000}
      />
    </ShowcaseSection>
  );
}
