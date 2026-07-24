"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import api from "@/lib/axios";
import Cookies from "js-cookie";

interface DocumentManagerProps {
  claimId: string;
}

type DocCategory = "client" | "GG";

const CATEGORIES: DocCategory[] = ["client", "GG"];

interface DocumentData {
  url: string;
  user_name?: string;
  category?: string | null;
}

interface DocumentsMap {
  [key: string]: string | DocumentData;
}

/**
 * Normalize an S3 URL so the object key matches what S3 expects.
 *
 * Fixes the common case where the backend stored a URL with a literal '+'
 * in the PATH (object key). In URLs, '+' is not special in the path, but many
 * systems confuse it with querystring decoding or end up storing it unencoded.
 *
 * Strategy:
 * - Parse URL
 * - Rebuild pathname segment-by-segment
 *   - decode percent-escapes (best effort)
 *   - replace literal '+' with '%2B'
 *   - encode each segment (so spaces -> %20, etc.)
 * - Do NOT modify search params (important for signed URLs) or host/origin
 */
function normalizeS3Url(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // Only normalize typical S3-style hosts. If you use CloudFront/custom domains,
  // you can remove this guard.
  const host = u.hostname.toLowerCase();
  const looksLikeS3 =
    host === "s3.amazonaws.com" ||
    host.endsWith(".s3.amazonaws.com") ||
    host.includes(".s3.") ||
    host.includes(".s3-") ||
    host.startsWith("s3.") ||
    host.includes("amazonaws.com");

  if (!looksLikeS3) return rawUrl;

  const segments = u.pathname.split("/");

  const normalizedPath = segments
    .map((seg) => {
      // keep leading empty segment from "/..."
      if (seg === "") return "";

      // best-effort decode; if malformed, leave as-is
      let decoded = seg;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        decoded = seg;
      }

      // critical fix: literal '+' in PATH should be treated as plus in key,
      // and must be percent-encoded to avoid any downstream decoding surprises
      decoded = decoded.replaceAll("+", "%2B");

      // Now ensure the segment is properly encoded.
      // encodeURIComponent will also encode '%' so first restore %2B markers:
      // (we used "%2B" as text above; convert it back to '+' before encoding,
      // then encode will turn it into %2B)
      decoded = decoded.replaceAll("%2B", "+");

      return encodeURIComponent(decoded);
    })
    .join("/");

  // Assigning pathname keeps search/hash intact
  u.pathname = normalizedPath;

  return u.toString();
}

/**
 * Normalize a document's category. If the backend didn't send one (null,
 * undefined, empty string, or anything unrecognized), default to "client".
 */
function normalizeCategory(cat?: string | null): DocCategory {
  if (cat === "GG") return "GG";
  return "client";
}

function getDocData(doc: string | DocumentData): DocumentData {
  return typeof doc === "string" ? { url: doc } : doc;
}

