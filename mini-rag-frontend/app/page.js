"use client";

import { useState, useRef } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://mini-rag-app-1-dlst.onrender.com";

async function readApiResponse(response) {
  const body = await response.text();
  let data;

  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`Backend returned HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(data.detail || `Backend returned HTTP ${response.status}`);
  }

  return data;
}

/* ---------- small icon set (inline SVG, no extra deps) ---------- */
const Icon = {
  Upload: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  File: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  Spark: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l1.8 5.6L19.4 9.4l-5.6 1.8L12 16.8l-1.8-5.6L4.6 9.4l5.6-1.8z" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Alert: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" strokeLinejoin="round" />
    </svg>
  ),
};

/* ---------- status pill ---------- */
function StatusPill({ text }) {
  if (!text) return null;
  const isError = /error/i.test(text);
  const isLoading = /(uploading|adding|searching)/i.test(text);

  return (
    <div
      className={`status-pop mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${
        isError
          ? "bg-red-500/10 text-red-300 border border-red-500/30"
          : isLoading
          ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
      }`}
    >
      {isLoading ? (
        <span className="spinner" />
      ) : isError ? (
        <Icon.Alert className="w-4 h-4" />
      ) : (
        <Icon.Check className="w-4 h-4" />
      )}
      <span>{text}</span>
    </div>
  );
}

function SectionCard({ children, className = "", delay = 0 }) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 sm:p-7 animate-fade-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [documentText, setDocumentText] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [addTextStatus, setAddTextStatus] = useState("");
  const [uploadFileStatus, setUploadFileStatus] = useState("");
  const [queryText, setQueryText] = useState("");
  const [queryStatus, setQueryStatus] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [llmAnswer, setLlmAnswer] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleAddText = async () => {
    if (!documentText.trim()) {
      setAddTextStatus("Please enter text to add.");
      return;
    }
    setAddTextStatus("Adding document...");
    try {
      const response = await fetch(`${BACKEND_URL}/add_document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: documentText }),
      });
      const data = await readApiResponse(response);
      setAddTextStatus(`Document added successfully! ID: ${data.id}`);
      setDocumentText("");
    } catch (error) {
      console.error("Network or server error:", error);
      setAddTextStatus(`Error: ${error.message}`);
    }
  };

  const handleFileUpload = async (file) => {
    const targetFile = file || documentFile;
    if (!targetFile) {
      setUploadFileStatus("Please select a file to upload.");
      return;
    }
    setUploadFileStatus(`Uploading "${targetFile.name}"...`);

    const formData = new FormData();
    formData.append("file", targetFile);

    try {
      const response = await fetch(`${BACKEND_URL}/upload_document`, {
        method: "POST",
        body: formData,
      });
      const data = await readApiResponse(response);
      setUploadFileStatus(`File "${data.filename}" uploaded successfully! ID: ${data.id}`);
      setDocumentFile(null);
    } catch (error) {
      console.error("Network or server error:", error);
      setUploadFileStatus(`Error: ${error.message}`);
    }
  };

  const handleQuery = async () => {
    if (!queryText.trim()) {
      setQueryStatus("Please enter a query.");
      return;
    }
    setQueryStatus("Searching...");
    setSearchResults([]);
    setLlmAnswer("");

    try {
      const response = await fetch(`${BACKEND_URL}/generate_answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: queryText }),
      });
      const data = await readApiResponse(response);
      setQueryStatus("");
      setLlmAnswer(data.answer);
      setSearchResults(
        (data.sources || []).map((source, index) => ({ id: index + 1, text: source, score: 1 }))
      );
    } catch (error) {
      console.error("Network or server error:", error);
      setQueryStatus(`Error: ${error.message}`);
      setSearchResults([]);
      setLlmAnswer("");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setDocumentFile(file);
      handleFileUpload(file);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="bg-aurora" />

      <div className="relative z-10 px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-indigo-200 tracking-wide">
              <Icon.Spark className="w-3.5 h-3.5" />
              RETRIEVAL-AUGMENTED GENERATION
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-shimmer">
              Mini RAG
            </h1>
            <p className="text-white/50 max-w-md mx-auto">
              Add your documents, then ask questions grounded only in what you&apos;ve uploaded.
            </p>
          </div>

          {/* Add Document */}
          <SectionCard delay={80}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                <Icon.File className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-lg font-semibold text-white/90">Add a Document</h2>
            </div>

            <div className="space-y-3">
              <label htmlFor="documentText" className="block text-sm text-white/50">
                Paste text directly
              </label>
              <textarea
                id="documentText"
                rows="5"
                placeholder="Enter the document text here..."
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white/90 placeholder-white/30 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20 transition resize-none"
              />
              <button
                onClick={handleAddText}
                disabled={addTextStatus === "Adding document..."}
                className="btn-gradient w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              >
                Add Document (Text)
              </button>
              <StatusPill text={addTextStatus} />
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0b0f1a] px-3 text-xs text-white/30 tracking-wider">OR</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-white/50">Upload a file (.pdf, .txt, .docx)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`dropzone rounded-xl p-8 text-center cursor-pointer ${isDragging ? "dragging" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setDocumentFile(e.target.files[0])}
                />
                <Icon.Upload className="w-7 h-7 mx-auto text-indigo-300/80 mb-2" />
                <p className="text-white/70 text-sm">
                  {documentFile ? (
                    <span className="text-indigo-200 font-medium">{documentFile.name}</span>
                  ) : (
                    <>Drag & drop a file, or click to browse</>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleFileUpload()}
                disabled={uploadFileStatus.startsWith("Uploading")}
                className="btn-gradient w-full py-3 rounded-xl font-semibold text-white"
              >
                Upload Document (File)
              </button>
              <StatusPill text={uploadFileStatus} />
            </div>
          </SectionCard>

          {/* Query */}
          <SectionCard delay={160}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Icon.Search className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-lg font-semibold text-white/90">Query Documents</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="What is the document about?"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                className="flex-1 p-3.5 rounded-xl bg-white/5 border border-white/10 text-white/90 placeholder-white/30 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20 transition"
              />
              <button
                onClick={handleQuery}
                disabled={queryStatus === "Searching..."}
                className="btn-gradient px-7 py-3 rounded-xl font-semibold text-white whitespace-nowrap"
              >
                Search
              </button>
            </div>
            <StatusPill text={queryStatus} />
          </SectionCard>

          {/* Answer */}
          <SectionCard delay={240}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <Icon.Spark className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-lg font-semibold text-white/90">Answer</h2>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-5 min-h-[5rem] flex items-center">
              {llmAnswer ? (
                <p key={llmAnswer} className="answer-reveal text-white/90 leading-relaxed">
                  {llmAnswer}
                </p>
              ) : (
                <p className="text-white/30 text-sm">Your generated answer will appear here...</p>
              )}
            </div>
          </SectionCard>

          {/* Sources */}
          <SectionCard delay={320}>
            <h2 className="text-lg font-semibold text-white/90 mb-4">Source Documents</h2>
            <div className="space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((result, i) => (
                  <div
                    key={result.id}
                    className="answer-reveal rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <p className="text-sm font-semibold text-indigo-200 mb-1">
                      Document {result.id}
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed">{result.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-white/30 text-sm text-center py-4">
                  Source documents will appear here...
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}