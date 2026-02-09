"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import api from "@/lib/axios";

interface DocumentManagerProps {
  claimId: string;
}

interface DocumentsMap {
  [key: string]: string;
}

export default function DocumentManager({  claimId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]); // one name per file
  const [singleDocName, setSingleDocName] = useState(""); // only for 1 file mode
  const [uploading, setUploading] = useState(false);
  const [sourceType, setSourceType] = useState<"file" | "camera" | null>(null);

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
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      // Initialize names with original filenames
      setFileNames(filesArray.map((f) => f.name));
      setSourceType(from);
      // Clear single name when switching to multi
      setSingleDocName("");
    }
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
      const formData = new FormData();
      formData.append("claimId", claimId);

      // Append files
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Append names (in same order as files)
      if (selectedFiles.length === 1) {
        const name = singleDocName.trim() || selectedFiles[0].name;
        formData.append("names", name);
      } else {
        // Multiple files → send array of names
        const cleanedNames = fileNames.map((n, i) =>
          n.trim() ? n.trim() : selectedFiles[i].name
        );
        cleanedNames.forEach((name) => {
          formData.append("names", name);
        });
      }

      const uploadRes = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      await fetchDocuments();

      const count = selectedFiles.length;
      setSuccessMsg(
        count === 1
          ? `Document "${singleDocName.trim() || selectedFiles[0].name}" uploaded successfully`
          : `${count} files uploaded successfully`
      );

      // Reset
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
      {/* Upload form */}
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
                        <label className="text-xs text-gray-600 mb-1 truncate">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </label>
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
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Files / Media
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1 cursor-pointer">
                  <div className="w-full px-4 py-3 border border-green-200 rounded-xl bg-green-50/50 hover:bg-green-100 transition text-center text-green-700 font-medium">
                    Choose Files
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

      {/* Documents List – unchanged */}
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
            {Object.entries(documents).map(([name, url]) => (
              <div
                key={name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-green-50/60 rounded-xl border border-green-100 hover:bg-green-50 transition group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-900 truncate">{name}</p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

