import os
from fastapi import FastAPI, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Union, List
from docx import Document as DocxDocument
from PyPDF2 import PdfReader
from io import BytesIO
from dotenv import load_dotenv
from transformers import pipeline

from local_rag import add_document_to_store, search_documents, rerank_documents

# Load environment variables from a .env file
load_dotenv()

app = FastAPI()

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local Llama-based text generator. This avoids API keys while keeping the app's
# reasoning model closer to a modern open-source LLM.
try:
    generator = pipeline(
        "text-generation",
        model="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        device=-1,
        torch_dtype=None,
    )
except Exception:
    generator = None


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
        doc_id = add_document_to_store(doc.text, document_id=str(doc.id) if doc.id is not None else None)
        return {"status": "success", "id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"add_document failed: {e}")


@app.post("/upload_document")
async def upload_document(file: UploadFile):
    try:
        content = extract_text_from_file(file)
        doc_id = add_document_to_store(content, filename=file.filename)
        return {"filename": file.filename, "id": doc_id, "status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"upload_document failed: {e}")


@app.post("/query")
async def query_documents(query: Query) -> List[SearchResult]:
    try:
        results = search_documents(query.text, top_k=query.top_k)
        return [
            SearchResult(id=str(doc["id"]), text=doc["text"], score=float(score))
            for doc, score in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"query failed: {e}")


@app.post("/generate_answer")
async def generate_answer(query: Query) -> LLMResponse:
    try:
        retrieved = search_documents(query.text, top_k=max(query.top_k * 2, 3))
        if not retrieved:
            return LLMResponse(
                answer="No documents found yet. Upload a document first, then ask again.",
                sources=[],
            )

        texts = [doc["text"] for doc, _ in retrieved]
        reranked = rerank_documents(query.text, texts, top_k=query.top_k)
        context = "\n\n".join(f"Document {i+1}: {text}" for i, (text, _) in enumerate(reranked))

        prompt = (
            "Use only the information in the context below to answer the user's question. "
            "If the answer is not in the context, say that it is not available in the documents.\n\n"
            f"Context:\n{context}\n\nQuestion: {query.text}\n\nAnswer:"
        )

        if generator is not None:
            generated = generator(
                prompt,
                max_new_tokens=160,
                do_sample=True,
                temperature=0.2,
                top_p=0.9,
                repetition_penalty=1.1,
            )
            answer = generated[0]["generated_text"].replace(prompt, "").strip()
            if not answer:
                answer = "I could not extract a clear answer from the provided documents."
        else:
            answer = "I could not generate a final answer locally, but these sources are relevant:\n\n" + "\n\n".join(reranked_text for reranked_text, _ in reranked)

        sources = [text for text, _ in reranked]
        return LLMResponse(answer=answer, sources=sources)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"generate_answer failed: {e}")


@app.get("/")
async def health_check():
    return {"status": "ok", "mode": "local-rag"}