# 🎬 CineVault — Movie Search App

A cinematic dark-themed movie search app built with pure HTML, CSS, and JavaScript.
Search thousands of movies, save your favourites, and view detailed info — all in a
stunning dark UI with a film-grain overlay.

🌐 **Live Demo:** https://sarathy7-tech.github.io/cinevault-movie-app

---

## 📸 Preview

> Dark cinematic theme with gold accents, film-grain overlay, and smooth animations.

---

## ✨ Features

- 🔍 **Search Movies** — Search any movie by title using the TMDB API
- ❤️ **Save Favourites** — Add/remove favourites, saved permanently in localStorage
- 🎬 **Movie Detail Modal** — Click any movie to see rating, runtime, genres, and overview
- 🕐 **Search History** — Your last 6 searches appear as clickable chips
- ⚡ **API Cache** — Results are cached so the same search doesn't hit the network twice
- 📱 **Responsive Design** — Works on mobile, tablet, and desktop
- 🎞️ **Film Grain Overlay** — Cinematic texture effect using SVG filter
- ✨ **Staggered Animations** — Cards animate in with a smooth staggered fade-up effect

---

## 🗂️ Project Structure
```
cinevault-movie-app/
│
├── index.html       → Structure and layout of the app
├── style.css        → All styling, theme, animations
└── app.js           → All logic, API calls, Promises, Closures
```

---

## 📄 File Breakdown

### 1. `index.html`
The skeleton of the entire app. Contains:

- **Header** with logo and navigation buttons (Search / Favourites tabs)
- **Search Tab** with hero section, search bar input, and search history chips area
- **Favourites Tab** with movie grid and empty state message
- **Modal Overlay** for displaying full movie details
- Links to `style.css` and `app.js`

Key HTML elements:
| Element ID | Purpose |
|---|---|
| `#search-input` | The text input where user types movie name |
| `#search-btn` | Button that triggers the search |
| `#movie-grid` | Grid where search result cards are displayed |
| `#fav-grid` | Grid where favourite movie cards are displayed |
| `#modal-overlay` | The dark overlay behind the detail popup |
| `#search-history` | Container for recent search chips |
| `#fav-count` | Badge showing number of saved favourites |

---

### 2. `style.css`
All the visual design of the app. Key sections:

**CSS Variables (Theme)**
```css
:root {
  --bg:       #0a0a0f;   /* main background — deep dark */
  --surface:  #1a1a26;   /* card/component background */
  --gold:     #c9a84c;   /* primary accent color */
  --red:      #e05252;   /* favourite heart color */
  --text:     #e8e4dc;   /* main text color */
  --muted:    #7a7a90;   /* secondary/placeholder text */
}
```

**Key Styling Highlights:**
- **Film Grain** — Created using an inline SVG `feTurbulence` filter as a fixed overlay
- **Hero Section** — Radial gradient background giving a cinematic glow effect
- **Cards** — Hover effect lifts the card with `translateY(-5px)` and glows gold border
- **Animations** — `@keyframes fadeUp` for card entrance, `@keyframes spin` for loader
- **Modal** — Slides up with `@keyframes slideUp`, background blurs with `backdrop-filter`
- **Fonts** — Playfair Display (serif, for titles) + DM Sans (clean, for body text)
- **Responsive** — Media query at 640px adjusts grid columns and modal layout

---

### 3. `app.js`
The brain of the app. Built around two core JavaScript concepts:

---

## 🧠 JavaScript Concepts Used

### ✅ Closures — 3 used in this project

A **closure** is when a function remembers variables from its outer scope even after
that outer function has finished running. In this project, closures are used to create
**private state** — data that can't be accidentally changed from outside.

---

**Closure 1 — `createSearchHistory()`**
```javascript
function createSearchHistory() {
  const history = [];  // ← private, no one outside can touch this directly

  return {
    add(query) { ... },   // adds to history
    get()      { ... },   // returns a copy
    clear()    { ... }    // empties it
  };
}
const searchHistory = createSearchHistory();
```
The `history` array is private. Only the returned methods can access it.
This prevents any other code from accidentally corrupting the search history.

---

