import os

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models

load_dotenv()

# Connect to your Qdrant Cloud
client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

# Create (or reset) the collection for embeddings
client.recreate_collection(
    collection_name="documents",
    vectors_config=models.VectorParams(
        size=384,
        distance=models.Distance.COSINE
    ),
)

print("Qdrant collection 'documents' created successfully!")
