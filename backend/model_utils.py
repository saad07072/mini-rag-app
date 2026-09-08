import os

LEGACY_GROQ_MODELS = {
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "llama-3.3-8b",
}

FALLBACK_GROQ_MODEL = "llama-3.3-70b-versatile"


def resolve_groq_model(model_name: str | None) -> str:
    """Return a model supported by Groq while keeping user-provided valid values."""
    if model_name and model_name.strip():
        cleaned = model_name.strip()
        if cleaned not in LEGACY_GROQ_MODELS:
            return cleaned

    env_value = os.getenv("GROQ_MODEL")
    if env_value and env_value.strip() and env_value.strip() not in LEGACY_GROQ_MODELS:
        return env_value.strip()

    return FALLBACK_GROQ_MODEL
