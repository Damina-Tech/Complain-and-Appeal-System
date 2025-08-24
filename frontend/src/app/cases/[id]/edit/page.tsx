"use client";

import { useParams, useRouter } from "next/navigation";
import InputGroup from "@/components/FormElements/InputGroup";
import { TextAreaGroup } from "@/components/FormElements/InputGroup/text-area";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type ExistingAttachment = {
  name: string;
  data?: string; // URL or data URI
  type?: string;
  size?: number;
  id?: string | number; // if your backend returns ids
};

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

  // Attachments state
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([]);
  const [replacements, setReplacements] = useState<Record<number, File | null>>({});
  const [toRemove, setToRemove] = useState<Set<number>>(new Set());
  const [newFiles, setNewFiles] = useState<File[]>([]);

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

        // Normalize attachments if present
        const atts: ExistingAttachment[] = Array.isArray(c?.attachments)
          ? c.attachments.map((a: any) => ({
              name: a?.name ?? "Attachment",
              data: a?.data,
              type: a?.type,
              size: a?.size,
              id: a?.id,
            }))
          : [];
        setExistingAttachments(atts);
        setReplacements({});
        setToRemove(new Set());
        setNewFiles([]);
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

  const formatSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const handleReplacePick = (idx: number, file: File | null) => {
    setReplacements((prev) => ({ ...prev, [idx]: file }));
    // ensure it's not marked for removal
    if (file !== null) {
      setToRemove((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const handleRemoveExisting = (idx: number) => {
    setToRemove((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    // clear any replacement for this index
    setReplacements((prev) => {
      const { [idx]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleNewFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setNewFiles((prev) => [...prev, ...arr]);
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

      // 1) Save the text fields
      const payload: any = {
        title: caseData.title,
        description: caseData.description,
        category_id: caseData.category,
        status: caseData.status,
        priority: caseData.priority,
        channel: caseData.channel,
      };
      const baseRes = await fetch(`${API_URL}/cases/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!baseRes.ok) {
        const msg = await baseRes.text();
        throw new Error(msg || `Update failed: ${baseRes.status}`);
      }

      const hasAttachmentChanges =
        newFiles.length > 0 || toRemove.size > 0 || Object.keys(replacements).length > 0;

      if (hasAttachmentChanges) {
        const form = new FormData();

        // Mark removals (send by attachment id or index)
        // Prefer IDs if your backend provides them; fallback to indices.
        const removeIds: (string | number)[] = [];
        toRemove.forEach((idx) => {
          const att = existingAttachments[idx];
          if (att?.id !== undefined && att?.id !== null) removeIds.push(att.id);
          else removeIds.push(idx);
        });
        if (removeIds.length) {
          form.append("remove_attachments", JSON.stringify(removeIds));
        }

        // Replacements: send tuple of (id or index, file)
        Object.entries(replacements).forEach(([idxStr, file]) => {
          if (!file) return;
          const idx = Number(idxStr);
          const att = existingAttachments[idx];
          const keyId = att?.id ?? idx;
          form.append("replace_keys[]", String(keyId));
          form.append("replace_files[]", file);
        });

        // New files
        newFiles.forEach((file) => {
          form.append("new_files[]", file);
        });

        const attRes = await fetch(`${API_URL}/cases/${id}/`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        });

        // If your API is strict with PATCH+multipart, you may need PUT or POST to /attachments/.
        if (!attRes.ok) {
          const m = await attRes.text();
          throw new Error(m || `Attachment update failed: ${attRes.status}`);
        }
      }

      router.push("/cases");
    } catch (err: any) {
      setError(err?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ShowcaseSection title={`Edit Case #${id}`} className="!p-6.5">
      {loading && <div className="mb-4 text-gray-500">Loading...</div>}
      {!!error && !loading && <div className="mb-4 text-red-500">{error}</div>}

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

        {/* Attachments */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Attachments
          </label>

          {/* Existing attachments list */}
          {existingAttachments.length === 0 ? (
            <div className="rounded border bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              No files uploaded
            </div>
          ) : (
            <ul className="space-y-2">
              {existingAttachments.map((att, idx) => {
                const isRemoved = toRemove.has(idx);
                const replacingWith = replacements[idx];

                return (
                  <li
                    key={`${att.id ?? idx}-${att.name}`}
                    className={`flex flex-col gap-2 rounded border p-3 md:flex-row md:items-center md:justify-between ${
                      isRemoved ? "opacity-60 line-through" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{att.name}</div>
                      <div className="text-xs text-gray-500">
                        {att.type ? `${att.type} • ` : ""}
                        {formatSize(att.size)}
                      </div>

                      {/* If replacement chosen, show the new file name */}
                      {replacingWith && !isRemoved && (
                        <div className="mt-1 text-xs text-blue-600">
                          Will replace with: <span className="font-medium">{replacingWith.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {att.data && !isRemoved && (
                        <a
                          href={att.data}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          View
                        </a>
                      )}

                      {!isRemoved && (
                        <label className="cursor-pointer rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700">
                          Replace
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) =>
                              handleReplacePick(idx, e.target.files?.[0] ?? null)
                            }
                          />
                        </label>
                      )}

                      {!isRemoved ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="px-3 py-1 text-sm"
                          onClick={() => handleRemoveExisting(idx)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="px-3 py-1 text-sm"
                          onClick={() =>
                            setToRemove((prev) => {
                              const next = new Set(prev);
                              next.delete(idx);
                              return next;
                            })
                          }
                        >
                          Undo
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add new files */}
          <div className="mt-4 rounded border p-3">
            <div className="mb-2 text-sm font-medium">Add more files</div>
            <input
              type="file"
              multiple
              onChange={(e) => handleNewFiles(e.target.files)}
            />
            {newFiles.length > 0 && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                {newFiles.length} file(s) selected
                <ul className="mt-1 list-inside list-disc">
                  {newFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      {f.name} ({formatSize(f.size)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="flex w-full justify-center rounded-lg bg-blue-600 p-[13px] font-medium text-white hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </ShowcaseSection>
  );
}
