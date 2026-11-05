import unittest
from unittest.mock import patch

from local_rag import cosine_similarity, search_documents


class RetrievalTest(unittest.TestCase):
    def test_cosine_similarity_of_identical_vectors_is_one(self):
        self.assertAlmostEqual(cosine_similarity([1, 0], [1, 0]), 1.0)

    def test_cosine_similarity_of_zero_vector_is_zero(self):
        self.assertEqual(cosine_similarity([0, 0], [1, 0]), 0.0)

    def test_search_ranks_documents_by_similarity(self):
        documents = [
            {"id": "less-relevant", "text": "B", "embedding": [0, 1]},
            {"id": "most-relevant", "text": "A", "embedding": [1, 0]},
        ]
        with (
            patch("local_rag.VECTOR_STORE", documents),
            patch("local_rag.get_embedding", return_value=[1, 0]),
        ):
            results = search_documents("query", top_k=1)

        self.assertEqual([document["id"] for document, _ in results], ["most-relevant"])


if __name__ == "__main__":
    unittest.main()
