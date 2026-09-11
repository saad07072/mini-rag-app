# Mini RAG App

Mini RAG is a full-stack retrieval-augmented generation application for asking grounded questions over user-provided documents. It combines a FastAPI service, transformer-based semantic retrieval, cross-encoder reranking, and a Next.js interface deployed separately on Render and Vercel.

**Live demo:** [mini-rag-app-eta.vercel.app](https://mini-rag-app-eta.vercel.app)

**Backend health:** [mini-rag-app-1-dlst.onrender.com/health](https://mini-rag-app-1-dlst.onrender.com/health)

## Why This Project

This project demonstrates an end-to-end AI product workflow rather than a single model call:

- Users add text or upload `.txt`, `.pdf`, and `.docx` files.
- Documents are embedded into vectors and stored in an in-memory retrieval index.
- Queries use cosine similarity to retrieve relevant documents.
- A cross-encoder reranks the strongest candidates.
- Gemini generates an answer using only the reranked context.
- The browser frontend communicates with the deployed API through configurable CORS and environment variables.

## Implementation Snapshot

| Area | Current implementation |
| --- | --- |
| API surface | 6 FastAPI routes, including 2 health endpoints |
| Supported files | 3 formats: `.txt`, `.pdf`, `.docx` |
| Retrieval | `all-MiniLM-L6-v2` embeddings + cosine similarity |
| Reranking | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Default result count | Top 3 documents |
| Document IDs | UUIDs, with optional custom IDs through the API |
| Answer generation | Google Gemini through `google-genai` |
| Backend deployment | Render, Python 3.11.9, Uvicorn |
| Frontend deployment | Vercel, Next.js 15.5.25, React 19.1 |
| Frontend route | Static `/` route with approximately 3.2 kB page payload |

## Tech Stack

### Backend

- Python 3.10+
- FastAPI and Uvicorn
- Sentence Transformers and PyTorch
- NumPy for vector operations
- Google Gemini via `google-genai`
- `python-docx` and `PyPDF2` for document extraction
- `python-dotenv` for local configuration

### Frontend

- Next.js 15.5.25 App Router
- React 19.1
- Tailwind CSS 4 with the PostCSS plugin
- ESLint 9 and Next.js core web vitals rules
- Client-side document upload, drag-and-drop, query, answer, and source views

### Deployment

- Render web service for the FastAPI backend
- Vercel project rooted at `mini-rag-frontend`
- Render health check at `/health`
- CORS allowlist connecting the Vercel origin to the Render API

## Project Structure

```text
mini-rag-app/
├── backend/
│   ├── main.py              # FastAPI routes, CORS, file parsing, Gemini calls
│   ├── local_rag.py         # Embedding, vector search, and reranking pipeline
│   ├── model_utils.py       # Model configuration helpers
│   ├── test_model_utils.py  # Regression tests for model selection
│   ├── requirements.txt
│   └── Procfile
├── mini-rag-frontend/
│   ├── app/
│   │   ├── page.js          # Main client experience
│   │   ├── layout.js
│   │   └── globals.css
│   ├── package.json
│   ├── package-lock.json
│   └── next.config.mjs
├── render.yaml              # Render service and health-check configuration
├── requirements.txt
└── readme.md
```

## Configuration

### Backend

Create `backend/.env` for local development:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:3000
```

For the deployed Render service, set:

```env
CORS_ORIGINS=https://mini-rag-app-eta.vercel.app
```

Keep API keys and other secrets out of Git. `render.yaml` configures Python `3.11.9`, installs `backend/requirements.txt`, starts Uvicorn on Render's `$PORT`, and monitors `/health`.

### Frontend

Create `mini-rag-frontend/.env.local` for local development:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8002
```

For Vercel, set this environment variable for Production:

```env
NEXT_PUBLIC_BACKEND_URL=https://mini-rag-app-1-dlst.onrender.com
```

In Vercel project settings, set **Root Directory** to `mini-rag-frontend`. The project uses the default Next.js build output and runs `npm run build`.

## Run Locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

The API is available at `http://localhost:8002`. FastAPI documentation is available at `http://localhost:8002/docs`.

### Frontend

```powershell
cd mini-rag-frontend
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.

## API Overview

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Basic service status |
| `GET` | `/health` | Render health check |
| `POST` | `/add_document` | Embed and store text |
| `POST` | `/upload_document` | Extract, embed, and store a file |
| `POST` | `/query` | Return top-k retrieved documents |
| `POST` | `/generate_answer` | Retrieve, rerank, and generate a grounded answer |

Example request:

```json
{
  "text": "What is this document about?",
  "top_k": 3
}
```

The `/generate_answer` response contains an `answer` string and a `sources` array so the interface can show both the generated response and supporting document text.

## Retrieval Flow

1. The API extracts text from direct input or an uploaded file.
2. `all-MiniLM-L6-v2` creates an embedding for the document.
3. The document and embedding are added to the process-local vector store.
4. A query embedding is compared with stored vectors using cosine similarity.
5. Candidate text is reranked by `ms-marco-MiniLM-L-6-v2`.
6. Gemini receives the reranked context and is instructed not to use information outside it.

Embedding and reranker initialization use one-entry LRU caches, so each model is loaded once per backend process instead of once per request.

## Testing

Frontend production build and lint:

```powershell
cd mini-rag-frontend
npm run lint
npm run build
```

Backend regression tests:

```powershell
cd backend
python -m pytest test_model_utils.py
```

## Deployment

### Backend on Render

The root `render.yaml` defines the `mini-rag-backend` Python web service:

- Root directory: `backend`
- Build command: `pip install --upgrade pip && pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

### Frontend on Vercel

Import the repository into Vercel and configure:

- Root Directory: `mini-rag-frontend`
- Framework: Next.js
- Build command: `npm run build`
- Environment variable: `NEXT_PUBLIC_BACKEND_URL`

After changing `NEXT_PUBLIC_BACKEND_URL`, redeploy Vercel because public Next.js environment variables are included at build time. After changing `CORS_ORIGINS`, redeploy Render so the API uses the new allowlist.

## Current Limitations

- Documents live in process memory and are cleared when the Render instance restarts.
- Large documents are not yet split into overlapping chunks.
- The free Render instance may sleep after inactivity, causing a slower first request.
- Production hardening would add authentication, rate limiting, persistent storage, stricter upload limits, and automated end-to-end tests.

## Roadmap

- Add persistent vector storage with Qdrant or FAISS.
- Chunk large documents with configurable overlap.
- Add authentication and per-user document collections.
- Add streaming answer responses and citations with document metadata.
- Add CI for backend tests, frontend linting, and deployment smoke tests.