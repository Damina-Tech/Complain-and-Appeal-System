"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "./_components/icons";
import { Button } from "@/components/ui/button";
import { SuccessModal } from "@/components/ui/success-modal";
import { User, Mail, Phone, MapPin, Building2, Calendar, UserCircle } from "lucide-react";

type UserData = {
  id: number | string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  national_id: string;
  address: string;
  profile_image_url: string | null;
  created_at?: string;
  last_seen?: string;
  office?: { id: number | string; name: string } | null;
  groups?: Array<{ name: string } | string>;
};

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();
  const hasLoadedRef = useRef(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Generate avatar from initials
  const getAvatarUrl = (user: UserData | null) => {
    if (user?.profile_image_url) {
      return user.profile_image_url;
    }
    // Generate avatar with initials
    const firstName = user?.first_name || "";
    const lastName = user?.last_name || "";
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
    const name = `${firstName} ${lastName}`.trim() || user?.username || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200&bold=true`;
  };

  const loadUserData = useCallback(async () => {
    // Prevent multiple loads
    if (hasLoadedRef.current || !API_URL || !token) return;
    
    hasLoadedRef.current = true;
    const headers: HeadersInit = { Authorization: `Bearer ${token}` };
    
    try {
      setLoading(true);
      setError("");
      // First get current user info to get the user ID
      const meRes = await fetch(`${API_URL}/auth/me/`, {
        headers,
        cache: "no-store",
      });
      if (!meRes.ok) throw new Error(`Failed to load user info: ${meRes.status}`);
      const meData = await meRes.json();
      const userId = meData.id;
      
      if (!userId) throw new Error("User ID not found");
      
      const res = await fetch(`${API_URL}/users/${userId}/`, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load profile: ${res.status}`);
      const data = await res.json();
      setUserData(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load profile");
      hasLoadedRef.current = false; // Reset on error to allow retry
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !API_URL || !token || !userData?.id) return;

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

      const res = await fetch(`${API_URL}/users/${userData.id}/`, {
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
      setUserData((prev) => (prev ? { ...prev, profile_image_url: updated.profile_image_url } : null));
      setSuccessMsg("Profile image updated successfully.");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };


  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[970px]">
        <Breadcrumb pageName="Profile" />
        <div className="p-6 text-center">Loading profile...</div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="mx-auto w-full max-w-[970px]">
        <Breadcrumb pageName="Profile" />
        <div className="p-6 text-center text-red-500">{error}</div>
      </div>
    );
  }

  const fullName = userData
    ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || userData.username
    : "User";
  const roleName = userData?.groups?.[0]
    ? typeof userData.groups[0] === "string"
      ? userData.groups[0]
      : userData.groups[0].name
    : "Citizen";

  return (
    <div className="mx-auto w-full max-w-[970px]">
      <Breadcrumb pageName="Profile" />

      <div className="overflow-hidden rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        {/* Cover Image */}
        <div className="relative z-20 h-35 md:h-65 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="absolute bottom-1 right-1 z-10 xsm:bottom-4 xsm:right-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pages/settings")}
              className="bg-white/90 hover:bg-white"
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="px-4 pb-6 text-center lg:pb-8 xl:pb-11.5">
          <div className="relative z-30 mx-auto -mt-22 h-30 w-full max-w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:max-w-[176px] sm:p-3">
            <div className="relative drop-shadow-2">
              <Image
                src={getAvatarUrl(userData)}
                width={160}
                height={160}
                className="overflow-hidden rounded-full object-cover"
                alt="profile"
                unoptimized={userData?.profile_image_url?.startsWith("http")}
              />

              <label
                htmlFor="profilePhoto"
                className="absolute bottom-0 right-0 flex size-8.5 cursor-pointer items-center justify-center rounded-full bg-primary text-white hover:bg-opacity-90 sm:bottom-2 sm:right-2"
                title="Upload profile image"
              >
                <CameraIcon />
                <input
                  type="file"
                  name="profilePhoto"
                  id="profilePhoto"
                  className="sr-only"
                  onChange={handleImageUpload}
                  accept="image/png, image/jpg, image/jpeg, image/webp"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
              {error}
            </div>
          )}

          <div className="mt-4">
            <h3 className="mb-1 text-heading-6 font-bold text-dark dark:text-white">
              {fullName}
            </h3>
            <p className="font-medium capitalize">{roleName}</p>

            {/* User Info Grid */}
            <div className="mx-auto mb-5.5 mt-5 grid max-w-[700px] grid-cols-1 gap-4 rounded-[5px] border border-stroke p-4 shadow-1 dark:border-dark-3 dark:bg-dark-2 dark:shadow-card sm:grid-cols-2">
              {userData?.username && (
                <div className="flex items-center gap-2 text-left">
                  <UserCircle className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-xs text-gray-500">Username</span>
                    <p className="font-medium text-dark dark:text-white">{userData.username}</p>
                  </div>
                </div>
              )}
              {userData?.email && (
                <div className="flex items-center gap-2 text-left">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-xs text-gray-500">Email</span>
                    <p className="font-medium text-dark dark:text-white">{userData.email}</p>
                  </div>
                </div>
              )}
              {userData?.phone_number && (
                <div className="flex items-center gap-2 text-left">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-xs text-gray-500">Phone Number</span>
                    <p className="font-medium text-dark dark:text-white">{userData.phone_number || "Not provided"}</p>
                  </div>
                </div>
              )}
              {userData?.national_id && (
                <div className="flex items-center gap-2 text-left">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-xs text-gray-500">National ID</span>
                    <p className="font-medium text-dark dark:text-white">{userData.national_id || "Not provided"}</p>
                  </div>
                </div>
              )}
              {userData?.office && (
                <div className="flex items-center gap-2 text-left">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-xs text-gray-500">Office</span>
                    <p className="font-medium text-dark dark:text-white">
                      {typeof userData.office === "object" ? userData.office.name : "Not assigned"}
                    </p>
                  </div>
                </div>
              )}
              {userData?.created_at && (
                <div className="flex items-center gap-2 text-left">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-xs text-gray-500">Member Since</span>
                    <p className="font-medium text-dark dark:text-white">
                      {new Date(userData.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {userData?.address && (
                <div className="flex items-start gap-2 text-left sm:col-span-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs text-gray-500">Address</span>
                    <p className="font-medium text-dark dark:text-white">{userData.address}</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>


      <SuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        message={successMsg}
        autoCloseMs={3000}
      />
    </div>
  );
}
