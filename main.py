"""
FastAPI backend for the movie recommender.

Run with:
    uvicorn main:app --reload

Requires movie_list.pkl and similarity.pkl in the same folder
(generate them by running train_model.py first).
"""

import pickle
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Movie Recommender API")

# Allow the frontend (served from anywhere, e.g. file:// or a dev server) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Load model artifacts once at startup ----
try:
    new_df: pd.DataFrame = pickle.load(open(BASE_DIR / "movie_list.pkl", "rb"))
    similarity = pickle.load(open(BASE_DIR / "similarity.pkl", "rb"))
except FileNotFoundError as e:
    raise RuntimeError(
        "Model files not found. Run train_model.py first to generate "
        "movie_list.pkl and similarity.pkl."
    ) from e

# Lowercase lookup index for fast, case-insensitive title matching
title_lookup = {t.lower(): idx for idx, t in zip(new_df.index, new_df["title"])}


def get_recommendations(movie_title: str, top_n: int = 5):
    key = movie_title.strip().lower()
    if key not in title_lookup:
        return None

    idx = title_lookup[key]
    distances = similarity[idx]

    ranked = sorted(
        list(enumerate(distances)),
        reverse=True,
        key=lambda x: x[1],
    )[1: top_n + 1]

    return [
        {"movie_id": int(new_df.iloc[i].movie_id), "title": new_df.iloc[i].title, "score": float(score)}
        for i, score in ranked
    ]


@app.get("/api/health")
def health():
    return {"status": "ok", "movies_loaded": len(new_df)}


@app.get("/api/movies")
def list_movies(q: str = Query("", description="Optional search prefix")):
    """Used to power an autocomplete/search box on the frontend."""
    titles = new_df["title"].tolist()
    if q:
        q_lower = q.lower()
        titles = [t for t in titles if q_lower in t.lower()]
    return {"results": titles[:20]}


@app.get("/api/recommend")
def recommend(movie: str = Query(..., description="Exact or close movie title")):
    results = get_recommendations(movie)
    if results is None:
        raise HTTPException(status_code=404, detail=f"Movie '{movie}' not found in dataset.")
    return {"movie": movie, "recommendations": results}