# Mini RAG — Full Stack Application

A full-stack Retrieval-Augmented Generation (RAG) app. Upload a document (text, PDF, or DOCX), ask a question, and get an answer grounded only in that document, with the source passages shown alongside.

The project is a monorepo with a FastAPI backend and a Next.js frontend.

## Architecture

Everything runs locally — there are no external API calls and no API keys required.

```
+---------------+      +----------------+     +--------------------------+
|    User's     | ---> |    Next.js     | --> |        FastAPI           |
|   Browser     |      |   Frontend     |     |        Backend           |
|  (localhost   |      |  (localhost    |     |     (localhost:8002)     |
|     :3000)    |      |     :3000)     |     |                          |
+---------------+      +----------------+     |  1. Embed   (MiniLM)     |
                                               |  2. Store   (in-memory)  |
                                               |  3. Retrieve (cosine)    |
                                               |  4. Rerank  (CrossEnc.)  |
                                               |  5. Generate (TinyLlama) |
                                               +--------------------------+
```

- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2`, run locally.
- **Vector store**: a plain in-memory Python list with cosine similarity — no external vector DB. This means the document store resets every time the backend restarts.
- **Reranking**: `cross-encoder/ms-marco-MiniLM-L-6-v2`, run locally, to re-score the initial retrieval before it's used as context.
- **Generation**: `TinyLlama/TinyLlama-1.1B-Chat-v1.0`, run locally via Hugging Face `transformers`. No Groq, OpenAI, or other hosted LLM API is called.

## Features

- Upload documents via pasted text, PDF, or DOCX.
- Two-step retrieval: initial cosine-similarity search, then cross-encoder reranking.
- Answers are generated only from the retrieved context, with the source passages returned alongside the answer.
- Zero API keys, zero external services — everything needed to run this app ships with it.

## Setup & Quickstart

### Prerequisites

- Python 3.10+ and pip
- Node.js and npm

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

The API is available at `http://127.0.0.1:8002`. No `.env` file is required for local mode — see `.env.example`.

### Frontend

```bash
cd mini-rag-frontend
npm install
npm run dev
```

The app is available at `http://localhost:3000`. It talks to the backend at `http://localhost:8002` by default (see `NEXT_PUBLIC_BACKEND_URL` in `next.config.mjs` if you need to change the port).

## Known limitations

- **No persistence**: the vector store is an in-memory list, so all uploaded documents are lost when the backend restarts. Swapping in a real vector DB (e.g. Qdrant, FAISS-on-disk) is the natural next step.
- **Chunking**: documents are embedded whole rather than split into chunks — fine for short documents, weaker for long ones.
- **Generation quality**: TinyLlama-1.1B is small and fast enough to run on CPU for free, but noticeably weaker than a hosted model like Llama-3.3-70B. This was a deliberate cost/quality trade-off, not an oversight.
- **Unused dependencies**: `requirements.txt` still lists packages from an earlier Groq/Qdrant-based version (`qdrant-client`, `groq`, `langchain`, `cohere`, `openai`) that the current code no longer imports. These should be pruned.
