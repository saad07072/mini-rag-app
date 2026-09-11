# Mini RAG App

A lightweight document Q&A application built with a FastAPI backend and a Next.js frontend. It lets you add text or upload files, retrieve the most relevant content, and generate grounded answers from the uploaded documents.

The current implementation uses local embedding + reranking in Python and a Gemini model for final answer generation.

## Features

- Add text documents directly through the UI or API
- Upload `.txt`, `.pdf`, and `.docx` files
- Store documents in memory for quick local retrieval
- Embed and search documents using sentence-transformers
- Rerank retrieved matches for better relevance
- Generate answers grounded in matching document content
- Use a modern Next.js interface for interacting with the backend

## Tech Stack

- Backend: FastAPI, Python
- Frontend: Next.js, React
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2`
- Reranking: `cross-encoder/ms-marco-MiniLM-L-6-v2`
- LLM: Google Gemini via `google-genai`
- Document parsing: `python-docx`, `PyPDF2`

## Project Structure

```text
mini-rag-app/
├── backend/
│   ├── main.py
│   ├── local_rag.py
│   ├── qdrant_setup.py
│   ├── requirements.txt
│   ├── Procfile
│   └── .env
├── mini-rag-frontend/
│   ├── app/
│   ├── public/
│   ├── package.json
│   ├── next.config.mjs
│   └── eslint.config.mjs
├── readme.md
├── render.yaml
├── requirements.txt
└── .venv/
```

## Requirements

- Python 3.10+
- Node.js 18+
- npm
- A Google Gemini API key

## Environment Setup

Create a `.env` file inside the `backend` folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
CORS_ORIGINS=http://localhost:3000
```

If you also want to use Qdrant Cloud, add:

```env
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key
```

## Backend Setup

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

On macOS/Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

The API will be available at:

```text
http://localhost:8002
```

## Frontend Setup

```bash
cd mini-rag-frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## API Overview

### Health

```http
GET /
```

Returns:

```json
{"status": "ok", "mode": "local-rag"}
```

### Add a document

```http
POST /add_document
```

Body:

```json
{
  "text": "This is a sample document",
  "id": "optional-custom-id"
}
```

### Upload a file

```http
POST /upload_document
```

Form-data field:

```text
file=<document file>
```

Supported formats:

- `.txt`
- `.pdf`
- `.docx`

### Query documents

```http
POST /query
```

Body:

```json
{
  "text": "What is this document about?",
  "top_k": 3
}
```

### Generate an answer

```http
POST /generate_answer
```

Body:

```json
{
  "text": "Answer based on the uploaded documents",
  "top_k": 3
}
```

Response:

```json
{
  "answer": "Generated answer text",
  "sources": ["Relevant source text 1", "Relevant source text 2"]
}
```

## How It Works

1. The backend reads text from a direct input or uploaded file.
2. It embeds the text with a sentence-transformer model.
3. It stores the document in an in-memory vector list.
4. A user query is embedded and compared with stored vectors.
5. The top matches are reranked for relevance.
6. The final answer is generated using Gemini with retrieved context.

## Deployment

This repository includes a Render configuration for deployment through [render.yaml](render.yaml). The backend is configured to run as a Python web service and uses the health endpoint for monitoring.

## Notes and Limitations

- Documents are stored in memory only; restarting the backend clears the data.
- Long documents are not chunked into sections yet.
- The RAG flow is designed for local demos and lightweight document search use cases.
- For production use, you should add persistent storage, chunking, stricter validation, and stronger security settings.

## Troubleshooting

### Backend fails to start

Check that:

- your Python environment is activated
- dependencies were installed
- the `.env` file contains a valid `GEMINI_API_KEY`

### Frontend cannot reach the backend

Ensure both services are running and that the frontend points to the correct backend URL. The default local backend URL is:

```text
http://localhost:8002
```

### Port already in use

On Windows PowerShell:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,8002
```

Then stop the process if needed:

```powershell
Stop-Process -Id <PID> -Force
```

## License

This project is intended for learning and local experimentation. Update this section if you want to add a formal license for distribution or production use.


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
