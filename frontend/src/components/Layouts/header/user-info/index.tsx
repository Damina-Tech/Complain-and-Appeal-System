"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { logoutUser } from "@/utils/api";
import { useRouter } from "next/navigation";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  // If session expired or no user, don't render anything (redirect will happen via useCurrentUser)
  if (!loading && !user) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-12 animate-pulse rounded-full bg-gray-200 dark:bg-dark-3" />
        <div className="hidden max-[1024px]:sr-only">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
        </div>
      </div>
    );
  }

  // Generate avatar URL if no profile image
  const getAvatarUrl = (img: string | undefined, name: string) => {
    if (img) return img;
    // Generate avatar with initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=200&bold=true`;
  };
  
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "";
  const displayImg = user?.img ? user.img : getAvatarUrl(undefined, displayName);

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          <Image
            src={displayImg}
            className="size-12 rounded-full object-cover"
            alt={`Avatar of ${displayName}`}
            role="presentation"
            width={48}
            height={48}
            unoptimized={displayImg.startsWith("https://ui-avatars.com")}
          />
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{displayName}</span>
            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <Image
            src={displayImg}
            className="size-12 rounded-full object-cover"
            alt={`Avatar for ${displayName}`}
            role="presentation"
            width={48}
            height={48}
            unoptimized={displayImg.startsWith("https://ui-avatars.com")}
          />
          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {displayName}
            </div>
            <div className="leading-none text-gray-6">{displayEmail}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href={"/profile"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />
            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>

          <Link
            href={"/pages/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />
            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={async () => {
              setIsOpen(false);
              try {
                await logoutUser();
              } finally {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                localStorage.removeItem("user_id");
                localStorage.removeItem("user_groups");
                // Clear token cookie
                document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                // Dispatch custom event to notify ConditionalLayout of logout
                window.dispatchEvent(new Event("localStorageChange"));
                router.replace("/auth/sign-in");
              }
            }}
          >
            <LogOutIcon />
            <span className="text-base font-medium">Log out</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
