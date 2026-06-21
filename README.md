# Movie-Recomender
 ## 🎬 Movie Recommendation System

A Machine Learning based Movie Recommendation System that suggests movies similar to a selected movie using Content-Based Filtering and Cosine Similarity. The application provides movie recommendations along with posters fetched from the TMDB API.

## 🚀 Features

* Movie recommendations based on content similarity
* Interactive user interface
* Movie poster integration using TMDB API
* Fast recommendation generation
* Scalable architecture for future Hybrid Recommendation System integration

## 🛠️ Tech Stack

### Machine Learning

* Python
* Pandas
* NumPy
* Scikit-Learn
* Cosine Similarity
* CountVectorizer

### Backend

* FastAPI

### Frontend

* React.js
* Vite

### APIs

* TMDB API

## 📂 Project Structure

Movie-Recomender/

├── movie-frontend/

│   ├── src/

│   ├── public/

│   └── package.json

├── main.py

├── rec.py

├── movie_list.pkl

├── similarity.pkl

├── tmdb_5000_movies.csv

├── tmdb_5000_credits.csv

├── requirements.txt

└── README.md

## ⚙️ Installation

### Clone Repository

```bash
git clone <repository-url>
cd Movie-Recomender
```

### Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### Install Frontend Dependencies

```bash
cd movie-frontend
npm install
```

### Run Backend

```bash
uvicorn main:app --reload
```

### Run Frontend

```bash
cd movie-frontend
npm run dev
```

## 📊 Machine Learning Workflow

1. Data Collection
2. Data Cleaning
3. Feature Engineering
4. Vectorization using CountVectorizer
5. Similarity Matrix Generation
6. Recommendation Generation

## 🎯 Future Enhancements

* Hybrid Recommendation System
* Collaborative Filtering
* User Authentication
* User Ratings
* Watchlist Functionality
* Personalized Recommendations
* Cloud Deployment
* Recommendation Explanations

## 📸 Screenshots

Add screenshots of your application here.

## 👨‍💻 Author

Arpit Maurya

First Year Undergraduate (Information Technology)

Passionate about Machine Learning, Full Stack Development, and AI.

## ⭐ Support

If you found this project useful, consider giving it a star on GitHub.

