import os
import unittest

from model_utils import resolve_groq_model


class ResolveGroqModelTest(unittest.TestCase):
    def test_legacy_default_falls_back_to_supported_model(self):
        self.assertEqual(resolve_groq_model("llama-3.1-8b-instant"), "llama-3.3-70b-versatile")

    def test_supported_model_is_preserved(self):
        self.assertEqual(resolve_groq_model("llama-3.3-70b-versatile"), "llama-3.3-70b-versatile")

    def test_missing_env_uses_supported_default(self):
        original = os.environ.get("GROQ_MODEL")
        os.environ.pop("GROQ_MODEL", None)
        try:
            self.assertEqual(resolve_groq_model(None), "llama-3.3-70b-versatile")
        finally:
            if original is not None:
                os.environ["GROQ_MODEL"] = original


if __name__ == "__main__":
    unittest.main()
