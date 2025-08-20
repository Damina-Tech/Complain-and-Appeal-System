import PublicNavbar from "@/components/PublicNavbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-[#020d1a] dark:text-white">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-16">
        <section className="mb-16">
          <h1 className="mb-4 text-4xl font-extrabold">Welcome to Complain & Appeal</h1>
          <p className="max-w-2xl text-lg text-gray-600 dark:text-dark-6">
            Streamline how complaints and appeals are managed. Sign in to access your dashboard,
            or explore to learn more about our services.
          </p>
          <div className="mt-8 flex gap-4">
            <a href="/auth/sign-in" className="rounded-md bg-primary px-6 py-3 font-semibold text-white hover:opacity-90">Get Started</a>
            <a href="/services" className="rounded-md border border-gray-300 px-6 py-3 font-semibold hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2">Learn More</a>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6 dark:border-dark-3">
            <h3 className="mb-2 text-xl font-semibold">Track Cases</h3>
            <p className="text-gray-600 dark:text-dark-6">Monitor complaint and appeal statuses in real time.</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 dark:border-dark-3">
            <h3 className="mb-2 text-xl font-semibold">Collaborate</h3>
            <p className="text-gray-600 dark:text-dark-6">Work with your team to resolve issues faster.</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-6 dark:border-dark-3">
            <h3 className="mb-2 text-xl font-semibold">Insights</h3>
            <p className="text-gray-600 dark:text-dark-6">Gain visibility with reports and analytics.</p>
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-dark-3">
        © {new Date().getFullYear()} Complain & Appeal. All rights reserved.
      </footer>
    </div>
  );
}


