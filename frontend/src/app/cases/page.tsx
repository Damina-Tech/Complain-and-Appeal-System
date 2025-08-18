"use client";

import { useState } from "react";
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
  const router = useRouter();

  // ✅ Example Data with all status
  const data = [
    {
      id: 1,
      name: "Ahmed Ali",
      nationalId: "1234567890",
      phone: "0912345678",
      category: "complaint",
      date: "2025-08-10",
      status: "Pending",
    },
    {
      id: 2,
      name: "Fatima Mohammed",
      nationalId: "0987654321",
      phone: "0922334455",
      category: "appeal",
      date: "2025-08-12",
      status: "In Investigation",
    },
    {
      id: 3,
      name: "Mohammed Ibrahim",
      nationalId: "1122334455",
      phone: "0933445566",
      category: "complaint",
      date: "2025-08-13",
      status: "Resolved",
    },
    {
      id: 4,
      name: "Amina Yusuf",
      nationalId: "2233445566",
      phone: "0944556677",
      category: "appeal",
      date: "2025-08-14",
      status: "Rejected",
    },
    {
      id: 5,
      name: "Hassan Ahmed",
      nationalId: "3344556677",
      phone: "0955667788",
      category: "complaint",
      date: "2025-08-15",
      status: "Closed",
    },
  ];

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
        <form className="space-y-4">
          <Input placeholder="Full Name" />
          <Input placeholder="National ID" />
          <Input placeholder="Phone Number" />
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="complaint">Complaint</SelectItem>
              <SelectItem value="appeal">Appeal</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" />
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </Button>
        </form>
      </Dialog>
    </>
  );
}
