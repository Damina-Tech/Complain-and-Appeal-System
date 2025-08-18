"use client";

import { useParams } from "next/navigation";
import InputGroup from "@/components/FormElements/InputGroup";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EditCasePage() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState({
    name: "",
    nationalId: "",
    phone: "",
    category: "",
    date: "",
    status: "",
  });

  // Mock fetch
  useEffect(() => {
    setCaseData({
      name: "Ahmed Ali",
      nationalId: "1234567890",
      phone: "0912345678",
      category: "complaint",
      date: "2025-08-10",
      status: "In Progress",
    });
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCaseData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Updated Case Data:", caseData);
  };

  return (
    <ShowcaseSection title={`Edit Case #${id}`} className="!p-6.5">
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
          Save Changes
        </Button>
      </form>
    </ShowcaseSection>
  );
}
