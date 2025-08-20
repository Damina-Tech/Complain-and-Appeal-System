"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicNavbar() {
  const pathname = usePathname();
  const linkCls = (href: string) =>
    `hover:text-primary ${pathname === href ? "text-primary" : ""}`;

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-dark-3 dark:bg-dark-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold">
          Complain & Appeal
        </Link>
        <ul className="flex items-center gap-6 text-sm font-medium">
          <li>
            <Link className={linkCls("/")} href="/">
              Home
            </Link>
          </li>
          <li>
            <Link className={linkCls("/about")} href="/about">
              About
            </Link>
          </li>
          <li>
            <Link className={linkCls("/services")} href="/services">
              Services
            </Link>
          </li>
          <li>
            <Link className={linkCls("/contact")} href="/contact">
              Contact
            </Link>
          </li>
          <li>
            <Link
              className="rounded-md bg-primary px-4 py-2 text-white hover:opacity-90"
              href="/auth/sign-in"
            >
              Sign In
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}


