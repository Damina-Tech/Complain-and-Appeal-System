"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const statusColors: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  "In Investigation":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Closed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function CaseViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [caseData, setCaseData] = useState<any>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState<"transfer" | "assign" | "status" | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

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
        setCaseData(c);
        setSelectedStatus(
          (c?.status || "pending").replace(/\b\w/g, (m: string) => m.toUpperCase()),
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleConfirm = (type: "transfer" | "assign" | "status") => {
    let msg = "";
    if (type === "transfer") msg = `Transferred to ${selectedOffice}`;
    if (type === "assign") msg = `Assigned to ${selectedMember}`;
    if (type === "status") msg = `Status changed to ${selectedStatus}`;
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
    setModalOpen(null);
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }
  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        {error}
        <Button onClick={() => router.push("/cases")} className="ml-4">
          Back
        </Button>
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="p-6 text-center text-red-500">
        Case not found.
        <Button onClick={() => router.push("/cases")} className="ml-4">
          Back
        </Button>
      </div>
    );
  }

  const titleCaseStatus = (caseData.status || "pending").replace(
    /\b\w/g,
    (m: string) => m.toUpperCase(),
  );

  return (
    <div className="p-6">
      <Button
        variant="ghost"
        className="mb-4 flex items-center gap-2"
        onClick={() => router.push("/cases")}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cases
      </Button>

      <Card className="shadow-lg border rounded-2xl max-w-3xl mx-auto bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{caseData.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-gray-700 dark:text-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Category</p>
              <p className="capitalize">{caseData.category_id}</p>
            </div>
            <div>
              <p className="font-semibold">Created</p>
              <p>{String(caseData.created_at).slice(0, 10)}</p>
            </div>
            <div>
              <p className="font-semibold">Channel</p>
              <p className="capitalize">{caseData.channel}</p>
            </div>
            <div>
              <p className="font-semibold">Priority</p>
              <p className="capitalize">{caseData.priority}</p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusColors[titleCaseStatus] || ""
                }`}
              >
                {titleCaseStatus}
              </span>
            </div>
          </div>

          <div>
            <p className="font-semibold">Description</p>
            <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
              {caseData.description || "—"}
            </p>
          </div>

          <div>
            <p className="font-semibold">Attachments</p>
            {Array.isArray(caseData.attachments) && caseData.attachments.length > 0 ? (
              <ul className="space-y-2">
                {caseData.attachments.map((a: any, idx: number) => (
                  <li key={`${a.name || idx}`} className="flex items-center gap-3">
                    <a
                      href={a.data || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {a.name || `Attachment ${idx + 1}`}
                    </a>
                    <span className="text-xs text-gray-500">
                      {a.type} {a.size ? `(${Math.round(a.size / 1024)} KB)` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                No files uploaded
              </div>
            )}
          </div>

          {/* Actions (UI only) */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="rounded-lg border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-400"
              onClick={() => setModalOpen("transfer")}
            >
              Transfer
            </Button>
            <Button
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setModalOpen("assign")}
            >
              Assign
            </Button>
            <Button
              className="rounded-lg bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setModalOpen("status")}
            >
              Change Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50"
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal (UI only) */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 p-6 rounded-lg max-w-sm w-full"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="text-lg font-semibold mb-4 capitalize">
                {modalOpen === "transfer"
                  ? "Transfer Case"
                  : modalOpen === "assign"
                  ? "Assign Case"
                  : "Change Status"}
              </h2>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {modalOpen === "transfer" && ["Head Office", "Regional Office", "Local Office"].map((office) => (
                  <label key={office} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="transferOffice"
                      value={office}
                      checked={selectedOffice === office}
                      onChange={() => setSelectedOffice(office)}
                    />
                    {office}
                  </label>
                ))}

                {modalOpen === "assign" && ["Officer A", "Officer B", "Officer C"].map((member) => (
                  <label key={member} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assignMember"
                      value={member}
                      checked={selectedMember === member}
                      onChange={() => setSelectedMember(member)}
                    />
                    {member}
                  </label>
                ))}

                {modalOpen === "status" && ["Pending", "In Investigation", "Resolved", "Rejected", "Closed"].map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={selectedStatus === status}
                      onChange={() => setSelectedStatus(status)}
                    />
                    {status}
                  </label>
                ))}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModalOpen(null)}>
                  Cancel
                </Button>
                <Button onClick={() => modalOpen && handleConfirm(modalOpen)}>
                  Confirm
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
