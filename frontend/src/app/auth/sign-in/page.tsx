import Signin from "@/components/Auth/Signin";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignIn() {
  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="grid grid-cols-1 xl:grid-cols-2">
        {/* Left: form */}
        <section className="order-2 w-full p-5 sm:p-10 xl:order-1">
          <div className="mx-auto w-full max-w-md">
            {/* Brand / heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold leading-tight text-[#5750f1]">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-dark-6">
                Sign in to continue to the Harari Regional Complaint & Appeal System.
              </p>
            </div>

            <Signin />

            {/* Helpful links */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link
                href="/help"
                className="text-[#5750f1] hover:opacity-90"
              >
                Need help?
              </Link>
              <Link
                href="/privacy"
                className="text-gray-500 hover:text-gray-700 dark:text-dark-6 dark:hover:text-white"
              >
                Privacy & Terms
              </Link>
            </div>
          </div>
        </section>

        {/* Right: visual panel */}
        <aside className="order-1 hidden w-full xl:order-2 xl:block">
          <div className="relative h-full overflow-hidden rounded-r-[10px]">
            {/* Soft brand gradient */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(1200px 600px at -20% -20%, rgba(87,80,241,0.25), transparent 60%), radial-gradient(800px 800px at 120% 120%, rgba(87,80,241,0.2), transparent 55%), linear-gradient(135deg, #0b1324 0%, #0b1324 40%, #111a31 100%)",
              }}
            />
            <div className="relative z-10 flex h-full flex-col p-10 text-white">
              <Link className="mb-8 inline-flex items-center gap-3" href="/">
                <Image
                  className="hidden dark:block"
                  src="/images/logo/logo.svg"
                  alt="Logo"
                  width={176}
                  height={32}
                />
                <Image
                  className="dark:hidden"
                  src="/images/logo/logo-dark.svg"
                  alt="Logo"
                  width={176}
                  height={32}
                />
              </Link>

              <div className="mt-12">
                <h2 className="mb-2 text-2xl font-semibold">
                  Faster, clearer case handling
                </h2>
                <p className="mb-6 max-w-md text-sm text-white/80">
                  Submit complaints and appeals, track progress in real time, and
                  collaborate across offices—paperwork reduced, resolution sped up.
                </p>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-block size-2 rounded-full bg-[#5750f1]" />
                    Transparent status: Pending, Investigation, Resolved, Rejected, Closed
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-block size-2 rounded-full bg-[#5750f1]" />
                    Smart routing: transfer to offices, assign to responsible staff
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-block size-2 rounded-full bg-[#5750f1]" />
                    Insights & reports for better decisions
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex items-center gap-3 text-xs text-white/60">
                <span>© {new Date().getFullYear()} Harari Region</span>
                <span>•</span>
                <span>Service Desk: support@harari.gov</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
