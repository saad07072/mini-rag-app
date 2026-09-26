import os
import logging
from fastapi import FastAPI, UploadFile, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Union, List
from docx import Document as DocxDocument
from PyPDF2 import PdfReader
from io import BytesIO
from dotenv import load_dotenv

from local_rag import add_document_to_store, get_gemini_client, search_documents

# Load environment variables from a .env file
load_dotenv()

logger = logging.getLogger(__name__)


app = FastAPI()

# ---- CORS ----
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

configured_gemini_model = os.getenv("GEMINI_MODEL") or "gemini-3.8-flash"
gemini_model = {
    "gemini-2.5-flash": "gemini-3.8-flash",
    "models/gemini-2.5-flash": "gemini-3.8-flash",
}.get(configured_gemini_model, configured_gemini_model)
if gemini_model != configured_gemini_model:
    logger.warning("Configured Gemini model %s is retired; using %s", configured_gemini_model, gemini_model)
gemini_client = get_gemini_client()


def extract_text_from_file(file: UploadFile) -> str:
    """Extracts text from different file types."""
    if not file.filename or "." not in file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File has no extension")

    content = ""
    file_type = file.filename.split(".")[-1].lower()

    try:
        if file_type == "txt":
            content = file.file.read().decode("utf-8")
        elif file_type == "pdf":
            reader = PdfReader(BytesIO(file.file.read()))
            for page in reader.pages:
                content += page.extract_text() or ""
        elif file_type == "docx":
            doc = DocxDocument(BytesIO(file.file.read()))
            for para in doc.paragraphs:
                content += para.text + "\n"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not read file: {e}")

    if not content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No extractable text found in file")

    return content


# ---- Pydantic Models ----
class Document(BaseModel):
    text: str
    id: Union[int, str, None] = None


class Query(BaseModel):
    text: str
    top_k: int = 3


class SearchResult(BaseModel):
    id: str
    text: str
    score: float


class LLMResponse(BaseModel):
    answer: str
    sources: List[str]


# ---- Endpoints ----
@app.post("/add_document")
async def add_document(doc: Document):
    try:
        doc_id = await run_in_threadpool(
            add_document_to_store,
            doc.text,
            document_id=str(doc.id) if doc.id is not None else None,
        )
        return {"status": "success", "id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"add_document failed: {e}")


@app.post("/upload_document")
async def upload_document(file: UploadFile):
    logger.info("Upload started: filename=%r", file.filename)
    try:
        content = await run_in_threadpool(extract_text_from_file, file)
        logger.info("File text extraction completed: filename=%r characters=%d", file.filename, len(content))
        logger.info("Embedding/storage started: filename=%r", file.filename)
        doc_id = await run_in_threadpool(add_document_to_store, content, filename=file.filename)
        logger.info("Embedding/storage completed: filename=%r document_id=%s", file.filename, doc_id)
        result = {"filename": file.filename, "id": doc_id, "status": "success"}
        logger.info("Upload completed: filename=%r document_id=%s", file.filename, doc_id)
        return result
    except HTTPException as exc:
        logger.warning("Upload failed: filename=%r HTTP %s: %s", file.filename, exc.status_code, exc.detail)
        raise
    except Exception as e:
        logger.exception("Upload failed: filename=%r", file.filename)
        raise HTTPException(status_code=500, detail=f"upload_document failed: {e}") from e


@app.post("/query")
async def query_documents(query: Query) -> List[SearchResult]:
    try:
        results = await run_in_threadpool(search_documents, query.text, top_k=query.top_k)
        return [
            SearchResult(id=str(doc["id"]), text=doc["text"], score=float(score))
            for doc, score in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"query failed: {e}")


@app.post("/generate_answer")
async def generate_answer(query: Query) -> LLMResponse:
    try:
        retrieved = await run_in_threadpool(
            search_documents,
            query.text,
            top_k=max(query.top_k * 2, 3),
        )
        if not retrieved:
            return LLMResponse(
                answer="No documents found yet. Upload a document first, then ask again.",
                sources=[],
            )

        ranked = [(doc["text"], score) for doc, score in retrieved[:query.top_k]]
        context = "\n\n".join(f"Document {i+1}: {text}" for i, (text, _) in enumerate(ranked))

        prompt = (
            "Use only the information in the context below to answer the user's question. "
            "If the answer is not in the context, say that it is not available in the documents.\n\n"
            f"Context:\n{context}\n\nQuestion: {query.text}\n\nAnswer:"
        )

        if gemini_client is not None:
            response = await run_in_threadpool(
                gemini_client.models.generate_content,
                model=gemini_model,
                contents=prompt,
            )
            answer = (response.text or "").strip()
            if not answer:
                answer = "I could not extract a clear answer from the provided documents."
        else:
            answer = "Answer generation is unavailable; these sources are relevant:\n\n" + "\n\n".join(text for text, _ in ranked)

        sources = [text for text, _ in ranked]
        return LLMResponse(answer=answer, sources=sources)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"generate_answer failed: {e}")


@app.get("/")
async def health_check():
    return {"status": "ok", "mode": "local-rag"}


@app.get("/health")
async def render_health_check():
    return {"status": "ok"}