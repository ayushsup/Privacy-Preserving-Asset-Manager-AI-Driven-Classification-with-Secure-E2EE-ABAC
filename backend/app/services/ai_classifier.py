import os
# Force transformers to ignore TensorFlow and use PyTorch
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"

from functools import lru_cache
from transformers import pipeline
LABELS = ["Financial", "Healthcare", "Personal", "General Corporate"]
SENSITIVITY_MAP = {
    "Financial": "High",
    "Healthcare": "High",
    "Personal": "Medium",
    "General Corporate": "Low",
}

@lru_cache
def get_classifier():
    return pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

def categorize_text(text: str):
    if not text or not text.strip():
        return {"category": "General Corporate", "sensitivity": "Low"}

    classifier = get_classifier()
    result = classifier(text[:1000], LABELS)
    top_label = result["labels"][0]
    return {
        "category": top_label,
        "sensitivity": SENSITIVITY_MAP.get(top_label, "Medium")
    }