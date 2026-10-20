import Link from "next/link";
import type { ReactNode } from "react";

export function AuthPageShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div data-testid="cas-auth-page" className="flex min-h-svh items-center justify-center bg-gray-2 px-4 py-8 dark:bg-[#020d1a] sm:px-6 sm:py-12">
      <div data-testid="cas-auth-card" className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark lg:grid-cols-2">
        <section className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:min-h-[600px] lg:px-12">
          <Link href="/login" className="mb-8 inline-flex items-center gap-3 text-primary">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold">CAS</span>
            <span className="text-sm font-semibold text-dark dark:text-white">Chiro City</span>
          </Link>
          <h1 className="text-3xl font-bold leading-tight text-dark dark:text-white">{title}</h1>
          <p className="mb-8 mt-3 text-sm leading-6 text-dark-5 dark:text-dark-6">{subtitle}</p>
          {children}
          <p className="mt-8 text-xs leading-5 text-dark-5 dark:text-dark-6">Chiro City Complaint &amp; Appeal System</p>
        </section>
        <aside className="hidden min-w-0 flex-col justify-between bg-gradient-to-br from-[#16163c] to-[#0b1324] p-12 text-white lg:flex">
          <p className="text-sm font-semibold tracking-wide text-white/80">COMPLAINTS &amp; APPEALS</p>
          <div className="py-10">
            <h2 className="text-3xl font-semibold leading-tight">Your voice. Better city services.</h2>
            <p className="mt-5 text-base leading-7 text-white/80">Submit a complaint or appeal, follow its progress, and receive updates from the responsible office.</p>
            <ul className="mt-8 space-y-4 text-sm leading-6 text-white/90">
              <li>Submit and track your own cases</li>
              <li>Receive responses and provide feedback</li>
              <li>One Chiro Auth account for city services</li>
            </ul>
          </div>
          <p className="text-xs text-white/60">&copy; {new Date().getFullYear()} Chiro City</p>
        </aside>
      </div>
    </div>
  );
}