**Closure 2 — `createFavourites()`**
```javascript
function createFavourites() {
  const favs = new Map();  // ← private Map, hidden inside the closure

  return {
    add(movie)   { ... },
    remove(id)   { ... },
    has(id)      { ... },
    toggle(movie){ ... },
    getAll()     { ... },
    count()      { ... }
  };
}
const favourites = createFavourites();
```
The `favs` Map stores all saved movies privately. It also internally handles
saving to and loading from `localStorage` — all hidden from the outside world.

---

**Closure 3 — `createCache(ttlMs)`**
```javascript
function createCache(ttlMs = 5 * 60 * 1000) {  // ← ttlMs closes over the function
  const store = new Map();  // ← private cache store

  return {
    get(key) { ... },   // returns cached data if not expired
    set(key, data) { ... },
    has(key) { ... }
  };
}
const cache = createCache();
```
Stores API results so the same search doesn't make a new network request.
Each entry expires after 5 minutes using a timestamp check.

---

### ✅ Promises — 3 patterns used in this project

A **Promise** is an object that represents a value that will be available in the
future (like data coming back from an API). Instead of waiting and freezing the
page, Promises let the app stay responsive.

---

**Pattern 1 — `fetchJSON()` with `.then()` chaining**
```javascript
function fetchJSON(url) {
  if (cache.has(url)) {
    return Promise.resolve(cache.get(url));  // instant resolve from cache
  }
  return fetch(url)              // fetch() returns a Promise
    .then(res => res.json())     // .json() also returns a Promise
    .then(data => {
      cache.set(url, data);      // save to cache
      return data;
    });
}
```
`fetch()` is built into the browser and returns a Promise.
`.then()` runs when the Promise resolves (data arrives).

---

**Pattern 2 — `doSearch()` with `.then().catch()`**
```javascript
function doSearch(query) {
  showSpinner(movieGrid);

  searchMovies(query)         // returns a Promise
    .then(movies => {
      renderMovies(movies, movieGrid);   // runs when data arrives
    })
    .catch(err => {
      movieGrid.innerHTML = `Error: ${err.message}`;  // runs if something fails
    });
}
```
`.catch()` handles any errors — network failure, wrong API key, etc.

---

**Pattern 3 — `openModal()` with async/await**
```javascript
async function openModal(movie) {
  const details = await getMovieDetails(movie.id);  // waits for the Promise
  // then runs the rest of the code with the result
}
```
`async/await` is just cleaner syntax for Promises. `await` pauses the function
until the Promise resolves, making the code easier to read.

---

## 🔑 API Used

**The Movie Database (TMDB) API** — free movie data API

| Endpoint | Used For |
|---|---|
| `/search/movie` | Searching movies by title |
| `/movie/{id}` | Getting full details of one movie |

To use your own API key:
1. Sign up free at **themoviedb.org**
2. Go to Settings → API → Request an API key
3. Replace the `API_KEY` value at the top of `app.js`

---

## 🛠️ Tech Stack

| Technology | Used For |
|---|---|
| HTML5 | Page structure and layout |
| CSS3 | Styling, animations, responsive design |
| Vanilla JavaScript | All app logic, no frameworks |
| TMDB REST API | Movie data source |
| localStorage | Saving favourites between sessions |
| Google Fonts | Playfair Display + DM Sans |

---

## 🚀 How to Run Locally

1. Download or clone the repository:
```bash
git clone https://github.com/sarathy7-tech/cinevault-movie-app.git
```
2. Open the `cinevault-movie-app` folder
3. Double-click `index.html` to open it in your browser
4. No server needed — it runs directly in the browser!

---

## 📚 What I Learned

- How to use the **Fetch API** to get data from a REST API
- How **Promises** work with `.then()`, `.catch()`, and `async/await`
- How **Closures** create private state and encapsulate logic
- How to build a **cache system** to avoid unnecessary API calls
- How to use **localStorage** to persist data between sessions
- How to build a **responsive dark UI** using CSS variables and animations
- How to use the **TMDB API** to fetch real movie data

---

## 👨‍💻 Author

**Sarathy K**
- GitHub: [@sarathy7-tech](https://github.com/sarathy7-tech)

---

## 📝 License

This project is open source and free to use for learning purposes.
