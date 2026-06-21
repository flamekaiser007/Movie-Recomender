"""
Builds the movie recommendation model and saves it to disk as:
  - movie_list.pkl     (DataFrame: movie_id, title, tags)
  - vectorizer.pkl      (fitted CountVectorizer)
  - nn_index.pkl        (fitted NearestNeighbors index)

Run this ONCE (or whenever your source CSVs change) before starting the API.
Requires tmdb_5000_movies.csv and tmdb_5000_credits.csv in the same folder.

WHY THIS VERSION IS DIFFERENT FROM A PLAIN cosine_similarity(vectors) MATRIX:
A full pairwise similarity matrix is O(n^2) in time and memory. At 5,000 movies
that's ~25 million cells (fine). At 100,000+ movies it becomes impossible to
hold in memory. NearestNeighbors instead builds a queryable index once, then
finds the top-k closest items per movie in milliseconds, without ever
materializing the full n x n matrix. This lets the same script scale from a
few thousand rows to a very large dataset later (e.g. a Kaggle daily-updated
dataset) without changing the core logic below — only the loading/cleaning
step above it would need to change to match a different CSV schema.
"""

import pandas as pd
import ast
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.neighbors import NearestNeighbors
import pickle

# ---------------------------------------------------------------------------
# 1. Load + clean data
#    (This section is the only part that's tied to the TMDB 5000 CSV schema.
#    Swapping in a different/larger dataset later means rewriting this
#    section to produce the same end result: a DataFrame with movie_id,
#    title, and tags columns. Everything below stays the same.)
# ---------------------------------------------------------------------------

movies = pd.read_csv("tmdb_5000_movies.csv")
credits = pd.read_csv("tmdb_5000_credits.csv")

movies = movies.merge(credits, on='title')

movies = movies[['movie_id', 'title', 'overview', 'genres',
                  'keywords', 'cast', 'crew']]

movies.dropna(inplace=True)


def convert(text):
    return [i['name'] for i in ast.literal_eval(text)]


movies['genres'] = movies['genres'].apply(convert)
movies['keywords'] = movies['keywords'].apply(convert)


def convert_cast(text):
    L = []
    for counter, i in enumerate(ast.literal_eval(text)):
        if counter >= 3:
            break
        L.append(i['name'])
    return L


movies['cast'] = movies['cast'].apply(convert_cast)


def fetch_director(text):
    return [i['name'] for i in ast.literal_eval(text) if i['job'] == 'Director']


movies['crew'] = movies['crew'].apply(fetch_director)

movies['overview'] = movies['overview'].apply(lambda x: x.split())


def collapse(L):
    return [i.replace(" ", "") for i in L]


movies['cast'] = movies['cast'].apply(collapse)
movies['crew'] = movies['crew'].apply(collapse)
movies['genres'] = movies['genres'].apply(collapse)
movies['keywords'] = movies['keywords'].apply(collapse)

movies['tags'] = (
    movies['overview']
    + movies['genres']
    + movies['keywords']
    + movies['cast']
    + movies['crew']
)

new_df = movies[['movie_id', 'title', 'tags']].copy()
new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x).lower())
new_df.reset_index(drop=True, inplace=True)

# ---------------------------------------------------------------------------
# 2. Vectorize + build a queryable nearest-neighbors index
#    (This section is dataset-size-agnostic — it works the same whether
#    new_df has 5,000 rows or 500,000.)
# ---------------------------------------------------------------------------

cv = CountVectorizer(max_features=5000, stop_words='english')

# Keep the sparse matrix — don't call .toarray(). NearestNeighbors accepts
# sparse input directly and it's far more memory-efficient at scale.
vectors = cv.fit_transform(new_df['tags'])

# n_neighbors=21 so we can return the top 20 matches per movie at query time
# (the 1st neighbor is always the movie itself, so we ask for one extra).
n_neighbors = min(21, len(new_df))
nn_index = NearestNeighbors(n_neighbors=n_neighbors, metric='cosine', algorithm='brute')
nn_index.fit(vectors)

# ---------------------------------------------------------------------------
# 3. Save artifacts
# ---------------------------------------------------------------------------

pickle.dump(new_df, open('movie_list.pkl', 'wb'))
pickle.dump(cv, open('vectorizer.pkl', 'wb'))
pickle.dump(nn_index, open('nn_index.pkl', 'wb'))

print(f"Done. {len(new_df)} movies processed.")
print("Saved movie_list.pkl, vectorizer.pkl, nn_index.pkl")