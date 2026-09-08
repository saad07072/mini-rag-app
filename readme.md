# Mini RAG Full Stack Application

A local, no-key Retrieval-Augmented Generation (RAG) application. Add text or upload a document, retrieve the most relevant content, and generate an answer with a local Llama model.

The repository contains a FastAPI backend and a Next.js frontend. Cloud services are not required for the current implementation.

## Current Features

- Add documents directly as text.
- Upload `.txt`, `.pdf`, and `.docx` files.
- Generate local embeddings with `all-MiniLM-L6-v2`.
- Search documents with cosine similarity.
- Rerank retrieved results with `cross-encoder/ms-marco-MiniLM-L-6-v2`.
- Generate grounded answers with `TinyLlama/TinyLlama-1.1B-Chat-v1.0`.
- Display the answer and the source documents used for retrieval.
- Handle non-JSON and failed backend responses in the frontend without showing a misleading network error.

## Architecture

```text
Browser
	|
	| HTTP requests to localhost:8002
	v
Next.js frontend (localhost:3000)
	|
	v
FastAPI backend (localhost:8002)
	|
	+--> In-memory document store
	+--> Sentence Transformer embeddings
	+--> Cosine similarity retrieval
	+--> CrossEncoder reranking
	+--> TinyLlama local text generation
```

The frontend uses `NEXT_PUBLIC_BACKEND_URL` when it is defined. For local development it defaults to `http://localhost:8002`. This direct connection avoids the slow local LLM request passing through the Next.js development rewrite proxy.

## Project Structure

```text
mini-rag-app/
|-- backend/
|   |-- main.py              FastAPI application and RAG orchestration
|   |-- local_rag.py         In-memory retrieval and reranking logic
|   |-- model_utils.py       Legacy Groq model fallback helpers
|   |-- test_model_utils.py  Regression tests for model fallback helpers
|   |-- requirements.txt      Python dependencies
|   `-- Procfile             Process definition for deployment platforms
|-- mini-rag-frontend/
|   |-- app/page.js          Browser UI and API calls
|   |-- app/globals.css      Global styles
|   |-- app/layout.js        Next.js root layout
|   |-- next.config.mjs      Next.js configuration
|   `-- package.json          Frontend scripts and dependencies
|-- requirements.txt         Root-level dependency file
`-- readme.md
```

## Requirements

- Windows, macOS, or Linux
- Python 3.10 or newer
- Node.js and npm
- Enough disk space and RAM for the local embedding, reranker, and Llama models
- No Groq, Qdrant, or other API key is required

## Quickstart on Windows

### 1. Install backend dependencies

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The first model-backed request may download Hugging Face models. This requires internet access once; later runs can use the local model cache.

### 2. Start the backend

Keep this terminal open:

```powershell
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8002
```

Backend health check:

```text
http://localhost:8002/
```

Expected response:

```json
{"status":"ok","mode":"local-rag"}
```

### 3. Install and start the frontend

Open a second terminal:

```powershell
cd mini-rag-frontend
npm install
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

To use another backend URL:

```powershell
$env:NEXT_PUBLIC_BACKEND_URL = "http://localhost:8002"
npm run dev
```

## API Reference

All request bodies use JSON except `/upload_document`, which uses multipart form data.

### `GET /`

Returns the backend health status.

### `POST /add_document`

Request:

```json
{"text":"A document to index","id":"optional-id"}
```

Returns a generated or supplied document ID.

### `POST /upload_document`

Form field:

```text
file=<document file>
```

Supported file extensions: `.txt`, `.pdf`, `.docx`.

### `POST /query`

Request:

```json
{"text":"What is in the document?","top_k":3}
```

Returns the top matching documents with IDs, text, and similarity scores.

### `POST /generate_answer`

Request:

```json
{"text":"Answer my question from the uploaded documents.","top_k":3}
```

Response shape:

```json
{
	"answer": "Generated answer",
	"sources": ["Relevant document text"]
}
```

