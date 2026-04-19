"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import api from "@/lib/axios";
import Cookies from "js-cookie";

interface DocumentManagerProps {
  claimId: string;
}

// Update the map to support both legacy string URLs and the new object format with user_name
interface DocumentData {
  url: string;
  user_name?: string;
}

interface DocumentsMap {
  [key: string]: string | DocumentData;
}

export default function DocumentManager({ claimId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [singleDocName, setSingleDocName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sourceType, setSourceType] = useState<"file" | "camera" | null>(null);
  const [username, setUsername] = useState<string | null>(null);

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
  }, [claimId]);

  const handleFilesSelect = (e: ChangeEvent<HTMLInputElement>, from: "file" | "camera") => {
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
        names = fileNames.map((n, i) =>
          n.trim() ? n.trim() : selectedFiles[i].name
        );
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

      const { results } = await presignRes.json() as {
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

      // Step 4: Merge logic preserving user_name if it exists
      for (let i = 0; i < results.length; i++) {
        let desiredName = names[i].trim().replace(/[^a-zA-Z0-9._-\s]/g, "_") || "document";

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

        // Check if the document already exists to preserve the original uploader's name
        const existingDoc = currentDocs[finalKey];
        let originalUserName = username;

        if (existingDoc) {
          // If it was previously saved as an object, grab the old user_name
          if (typeof existingDoc === 'object' && existingDoc.user_name) {
            originalUserName = existingDoc.user_name;
          }
        }

        currentDocs[finalKey] = {
          url: results[i].fileUrl,
          user_name: originalUserName // Retains old username if replacing, otherwise uses current username
        };
      }

      const putRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/post/claim-documents/${claimId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            documents: currentDocs,
            user_name: username 
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

  const handleClearForm = () => {
    setSelectedFiles([]);
    setFileNames([]);
    setSingleDocName("");
    setSourceType(null);
    setError(null);
    setSuccessMsg(null);
  };

  const isMultiple = selectedFiles.length > 1;

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
        {successMsg && <p className="mt-6 text-green-600 text-center font-medium">{successMsg}</p>}
      </div>

      <div className="bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-green-800 mb-6">
          Current Documents ({Object.keys(documents).length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : Object.keys(documents).length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            No documents uploaded for this claim yet.
            <br />
            <span className="text-sm">Use the form above to add documents.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(documents).map(([name, docData]) => {
              // Handle backwards compatibility for legacy strings vs new objects
              const url = typeof docData === 'string' ? docData : docData.url;
              const uploader = typeof docData === 'object' && docData.user_name ? docData.user_name.toUpperCase() : "__";

              return (
                <div
                  key={name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-green-50/60 rounded-xl border border-green-100 hover:bg-green-50 transition group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-900 truncate">{name}</p>
                    <p className="text-xs text-gray-500 mt-1">Uploaded by: {uploader}</p>
                  </div>

                  <div className="flex gap-3 flex-shrink-0">
                    <a
                      href={url}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}