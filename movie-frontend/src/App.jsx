import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

// Point this at wherever your FastAPI server is running.
const API_BASE = "http://localhost:8000";

// Get a free key at https://www.themoviedb.org/settings/api
const TMDB_API_KEY = "de332f4d7fe72260649e5b770b5acd51";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

// Simple in-memory cache so we don't refetch the same poster twice per session.
const posterCache = new Map();

export default function MovieRecommender() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  // Detail modal state
  const [activeMovieId, setActiveMovieId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  // Debounced autocomplete search against /api/movies
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/movies?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch {
        // Silently ignore autocomplete failures; the main search will surface real errors.
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const fetchRecommendations = useCallback(async (title) => {
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    setRecommendations([]);
    setShowSuggestions(false);

    try {
      const res = await fetch(
        `${API_BASE}/api/recommend?movie=${encodeURIComponent(title)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Movie not found in the dataset.");
      }
      const data = await res.json();
      setSelectedMovie(data.movie);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchRecommendations(query);
  };

  const handleSuggestionClick = (title) => {
    setQuery(title);
    fetchRecommendations(title);
  };

  const openMovieDetails = (movieId) => {
    setActiveMovieId(movieId);
  };

  const closeMovieDetails = () => {
    setActiveMovieId(null);
    setMovieDetails(null);
    setDetailsError("");
  };

  // Fetch full details whenever a movie is selected for the modal
  useEffect(() => {
    if (!activeMovieId) return;

    if (!TMDB_API_KEY || TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
      setDetailsError("Add your TMDB API key to see movie details.");
      return;
    }

    let cancelled = false;
    setDetailsLoading(true);
    setDetailsError("");
    setMovieDetails(null);

    fetch(
      `https://api.themoviedb.org/3/movie/${activeMovieId}?api_key=${TMDB_API_KEY}`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setMovieDetails(data);
      })
      .catch(() => {
        if (!cancelled) setDetailsError("Couldn't load details for this movie.");
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMovieId]);

  return (
    <div className="app">
      <SprocketStrip />

      <div className="container">
        <header className="header">
          <p className="eyebrow">Now Screening</p>
          <h1 className="title">Reel Match</h1>
          <p className="subtitle">
            Tell us a film you love. We'll find what plays next.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-bar">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. The Dark Knight"
              className="search-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="search-button"
            >
              {loading ? "Finding…" : "Find Matches"}
            </button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((title) => (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(title)}
                    className="suggestion-button"
                  >
                    {title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {error && <div className="error-box">{error}</div>}

        {!loading && !error && recommendations.length === 0 && (
          <section className="empty-reel" aria-label="No recommendations yet">
            <div className="reel-photo" aria-hidden="true">
              <span className="reel-core" />
            </div>
            <p className="empty-reel-text">Search a movie to start matching.</p>
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="results">
            <p className="results-label">
              Because you watched{" "}
              <span className="highlight">{selectedMovie}</span>
            </p>

            <ol className="results-grid">
              {recommendations.map((rec, i) => (
                <li key={rec.movie_id} className="result-card">
                  <span className="result-rank">{i + 1}</span>
                  <button
                    type="button"
                    className="poster-button"
                    onClick={() => openMovieDetails(rec.movie_id)}
                    aria-label={`View details for ${rec.title}`}
                  >
                    <PosterImage movieId={rec.movie_id} title={rec.title} />
                  </button>
                  <span className="result-title">{rec.title}</span>
                  <span className="result-score">
                    {(rec.score * 100).toFixed(0)}% match
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {activeMovieId && (
        <MovieDetailsModal
          loading={detailsLoading}
          error={detailsError}
          details={movieDetails}
          onClose={closeMovieDetails}
        />
      )}
    </div>
  );
}

// Modal showing full movie details fetched from TMDB.
function MovieDetailsModal({ loading, error, details, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const backdropPath = details?.backdrop_path;
  const posterPath = details?.poster_path;
  const year = details?.release_date ? details.release_date.slice(0, 4) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {loading && <div className="modal-status">Loading details…</div>}

        {error && !loading && <div className="modal-status modal-error">{error}</div>}

        {details && !loading && !error && (
          <>
            {backdropPath && (
              <div
                className="modal-backdrop-image"
                style={{
                  backgroundImage: `url(https://image.tmdb.org/t/p/w780${backdropPath})`,
                }}
              />
            )}

            <div className="modal-body">
              {posterPath && (
                <img
                  src={`${TMDB_IMAGE_BASE}${posterPath}`}
                  alt={`${details.title} poster`}
                  className="modal-poster"
                />
              )}

              <div className="modal-info">
                <h2 className="modal-title">
                  {details.title}
                  {year && <span className="modal-year"> ({year})</span>}
                </h2>

                {details.tagline && (
                  <p className="modal-tagline">{details.tagline}</p>
                )}

                <div className="modal-meta">
                  {details.vote_average != null && (
                    <span className="modal-pill">
                      ★ {details.vote_average.toFixed(1)}
                    </span>
                  )}
                  {details.runtime ? (
                    <span className="modal-pill">{details.runtime} min</span>
                  ) : null}
                  {details.genres?.length > 0 && (
                    <span className="modal-pill">
                      {details.genres.map((g) => g.name).join(", ")}
                    </span>
                  )}
                </div>

                <p className="modal-overview">
                  {details.overview || "No overview available."}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Fetches and displays a movie's poster from TMDB by its movie_id.
// Falls back to a styled placeholder if no key is set, the request fails,
// or the movie has no poster on file.
function PosterImage({ movieId, title }) {
  const [posterUrl, setPosterUrl] = useState(
    posterCache.get(movieId) ?? null
  );
  const [failed, setFailed] = useState(posterCache.get(movieId) === null);

  useEffect(() => {
    if (posterCache.has(movieId)) return; // already cached (hit or known-miss)

    if (!TMDB_API_KEY || TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
      setFailed(true);
      return;
    }

    let cancelled = false;

    fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        if (data.poster_path) {
          const url = `${TMDB_IMAGE_BASE}${data.poster_path}`;
          posterCache.set(movieId, url);
          setPosterUrl(url);
        } else {
          posterCache.set(movieId, null);
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          posterCache.set(movieId, null);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  if (posterUrl) {
    return (
      <img
        src={posterUrl}
        alt={`${title} poster`}
        className="poster-image"
        loading="lazy"
      />
    );
  }

  // Placeholder: keeps layout stable while loading, and degrades gracefully
  // if there's no API key or no poster available.
  return (
    <div className="poster-placeholder" aria-hidden={failed ? "false" : "true"}>
      {failed ? (
        <span className="poster-placeholder-label">{title}</span>
      ) : null}
    </div>
  );
}

// Decorative film-sprocket strip used as the page's signature visual motif.
function SprocketStrip() {
  const holes = Array.from({ length: 28 });
  return (
    <div className="sprocket-strip">
      {holes.map((_, i) => (
        <span key={i} className="sprocket-hole" />
      ))}
    </div>
  );
}
