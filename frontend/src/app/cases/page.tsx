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
import { TextAreaGroup } from "@/components/FormElements/InputGroup/text-area";

type Attachment = { name: string; type: string; size: number; data: string };

// ✅ Status Color Mapping (Title Case)
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
  const [form, setForm] = useState<{
    title: string;
    description: string;
    category: string;
    attachments: Attachment[];
    status: string;
    office: string;
    citizenId: string | null;
  }>({
    title: "",
    description: "",
    category: "",
    attachments: [],
    status: "pending",
    office: "",
    citizenId: typeof window !== "undefined" ? localStorage.getItem("user_id") : null,
  });
  const [data, setData] = useState<Array<{
    id: number | string;
    title: string;
    category: string;
    channel: string;
    priority: string;
    date: string; // YYYY-MM-DD
    status: string; // Title Case for badge mapping
  }>>([]);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:8000/api

  const loadCases = async () => {
    if (!API_URL) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/cases/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }
      const cases = await res.json();
      const mineOnly = (Array.isArray(cases) ? cases : []).filter((c: any) => {
        if (!userId) return true; // fallback if not present
        return String(c.citizen_id) === String(userId);
      });
      const mapped = mineOnly.map((c: any) => ({
        id: c.id,
        title: c.title || `Case #${c.id}`,
        category: c.category_id || "complaint",
        channel: c.channel || "web",
        priority: c.priority || "medium",
        date: (c.created_at ? String(c.created_at).slice(0, 10) : "").replace(/T.*/, ""),
        status: (c.status || "pending").replace(/\b\w/g, (m: string) => m.toUpperCase()),
      }));
      setData(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch cases from Django `/api/cases/` and map to table shape
  useEffect(() => {
    loadCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = data.filter((item) => {
    const matchCategory = category === "all" || item.category === category;
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchDate = !date || item.date === date.toISOString().split("T")[0];
    return matchCategory && matchSearch && matchDate;
  });

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList) {
      setForm((s) => ({ ...s, attachments: [] }));
      return;
    }
    const files = Array.from(fileList);
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    const selected = files.filter((f) => allowed.includes(f.type));
    const toBase64 = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    const attachments: Attachment[] = await Promise.all(
      selected.map(async (f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
        data: await toBase64(f),
      })),
    );

    setForm((s) => ({ ...s, attachments }));
  };

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
              <TableHead className="!text-left">Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
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
                  <TableCell className="!text-left">{item.title}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell className="capitalize">{item.channel}</TableCell>
                  <TableCell className="capitalize">{item.priority}</TableCell>
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
              const payload: any = {
                title: form.title || `New Case ${Date.now()}`,
                description: form.description || "",
                category_id: form.category || "complaint",
                attachments: form.attachments || [],
                status: form.status || "pending",
                office: form.office || "",
                citizen_id: form.citizenId || "",
              };
              // Debug log to verify submit is firing
              console.log("Submitting /cases/ payload", payload);
              const res = await fetch(`${API_URL}/cases/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  title: form.title || `New Case ${Date.now()}`,
                  description: form.description || "",
                  category_id: form.category || "complaint",
                  attachments: form.attachments || [],
                  status: form.status || "pending",
                  office: form.office || "",
                  citizen_id: form.citizenId || "",
                }),
              });
              if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || `Create failed: ${res.status}`);
              }
              // Optional: read created entity
              await res.json().catch(() => null);
              setOpenDialog(false);
              setForm({ title: "", description: "", category: "", attachments: [], status: "pending", office: "", citizenId: typeof window !== "undefined" ? localStorage.getItem("user_id") : null });
              await loadCases();
            } catch (err: any) {
              setError(err?.message || "Failed to create");
            } finally {
              setCreating(false);
            }
          }}
        >
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          />
          <TextAreaGroup
            name="description"
            label="Description"
            rows={4}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          />
          {/* <Input
            placeholder="Attachments"
            value={form.attachments}
            onChange={(e) => setForm((s) => ({ ...s, attachments: [...s.attachments, e.target.value] }))}
          /> */}
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
          <div>
            <label className="mb-1 block text-sm font-medium">Attachments (PDF, PNG, JPG)</label>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="w-full rounded border border-gray-300 p-2 dark:border-dark-3 dark:bg-dark-2"
            />
            {Array.isArray(form.attachments) && form.attachments.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-600 dark:text-dark-6">
                {(form.attachments as any[]).map((a: any) => (
                  <li key={a.name}>
                    {a.name} {a.size ? `(${Math.round(a.size / 1024)} KB)` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
