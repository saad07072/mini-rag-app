from __future__ import annotations

import uuid
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

import numpy as np

VECTOR_STORE: List[Dict[str, Any]] = []


@lru_cache(maxsize=1)
def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    from google import genai

    return genai.Client(api_key=api_key)


def get_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
    client = get_gemini_client()
    if client is None:
        raise RuntimeError("GEMINI_API_KEY is required to generate document embeddings")

    from google.genai import types

    chunks = [text[index:index + 6000] for index in range(0, len(text), 6000)]
    if not chunks:
        raise ValueError("Cannot generate an embedding for empty text")

    embeddings = []
    for index in range(0, len(chunks), 16):
        response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=chunks[index:index + 16],
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=768,
            ),
        )
        if not response.embeddings or any(item.values is None for item in response.embeddings):
            raise RuntimeError("Gemini returned no document embeddings")
        embeddings.extend(np.asarray(item.values, dtype=np.float32) for item in response.embeddings)

    vector = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(vector)
    if norm:
        vector /= norm
    return vector.tolist()


def cosine_similarity(vec_a, vec_b) -> float:
    a = np.asarray(vec_a, dtype=np.float32)
    b = np.asarray(vec_b, dtype=np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def add_document_to_store(text: str, filename: Optional[str] = None, document_id: Optional[str] = None) -> str:
    doc_id = str(uuid.uuid4()) if document_id is None else str(document_id)
    VECTOR_STORE.append({
        "id": doc_id,
        "text": text,
        "filename": filename,
        "embedding": get_embedding(text, task_type="RETRIEVAL_DOCUMENT"),
    })
    return doc_id


def search_documents(query_text: str, top_k: int = 3):
    if not VECTOR_STORE:
        return []
    query_vector = get_embedding(query_text, task_type="RETRIEVAL_QUERY")
    scored = []
    for doc in VECTOR_STORE:
        scored.append((doc, cosine_similarity(query_vector, doc["embedding"])))
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:top_k]
