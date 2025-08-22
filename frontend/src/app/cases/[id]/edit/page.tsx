"use client";

import { useParams, useRouter } from "next/navigation";
import InputGroup from "@/components/FormElements/InputGroup";
import { TextAreaGroup } from "@/components/FormElements/InputGroup/text-area";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditCasePage() {
  const { id } = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState({
    title: "",
    description: "",
    category: "",
    status: "pending",
    priority: "medium",
    channel: "web",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:8000/api

  // Load case by id and map to form fields
  useEffect(() => {
    const load = async () => {
      if (!API_URL || !id) return;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_URL}/cases/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        const c = await res.json();
        setCaseData({
          title: c?.title || "",
          description: c?.description || "",
          category: c?.category_id || "complaint",
          status: c?.status || "pending",
          priority: c?.priority || "medium",
          channel: c?.channel || "web",
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
      const payload: any = {
        title: caseData.title,
        description: caseData.description,
        category_id: caseData.category,
        status: caseData.status,
        priority: caseData.priority,
        channel: caseData.channel,
      };
      const res = await fetch(`${API_URL}/cases/${id}/`, {
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
          label="Title"
          type="text"
          name="title"
          value={caseData.title}
          onChange={handleChange}
          placeholder="Enter case title"
          className="mb-4.5"
        />

        <TextAreaGroup
          label="Description"
          name="description"
          value={caseData.description}
          onChange={(e) => setCaseData((s) => ({ ...s, description: e.target.value }))}
          placeholder="Enter description"
          rows={6}
          className="mb-4.5"
        />

        <div className="mb-4.5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-body-sm font-medium">Category</label>
            <Select value={caseData.category} onValueChange={(val) => setCaseData((s) => ({ ...s, category: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="appeal">Appeal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium">Status</label>
            <Select value={caseData.status} onValueChange={(val) => setCaseData((s) => ({ ...s, status: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="investigation">In Investigation</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-body-sm font-medium">Priority</label>
            <Select value={caseData.priority} onValueChange={(val) => setCaseData((s) => ({ ...s, priority: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-5.5">
          <label className="mb-1 block text-body-sm font-medium">Channel</label>
          <Select value={caseData.channel} onValueChange={(val) => setCaseData((s) => ({ ...s, channel: val }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
