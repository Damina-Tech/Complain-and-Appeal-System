"use client";

import { useEffect, useState } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Dialog from "@/components/ui/Dialog";
import { Eye, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

// ✅ Status Color Mapping
const statusColors: Record<string, string> = {
  Pending: "bg-gray-200 text-gray-800",
  "In Investigation": "bg-blue-200 text-blue-800",
  Resolved: "bg-green-200 text-green-800",
  Rejected: "bg-red-200 text-red-800",
  Closed: "bg-yellow-200 text-yellow-800",
};

export default function ComplaintAppealPage() {
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [form, setForm] = useState({
    fullName: "",
    nationalId: "",
    phone: "",
    category: "",
    date: "",
  });
  const [data, setData] = useState<Array<{
    id: number | string;
    name: string;
    nationalId: string;
    phone: string;
    category: string;
    date: string; // YYYY-MM-DD
    status: string;
  }>>([]);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:8000/api

  const loadUsers = async () => {
    if (!API_URL) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }
      const users = await res.json();
      const mapped = (Array.isArray(users) ? users : []).map((u: any) => ({
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "",
        nationalId: u.national_id || "",
        phone: u.phone_number || "",
        category: "complaint",
        date: (u.created_at ? String(u.created_at).slice(0, 10) : "").replace(/T.*/, ""),
        status: u.status || "Pending",
      }));
      setData(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch real data from Django `/api/users/` and map to table shape
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = data.filter((item) => {
    const matchCategory = category === "all" || item.category === category;
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.nationalId.includes(search) ||
      item.phone.includes(search);
    const matchDate = !date || item.date === date.toISOString().split("T")[0];
    return matchCategory && matchSearch && matchDate;
  });

  return (
    <>
      <Breadcrumb pageName="Complaints & Appeals" />

      <div
        className={cn(
          "rounded-[10px] bg-white p-5 shadow-1 dark:bg-gray-dark dark:shadow-card"
        )}
      >
        {/* Filters & Add Button */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Select onValueChange={(val) => setCategory(val)} defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="complaint">Complaints</SelectItem>
                <SelectItem value="appeal">Appeals</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by Name, ID, or Phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[250px]"
            />
          </div>

          <Button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setOpenDialog(true)}
          >
            + Add New
          </Button>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="[&>th]:text-center">
              <TableHead className="!text-left">Name</TableHead>
              <TableHead>National ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-gray-500 dark:text-gray-300">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!!error && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-4 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <TableRow
                  key={item.id}
                  className="text-center text-base font-medium text-dark dark:text-white"
                >
                  <TableCell className="!text-left">{item.name}</TableCell>
                  <TableCell>{item.nationalId}</TableCell>
                  <TableCell>{item.phone}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/cases/${item.id}/view`)}
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/cases/${item.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4 text-green-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-4 text-center text-gray-500 dark:text-gray-300"
                >
                  No records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ✅ Add New Case Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Add New Case"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
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
              setCreating(true);
              // Derive a minimal valid Django user payload from the form
              const [first, ...rest] = form.fullName.trim().split(" ");
              const payload: any = {
                username: form.nationalId || form.phone || (first ? first.toLowerCase() : `user_${Date.now()}`),
                first_name: first || "",
                last_name: rest.join(" ") || "",
                phone_number: form.phone || "",
                national_id: form.nationalId || "",
                status: "active",
              };
              // Debug log to verify submit is firing
              console.log("Submitting /users/ payload", payload);
              const res = await fetch(`${API_URL}/users/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || `Create failed: ${res.status}`);
              }
              // Optional: read created entity
              await res.json().catch(() => null);
              setOpenDialog(false);
              setForm({ fullName: "", nationalId: "", phone: "", category: "", date: "" });
              await loadUsers();
            } catch (err: any) {
              setError(err?.message || "Failed to create");
            } finally {
              setCreating(false);
            }
          }}
        >
          <Input
            placeholder="Full Name"
            value={form.fullName}
            onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
          />
          <Input
            placeholder="National ID"
            value={form.nationalId}
            onChange={(e) => setForm((s) => ({ ...s, nationalId: e.target.value }))}
          />
          <Input
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          />
          <Select
            value={form.category}
            onValueChange={(val) => setForm((s) => ({ ...s, category: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="complaint">Complaint</SelectItem>
              <SelectItem value="appeal">Appeal</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
          />
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {creating ? "Saving..." : "Save"}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
