"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ACCENT = "#5750f1";

export default function PublicNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkActive = (href: string) =>
    pathname === href ? "text-[#5750f1]" : "text-dark-2 dark:text-dark-6";

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className={`relative px-2 py-1 font-medium hover:text-[#5750f1] ${linkActive(href)}`}
      onClick={() => setOpen(false)}
    >
      {children}
      {pathname === href && (
        <span
          className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
      )}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/70 backdrop-blur-md dark:border-dark-3 dark:bg-[#0b1420]/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="group inline-flex items-center gap-2">
          <span
            className="grid size-8 place-items-center rounded-md text-white"
            style={{ background: ACCENT }}
          >
            CA
          </span>
          <span className="text-lg font-bold text-dark dark:text-white">
            Complaints&nbsp;&amp;&nbsp;Appeals
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-6 md:flex">
          <li><NavLink href="/">Home</NavLink></li>
          <li><NavLink href="/about">About</NavLink></li>
          <li><NavLink href="/services">Services</NavLink></li>
          <li><NavLink href="/contact">Contact</NavLink></li>
        </ul>

        {/* Auth buttons (desktop) */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/sign-in"
            className="rounded-md border px-4 py-2 font-semibold hover:opacity-90"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            Sign In
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-md px-4 py-2 font-semibold text-white hover:opacity-90"
            style={{ background: ACCENT }}
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="inline-flex size-10 items-center justify-center rounded-md border md:hidden dark:border-dark-3"
          onClick={() => setOpen((s) => !s)}
          aria-label="Toggle navigation"
          style={{ borderColor: "rgba(87,80,241,0.25)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-gray-200/70 md:hidden dark:border-dark-3">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/services">Services</NavLink>
            <NavLink href="/contact">Contact</NavLink>
            <div className="mt-2 flex gap-2">
              <Link
                href="/auth/sign-in"
                className="flex-1 rounded-md border px-4 py-2 text-center font-semibold"
                style={{ borderColor: ACCENT, color: ACCENT }}
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="flex-1 rounded-md px-4 py-2 text-center font-semibold text-white"
                style={{ background: ACCENT }}
                onClick={() => setOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