export default function DocumentManager({ claimId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [singleDocName, setSingleDocName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<DocCategory>("client");
  const [uploading, setUploading] = useState(false);
  const [sourceType, setSourceType] = useState<"file" | "camera" | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [categoryUpdating, setCategoryUpdating] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUsername = (): string | null => {
      try {
        const userData = Cookies.get("user");
        if (!userData) return null;
        const parsed = JSON.parse(userData);
        return parsed?.username || null;
      } catch {
        return null;
      }
    };
    const currentUser = getCurrentUsername();
    setUsername(currentUser);
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/api/claim-documents/${claimId}`, {
        headers: { requiresAuth: true },
      });
      setDocuments(res.data.documents || {});
    } catch (err: any) {
      if (err.response?.status === 404) {
        setDocuments({});
      } else {
        setError(err.response?.data?.detail || "Failed to load documents.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (claimId) fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const handleFilesSelect = (
    e: ChangeEvent<HTMLInputElement>,
    from: "file" | "camera"
  ) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setFileNames((prev) => [...prev, ...newFiles.map((f) => f.name)]);
      setSourceType(from);
      setSingleDocName("");
      e.target.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileNames((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index: number, name: string) => {
    const newNames = [...fileNames];
    newNames[index] = name;
    setFileNames(newNames);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let names: string[];
      let isExplicitReplacement = false;

      if (selectedFiles.length === 1) {
        names = [singleDocName.trim() || selectedFiles[0].name];
        if (singleDocName.trim() !== "") {
          isExplicitReplacement = true; // User explicitly typed a name to replace
        }
      } else {
        names = fileNames.map((n, i) => (n.trim() ? n.trim() : selectedFiles[i].name));
      }

      const presignRes = await fetch("/api/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          files: selectedFiles.map((f) => ({ name: f.name, type: f.type })),
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URLs");

      const { results } = (await presignRes.json()) as {
        results: { presignedUrl: string; fileUrl: string; key: string }[];
      };

      await Promise.all(
        selectedFiles.map((file, i) =>
          fetch(results[i].presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          }).then((res) => {
            if (!res.ok) throw new Error(`S3 upload failed for ${file.name}`);
          })
        )
      );

      let currentDocs: Record<string, any> = {};
      try {
        const getRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`
        );
        if (getRes.ok) {
          const data = await getRes.json();
          currentDocs = data.documents || {};
        }
      } catch {
        currentDocs = {};
      }

      // Merge logic preserving user_name if it exists
      for (let i = 0; i < results.length; i++) {
        let desiredName =
          names[i].trim().replace(/[^a-zA-Z0-9._-\s]/g, "_") || "document";

        const [base, ext] = desiredName.includes(".")
          ? [
              desiredName.slice(0, desiredName.lastIndexOf(".")),
              desiredName.slice(desiredName.lastIndexOf(".")),
            ]
          : [desiredName, ""];

        let finalKey = desiredName;

        // Only dedup if it's not an explicit single file replacement
        if (!isExplicitReplacement) {
          let counter = 1;
          while (currentDocs[finalKey]) {
            finalKey = `${base}-${counter}${ext}`;
            counter++;
          }
        }

        const existingDoc = currentDocs[finalKey];
        let originalUserName = username;

        if (existingDoc && typeof existingDoc === "object" && existingDoc.user_name) {
          originalUserName = existingDoc.user_name;
        }

        currentDocs[finalKey] = {
          // Store as-is (backend behavior), UI will normalize when opening
          url: results[i].fileUrl,
          user_name: originalUserName,
          // Category chosen at upload time. Backend may omit this for older
          // docs — normalizeCategory() treats missing/unknown as "client".
          category: uploadCategory,
        };
      }

      const putRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documents: currentDocs,
            user_name: username,
          }),
        }
      );

      if (!putRes.ok) throw new Error("Backend PUT failed");

      await fetchDocuments();

      const count = selectedFiles.length;
      setSuccessMsg(
        count === 1
          ? `Document "${names[0]}" uploaded successfully`
          : `${count} files uploaded successfully`
      );

      setSelectedFiles([]);
      setFileNames([]);
      setSingleDocName("");
      setSourceType(null);
      setUploadCategory("client");
    } catch (err: any) {
      setError(err.message || "Failed to upload document(s).");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docKey: string) => {
    if (!confirm(`Delete "${docKey}" permanently? This cannot be undone.`)) return;

    const previous = { ...documents };
    const updated = { ...documents };
    delete updated[docKey];
    setDocuments(updated);

    setError(null);
    setSuccessMsg(null);

    try {
      await api.delete(`/api/claim-documents/${claimId}/${docKey}`, {
        headers: { requiresAuth: true },
      });
      setSuccessMsg(`"${docKey}" deleted successfully.`);
    } catch (err: any) {
      setDocuments(previous);
      setError(err.response?.data?.detail || "Delete failed – changes reverted.");
      console.error("Delete error:", err);
    }
  };

  const handleCategoryChange = async (docKey: string, newCategory: DocCategory) => {
    const previous = { ...documents };
    const existing = getDocData(documents[docKey]);
    const updatedDoc: DocumentData = { ...existing, category: newCategory };
    const updated = { ...documents, [docKey]: updatedDoc };

    setDocuments(updated);
    setCategoryUpdating(docKey);
    setError(null);
    setSuccessMsg(null);

    try {
      const putRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documents: updated,
            user_name: username,
          }),
        }
      );

      if (!putRes.ok) throw new Error("Failed to update category");
      setSuccessMsg(`"${docKey}" moved to ${newCategory}.`);
    } catch (err: any) {
      setDocuments(previous);
      setError("Failed to update category – changes reverted.");
      console.error("Category update error:", err);
    } finally {
      setCategoryUpdating(null);
    }
  };

  const handleClearForm = () => {
    setSelectedFiles([]);
    setFileNames([]);
    setSingleDocName("");
    setSourceType(null);
    setUploadCategory("client");
    setError(null);
    setSuccessMsg(null);
  };

  const isMultiple = selectedFiles.length > 1;

  // Group documents by category (missing/unknown category defaults to "client")
  const groupedDocuments = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = Object.entries(documents).filter(
      ([, docData]) => normalizeCategory(getDocData(docData).category) === cat
    );
    return acc;
  }, {} as Record<DocCategory, [string, string | DocumentData][]>);

  const renderDocRow = (name: string, docData: string | DocumentData) => {
    const data = getDocData(docData);
    const openUrl = normalizeS3Url(data.url);
    const uploader = data.user_name ? data.user_name.toUpperCase() : "__";
    const currentCategory = normalizeCategory(data.category);

    return (
      <div
        key={name}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-green-50/60 rounded-xl border border-green-100 hover:bg-green-50 transition group"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 mt-1">Uploaded by: {uploader}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <select
            value={currentCategory}
            disabled={categoryUpdating === name}
            onChange={(e) =>
              handleCategoryChange(name, e.target.value as DocCategory)
            }
            className="text-xs border border-green-200 rounded-lg px-2 py-2 bg-white text-green-800 focus:ring-2 focus:ring-green-400 focus:border-green-400 disabled:opacity-60"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "GG" ? "GG" : "Client"}
              </option>
            ))}
          </select>

          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
          >
            Open
          </a>
          <button
            onClick={() => handleDelete(name)}
            className="px-5 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="bg-white border border-green-100 rounded-2xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-green-800 mb-6">
          Upload Documents (Photos, Videos, PDFs)
        </h2>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isMultiple ? "File Names (edit below)" : "Document Name / Category"}
                </label>

                {!isMultiple && (
                  <>
                    <input
                      type="text"
                      value={singleDocName}
                      onChange={(e) => setSingleDocName(e.target.value)}
                      placeholder="e.g. Police Report, Front Damage, Invoice"
                      className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Use this name to replace existing document (if same name)
                    </p>
                  </>
                )}

                {isMultiple && (
                  <div className="space-y-3 mt-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-600 truncate flex-1">
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 text-xs text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            ✕ Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          value={fileNames[index] || ""}
                          onChange={(e) => updateFileName(index, e.target.value)}
                          placeholder={`Suggested: ${file.name}`}
                          className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition bg-white/80 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {!isMultiple && selectedFiles.length === 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(0)}
                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                  >
                    ✕ Remove file
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Files / Media
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="w-full px-4 py-3 border border-green-200 rounded-xl bg-green-50/50 hover:bg-green-100 transition text-center text-green-700 font-medium">
                    {selectedFiles.length > 0 ? "Add More Files" : "Choose Files"}
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf"
                    multiple
                    onChange={(e) => handleFilesSelect(e, "file")}
                    className="hidden"
                  />
                </label>

                <label className="flex-1 cursor-pointer">
                  <div className="w-full px-4 py-3 border border-green-200 rounded-xl bg-green-50/50 hover:bg-green-100 transition text-center text-green-700 font-medium">
                    Take Photo
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFilesSelect(e, "camera")}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedFiles.length > 0 && !isMultiple && (
                <p className="mt-3 text-sm text-gray-600 truncate">
                  Selected: {selectedFiles[0].name} {sourceType && `(${sourceType})`}
                </p>
              )}

              {isMultiple && (
                <p className="mt-3 text-sm text-gray-600">
                  {selectedFiles.length} files selected
                </p>
              )}
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="flex gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setUploadCategory(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-medium border transition ${
                      uploadCategory === cat
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-green-700 border-green-200 hover:bg-green-50"
                    }`}
                  >
                    {cat === "GG" ? "GG" : "Client"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Applies to all files in this upload.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={handleClearForm}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition border border-gray-300"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className={`px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-full shadow-lg transform hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {uploading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </form>

        {error && <p className="mt-6 text-red-600 text-center font-medium">{error}</p>}
        {successMsg && (
          <p className="mt-6 text-green-600 text-center font-medium">{successMsg}</p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : Object.keys(documents).length === 0 ? (
        <div className="bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl shadow-lg p-6 md:p-8 text-center py-16 text-gray-600">
          No documents uploaded for this claim yet.
          <br />
          <span className="text-sm">Use the form above to add documents.</span>
        </div>
      ) : (
        CATEGORIES.map((cat) => (
          <div
            key={cat}
            className="bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl shadow-lg p-6 md:p-8"
          >
            <h2 className="text-2xl font-bold text-green-800 mb-6">
              {cat === "GG" ? "GG Documents" : "Client Documents"} (
              {groupedDocuments[cat].length})
            </h2>

            {groupedDocuments[cat].length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">
                No {cat === "GG" ? "GG" : "client"} documents yet.
              </p>
            ) : (
              <div className="space-y-4">
                {groupedDocuments[cat].map(([name, docData]) =>
                  renderDocRow(name, docData)
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}