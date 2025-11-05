import PublicNavbar from "@/components/PublicNavbar";

export default function ContactPage() {
  return (
    <div>
      <PublicNavbar />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold">Contact</h1>
        <p className="text-gray-600 dark:text-dark-6">Reach us at contact@example.com</p>
      </div>
    </div>
  );
}


