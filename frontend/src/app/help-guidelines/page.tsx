// src/app/help/page.tsx
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Link from "next/link";
import { CheckCircle, FileText, Users, BarChart3, Clock, Shield, Globe2, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Help & Guidelines",
};

export default function HelpGuidelinesPage() {
  const accent = "text-[#5750f1]";

  return (
    <>
      <Breadcrumb pageName="Help & Guidelines" />

      <div className="grid gap-6 md:grid-cols-[260px,1fr]">
        {/* Table of contents (sticky on larger screens) */}
        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-dark-3 dark:bg-gray-dark">
            <div className={`mb-2 font-semibold ${accent}`}>On this page</div>
            <nav className="space-y-2">
              <a href="#overview" className="block hover:underline">Overview</a>
              <a href="#benefits" className="block hover:underline">What the system simplifies</a>
              <a href="#how-it-works" className="block hover:underline">How it works</a>
              <a href="#roles" className="block hover:underline">User roles</a>
              <a href="#reports" className="block hover:underline">Reporting & decisions</a>
              <a href="#security" className="block hover:underline">Security & privacy</a>
              <a href="#faq" className="block hover:underline">FAQs</a>
              <a href="#support" className="block hover:underline">Support</a>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="space-y-8">
          {/* HERO */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h1 className="mb-2 text-2xl font-bold text-dark dark:text-white">
              Harari Regional Complaint & Appeal System — <span className={accent}>Help & Guidelines</span>
            </h1>
            <p className="text-gray-600 dark:text-dark-6">
              This guide explains how the system moves Harari Region’s complaint and appeal handling from paper-based
              processes to a fully digital workflow—improving transparency, speed, and decision-making across city
              administration and civil service.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-lg bg-[#5750f1] px-4 py-2 text-white hover:opacity-90"
              >
                See How it Works <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <Link
                href="/cases"
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Go to Cases
              </Link>
            </div>
          </section>

          {/* OVERVIEW */}
          <section id="overview" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-4 text-xl font-semibold ${accent}`}>Overview</h2>
            <p className="text-gray-700 dark:text-dark-6">
              The system centralizes citizen complaints and appeals, routes them to the appropriate offices and officers,
              and tracks progress from registration to closure. It replaces spreadsheets, emails, and paper folders with a
              single, auditable source of truth—complete with transfer, assignment, and status updates.
            </p>
          </section>

          {/* BENEFITS */}
          <section id="benefits" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-6 text-xl font-semibold ${accent}`}>What the system simplifies</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Feature
                icon={<FileText className="h-5 w-5" />}
                title="Paper → Digital"
                text="Register, track, and resolve cases digitally—no lost files, instant retrieval."
              />
              <Feature
                icon={<Users className="h-5 w-5" />}
                title="Clear ownership"
                text="Assign cases to responsible officers and transfer between offices with reasoned logs."
              />
              <Feature
                icon={<Clock className="h-5 w-5" />}
                title="Faster resolution"
                text="Automations and structured workflows reduce delays and bottlenecks."
              />
              <Feature
                icon={<BarChart3 className="h-5 w-5" />}
                title="Actionable reports"
                text="Operational and strategic reports support better decisions across the Region."
              />
              <Feature
                icon={<Globe2 className="h-5 w-5" />}
                title="Citizen experience"
                text="Transparent case statuses build trust and improve service satisfaction."
              />
              <Feature
                icon={<CheckCircle className="h-5 w-5" />}
                title="Audit trail"
                text="Every transfer, assignment, and status change is recorded for accountability."
              />
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how-it-works" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-6 text-xl font-semibold ${accent}`}>How it works</h2>

            <ol className="relative ml-4 border-l border-gray-200 dark:border-dark-3">
              <Step
                title="1) Register"
                text="A case is created with title, description, category (complaint/appeal), and attachments (optional)."
              />
              <Step
                title="2) Triage & Assign"
                text="The case is assigned to an officer or transferred to the appropriate office based on jurisdiction."
              />
              <Step
                title="3) Investigate"
                text="Status moves to 'In Investigation'. Officers collect information, coordinate, and add notes."
              />
              <Step
                title="4) Resolve / Reject"
                text="Outcome is set to 'Resolved' or 'Rejected', with a reason. Appeals can be initiated if applicable."
              />
              <Step
                title="5) Close"
                text="The case is 'Closed' with a clear audit trail and optional citizen feedback."
              />
            </ol>

            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm dark:bg-dark-2">
              <div className="font-medium">Statuses used:</div>
              <ul className="mt-1 list-disc pl-5 text-gray-600 dark:text-dark-6">
                <li><b>Pending</b> (Registered)</li>
                <li><b>In Investigation</b> (Officer working)</li>
                <li><b>Resolved</b>, <b>Rejected</b>, <b>Closed</b></li>
              </ul>
            </div>
          </section>

          {/* ROLES */}
          <section id="roles" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-6 text-xl font-semibold ${accent}`}>User roles</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <RoleCard
                title="Citizen"
                items={[
                  "Create complaints/appeals",
                  "Track status & view updates",
                  "Provide feedback or submit appeal",
                ]}
              />
              <RoleCard
                title="Focal Person (Kebele/Wereda/Sector)"
                items={[
                  "Register/triage cases",
                  "Assign or transfer to proper office",
                  "Investigate, update status",
                ]}
              />
              <RoleCard
                title="Director / President Office / President"
                items={[
                  "Oversee offices & teams",
                  "Manage users, roles, and offices",
                  "Use reports for decisions",
                ]}
              />
              <RoleCard
                title="All Staff"
                items={[
                  "Work within clear workflows",
                  "Maintain audit logs",
                  "Deliver timely resolutions",
                ]}
              />
            </div>
          </section>

          {/* REPORTING */}
          <section id="reports" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-4 text-xl font-semibold ${accent}`}>Reporting & decisions</h2>
            <p className="text-gray-700 dark:text-dark-6">
              Leadership can view real-time dashboards, trends by category/location, performance by office,
              and resolution lead times. Export summaries to support strategic decisions and public accountability.
            </p>
          </section>

          {/* SECURITY */}
          <section id="security" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-4 text-xl font-semibold ${accent}`}>Security & privacy</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              <Bullet text="Role-based access (least privilege)" />
              <Bullet text="Audit trail for key actions" />
              <Bullet text="Secure authentication & session handling" />
              <Bullet text="Data retention aligned with policy" />
            </ul>
          </section>

          {/* FAQ */}
          <section id="faq" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-4 text-xl font-semibold ${accent}`}>FAQs</h2>

            <details className="group rounded-lg border border-gray-200 p-4 dark:border-dark-3">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                How do I submit a new complaint or appeal?
                <span className="transition group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-2 text-gray-700 dark:text-dark-6">
                Go to <Link href="/cases" className="text-[#5750f1] underline">Cases</Link> and click <b>Add New</b>.
                Fill in the title, description, category, and optional attachments.
              </p>
            </details>

            <details className="group mt-3 rounded-lg border border-gray-200 p-4 dark:border-dark-3">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                Who can assign or transfer a case?
                <span className="transition group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-2 text-gray-700 dark:text-dark-6">
                Focal Persons and leadership (Director/President Office/President) can assign to members
                and transfer across offices with reasons recorded.
              </p>
            </details>

            <details className="group mt-3 rounded-lg border border-gray-200 p-4 dark:border-dark-3">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                How can I see my assigned cases?
                <span className="transition group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-2 text-gray-700 dark:text-dark-6">
                Open <Link href="/my-assigned" className="text-[#5750f1] underline">My Assigned Cases</Link> from the sidebar.
              </p>
            </details>
          </section>

          {/* SUPPORT */}
          <section id="support" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-dark-3 dark:bg-gray-dark">
            <h2 className={`mb-4 text-xl font-semibold ${accent}`}>Support</h2>
            <p className="text-gray-700 dark:text-dark-6">
              For access issues or feature requests, contact your system administrator or the President Office ICT team.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}

/* ---------- Small presentational helpers (no external deps) ---------- */

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-3">
      <div className="mb-2 inline-flex rounded-lg bg-gray-100 p-2 dark:bg-dark-2">{icon}</div>
      <div className="font-semibold text-dark dark:text-white">{title}</div>
      <p className="text-sm text-gray-600 dark:text-dark-6">{text}</p>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <li className="ml-4 pb-6 last:pb-0">
      <div className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full border border-gray-300 bg-white dark:border-dark-3 dark:bg-gray-dark" />
      <div className="font-semibold text-dark dark:text-white">{title}</div>
      <p className="text-sm text-gray-600 dark:text-dark-6">{text}</p>
    </li>
  );
}

function RoleCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-3">
      <div className="mb-2 font-semibold text-dark dark:text-white">{title}</div>
      <ul className="space-y-1 text-sm text-gray-600 dark:text-dark-6">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[5px] inline-block h-1.5 w-1.5 rounded-full bg-[#5750f1]" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-gray-700 dark:bg-dark-2 dark:text-dark-6">
      <Shield className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-sm">{text}</span>
    </li>
  );
}
