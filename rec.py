"""
Builds the movie recommendation model and saves it to disk as:
  - movie_list.pkl
  - similarity.pkl

Run this ONCE (or whenever your source CSVs change) before starting the API.
Requires tmdb_5000_movies.csv and tmdb_5000_credits.csv in the same folder.
"""

import pandas as pd
import ast
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle

# Load datasets
movies = pd.read_csv("tmdb_5000_movies.csv")
credits = pd.read_csv("tmdb_5000_credits.csv")

# Merge datasets
movies = movies.merge(credits, on='title')

# Select useful columns
movies = movies[['movie_id', 'title', 'overview', 'genres',
                  'keywords', 'cast', 'crew']]

# Remove null values
movies.dropna(inplace=True)


# Convert genres and keywords
def convert(text):
    L = []
    for i in ast.literal_eval(text):
        L.append(i['name'])
    return L


movies['genres'] = movies['genres'].apply(convert)
movies['keywords'] = movies['keywords'].apply(convert)


# Get top 3 cast members
def convert_cast(text):
    L = []
    counter = 0
    for i in ast.literal_eval(text):
        if counter < 3:
            L.append(i['name'])
            counter += 1
        else:
            break
    return L


movies['cast'] = movies['cast'].apply(convert_cast)


# Get director
def fetch_director(text):
    L = []
    for i in ast.literal_eval(text):
        if i['job'] == 'Director':
            L.append(i['name'])
    return L


movies['crew'] = movies['crew'].apply(fetch_director)

# Split overview into words
movies['overview'] = movies['overview'].apply(lambda x: x.split())


# Remove spaces so "Sam Worthington" -> "SamWorthington" (keeps multi-word names as one token)
def collapse(L):
    return [i.replace(" ", "") for i in L]


movies['cast'] = movies['cast'].apply(collapse)
movies['crew'] = movies['crew'].apply(collapse)
movies['genres'] = movies['genres'].apply(collapse)
movies['keywords'] = movies['keywords'].apply(collapse)

# Create tags column
movies['tags'] = (
    movies['overview']
    + movies['genres']
    + movies['keywords']
    + movies['cast']
    + movies['crew']
)

# New dataframe
new_df = movies[['movie_id', 'title', 'tags']].copy()

# Convert list to string
new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x))
new_df['tags'] = new_df['tags'].apply(lambda x: x.lower())

# Vectorization
cv = CountVectorizer(max_features=5000, stop_words='english')
vectors = cv.fit_transform(new_df['tags']).toarray()

# Similarity matrix
similarity = cosine_similarity(vectors)

# Reset index so positions line up cleanly with the similarity matrix
new_df.reset_index(drop=True, inplace=True)

# Save AFTER everything is built
pickle.dump(new_df, open('movie_list.pkl', 'wb'))
pickle.dump(similarity, open('similarity.pkl', 'wb'))

print(f"Done. {len(new_df)} movies processed.")
print("Saved movie_list.pkl and similarity.pkl")