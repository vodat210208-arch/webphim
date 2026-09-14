// ==========================================================================
// AURA CINEMA - APP CONTROLLER (VỚI BỘ ĐỔI THEME)
// ==========================================================================

let allMovies = [];
let currentFilter = 'all';
let searchQuery = '';
let currentMovie = null;
let currentServerIndex = 0;

// DOM Selectors
const navbar = document.getElementById('navbar');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const genreChips = document.getElementById('genreChips');
const movieGrid = document.getElementById('movieGrid');
const movieCount = document.getElementById('movieCount');
const sectionTitle = document.getElementById('sectionTitle');
const emptyState = document.getElementById('emptyState');
const resetFilterBtn = document.getElementById('resetFilterBtn');

// Hero Selectors
const heroBanner = document.getElementById('heroBanner');
const heroBackdrop = document.getElementById('heroBackdrop');
const heroTitle = document.getElementById('heroTitle');
const heroDesc = document.getElementById('heroDesc');
const heroYear = document.getElementById('heroYear');
const heroDuration = document.getElementById('heroDuration');
const heroGenres = document.getElementById('heroGenres');
const heroQuality = document.getElementById('heroQuality');
const heroRating = document.getElementById('heroRating');
const heroWatchBtn = document.getElementById('heroWatchBtn');
const heroInfoBtn = document.getElementById('heroInfoBtn');

// Modal Selectors
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

// Theme Switcher Manager
function setupThemeSwitcher() {
  const currentTheme = localStorage.getItem('aura_theme') || 'blue';
  setTheme(currentTheme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.dataset.setTheme;
      setTheme(selected);
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

// Load movies
async function loadMovies() {
  try {
    const response = await fetch('./data/movies.json');
    if (!response.ok) throw new Error('Không thể đọc dữ liệu phim.');
    allMovies = await response.json();
    
    setupHero(allMovies);
    renderGenreChips(allMovies);
    renderMovies();
  } catch (error) {
    console.error('Error loading movies:', error);
    movieGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: var(--theme-primary);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; margin-bottom: 14px;"></i>
        <p>Không thể kết nối đến cơ sở dữ liệu phim. Vui lòng thử lại sau.</p>
      </div>
    `;
  }
}

// Hero Setup
function setupHero(movies) {
  const featured = movies.find(m => m.featured) || movies[0];
  if (!featured) return;

  heroBackdrop.style.backgroundImage = `url('${featured.backdrop || featured.poster}')`;
  heroTitle.textContent = featured.title;
  heroDesc.textContent = featured.description;
  heroYear.textContent = featured.year;
  heroDuration.textContent = featured.duration;
  heroGenres.textContent = (featured.genres || []).join(', ');
  heroQuality.textContent = featured.quality || '4K Ultra';
  heroRating.innerHTML = `<i class="fa-solid fa-star"></i> ${featured.rating || '8.8'}`;

  heroWatchBtn.onclick = () => openPlayer(featured, 0);
  heroInfoBtn.onclick = () => openPlayer(featured, 0);
}

// Render Genre Filter Chips
function renderGenreChips(movies) {
  const genresSet = new Set();
  movies.forEach(m => {
    (m.genres || []).forEach(g => genresSet.add(g));
  });

  const chipsHtml = [
    `<button class="pill-chip active" data-genre="all">Tất Cả</button>`,
    ...Array.from(genresSet).map(g => `<button class="pill-chip" data-genre="${g}">${g}</button>`)
  ].join('');

  genreChips.innerHTML = chipsHtml;

  genreChips.querySelectorAll('.pill-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      genreChips.querySelectorAll('.pill-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.genre;
      updateNavHighlight(currentFilter);
      renderMovies();
    });
  });
}

function updateNavHighlight(genre) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.genre === genre);
  });
}

// Render Movies
function renderMovies() {
  const filtered = allMovies.filter(movie => {
    const matchGenre = currentFilter === 'all' || (movie.genres && movie.genres.includes(currentFilter));
    const query = searchQuery.toLowerCase().trim();
    const matchSearch = !query || 
      movie.title.toLowerCase().includes(query) ||
      (movie.originalTitle && movie.originalTitle.toLowerCase().includes(query)) ||
      (movie.genres && movie.genres.some(g => g.toLowerCase().includes(query))) ||
      (movie.description && movie.description.toLowerCase().includes(query));

    return matchGenre && matchSearch;
  });

  movieCount.textContent = `${filtered.length} tác phẩm`;

  if (filtered.length === 0) {
    movieGrid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  movieGrid.innerHTML = filtered.map(movie => `
    <div class="movie-card" data-id="${movie.id}">
      <div class="card-poster-frame">
        <img class="card-poster-img" src="${movie.poster}" alt="${movie.title}" loading="lazy" />
        <span class="card-tag-badge">${movie.badge || movie.quality || 'HD'}</span>
        <span class="card-score-badge"><i class="fa-solid fa-star"></i> ${movie.rating || '8.0'}</span>
        <div class="card-hover-aura">
          <div class="card-play-disc"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-content">
        <h3 class="card-heading" title="${movie.title}">${movie.title}</h3>
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

// Embed URL Converter
function formatVideoUrl(url, type) {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    return url.replace(/\/view(\?.*)?$/, '/preview');
  }

  if (url.includes('youtube.com/watch?v=')) {
    const videoId = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
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
  modalRating.innerHTML = `<i class="fa-solid fa-star"></i> ${movie.rating || '8.8'}`;
  modalMovieDesc.textContent = movie.description || '';

  modalGenres.innerHTML = (movie.genres || []).map(g => `
    <span class="genre-tag-pill">${g}</span>
  `).join('');

  const servers = movie.servers && movie.servers.length > 0 ? movie.servers : [
    { name: 'Nguồn Mặc Định', type: movie.type || 'direct', url: movie.videoUrl }
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
    const videoEl = document.createElement('video');
    videoEl.src = processedUrl;
    videoEl.controls = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    playerWrapper.appendChild(videoEl);
  } else {
    const iframeEl = document.createElement('iframe');
    iframeEl.src = processedUrl;
    iframeEl.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframeEl.allowFullscreen = true;
    playerWrapper.appendChild(iframeEl);
  }
}

// Close Modal
function closeModal() {
  videoModal.classList.remove('open');
  document.body.style.overflow = '';
  playerWrapper.innerHTML = `
    <div class="screen-loading">
      <div class="pulse-loader"></div>
      <span>Đang kết nối phòng chiếu...</span>
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
    genreChips.querySelectorAll('.pill-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.genre === 'all');
    });
    renderMovies();
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const genre = item.dataset.genre;
      currentFilter = genre;
      updateNavHighlight(genre);
      
      genreChips.querySelectorAll('.pill-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.genre === genre);
      });

      renderMovies();

      if (genre !== 'all') {
        document.getElementById('movies-section').scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}
