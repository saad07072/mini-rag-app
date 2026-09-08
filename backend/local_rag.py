from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

VECTOR_STORE: List[Dict[str, Any]] = []


def get_embedding(text: str):
    return embedding_model.encode(text).astype(np.float32).tolist()


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
        "embedding": get_embedding(text),
    })
    return doc_id


def search_documents(query_text: str, top_k: int = 3):
    if not VECTOR_STORE:
        return []
    query_vector = get_embedding(query_text)
    scored = []
    for doc in VECTOR_STORE:
        scored.append((doc, cosine_similarity(query_vector, doc["embedding"])))
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:top_k]


def rerank_documents(query_text: str, texts: List[str], top_k: int = 3):
    if not texts:
        return []
    score_pairs = reranker_model.predict([(query_text, text) for text in texts])
    return sorted(zip(texts, score_pairs), key=lambda x: x[1], reverse=True)[:top_k]
