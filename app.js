// ==========================================================================
// AURA CINEMA - LIGHTWEIGHT APP CONTROLLER (NO-LAG FOR LOW-END PHONES)
// ==========================================================================

let allMovies = [];
let currentFilter = 'all';
let searchQuery = '';
let currentMovie = null;
let currentServerIndex = 0;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const genreChips = document.getElementById('genreChips');
const movieGrid = document.getElementById('movieGrid');
const movieCount = document.getElementById('movieCount');
const emptyState = document.getElementById('emptyState');
const resetFilterBtn = document.getElementById('resetFilterBtn');

// Hero Elements
const heroBackdrop = document.getElementById('heroBackdrop');
const heroTitle = document.getElementById('heroTitle');
const heroDesc = document.getElementById('heroDesc');
const heroYear = document.getElementById('heroYear');
const heroDuration = document.getElementById('heroDuration');
const heroQuality = document.getElementById('heroQuality');
const heroRating = document.getElementById('heroRating');
const heroWatchBtn = document.getElementById('heroWatchBtn');
const heroInfoBtn = document.getElementById('heroInfoBtn');

// Modal Elements
const videoModal = document.getElementById('videoModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const playerWrapper = document.getElementById('playerWrapper');
const serverButtons = document.getElementById('serverButtons');
const modalMovieTitle = document.getElementById('modalMovieTitle');
const modalYear = document.getElementById('modalYear');
const modalDuration = document.getElementById('modalDuration');
const modalQuality = document.getElementById('modalQuality');
const modalRating = document.getElementById('modalRating');
const modalGenres = document.getElementById('modalGenres');
const modalMovieDesc = document.getElementById('modalMovieDesc');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupThemeSwitcher();
  setupEventListeners();
  await loadMovies();
});

// Setup 3 Themes
function setupThemeSwitcher() {
  const currentTheme = localStorage.getItem('aura_theme') || 'blue';
  setTheme(currentTheme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const theme = btn.dataset.setTheme;
      setTheme(theme);
    });
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('aura_theme', theme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.setTheme === theme);
  });
}

