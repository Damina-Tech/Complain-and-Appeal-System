import PublicNavbar from "@/components/PublicNavbar";

export default function AboutPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold">About</h1>
        <p className="text-gray-600 dark:text-dark-6">
          Complain & Appeal is a platform to manage complaints and appeals efficiently.
        </p>
      </div>
    </div>
  );
}


