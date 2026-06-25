# 🎬 CineVault — Movie Search App

A cinematic, dark-themed movie search app built with pure **HTML, CSS, and JavaScript** — no frameworks, no build tools. Search thousands of movies, save your favourites, and explore full details, all wrapped in a dark UI with a film-grain overlay.

🌐 **Live Demo:** [https://sarathy7-tech.github.io/cinevault-movie-app](https://sarathy7-tech.github.io/cinevault-movie-app)

---

## 📸 Preview

```md
![Demo](demo.png)
```

---

## ✨ Features

- 🔍 **Movie Search** — search any title using the TMDB API
- ❤️ **Favourites** — add/remove movies, saved permanently in `localStorage`
- 🎬 **Detail Modal** — click a movie to see rating, runtime, genres, and overview
- 🕐 **Search History** — last 6 searches shown as clickable chips
- ⚡ **API Caching** — repeated searches don't hit the network twice
- 📱 **Fully Responsive** — works on mobile, tablet, and desktop
- 🎞️ **Film-Grain Overlay** — cinematic texture using an inline SVG filter
- ✨ **Staggered Animations** — smooth fade-up entrance for result cards

---

## 🗂️ Project Structure

```
cinevault-movie-app/
├── index.html   → page structure & layout
├── style.css    → theme, animations, responsive design
└── app.js       → app logic — API calls, Promises, Closures
```

---

## 📄 File Breakdown

### 1. `index.html`
The skeleton of the app. Contains:
- **Header** with logo and tab navigation (Search / Favourites)
- **Search Tab** — hero section, search bar, search-history chip area
- **Favourites Tab** — saved movies grid + empty state
- **Modal Overlay** — for full movie detail popups

| Element ID | Purpose |
|---|---|
| `#search-input` | Text input for the movie title |
| `#search-btn` | Triggers the search |
| `#movie-grid` | Grid where search results render |
| `#fav-grid` | Grid where favourites render |
| `#modal-overlay` | Dark backdrop behind the detail popup |
| `#search-history` | Container for recent search chips |
| `#fav-count` | Badge showing number of saved favourites |

### 2. `style.css`
All visual design, built on CSS variables for an easy-to-tweak theme:

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

- **Film grain** — an inline SVG `feTurbulence` filter laid over the whole page as a fixed overlay
- **Cards** — lift on hover (`translateY(-5px)`) with a gold border glow
- **Animations** — `@keyframes fadeUp` for card entry, `@keyframes spin` for the loader, `@keyframes slideUp` for the modal
- **Responsive** — a single media query at `640px` adjusts grid columns and stacks the modal layout

### 3. `app.js`
The brain of the app — covered in detail below, since this is where the actual engineering happens.

---

## 🧠 Core JavaScript Concepts (the critical code)

### Closures — used for private state, no global variables

A **closure** lets an inner function "remember" variables from the function that created it, even after that outer function has finished running. Here, closures replace what would otherwise be loose global variables — keeping state private and safe from accidental edits elsewhere in the code.

**1. `createSearchHistory()` — private search log**
```js
function createSearchHistory() {
    const history = []; // ← private, lives only inside this closure

    return {
        add(query) {
            const q = query.trim();
            if (!q || history.includes(q)) return;
            history.unshift(q);          // newest search goes first
            if (history.length > 6) history.pop(); // cap at 6 entries
        },
        get()   { return [...history]; }, // returns a copy, not the original array
        clear() { history.length = 0; }
    };
}
const searchHistory = createSearchHistory();
```
No code outside this function can ever touch `history` directly — only `add()`, `get()`, and `clear()` can. That's the core benefit of a closure: **encapsulation without needing a class.**

**2. `createFavourites()` — private Map + localStorage sync**
```js
function createFavourites() {
    const favs = new Map(); // ← private state

    const saveToStorage = () => {
        localStorage.setItem('cinevault_favs', JSON.stringify([...favs.values()]));
    };

    return {
        add(movie)   { favs.set(movie.id, movie); saveToStorage(); },
        remove(id)   { favs.delete(id); saveToStorage(); },
        has(id)      { return favs.has(id); },
        toggle(movie){ this.has(movie.id) ? this.remove(movie.id) : this.add(movie); },
        getAll()     { return [...favs.values()]; },
        count()      { return favs.size; }
    };
}
const favourites = createFavourites();
```
`favs` is a private `Map` — every favourite lives only inside this closure. `saveToStorage` is also private; nothing outside can call it directly, which prevents the favourites list and `localStorage` from ever drifting out of sync.

**3. `createCache(ttlMs)` — API response cache with expiry**
```js
function createCache(ttlMs = 5 * 60 * 1000) { // 5 minutes default
    const store = new Map();

    return {
        get(key) {
            const entry = store.get(key);
            if (!entry) return null;
            if (Date.now() - entry.ts > ttlMs) { store.delete(key); return null; } // expired
            return entry.data;
        },
        set(key, data) { store.set(key, { data, ts: Date.now() }); },
        has(key)       { return !!this.get(key); }
    };
}
const cache = createCache();
```
`ttlMs` itself is captured by the closure — each cache instance can have its own expiry time. This is why a repeated search for "batman" within 5 minutes returns instantly with zero network calls.

---

### Promises — three real-world async patterns

A **Promise** represents a value that isn't available yet but will be (like a network response). Without Promises, the page would have to freeze and wait for the API — instead, the UI stays responsive while data loads in the background.

**1. `.then()` chaining — `fetchJSON()`**
```js
function fetchJSON(url) {
    if (cache.has(url)) return Promise.resolve(cache.get(url)); // instant, no network

    return fetch(url)                 // fetch() returns a Promise
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();        // .json() also returns a Promise
        })
        .then(data => {
            cache.set(url, data);     // save before returning
            return data;
        });
}
```
Each `.then()` only runs once the previous Promise resolves. This chain is what actually talks to TMDB and feeds the cache.

**2. `.then().catch()` — `doSearch()`**
```js
function doSearch(query) {
    showSpinner(movieGrid);
    searchMovies(query)
        .then(movies => renderMovies(movies, movieGrid))   // success path
        .catch(err => showFetchError(movieGrid, err.message)); // failure path
}
```
`.catch()` is what shows a friendly error message instead of leaving the page silently broken if the network fails or the API key is wrong.

**3. `async/await` — `openModal()`**
```js
async function openModal(movie) {
    try {
        const details = await getMovieDetails(movie.id); // pauses here until resolved
        // ...render the modal using `details`
    } catch (err) {
        // ...show an error in the modal
    }
}
```
`async/await` is just a cleaner way to write the same Promise logic — `await` pauses the function (without freezing the browser) until the data arrives, then continues top-to-bottom like normal synchronous code.

---

## 🔑 About the API Key

This project uses **[TMDB (The Movie Database)](https://www.themoviedb.org/)**'s free API. The key sits directly inside `app.js`:

```js
const API_KEY = '479c3271b2e96e297b126d7e7dca56f5';
```

**Why it's safe to leave visible here:**
- TMDB's `v3` API key is a *read-only, free, non-commercial* key — it's meant to be used in client-side apps exactly like this one. It carries no billing risk; there's no money or sensitive data attached to it.
- Anyone building a static frontend-only app (no backend server) faces the same situation — JavaScript that runs in the browser can always be viewed via DevTools, so true "hiding" of a key isn't possible without a backend. Since this key has no financial risk, full hiding isn't necessary here.
- TMDB officially permits this for non-commercial projects (with attribution — see below), which is exactly what this is.

**Using your own key:**
1. Sign up free at [themoviedb.org](https://www.themoviedb.org)
2. Go to **Settings → API → Request an API Key** → choose **Developer**
3. Replace the `API_KEY` value at the top of `app.js`

**Attribution:** This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## 🛠️ Tech Stack

| Technology | Used For |
|---|---|
| HTML5 | Page structure and layout |
| CSS3 | Styling, animations, responsive design |
| Vanilla JavaScript | All app logic — no frameworks |
| TMDB REST API | Movie data source |
| localStorage | Persisting favourites between sessions |
| Google Fonts | Playfair Display + DM Sans |

---

## 🚀 Run Locally

```bash
git clone https://github.com/sarathy7-tech/cinevault-movie-app.git
cd cinevault-movie-app
```

Then just open `index.html` in your browser — no server, no build step, no npm install.

---

## 🔮 Future Improvements

- 🌙 Light/dark theme toggle
- 🎭 Filter results by genre or release year
- 📺 Add TV show search (TMDB supports this too)
- ⌨️ Debounced live search (search-as-you-type instead of needing a click)
- 🔁 "Similar movies" suggestions inside the detail modal

---

## 📚 What I Learned

- Using the **Fetch API** to pull live data from a REST API
- How **Promises** work via `.then()`, `.catch()`, and `async/await`
- How **Closures** create private state and encapsulate logic without classes
- Building a simple **TTL-based cache** to cut unnecessary network calls
- Persisting user data across sessions with **localStorage**
- Designing a **responsive, animated dark UI** using CSS variables
- Real-world debugging: tracking down a single misplaced space (`? .` vs `?.`) that silently broke an entire script

---

## 👨‍💻 Author

**Sarathy K**
GitHub: [@sarathy7-tech](https://github.com/sarathy7-tech)

---
