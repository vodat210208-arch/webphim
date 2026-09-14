// State Management
let allMovies = [];
let currentFilter = 'all';
let searchQuery = '';
let currentMovie = null;
let currentServerIndex = 0;

// DOM Elements
const navbar = document.getElementById('navbar');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const genreChips = document.getElementById('genreChips');
const movieGrid = document.getElementById('movieGrid');
const movieCount = document.getElementById('movieCount');
const sectionTitle = document.getElementById('sectionTitle');
const emptyState = document.getElementById('emptyState');
const resetFilterBtn = document.getElementById('resetFilterBtn');

// Hero Elements
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

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadMovies();
});

// Load movies from JSON file
async function loadMovies() {
  try {
    const response = await fetch('./data/movies.json');
    if (!response.ok) throw new Error('Không thể tải file movies.json');
    allMovies = await response.json();
    
    setupHero(allMovies);
    renderGenreChips(allMovies);
    renderMovies();
  } catch (error) {
    console.error('Error loading movies:', error);
    movieGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff5e62;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 12px;"></i>
        <p>Không thể tải danh sách phim. Vui lòng kiểm tra lại file data/movies.json.</p>
      </div>
    `;
  }
}

// Setup Hero Featured Movie
function setupHero(movies) {
  const featured = movies.find(m => m.featured) || movies[0];
  if (!featured) return;

  heroBackdrop.style.backgroundImage = `url('${featured.backdrop || featured.poster}')`;
  heroTitle.textContent = featured.title;
  heroDesc.textContent = featured.description;
  heroYear.textContent = featured.year;
  heroDuration.textContent = featured.duration;
  heroGenres.textContent = (featured.genres || []).join(', ');
  heroQuality.textContent = featured.quality || 'HD';
  heroRating.innerHTML = `<i class="fa-solid fa-star"></i> ${featured.rating || '8.5'}`;

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
    `<button class="chip active" data-genre="all">Tất Cả</button>`,
    ...Array.from(genresSet).map(g => `<button class="chip" data-genre="${g}">${g}</button>`)
  ].join('');

  genreChips.innerHTML = chipsHtml;

  // Add click handler to chips
  genreChips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      genreChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.genre;
      updateNavMenuHighlight(currentFilter);
      renderMovies();
    });
  });
}

function updateNavMenuHighlight(genre) {
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.dataset.genre === genre) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Filter and Render Movies
function renderMovies() {
  let filtered = allMovies.filter(movie => {
    const matchGenre = currentFilter === 'all' || (movie.genres && movie.genres.includes(currentFilter));
    const searchLower = searchQuery.toLowerCase().trim();
    const matchSearch = !searchLower || 
      movie.title.toLowerCase().includes(searchLower) ||
      (movie.originalTitle && movie.originalTitle.toLowerCase().includes(searchLower)) ||
      (movie.genres && movie.genres.some(g => g.toLowerCase().includes(searchLower))) ||
      (movie.description && movie.description.toLowerCase().includes(searchLower));

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
      <div class="card-poster-wrap">
        <img class="card-poster" src="${movie.poster}" alt="${movie.title}" loading="lazy" />
        <span class="card-badge">${movie.badge || movie.quality || 'HD'}</span>
        <span class="card-rating"><i class="fa-solid fa-star"></i> ${movie.rating || '8.0'}</span>
        <div class="card-play-overlay">
          <div class="card-play-btn"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-title" title="${movie.title}">${movie.title}</h3>
        <div class="card-meta">
          <span>${movie.year}</span>
          <span>${movie.duration}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Attach card click handlers
  movieGrid.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const movie = allMovies.find(m => m.id === id);
      if (movie) openPlayer(movie, 0);
    });
  });
}

// URL Helper: Auto-converts Google Drive & YouTube links to embeddable URLs
function formatVideoUrl(url, type) {
  if (!url) return '';
  
  // Google Drive: convert /view to /preview
  if (url.includes('drive.google.com')) {
    return url.replace(/\/view(\?.*)?$/, '/preview');
  }

  // YouTube: convert standard watch URL or youtu.be to /embed/
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
  modalQuality.textContent = movie.quality || 'HD';
  modalRating.innerHTML = `<i class="fa-solid fa-star"></i> ${movie.rating || '8.5'}`;
  modalMovieDesc.textContent = movie.description || '';

  modalGenres.innerHTML = (movie.genres || []).map(g => `
    <span class="badge badge-tag">${g}</span>
  `).join('');

  // Render server buttons
  const servers = movie.servers && movie.servers.length > 0 ? movie.servers : [
    { name: 'Nguồn Mặc Định', type: movie.type || 'direct', url: movie.videoUrl }
  ];

  serverButtons.innerHTML = servers.map((srv, idx) => `
    <button class="server-btn ${idx === serverIndex ? 'active' : ''}" data-idx="${idx}">
      ${srv.name || `Server ${idx + 1}`}
    </button>
  `).join('');

  serverButtons.querySelectorAll('.server-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      openPlayer(movie, idx);
    });
  });

  // Load Video Content
  const selectedServer = servers[serverIndex] || servers[0];
  loadServerMedia(selectedServer);

  // Open modal
  videoModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function loadServerMedia(server) {
  playerWrapper.innerHTML = '';

  const processedUrl = formatVideoUrl(server.url, server.type);

  if (server.type === 'direct' || (!server.type && processedUrl.match(/\.(mp4|webm|ogg|m4v)(\?.*)?$/i))) {
    // HTML5 Video tag for direct video stream
    const videoEl = document.createElement('video');
    videoEl.src = processedUrl;
    videoEl.controls = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    playerWrapper.appendChild(videoEl);
  } else {
    // Iframe for Google Drive, YouTube, Doodstream, Streamtape, Filemoon, Ok.ru...
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
  // Clear player to stop any playing audio/video
  playerWrapper.innerHTML = `
    <div class="player-placeholder">
      <div class="spinner"></div>
      <span>Đang tải trình phát...</span>
    </div>
  `;
}

// Event Listeners
function setupEventListeners() {
  // Modal close handlers
  modalCloseBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('open')) {
      closeModal();
    }
  });

  // Search input handler
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

  // Reset filter button
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

  // Navigation Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const genre = link.dataset.genre;
      currentFilter = genre;
      updateNavMenuHighlight(genre);
      
      // Sync chip active state
      genreChips.querySelectorAll('.chip').forEach(c => {
        c.classList.toggle('active', c.dataset.genre === genre);
      });

      renderMovies();

      // Scroll to movies section if not home
      if (genre !== 'all') {
        document.getElementById('movies-section').scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}