// Load Movies JSON
async function loadMovies() {
  try {
    const res = await fetch('./data/movies.json');
    if (!res.ok) throw new Error('Failed to load movies data');
    allMovies = await res.json();

    setupHero(allMovies);
    renderGenreChips(allMovies);
    renderMovies();
  } catch (err) {
    console.error('Error loading movies:', err);
    movieGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 10px; color: #ff5277;">
        <p>Không thể tải danh sách phim. Vui lòng thử tải lại trang.</p>
      </div>
    `;
  }
}

// Setup Hero
function setupHero(movies) {
  const featured = movies.find(m => m.featured) || movies[0];
  if (!featured) return;

  heroBackdrop.style.backgroundImage = `url('${featured.backdrop || featured.poster}')`;
  heroTitle.textContent = featured.title;
  heroDesc.textContent = featured.description;
  heroYear.textContent = featured.year;
  heroDuration.textContent = featured.duration;
  heroQuality.textContent = featured.quality || '4K Ultra';
  heroRating.textContent = featured.rating || '8.8';

  heroWatchBtn.onclick = () => openPlayer(featured, 0);
  heroInfoBtn.onclick = () => openPlayer(featured, 0);
}

// Render Genre Filter Chips
function renderGenreChips(movies) {
  const genres = new Set();
  movies.forEach(m => (m.genres || []).forEach(g => genres.add(g)));

  const html = [
    `<button class="chip active" data-genre="all">Tất Cả</button>`,
    ...Array.from(genres).map(g => `<button class="chip" data-genre="${g}">${g}</button>`)
  ].join('');

  genreChips.innerHTML = html;

  genreChips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      genreChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.genre;
      renderMovies();
    });
  });
}

// Render Movie Grid
function renderMovies() {
  const q = searchQuery.toLowerCase().trim();
  const filtered = allMovies.filter(movie => {
    const matchGenre = currentFilter === 'all' || (movie.genres && movie.genres.includes(currentFilter));
    const matchSearch = !q || 
      movie.title.toLowerCase().includes(q) ||
      (movie.originalTitle && movie.originalTitle.toLowerCase().includes(q)) ||
      (movie.genres && movie.genres.some(g => g.toLowerCase().includes(q)));

    return matchGenre && matchSearch;
  });

  movieCount.textContent = `${filtered.length} phim`;

  if (filtered.length === 0) {
    movieGrid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  movieGrid.innerHTML = filtered.map(movie => `
    <div class="movie-card" data-id="${movie.id}">
      <div class="card-poster-frame">
        <img class="card-poster-img" src="${movie.poster}" alt="${movie.title}" loading="lazy" decoding="async" />
        <span class="card-tag-badge">${movie.badge || movie.quality || 'HD'}</span>
        <span class="card-score-badge"><i class="fa-solid fa-star"></i> ${movie.rating || '8.0'}</span>
        <div class="card-hover-aura">
          <div class="card-play-disc"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-content">
        <div class="card-heading" title="${movie.title}">${movie.title}</div>
        <div class="card-footer-meta">
          <span>${movie.year}</span>
          <span>${movie.duration}</span>
        </div>
      </div>
    </div>
  `).join('');

  movieGrid.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const movie = allMovies.find(m => m.id === id);
      if (movie) openPlayer(movie, 0);
    });
  });
}

// Convert video URL (Drive / YouTube)
function formatVideoUrl(url, type) {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    return url.replace(/\/view(\?.*)?$/, '/preview');
  }
  if (url.includes('youtube.com/watch?v=')) {
    const id = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  return url;
}

// Open Player Modal
function openPlayer(movie, serverIndex = 0) {
  currentMovie = movie;
  currentServerIndex = serverIndex;

  modalMovieTitle.textContent = movie.title;
  modalYear.textContent = movie.year;
  modalDuration.textContent = movie.duration;
  modalQuality.textContent = movie.quality || '4K';
  modalRating.textContent = movie.rating || '8.8';
  modalMovieDesc.textContent = movie.description || '';

  modalGenres.innerHTML = (movie.genres || []).map(g => `
    <span class="genre-item">${g}</span>
  `).join('');

  const servers = movie.servers && movie.servers.length > 0 ? movie.servers : [
    { name: 'Nguồn Chính', type: movie.type || 'direct', url: movie.videoUrl }
  ];

  serverButtons.innerHTML = servers.map((srv, idx) => `
    <button class="source-pill-btn ${idx === serverIndex ? 'active' : ''}" data-idx="${idx}">
      ${srv.name || `Server ${idx + 1}`}
    </button>
  `).join('');

  serverButtons.querySelectorAll('.source-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      openPlayer(movie, idx);
    });
  });

  const selectedServer = servers[serverIndex] || servers[0];
  loadServerMedia(selectedServer);

  videoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function loadServerMedia(server) {
  playerWrapper.innerHTML = '';
  const processedUrl = formatVideoUrl(server.url, server.type);

  if (server.type === 'direct' || (!server.type && processedUrl.match(/\.(mp4|webm|ogg|m4v)(\?.*)?$/i))) {
    const video = document.createElement('video');
    video.src = processedUrl;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    playerWrapper.appendChild(video);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = processedUrl;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    playerWrapper.appendChild(iframe);
  }
}

// Close Modal
function closeModal() {
  videoModal.classList.remove('open');
  document.body.style.overflow = '';
  playerWrapper.innerHTML = `
    <div class="video-loading">
      <div class="simple-spinner"></div>
      <span>Đang tải phim...</span>
    </div>
  `;
}

// Event Listeners
function setupEventListeners() {
  modalCloseBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('open')) {
      closeModal();
    }
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearch.style.display = searchQuery ? 'block' : 'none';
    renderMovies();
  });

  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearch.style.display = 'none';
    renderMovies();
  });

  resetFilterBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearch.style.display = 'none';
    currentFilter = 'all';
    genreChips.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.dataset.genre === 'all');
    });
    renderMovies();
  });
}
