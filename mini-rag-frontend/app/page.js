"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://mini-rag-app-1-dlst.onrender.com";
const EXAMPLE_QUESTIONS = [
  "What are the main takeaways?",
  "Summarize this document",
  "What dates or deadlines are mentioned?",
];

async function readApiResponse(response) {
  const body = await response.text();
  let data;

  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`Backend returned HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : body || "Unknown backend error";
    throw new Error(`Backend returned HTTP ${response.status}: ${detail}`);
  }

  return data;
}

function StatusMessage({ text }) {
  if (!text) return null;

  const isError = /error|please|failed/i.test(text);
  const isLoading = /(uploading|adding|searching)/i.test(text);

  return (
    <p
      role={isError ? "alert" : "status"}
      className={`mt-3 text-sm ${isError ? "text-red-700" : isLoading ? "text-slate-500" : "text-emerald-800"}`}
    >
      {text}
    </p>
  );
}

function FileKind({ kind }) {
  return (
    <span className="file-kind" aria-label={`${kind} document`}>
      {kind}
    </span>
  );
}

export default function Home() {
  const [documentText, setDocumentText] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documents, setDocuments] = useState([]);
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
      setDocuments((current) => [
        { id: data.id, name: "Pasted text", kind: "TXT" },
        ...current,
      ]);
      setAddTextStatus("Document added and ready to search.");
      setDocumentText("");
    } catch (error) {
      console.error("Network or server error:", error);
      setAddTextStatus(`Error: ${error.message}`);
    }
  };

  const handleFileUpload = async (file = documentFile) => {
    if (!file) {
      setUploadFileStatus("Please select a file to upload.");
      return;
    }

    setUploadFileStatus(`Uploading "${file.name}"...`);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/upload_document`, {
        method: "POST",
        body: formData,
      });
      const data = await readApiResponse(response);
      const extension = file.name.split(".").pop()?.toUpperCase() || "FILE";
      setDocuments((current) => [
        { id: data.id, name: data.filename, kind: extension },
        ...current,
      ]);
      setUploadFileStatus(`"${data.filename}" is ready to search.`);
      setDocumentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Network or server error:", error);
      setUploadFileStatus(`Error: ${error.message}`);
    }
  };

  const handleQuery = async (question = queryText) => {
    if (!question.trim()) {
      setQueryStatus("Enter a question to search your documents.");
      return;
    }

    setQueryText(question);
    setQueryStatus("Searching...");
    setSearchResults([]);
    setLlmAnswer("");

    try {
      const response = await fetch(`${BACKEND_URL}/generate_answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: question }),
      });
      const data = await readApiResponse(response);
      setQueryStatus("");
      setLlmAnswer(data.answer);
      setSearchResults(
        (Array.isArray(data.sources) ? data.sources : []).map((text, index) => ({
          id: index + 1,
          text,
        }))
      );
    } catch (error) {
      console.error("Network or server error:", error);
      setQueryStatus(`Error: ${error.message}`);
      setSearchResults([]);
      setLlmAnswer("");
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setDocumentFile(file);
      handleFileUpload(file);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="app-header">
        <div className="page-width flex items-center justify-between gap-4 py-4">
          <Link className="brand" href="/" aria-label="Mini RAG home">
            <span className="brand-mark" aria-hidden="true">M</span>
            <span>
              <span className="brand-name">Mini RAG</span>
              <span className="brand-caption">DOCUMENT WORKSPACE</span>
            </span>
          </Link>
          <div className="service-label">
            <span className="service-dot" />
            Gemini document search
          </div>
        </div>
      </header>

      <div className="page-width py-10 sm:py-14">
        <section className="mb-8 sm:mb-10">
          <p className="eyebrow">YOUR DOCUMENTS, IN CONTEXT</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            A clearer way to find answers.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Add the documents you work with, then ask a question. Answers are generated from the
            relevant material in your library.
          </p>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">BUILD YOUR LIBRARY</p>
                <h2 className="panel-title">Add documents</h2>
              </div>
              <span className="step-number">01</span>
            </div>

            <label className="field-label" htmlFor="documentText">Paste text</label>
            <textarea
              id="documentText"
              rows={5}
              placeholder="Paste notes, an excerpt, or any text you want to search..."
              value={documentText}
              onChange={(event) => setDocumentText(event.target.value)}
              className="text-field resize-y"
            />
            <button
              onClick={handleAddText}
              disabled={addTextStatus === "Adding document..."}
              className="button button-secondary mt-3 w-full"
            >
              Add pasted text
            </button>
            <StatusMessage text={addTextStatus} />

            <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or upload a file
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`upload-area ${isDragging ? "upload-area-active" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="sr-only"
                id="documentFile"
                onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
              />
              <label htmlFor="documentFile" className="upload-prompt">
                <span className="upload-icon" aria-hidden="true">↑</span>
                <span className="font-medium text-slate-800">
                  {documentFile ? documentFile.name : "Choose a document"}
                </span>
                <span className="mt-1 text-sm text-slate-500">
                  PDF, DOCX, or TXT · click to browse or drag it here
                </span>
              </label>
            </div>
            <button
              onClick={() => handleFileUpload()}
              disabled={uploadFileStatus.startsWith("Uploading")}
              className="button button-primary mt-3 w-full"
            >
              Upload document
            </button>
            <StatusMessage text={uploadFileStatus} />
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AVAILABLE TO SEARCH</p>
                <h2 className="panel-title">Your library</h2>
              </div>
              <span className="count-badge">{documents.length}</span>
            </div>

            {documents.length ? (
              <>
                <p className="mb-3 text-sm text-slate-500">
                  Added in this session. Documents may be cleared when the service restarts.
                </p>
                <ul className="document-list" aria-label="Documents added this session">
                  {documents.map((document, index) => (
                    <li className="document-row" key={`${document.id}-${index}`}>
                      <FileKind kind={document.kind} />
                      <span className="min-w-0 flex-1">
                        <span className="document-name">{document.name}</span>
                        <span className="document-status">Ready to search</span>
                      </span>
                      <span className="ready-dot" aria-label="Ready" />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="empty-library">
                <div className="empty-icon" aria-hidden="true">▤</div>
                <h3 className="font-medium text-slate-800">Your library is ready</h3>
                <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                  Add a file or paste text. It will appear here once it has been processed.
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="field-label mb-3">Try an example question</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((question) => (
                  <button
                    className="question-chip"
                    key={question}
                    onClick={() => handleQuery(question)}
                    disabled={queryStatus === "Searching..."}
                  >
                    {question}
                  </button>
                ))}
              </div>
              {documents.length === 0 && (
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Add a document before trying a question.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="panel mt-5">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ASK YOUR LIBRARY</p>
              <h2 className="panel-title">What would you like to know?</h2>
            </div>
            <span className="step-number">02</span>
          </div>
          <div className="query-row">
            <label className="sr-only" htmlFor="queryText">Question</label>
            <input
              id="queryText"
              type="text"
              placeholder="Ask a question about your documents..."
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleQuery()}
              className="text-field"
            />
            <button
              onClick={() => handleQuery()}
              disabled={queryStatus === "Searching..."}
              className="button button-primary query-button"
            >
              {queryStatus === "Searching..." ? "Searching..." : "Ask question"}
            </button>
          </div>
          <StatusMessage text={queryStatus} />
        </section>

        {(llmAnswer || searchResults.length > 0) && (
          <section className="panel mt-5" aria-live="polite">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">RESPONSE</p>
                <h2 className="panel-title">Answer</h2>
              </div>
              {searchResults.length > 0 && (
                <span className="source-count">
                  {searchResults.length} {searchResults.length === 1 ? "source" : "sources"}
                </span>
              )}
            </div>
            {llmAnswer && <p className="answer-text">{llmAnswer}</p>}

            {searchResults.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="field-label mb-3">Retrieved source text</h3>
                <ol className="space-y-3">
                  {searchResults.map((result) => (
                    <li className="source-card" key={result.id}>
                      <span className="source-label">Source {result.id}</span>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {result.text}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        <footer className="py-8 text-center text-xs text-slate-400">
          Answers are generated from retrieved document text. Check the source text for context.
        </footer>
      </div>
    </main>
  );
}
