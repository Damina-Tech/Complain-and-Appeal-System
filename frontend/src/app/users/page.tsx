"use client";

import { useState } from "react";
import PublicNavbar from "@/components/PublicNavbar";

export default function CitizenSignupPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationalId: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!API_URL) {
      setError("NEXT_PUBLIC_API_URL is not configured");
      return;
    }
    if (!form.firstName || !form.lastName || !form.phone) {
      setError("First name, last name and phone are required");
      return;
    }

    try {
      setSubmitting(true);
      const usernameBase = form.email || form.phone || `${form.firstName.toLowerCase()}_${Date.now()}`;
      const payload: Record<string, any> = {
        username: usernameBase,
        first_name: form.firstName,
        last_name: form.lastName,
        phone_number: form.phone,
        status: "active",
        groups: ["Citizen"],
      };
      if (form.email) payload.email = form.email;
      if (form.nationalId) payload.national_id = form.nationalId;
      // 'address' is collected but not sent since backend User model doesn't have it yet

      const res = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Signup failed (${res.status})`);
      }

      setSuccess("Account created. You can now sign in.");
      setForm({ firstName: "", lastName: "", email: "", phone: "", nationalId: "", address: "" });
    } catch (err: any) {
      setError(
        err?.message?.includes("Authentication credentials were not provided")
          ? "Signup requires server support. Ask the admin to enable a public signup endpoint."
          : err?.message || "Signup failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-[#020d1a] dark:text-white">
      <PublicNavbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Citizen Signup</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">First Name *</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Last Name *</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Email (optional)</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                placeholder="+2519..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">National ID (optional)</label>
              <input
                name="nationalId"
                value={form.nationalId}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                placeholder="ID-123"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Address</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
                placeholder="Street, City"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-primary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Create Account"}
          </button>
        </form>
      </main>
    </div>
  );
}


