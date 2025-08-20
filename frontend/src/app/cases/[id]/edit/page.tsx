"use client";

import { useParams, useRouter } from "next/navigation";
import InputGroup from "@/components/FormElements/InputGroup";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EditCasePage() {
  const { id } = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState({
    name: "",
    nationalId: "",
    phone: "",
    category: "",
    date: "",
    status: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:8000/api

  // Load user by id and map to form fields
  useEffect(() => {
    const load = async () => {
      if (!API_URL || !id) return;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_URL}/users/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const u = await res.json();
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "";
        setCaseData({
          name: fullName,
          nationalId: u.national_id || "",
          phone: u.phone_number || "",
          category: "complaint",
          date: (u.created_at ? String(u.created_at).slice(0, 10) : "").replace(/T.*/, ""),
          status: u.status || "",
        });
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCaseData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_URL) {
      setError("NEXT_PUBLIC_API_URL is not set");
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setError("You are not authenticated. Please sign in.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const [first, ...rest] = caseData.name.trim().split(" ");
      const payload: any = {
        first_name: first || "",
        last_name: rest.join(" ") || "",
        phone_number: caseData.phone,
        national_id: caseData.nationalId,
        status: caseData.status || "active",
      };
      const res = await fetch(`${API_URL}/users/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Update failed: ${res.status}`);
      }
      // Navigate back to list or show success
      router.push("/cases");
    } catch (err: any) {
      setError(err?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ShowcaseSection title={`Edit Case #${id}`} className="!p-6.5">
      {loading && (
        <div className="mb-4 text-gray-500">Loading...</div>
      )}
      {!!error && !loading && (
        <div className="mb-4 text-red-500">{error}</div>
      )}
      <form onSubmit={handleSubmit}>
        <InputGroup
          label="Full Name"
          type="text"
          name="name"
          value={caseData.name}
          onChange={handleChange}
          placeholder="Enter full name"
          className="mb-4.5"
        />

        <InputGroup
          label="National ID"
          type="text"
          name="nationalId"
          value={caseData.nationalId}
          onChange={handleChange}
          placeholder="Enter national ID"
          className="mb-4.5"
        />

        <InputGroup
          label="Phone Number"
          type="text"
          name="phone"
          value={caseData.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
          className="mb-4.5"
        />

        <InputGroup
          label="Category"
          type="text"
          name="category"
          value={caseData.category}
          onChange={handleChange}
          placeholder="Complaint or Appeal"
          className="mb-4.5"
        />

        <InputGroup
          label="Date"
          type="date"
          name="date"
          value={caseData.date}
          onChange={handleChange}
          className="mb-4.5"
        />

        <InputGroup
          label="Status"
          type="text"
          name="status"
          value={caseData.status}
          onChange={handleChange}
          placeholder="Status"
          className="mb-5.5"
        />

        <Button
          type="submit"
          className="flex w-full justify-center rounded-lg bg-blue-600 hover:bg-blue-700 p-[13px] font-medium text-white"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </ShowcaseSection>
  );
}
