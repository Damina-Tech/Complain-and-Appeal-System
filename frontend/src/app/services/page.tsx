import PublicNavbar from "@/components/PublicNavbar";

export default function ServicesPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold">Services</h1>
        <ul className="list-inside list-disc text-gray-600 dark:text-dark-6">
          <li>Complaint intake and tracking</li>
          <li>Appeal processing and collaboration</li>
          <li>Analytics and reporting</li>
        </ul>
      </div>
    </div>
  );
}


