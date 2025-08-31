# Mini RAG Full Stack Application

This is a full-stack Retrieval-Augmented Generation (RAG) application that allows you to upload documents and get answers to questions based on their content. The project is structured as a monorepo, containing a FastAPI backend and a Next.js frontend.

## Features
- **Document Ingestion**: Upload documents via text, PDF, and DOCX files.
- **Backend API**: A FastAPI backend that handles all core logic.
- **Frontend UI**: A Next.js frontend that provides a clean user interface.
- **Vector Search**: Uses a local Sentence Transformer model for embeddings and Qdrant for vector storage.
- **Two-Step Retrieval**: Implements a retriever and a reranker to find the most relevant document chunks.
- **Grounded Answers**: An LLM is used to generate answers based on the retrieved documents, with inline citations.

## Architecture
The application follows a standard client-server architecture with a two-step retrieval pipeline for the RAG system.

```
+---------------+      +----------------+     +--------------+     +-------------+
|    User's     | ---> |    Next.js     | <-> |   FastAPI    | <-> |    Groq     |
|   Browser     |      |   Frontend     |     |   Backend    |     |    LLM      |
|               |      +----------------+     |              |     +-------------+
|               |                             |              |
|               |                             |              |     +-------------+
|               |                             | (Reranker)   | <-> |   Qdrant    |
|               |                             | (Embedder)   |     |   Database  |
|               |                             +--------------+     +-------------+
```

## Setup & Quickstart

To run this project, you'll need to set up both the backend and frontend.

### Prerequisites
- Python 3.10+ and pip
- Node.js and npm

### Backend Setup
Navigate to the backend directory:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv venv
.env\Scriptsctivate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

> (Note: You can create a requirements.txt file by running `pip freeze > requirements.txt` after installing the required packages.)

Configure environment variables:  
Create a file named `.env` in the backend directory with your API keys.

```
QDRANT_URL="<your_qdrant_url>"
QDRANT_API_KEY="<your_qdrant_api_key>"
GROQ_API_KEY="<your_groq_api_key>"
```

Run the backend server:

```bash
uvicorn main:app --reload
```

The API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000).

### Frontend Setup
In a new terminal window, navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## Remarks
- **Trade-offs**: To meet the "free of cost" requirement, this project uses local open-source models for embeddings (`all-MiniLM-L6-v2`) and reranking (`cross-encoder/ms-marco-MiniLM-L-6-v2`) instead of paid API-based services. While this keeps costs at zero, it can be less performant than a powerful paid model.
- **Chunking Strategy**: The current chunking strategy is very basic. In a production setting, a more sophisticated chunking algorithm (e.g., splitting text into paragraphs or by sentence) would improve retrieval accuracy.
- **Deployment**: For deployment, you would need to use a service that supports a monorepo setup, such as Vercel for the frontend and Render for the backend, with specific build and root directory configurations.
