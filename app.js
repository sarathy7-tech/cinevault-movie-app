/* ================================================================
   CineVault – Movie Search App
   Key JS Concepts used:
   ✅ PROMISES  – all API calls use fetch() which returns Promises,
                  chained with .then()/.catch() and async/await
   ✅ CLOSURES  – createSearchHistory(), createFavourites(),
                  createCache() — each returns functions that
                  "close over" private state
   ================================================================ */

// ── CONFIG ──────────────────────────────────────────────────────
// Using TMDB public demo key — replace with your own free key from
// https://www.themoviedb.org/settings/api
const API_KEY = '2dca580c2a14b55200e784d157207b4d';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

// ── CLOSURE #1 : Search History ─────────────────────────────────
// createSearchHistory returns functions that share a private `history`
// array — no global variable needed.
function createSearchHistory() {
    const history = []; // ← private state, lives in closure

    return {
        add(query) {
            const q = query.trim();
            if (!q || history.includes(q)) return;
            history.unshift(q); // newest first
            if (history.length > 6) history.pop();
        },
        get() { return [...history]; },
        clear() { history.length = 0; }
    };
}
const searchHistory = createSearchHistory();


// ── CLOSURE #2 : Favourites Manager ─────────────────────────────
// Private `favs` Map, exposed through add/remove/has/getAll.
function createFavourites() {
    const favs = new Map(); // ← private state

    const saveToStorage = () => {
        try {
            localStorage.setItem('cinevault_favs',
                JSON.stringify([...favs.values()]));
        } catch (e) { /* storage unavailable */ }
    };

    const loadFromStorage = () => {
        try {
            const data = JSON.parse(localStorage.getItem('cinevault_favs') || '[]');
            data.forEach(m => favs.set(m.id, m));
        } catch (e) {}
    };

    loadFromStorage();

    return {
        add(movie) {
            favs.set(movie.id, movie);
            saveToStorage();
        },
        remove(id) {
            favs.delete(id);
            saveToStorage();
        },
        has(id) { return favs.has(id); },
        toggle(movie) { this.has(movie.id) ? this.remove(movie.id) : this.add(movie); },
        getAll() { return [...favs.values()]; },
        count() { return favs.size; }
    };
}
const favourites = createFavourites();


// ── CLOSURE #3 : API Response Cache ─────────────────────────────
// Caches fetch results so the same query won't hit the network twice.
function createCache(ttlMs = 5 * 60 * 1000) {
    const store = new Map(); // ← private cache store

    return {
        get(key) {
            const entry = store.get(key);
            if (!entry) return null;
            if (Date.now() - entry.ts > ttlMs) { store.delete(key); return null; }
            return entry.data;
        },
        set(key, data) { store.set(key, { data, ts: Date.now() }); },
        has(key) { return !!this.get(key); }
    };
}
const cache = createCache();


// ── PROMISE-BASED API HELPERS ────────────────────────────────────

// Fetch with cache — returns a Promise
function fetchJSON(url) {
    if (cache.has(url)) {
        return Promise.resolve(cache.get(url)); // resolve immediately from cache
    }
    return fetch(url) // fetch returns a Promise
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json(); // .json() also a Promise
        })
        .then(data => {
            cache.set(url, data);
            return data;
        });
}

// Search movies – returns Promise<Array>
function searchMovies(query) {
    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
    return fetchJSON(url).then(data => data.results || []);
}

// Get movie details – returns Promise<Object>
function getMovieDetails(id) {
    const url = `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US`;
    return fetchJSON(url);
}


// ── DOM ELEMENTS ─────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const movieGrid = document.getElementById('movie-grid');
const resultsSection = document.getElementById('results-section');
const resultsTitle = document.getElementById('results-title');
const historyEl = document.getElementById('search-history');
const favGrid = document.getElementById('fav-grid');
const favEmpty = document.getElementById('fav-empty');
const favCount = document.getElementById('fav-count');
const clearFavsBtn = document.getElementById('clear-favs');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const navBtns = document.querySelectorAll('.nav-btn');


// ── RENDER HELPERS ───────────────────────────────────────────────