## RAG Pipeline

1. The backend extracts text from direct input or an uploaded file.
2. The text is embedded with `all-MiniLM-L6-v2`.
3. The embedding and original text are stored in the in-memory vector store.
4. A query is embedded and compared with stored vectors using cosine similarity.
5. The backend retrieves at least 3 candidates, or twice the requested `top_k` when that is larger.
6. Candidates are reranked with `cross-encoder/ms-marco-MiniLM-L-6-v2`.
7. The reranked context is passed to TinyLlama with an instruction to answer only from the documents.
8. The response returns the generated answer and the selected source texts.

## Full Application Report

### Numeric implementation report

| Metric | Value |
|---|---:|
| Frontend applications | 1 |
| Backend applications | 1 |
| HTTP API endpoints | 5 |
| Document ingestion methods | 2 |
| Supported file formats | 3 |
| Retrieval stages | 2 |
| Local model components | 3 |
| Default `top_k` | 3 |
| Minimum retrieval candidates | 3 |
| Candidate multiplier | 2x `top_k` |
| Maximum generated tokens | 160 |
| Frontend port | 3000 |
| Backend port | 8002 |
| Required API keys | 0 |
| Required cloud databases | 0 |
| Persistent storage engines | 0 |
| External LLM providers | 0 |
| Supported document extensions | 3 |

### Local model report

| Component | Model | Purpose |
|---|---|---|
| Embedding model | `sentence-transformers/all-MiniLM-L6-v2` | Convert documents and queries into vectors |
| Reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` | Reorder retrieved documents by relevance |
| Generation model | `TinyLlama/TinyLlama-1.1B-Chat-v1.0` | Generate the final answer |

### Verified runtime report

- Backend health endpoint: HTTP `200 OK`.
- Direct `POST /generate_answer`: HTTP `200 OK` with JSON containing `answer` and `sources`.
- Document upload endpoint: HTTP `200 OK` was verified during local testing.
- Frontend development server: available at `http://localhost:3000`.
- Backend development server: available at `http://localhost:8002`.
- Frontend lint: passed with `npm run lint`.
- Generation runs locally on CPU, so answer generation can take longer than document ingestion.

## Important Limitations

- Documents are stored only in memory. Restarting the backend removes all uploaded documents.
- The current implementation stores each submitted document as one vector; it does not split long documents into chunks.
- Local Llama generation is slower on CPU and uses more system memory than a hosted model.
- The answer is instructed to use retrieved context, but generated text should still be reviewed for accuracy.
- The current CORS policy allows all origins and should be restricted before production deployment.
- The old `next.config.mjs` rewrite remains in the project for compatibility, but the active frontend calls use `NEXT_PUBLIC_BACKEND_URL` directly.

## Troubleshooting

### Port already in use

Find the process using a port:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,8002
```

Stop a process only when you have confirmed its PID:

```powershell
Stop-Process -Id <PID> -Force
```

### Frontend reports a network error

1. Confirm the backend is running on port `8002`.
2. Open `http://localhost:8002/` and check for the local RAG health response.
3. Restart the Next.js development server after changing `NEXT_PUBLIC_BACKEND_URL`.
4. Check the browser console for the actual HTTP status and response body.

### Models fail to load

Confirm the Python environment has the packages in `backend/requirements.txt` and that the machine can access Hugging Face on the first run. The app falls back to a source-based response if the text-generation pipeline cannot initialize.

## Testing

Frontend lint:

```powershell
cd mini-rag-frontend
npm run lint
```

Model utility regression tests, when the backend environment is active:

```powershell
cd backend
python -m pytest test_model_utils.py
```

## Future Improvements

- Add SQLite or FAISS persistence so documents survive restarts.
- Split large documents into overlapping chunks before embedding.
- Add authentication and restrict CORS for deployment.
- Add streaming responses for long local generation requests.
- Add automated end-to-end tests for upload, retrieval, and answer generation.
- Add a production deployment configuration with separate frontend and backend environment variables.
