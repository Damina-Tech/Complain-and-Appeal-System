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
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Mock data
const mockData = [
  {
    id: 1,
    name: "Ahmed Ali",
    nationalId: "1234567890",
    phone: "0912345678",
    category: "complaint",
    date: "2025-08-10",
    status: "In Progress",
    title: "Service Delay Complaint",
    description: "Customer complaint about delayed service.",
    resolvedDate: null,
  },
  {
    id: 2,
    name: "Fatima Mohammed",
    nationalId: "0987654321",
    phone: "0922334455",
    category: "appeal",
    date: "2025-08-12",
    status: "Resolved",
    title: "Appeal on Service Charges",
    description: "Appeal regarding service charges.",
    resolvedDate: "2025-08-15",
  },
];

const statusColors: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  "In Progress":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Closed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function CaseViewPage() {
  const { id } = useParams();
  const router = useRouter();

  const caseData = mockData.find((item) => item.id.toString() === id);

  // Modal states
  const [modalOpen, setModalOpen] = useState<"transfer" | "assign" | "status" | null>(null);

  // Success message state
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>(caseData?.status || "");

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

  const offices = ["Head Office", "Regional Office", "Local Office"];
  const members = ["Officer A", "Officer B", "Officer C"];
  const statuses = ["Pending", "In Progress", "Resolved", "Rejected", "Closed"];

  const handleConfirm = (type: "transfer" | "assign" | "status") => {
    let msg = "";
    if (type === "transfer") msg = `Transferred to ${selectedOffice}`;
    if (type === "assign") msg = `Assigned to ${selectedMember}`;
    if (type === "status") msg = `Status changed to ${selectedStatus}`;

    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000); // Clear after 3s
    setModalOpen(null);
    console.log(msg);
  };

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
              <p className="font-semibold">Full Name</p>
              <p>{caseData.name}</p>
            </div>
            <div>
              <p className="font-semibold">National ID</p>
              <p>{caseData.nationalId}</p>
            </div>
            <div>
              <p className="font-semibold">Phone Number</p>
              <p>{caseData.phone}</p>
            </div>
            <div>
              <p className="font-semibold">Category</p>
              <p className="capitalize">{caseData.category}</p>
            </div>
            <div>
              <p className="font-semibold">Date</p>
              <p>{caseData.date}</p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusColors[caseData.status] || ""
                }`}
              >
                {caseData.status}
              </span>
            </div>
            {caseData.resolvedDate && (
              <div>
                <p className="font-semibold">Resolved Date</p>
                <p>{caseData.resolvedDate}</p>
              </div>
            )}
          </div>

          <div>
            <p className="font-semibold">Description</p>
            <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
              {caseData.description}
            </p>
          </div>

          <div>
            <p className="font-semibold">Attachments</p>
            <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
              No files uploaded
            </div>
          </div>

          {/* Actions */}
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

      {/* Modal */}
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
                {modalOpen === "transfer" &&
                  offices.map((office) => (
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

                {modalOpen === "assign" &&
                  members.map((member) => (
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

                {modalOpen === "status" &&
                  statuses.map((status) => (
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
                <Button
                  variant="ghost"
                  onClick={() => setModalOpen(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    modalOpen && handleConfirm(modalOpen)
                  }
                >
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