function createMovieCard(movie, staggerIndex = 0) {
    const isFav = favourites.has(movie.id);
    const year = movie.release_date ? movie.release_date.slice(0, 4) || 'N/A' : 'N/A';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${staggerIndex * 50}ms`;
    card.innerHTML = `
    ${movie.poster_path
      ? `<img src="${IMG_BASE}${movie.poster_path}" alt="${movie.title}" loading="lazy"/>`
      : `<div class="card-no-poster">🎬</div>`}
    <button class="card-fav ${isFav ? 'active' : ''}" title="Favourite">
      ${isFav ? '♥' : '♡'}
    </button>
    <div class="card-body">
      <div class="card-title">${movie.title}</div>
      <div class="card-year">${year}</div>
    </div>
  `;

  // Open detail modal on card click (uses Promise inside)
  card.addEventListener('click', e => {
    if (e.target.closest('.card-fav')) return; // handled below
    openModal(movie);
  });

  // Toggle favourite
  card.querySelector('.card-fav').addEventListener('click', e => {
    e.stopPropagation();
    favourites.toggle(movie);
    refreshFavBtn(card.querySelector('.card-fav'), movie.id);
    updateFavCount();
    if (document.getElementById('tab-favourites').classList.contains('active')) {
      renderFavourites();
    }
  });

  return card;
}

function refreshFavBtn(btn, movieId) {
  const active = favourites.has(movieId);
  btn.textContent = active ? '♥' : '♡';
  btn.classList.toggle('active', active);
}

function renderMovies(movies, container) {
  container.innerHTML = '';
  if (!movies.length) {
    container.innerHTML = '<p class="empty-msg">No movies found.</p>';
    return;
  }
  movies.forEach((m, i) => container.appendChild(createMovieCard(m, i)));
}

function showSpinner(container) {
  container.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
}

function renderHistory() {
  historyEl.innerHTML = '';
  searchHistory.get().forEach(q => {
    const chip = document.createElement('button');
    chip.className = 'history-chip';
    chip.textContent = q;
    chip.addEventListener('click', () => {
      searchInput.value = q;
      doSearch(q);
    });
    historyEl.appendChild(chip);
  });
}

function renderFavourites() {
  const all = favourites.getAll();
  favEmpty.classList.toggle('hidden', all.length > 0);
  renderMovies(all, favGrid);
}

function updateFavCount() {
  const n = favourites.count();
  favCount.textContent = n;
}


// ── SEARCH FLOW (uses Promise chain) ────────────────────────────

function doSearch(query) {
  const q = query.trim();
  if (!q) return;

  searchHistory.add(q);
  renderHistory();
  resultsTitle.textContent = `Results for "${q}"`;
  resultsSection.classList.remove('hidden');
  showSpinner(movieGrid);

  // Promise chain: search → render
  searchMovies(q)
    .then(movies => {
      renderMovies(movies, movieGrid);
    })
    .catch(err => {
      movieGrid.innerHTML = `<p class="empty-msg">Error: ${err.message}</p>`;
    });
}

searchBtn.addEventListener('click', () => doSearch(searchInput.value));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch(searchInput.value);
});


// ── MODAL (uses async/await over a Promise) ──────────────────────

async function openModal(movie) {
  modalOverlay.classList.remove('hidden');
  modalContent.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  try {
    // getMovieDetails returns a Promise; await unwraps it
    const details = await getMovieDetails(movie.id);
    const isFav   = favourites.has(details.id);
    const year    = details.release_date?.slice(0, 4) || 'N/A';
    const runtime = details.runtime ? `${details.runtime} min` : '';
    const rating  = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
    const genres  = (details.genres || []).map(g => g.name).join(', ');

    modalContent.innerHTML = `
      <div class="modal-inner">
        ${details.poster_path
          ? `<img class="modal-poster" src="${IMG_BASE}${details.poster_path}" alt="${details.title}"/>`
          : `<div class="modal-no-poster">🎬</div>`}
        <div class="modal-info">
          <h2 class="modal-title">${details.title}</h2>
          <p class="modal-meta">${year} ${runtime ? '· ' + runtime : ''} ${genres ? '· ' + genres : ''}</p>
          <div class="modal-rating">⭐ ${rating} / 10</div>
          <p class="modal-overview">${details.overview || 'No overview available.'}</p>
          <button class="modal-fav-btn ${isFav ? 'active' : ''}">
            ${isFav ? '♥ Remove from Favourites' : '♡ Add to Favourites'}
          </button>
        </div>
      </div>
    `;

    modalContent.querySelector('.modal-fav-btn').addEventListener('click', function() {
      favourites.toggle(details);
      const nowFav = favourites.has(details.id);
      this.textContent = nowFav ? '♥ Remove from Favourites' : '♡ Add to Favourites';
      this.classList.toggle('active', nowFav);
      updateFavCount();
      renderFavourites();
    });

  } catch(err) {
    modalContent.innerHTML = `<p class="empty-msg">Could not load details.</p>`;
  }
}

modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});


// ── TAB NAVIGATION ───────────────────────────────────────────────

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'favourites') renderFavourites();
  });
});


// ── CLEAR FAVOURITES ─────────────────────────────────────────────

clearFavsBtn.addEventListener('click', () => {
  favourites.getAll().forEach(m => favourites.remove(m.id));
  updateFavCount();
  renderFavourites();
});


// ── INIT ─────────────────────────────────────────────────────────
updateFavCount();
renderHistory();