from qdrant_client import QdrantClient
from qdrant_client.http import models

# Connect to your Qdrant Cloud
client = QdrantClient(
    url="https://7794553c-496c-4037-91b1-b0c4a0f56f25.us-west-1-0.aws.cloud.qdrant.io:",
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.-wC9x_dlALxYVFHcczirpKrLrvMnjjaSIa8PCXIgVsw",  # full API key
)

# Create (or reset) the collection for embeddings
client.recreate_collection(
    collection_name="mini_rag_docs",
    vectors_config=models.VectorParams(
        size=1536,  # OpenAI embedding size
        distance=models.Distance.COSINE
    ),
)

print("✅ Qdrant collection 'mini_rag_docs' created successfully!")
