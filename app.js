/* ==========================================================================
   LYRICFLOW - LÓGICA Y ESTADO DE LA APLICACIÓN
   ========================================================================== */

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let songs = [];
let rehearsalSetlist = [];
let currentSongId = null;
let showChords = true;
let isEditMode = false;

// Estado del Modo Presentación (Ensayo)
let presentationIndex = 0;
let fontSizePercent = 100;
let metronomeIntervalId = null;
let isMetronomePlaying = false;
let autoScrollIntervalId = null;
let isAutoScrolling = false;
let showChordsPresentation = true;

// Estado de Sincronización en la Nube (Firebase)
let syncActive = false;
let db = null;
let syncUnsubscribe = null;
let lastSyncedTime = 0;

// --- ELEMENTOS DEL DOM ---
const DOM = {
  // Paneles
  panelSongs: document.getElementById('panel-songs'),
  panelMain: document.getElementById('panel-main'),
  panelRehearsals: document.getElementById('panel-rehearsals'),
  
  // Vistas del panel central
  welcomeView: document.getElementById('welcome-view'),
  detailView: document.getElementById('detail-view'),
  editorView: document.getElementById('editor-view'),
  
  // Lista de canciones
  songsListContainer: document.getElementById('songs-list-container'),
  searchInput: document.getElementById('search-input'),
  btnNewSong: document.getElementById('btn-new-song'),
  
  // Detalle de canción
  songDetailTitle: document.getElementById('song-detail-title'),
  songDetailArtist: document.getElementById('song-detail-artist'),
  songDetailKey: document.getElementById('song-detail-key'),
  songDetailBpm: document.getElementById('song-detail-bpm'),
  lyricsViewer: document.getElementById('lyrics-viewer'),
  btnToggleChords: document.getElementById('btn-toggle-chords'),
  btnAddToSetlist: document.getElementById('btn-add-to-setlist'),
  btnEditSong: document.getElementById('btn-edit-song'),
  btnDeleteSong: document.getElementById('btn-delete-song'),
  
  // Formulario editor
  songForm: document.getElementById('song-form'),
  editorTitleText: document.getElementById('editor-title-text'),
  songTitleInput: document.getElementById('song-title'),
  songArtistInput: document.getElementById('song-artist'),
  songKeySelect: document.getElementById('song-key'),
  songBpmInput: document.getElementById('song-bpm'),
  songLyricsInput: document.getElementById('song-lyrics'),
  btnCancelEditor: document.getElementById('btn-cancel-editor'),
  
  // Setlist de ensayo
  rehearsalListContainer: document.getElementById('rehearsal-list-container'),
  rehearsalCountBadge: document.getElementById('rehearsal-count-badge'),
  rehearsalTotalBpm: document.getElementById('rehearsal-total-bpm'),
  btnStartRehearsal: document.getElementById('btn-start-rehearsal'),
  btnClearRehearsal: document.getElementById('btn-clear-rehearsal'),
  btnExportData: document.getElementById('btn-export-data'),
  btnImportData: document.getElementById('btn-import-data'),
  importFileInput: document.getElementById('import-file-input'),
  
  // Modo Presentación
  presentationMode: document.getElementById('presentation-mode'),
  presIndex: document.getElementById('pres-index'),
  presTitle: document.getElementById('pres-title'),
  presArtist: document.getElementById('pres-artist'),
  presMetronome: document.getElementById('pres-metronome'),
  presMetroDot: document.getElementById('pres-metro-dot'),
  presBpmText: document.getElementById('pres-bpm-text'),
  btnPresMetroToggle: document.getElementById('btn-pres-metro-toggle'),
  btnFontDec: document.getElementById('btn-font-dec'),
  btnFontInc: document.getElementById('btn-font-inc'),
  btnPresChords: document.getElementById('btn-pres-chords'),
  btnPresScroll: document.getElementById('btn-pres-scroll'),
  btnClosePresentation: document.getElementById('btn-close-presentation'),
  btnPresPrev: document.getElementById('btn-pres-prev'),
  btnPresNext: document.getElementById('btn-pres-next'),
  presLyricsScroll: document.getElementById('pres-lyrics-scroll'),
  presLyricsArea: document.getElementById('pres-lyrics-area'),
  
  // Tabs móviles
  tabBtnSongs: document.getElementById('tab-btn-songs'),
  tabBtnMain: document.getElementById('tab-btn-main'),
  tabBtnRehearsal: document.getElementById('tab-btn-rehearsal'),
  
  // Sincronización en la nube (Firebase)
  btnOpenSync: document.getElementById('btn-open-sync'),
  syncStatusIndicator: document.getElementById('sync-status-indicator'),
  syncModal: document.getElementById('sync-modal'),
  btnCloseSyncModal: document.getElementById('btn-close-sync-modal'),
  syncBandCode: document.getElementById('sync-band-code'),
  syncFirebaseConfig: document.getElementById('sync-firebase-config'),
  btnDisconnectSync: document.getElementById('btn-disconnect-sync'),
  btnSaveSyncConfig: document.getElementById('btn-save-sync-config'),
  syncModalStatusDot: document.getElementById('sync-modal-status-dot'),
  syncModalStatusText: document.getElementById('sync-modal-status'),
  
  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  renderSongsList();
  renderRehearsalList();
  autoConnectFirebase();
});

// --- CARGA Y GUARDADO DE DATOS (LOCALSTORAGE) ---
function loadData() {
  const savedSongs = localStorage.getItem('lyricflow_songs');
  if (savedSongs) {
    songs = JSON.parse(savedSongs);
  } else {
    // Si no hay datos, cargar los por defecto de songs-data.js
    songs = typeof DEFAULT_SONGS !== 'undefined' ? DEFAULT_SONGS : [];
    saveSongs();
  }
  
  const savedSetlist = localStorage.getItem('lyricflow_setlist');
  if (savedSetlist) {
    rehearsalSetlist = JSON.parse(savedSetlist);
  } else {
    rehearsalSetlist = [];
  }
}

function saveSongs() {
  localStorage.setItem('lyricflow_songs', JSON.stringify(songs));
  if (syncActive) uploadLocalData();
}

function saveSetlist() {
  localStorage.setItem('lyricflow_setlist', JSON.stringify(rehearsalSetlist));
  if (syncActive) uploadLocalData();
}

// --- NOTIFICACIONES TOAST ---
function showToast(message) {
  DOM.toastMessage.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 3000);
}

// --- PARSER DE ACORDES Y LETRAS ---
// Convierte una letra con corchetes en HTML estructurado para mostrar acordes flotantes
function parseLyricsHTML(lyrics) {
  const lines = lyrics.split('\n');
  return lines.map(line => {
    // Si la línea está vacía, renderizar un espacio para mantener el salto de línea
    if (line.trim() === '') {
      return '<div class="lyrics-line">&nbsp;</div>';
    }
    
    // Separar usando la expresión regular que captura [Acorde]
    const parts = line.split(/(\[[^\]]+\])/);
    let lineHtml = '<div class="lyrics-line">';
    let currentChord = null;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('[') && part.endsWith(']')) {
        currentChord = part.slice(1, -1);
      } else {
        const text = part;
        if (currentChord) {
          // Reemplazar espacios iniciales por non-breaking spaces para mantener alineación exacta
          const displayText = text.startsWith(' ') ? '\u00A0' + text.slice(1) : text;
          lineHtml += `<span class="chord-wrapper" data-chord="${escapeHTML(currentChord)}">${escapeHTML(displayText || '\u00A0')}</span>`;
          currentChord = null;
        } else {
          if (text) {
            lineHtml += `<span>${escapeHTML(text)}</span>`;
          }
        }
      }
    }
    
    // Si quedó un acorde colgando al final de la línea
    if (currentChord) {
      lineHtml += `<span class="chord-wrapper" data-chord="${escapeHTML(currentChord)}">&nbsp;</span>`;
    }
    
    lineHtml += '</div>';
    return lineHtml;
  }).join('');
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- RENDERIZACIÓN DE VISTAS ---

// 1. Renderizar Lista de Canciones Alfabética
function renderSongsList(query = '') {
  DOM.songsListContainer.innerHTML = '';
  
  // Filtrar canciones según la búsqueda
  const filtered = songs.filter(song => {
    const q = query.toLowerCase();
    return song.title.toLowerCase().includes(q) || 
           song.artist.toLowerCase().includes(q) ||
           song.lyrics.toLowerCase().includes(q);
  });
  
  // Ordenar alfabéticamente por título
  filtered.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
  
  if (filtered.length === 0) {
    DOM.songsListContainer.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        <p>No se encontraron canciones</p>
      </div>
    `;
    return;
  }
  
  // Agrupar por la letra inicial
  let currentLetter = '';
  let groupContainer = null;
  
  filtered.forEach(song => {
    const firstChar = song.title.charAt(0).toUpperCase();
    const isLetter = /[A-Z]/.test(firstChar);
    const letterGroup = isLetter ? firstChar : '#';
    
    if (letterGroup !== currentLetter) {
      currentLetter = letterGroup;
      
      // Crear cabecera de letra
      const header = document.createElement('div');
      header.className = 'alphabet-header';
      header.textContent = currentLetter;
      DOM.songsListContainer.appendChild(header);
      
      // Crear contenedor del grupo
      groupContainer = document.createElement('div');
      groupContainer.className = 'alphabet-group';
      DOM.songsListContainer.appendChild(groupContainer);
    }
    
    // Crear elemento de la canción
    const item = document.createElement('div');
    item.className = `song-item ${song.id === currentSongId ? 'active' : ''}`;
    item.innerHTML = `
      <div class="song-item-info">
        <span class="song-item-title">${escapeHTML(song.title)}</span>
        <span class="song-item-artist">${escapeHTML(song.artist)}</span>
      </div>
      ${song.key ? `<span class="song-item-badge">${escapeHTML(song.key)}</span>` : ''}
    `;
    
    item.addEventListener('click', () => selectSong(song.id));
    groupContainer.appendChild(item);
  });
}

// Seleccionar y ver una canción
function selectSong(songId) {
  currentSongId = songId;
  const song = songs.find(s => s.id === songId);
  
  if (!song) return;
  
  // Ocultar editor y bienvenida, mostrar detalle
  DOM.welcomeView.style.display = 'none';
  DOM.editorView.style.display = 'none';
  DOM.detailView.style.display = 'flex';
  
  // Rellenar datos
  DOM.songDetailTitle.textContent = song.title;
  DOM.songDetailArtist.textContent = song.artist;
  DOM.songDetailKey.textContent = song.key || 'N/A';
  DOM.songDetailBpm.textContent = song.bpm ? `${song.bpm} BPM` : 'Sin tempo';
  
  // Renderizar letras con acordes
  DOM.lyricsViewer.innerHTML = parseLyricsHTML(song.lyrics);
  
  // Configurar visualización de acordes
  updateChordsVisibility();
  
  // Actualizar clase activa en la barra lateral
  document.querySelectorAll('.song-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Buscar y marcar activo el elemento en la lista
  renderSongsList(DOM.searchInput.value);
  
  // Cambiar de pestaña en móvil a la del detalle (Main Panel)
  switchMobilePanel('main');
}

function updateChordsVisibility() {
  if (showChords) {
    DOM.lyricsViewer.classList.remove('hide-chords');
    DOM.btnToggleChords.classList.add('btn-accent');
    DOM.btnToggleChords.classList.remove('btn-secondary');
  } else {
    DOM.lyricsViewer.classList.add('hide-chords');
    DOM.btnToggleChords.classList.remove('btn-accent');
    DOM.btnToggleChords.classList.add('btn-secondary');
  }
}

// 2. Renderizar la Lista del Setlist de Ensayo
function renderRehearsalList() {
  DOM.rehearsalListContainer.innerHTML = '';
  
  if (rehearsalSetlist.length === 0) {
    DOM.rehearsalListContainer.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M3 20v-8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8"></path><path d="M14 20v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path></svg>
        <p>No hay canciones en el setlist del ensayo. Haz clic en "+ Al Ensayo" en los detalles de una canción.</p>
      </div>
    `;
    DOM.rehearsalCountBadge.textContent = '0';
    DOM.rehearsalTotalBpm.textContent = '0 BPM prom.';
    DOM.btnStartRehearsal.disabled = true;
    DOM.btnClearRehearsal.disabled = true;
    return;
  }
  
  DOM.rehearsalCountBadge.textContent = rehearsalSetlist.length;
  DOM.btnStartRehearsal.disabled = false;
  DOM.btnClearRehearsal.disabled = false;
  
  let totalBpm = 0;
  let bpmCount = 0;
  
  rehearsalSetlist.forEach((songId, index) => {
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    
    if (song.bpm) {
      totalBpm += parseInt(song.bpm);
      bpmCount++;
    }
    
    const item = document.createElement('div');
    item.className = 'rehearsal-item';
    item.innerHTML = `
      <div class="rehearsal-index">${index + 1}</div>
      <div class="rehearsal-song-title">${escapeHTML(song.title)}</div>
      ${song.key ? `<div class="rehearsal-song-key">${escapeHTML(song.key)}</div>` : ''}
      
      <!-- Controles de Ordenación -->
      <div style="display: flex; gap: 0.15rem;">
        <button class="btn-remove-rehearsal" onclick="moveSetlistItem(${index}, -1)" title="Subir" ${index === 0 ? 'disabled' : ''} style="padding: 0.1rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
        </button>
        <button class="btn-remove-rehearsal" onclick="moveSetlistItem(${index}, 1)" title="Bajar" ${index === rehearsalSetlist.length - 1 ? 'disabled' : ''} style="padding: 0.1rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </div>
      
      <!-- Botón Eliminar de lista -->
      <button class="btn-remove-rehearsal" onclick="removeFromSetlist(${index})" title="Quitar del ensayo">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    
    DOM.rehearsalListContainer.appendChild(item);
  });
  
  const avgBpm = bpmCount > 0 ? Math.round(totalBpm / bpmCount) : 0;
  DOM.rehearsalTotalBpm.textContent = avgBpm > 0 ? `${avgBpm} BPM prom.` : 'Sin BPM';
}

// Operaciones del Setlist
function addToSetlist(songId) {
  if (!songId) return;
  
  // Comprobar si ya está
  if (rehearsalSetlist.includes(songId)) {
    showToast("Esta canción ya está en el setlist");
    return;
  }
  
  rehearsalSetlist.push(songId);
  saveSetlist();
  renderRehearsalList();
  showToast("Canción añadida al setlist de ensayo");
}

function removeFromSetlist(index) {
  rehearsalSetlist.splice(index, 1);
  saveSetlist();
  renderRehearsalList();
  showToast("Canción quitada del setlist");
}

function moveSetlistItem(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= rehearsalSetlist.length) return;
  
  // Intercambiar
  const temp = rehearsalSetlist[index];
  rehearsalSetlist[index] = rehearsalSetlist[targetIndex];
  rehearsalSetlist[targetIndex] = temp;
  
  saveSetlist();
  renderRehearsalList();
}

function clearSetlist() {
  if (confirm("¿Estás seguro de que quieres vaciar la lista de ensayo?")) {
    rehearsalSetlist = [];
    saveSetlist();
    renderRehearsalList();
    showToast("Setlist vaciado");
  }
}

// --- ACCIONES DE CREACIÓN / EDICIÓN ---
function openCreateForm() {
  isEditMode = false;
  DOM.editorTitleText.textContent = "Crear Nueva Canción";
  
  // Limpiar campos
  DOM.songTitleInput.value = '';
  DOM.songArtistInput.value = '';
  DOM.songKeySelect.value = 'C';
  DOM.songBpmInput.value = '';
  DOM.songLyricsInput.value = '';
  
  DOM.welcomeView.style.display = 'none';
  DOM.detailView.style.display = 'none';
  DOM.editorView.style.display = 'flex';
  
  switchMobilePanel('main');
}

function openEditForm() {
  if (!currentSongId) return;
  
  const song = songs.find(s => s.id === currentSongId);
  if (!song) return;
  
  isEditMode = true;
  DOM.editorTitleText.textContent = "Editar Canción";
  
  // Rellenar campos
  DOM.songTitleInput.value = song.title;
  DOM.songArtistInput.value = song.artist;
  DOM.songKeySelect.value = song.key || 'C';
  DOM.songBpmInput.value = song.bpm || '';
  DOM.songLyricsInput.value = song.lyrics;
  
  DOM.welcomeView.style.display = 'none';
  DOM.detailView.style.display = 'none';
  DOM.editorView.style.display = 'flex';
}

function saveSongFromForm() {
  const title = DOM.songTitleInput.value.trim();
  const artist = DOM.songArtistInput.value.trim();
  const key = DOM.songKeySelect.value;
  const bpm = DOM.songBpmInput.value ? parseInt(DOM.songBpmInput.value) : null;
  const lyrics = DOM.songLyricsInput.value;
  
  if (!title || !artist || !lyrics) {
    showToast("Por favor rellena los campos obligatorios");
    return;
  }
  
  if (isEditMode && currentSongId) {
    // Editar
    const songIndex = songs.findIndex(s => s.id === currentSongId);
    if (songIndex !== -1) {
      songs[songIndex] = {
        ...songs[songIndex],
        title,
        artist,
        key,
        bpm,
        lyrics
      };
      saveSongs();
      showToast("Canción guardada con éxito");
      selectSong(currentSongId);
    }
  } else {
    // Crear
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const newSong = {
      id,
      title,
      artist,
      key,
      bpm,
      lyrics
    };
    songs.push(newSong);
    saveSongs();
    showToast("Canción creada con éxito");
    selectSong(id);
  }
}

function deleteCurrentSong() {
  if (!currentSongId) return;
  
  const song = songs.find(s => s.id === currentSongId);
  if (!song) return;
  
  if (confirm(`¿Estás seguro de que quieres eliminar la canción "${song.title}"?`)) {
    // Eliminar del setlist si existe
    rehearsalSetlist = rehearsalSetlist.filter(id => id !== currentSongId);
    saveSetlist();
    renderRehearsalList();
    
    // Eliminar de biblioteca
    songs = songs.filter(s => s.id !== currentSongId);
    saveSongs();
    
    currentSongId = null;
    DOM.detailView.style.display = 'none';
    DOM.welcomeView.style.display = 'flex';
    
    renderSongsList(DOM.searchInput.value);
    showToast("Canción eliminada");
    switchMobilePanel('songs');
  }
}

// --- MODO PRESENTACIÓN (ENSAYO EN PANTALLA COMPLETA) ---
function startPresentationMode() {
  if (rehearsalSetlist.length === 0) return;
  
  presentationIndex = 0;
  showChordsPresentation = showChords;
  DOM.presentationMode.classList.add('active');
  
  renderPresentationSong();
}

function closePresentationMode() {
  // Parar metrónomo y autoscroll
  stopMetronome();
  stopAutoScroll();
  
  DOM.presentationMode.classList.remove('active');
}

function renderPresentationSong() {
  stopMetronome();
  stopAutoScroll();
  
  const songId = rehearsalSetlist[presentationIndex];
  const song = songs.find(s => s.id === songId);
  
  if (!song) {
    closePresentationMode();
    return;
  }
  
  DOM.presIndex.textContent = `${presentationIndex + 1} / ${rehearsalSetlist.length}`;
  DOM.presTitle.textContent = song.title;
  DOM.presArtist.textContent = `${song.artist} | Tono: ${song.key || 'N/A'}`;
  
  // Renderizar letras
  DOM.presLyricsArea.innerHTML = parseLyricsHTML(song.lyrics);
  
  // Aplicar escala de fuente
  DOM.presLyricsArea.style.fontSize = `${fontSizePercent}%`;
  
  // Alternar acordes
  updatePresentationChords();
  
  // Configurar metrónomo
  if (song.bpm) {
    DOM.presMetronome.style.display = 'flex';
    DOM.presBpmText.textContent = `${song.bpm} BPM`;
  } else {
    DOM.presMetronome.style.display = 'none';
  }
  
  // Flechas de navegación
  DOM.btnPresPrev.style.display = presentationIndex === 0 ? 'none' : 'flex';
  DOM.btnPresNext.style.display = presentationIndex === rehearsalSetlist.length - 1 ? 'none' : 'flex';
  
  // Scroll al principio
  DOM.presLyricsScroll.scrollTop = 0;
}

function updatePresentationChords() {
  if (showChordsPresentation) {
    DOM.presLyricsArea.classList.remove('hide-chords');
    DOM.btnPresChords.classList.add('btn-accent');
    DOM.btnPresChords.classList.remove('btn-secondary');
  } else {
    DOM.presLyricsArea.classList.add('hide-chords');
    DOM.btnPresChords.classList.remove('btn-accent');
    DOM.btnPresChords.classList.add('btn-secondary');
  }
}

// Navegación en presentación
function navigatePresentation(direction) {
  const newIndex = presentationIndex + direction;
  if (newIndex >= 0 && newIndex < rehearsalSetlist.length) {
    presentationIndex = newIndex;
    renderPresentationSong();
  }
}

// Metrónomo Visual
function toggleMetronome() {
  if (isMetronomePlaying) {
    stopMetronome();
  } else {
    const songId = rehearsalSetlist[presentationIndex];
    const song = songs.find(s => s.id === songId);
    if (!song || !song.bpm) return;
    
    isMetronomePlaying = true;
    DOM.btnPresMetroToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>';
    DOM.btnPresMetroToggle.classList.add('btn-accent');
    DOM.btnPresMetroToggle.classList.remove('btn-secondary');
    
    const intervalMs = 60000 / song.bpm;
    
    metronomeIntervalId = setInterval(() => {
      DOM.presMetroDot.classList.add('active');
      setTimeout(() => {
        DOM.presMetroDot.classList.remove('active');
      }, 100);
    }, intervalMs);
  }
}

function stopMetronome() {
  isMetronomePlaying = false;
  if (metronomeIntervalId) {
    clearInterval(metronomeIntervalId);
    metronomeIntervalId = null;
  }
  DOM.presMetroDot.classList.remove('active');
  DOM.btnPresMetroToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  DOM.btnPresMetroToggle.classList.remove('btn-accent');
  DOM.btnPresMetroToggle.classList.add('btn-secondary');
}

// Desplazamiento Automático (AutoScroll)
function toggleAutoScroll() {
  if (isAutoScrolling) {
    stopAutoScroll();
  } else {
    isAutoScrolling = true;
    DOM.btnPresScroll.classList.add('btn-primary');
    DOM.btnPresScroll.classList.remove('btn-accent');
    DOM.btnPresScroll.textContent = "Pausar Scroll";
    
    autoScrollIntervalId = setInterval(() => {
      DOM.presLyricsScroll.scrollTop += 1;
      
      // Detener al final del scroll
      const maxScroll = DOM.presLyricsScroll.scrollHeight - DOM.presLyricsScroll.clientHeight;
      if (DOM.presLyricsScroll.scrollTop >= maxScroll - 1) {
        stopAutoScroll();
      }
    }, 45); // Ajustar velocidad aquí
  }
}

function stopAutoScroll() {
  isAutoScrolling = false;
  if (autoScrollIntervalId) {
    clearInterval(autoScrollIntervalId);
    autoScrollIntervalId = null;
  }
  DOM.btnPresScroll.classList.remove('btn-primary');
  DOM.btnPresScroll.classList.add('btn-accent');
  DOM.btnPresScroll.textContent = "AutoScroll";
}

// --- EXPORTACIÓN E IMPORTACIÓN JSON ---
function exportSongsData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `lyricflow_songs_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Base de datos exportada");
}

function triggerImportFileInput() {
  DOM.importFileInput.click();
}

function importSongsData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        // Validar campos mínimos
        const validSongs = imported.filter(song => song.title && song.artist && song.lyrics);
        if (validSongs.length > 0) {
          if (confirm(`¿Quieres importar ${validSongs.length} canciones? Se añadirán a tu biblioteca.`)) {
            // Unir sin duplicar ID
            validSongs.forEach(impSong => {
              const exists = songs.find(s => s.id === impSong.id || (s.title === impSong.title && s.artist === impSong.artist));
              if (!exists) {
                songs.push(impSong);
              } else {
                // Actualizar la existente
                Object.assign(exists, impSong);
              }
            });
            saveSongs();
            renderSongsList();
            showToast(`${validSongs.length} canciones importadas`);
          }
        } else {
          showToast("El archivo JSON no contiene canciones válidas.");
        }
      } else {
        showToast("Formato de archivo inválido. Debe ser una lista.");
      }
    } catch (err) {
      showToast("Error al leer el archivo JSON.");
    }
  };
  reader.readAsText(file);
  DOM.importFileInput.value = ''; // Limpiar input
}

// --- NAVEGACIÓN MÓVIL (TABS) ---
function switchMobilePanel(panelName) {
  // Quitar clases activas en botones de tabs
  DOM.tabBtnSongs.classList.remove('active');
  DOM.tabBtnMain.classList.remove('active');
  DOM.tabBtnRehearsal.classList.remove('active');
  
  // Quitar clases activas de paneles
  DOM.panelSongs.classList.remove('active-mobile-panel');
  DOM.panelMain.classList.remove('active-mobile-panel');
  DOM.panelRehearsals.classList.remove('active-mobile-panel');
  
  if (panelName === 'songs') {
    DOM.tabBtnSongs.classList.add('active');
    DOM.panelSongs.classList.add('active-mobile-panel');
  } else if (panelName === 'main') {
    DOM.tabBtnMain.classList.add('active');
    DOM.panelMain.classList.add('active-mobile-panel');
  } else if (panelName === 'rehearsal') {
    DOM.tabBtnRehearsal.classList.add('active');
    DOM.panelRehearsals.classList.add('active-mobile-panel');
  }
}

// --- CONFIGURAR LISTENERS ---
function setupEventListeners() {
  // Buscador
  DOM.searchInput.addEventListener('input', (e) => {
    renderSongsList(e.target.value);
  });
  
  // Botones
  DOM.btnNewSong.addEventListener('click', openCreateForm);
  DOM.btnCancelEditor.addEventListener('click', () => {
    if (currentSongId) {
      selectSong(currentSongId);
    } else {
      DOM.editorView.style.display = 'none';
      DOM.welcomeView.style.display = 'flex';
    }
  });
  
  // Guardado
  DOM.songForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSongFromForm();
  });
  
  // Detalle Canción
  DOM.btnToggleChords.addEventListener('click', () => {
    showChords = !showChords;
    updateChordsVisibility();
  });
  
  DOM.btnAddToSetlist.addEventListener('click', () => {
    addToSetlist(currentSongId);
  });
  
  DOM.btnEditSong.addEventListener('click', openEditForm);
  DOM.btnDeleteSong.addEventListener('click', deleteCurrentSong);
  
  // Setlist Ensayo
  DOM.btnClearRehearsal.addEventListener('click', clearSetlist);
  DOM.btnStartRehearsal.addEventListener('click', startPresentationMode);
  DOM.btnExportData.addEventListener('click', exportSongsData);
  DOM.btnImportData.addEventListener('click', triggerImportFileInput);
  DOM.importFileInput.addEventListener('change', importSongsData);
  
  // Presentación
  DOM.btnClosePresentation.addEventListener('click', closePresentationMode);
  DOM.btnPresPrev.addEventListener('click', () => navigatePresentation(-1));
  DOM.btnPresNext.addEventListener('click', () => navigatePresentation(1));
  DOM.btnPresMetroToggle.addEventListener('click', toggleMetronome);
  DOM.btnPresScroll.addEventListener('click', toggleAutoScroll);
  
  DOM.btnPresChords.addEventListener('click', () => {
    showChordsPresentation = !showChordsPresentation;
    updatePresentationChords();
  });
  
  DOM.btnFontInc.addEventListener('click', () => {
    if (fontSizePercent < 250) {
      fontSizePercent += 15;
      DOM.presLyricsArea.style.fontSize = `${fontSizePercent}%`;
    }
  });
  
  DOM.btnFontDec.addEventListener('click', () => {
    if (fontSizePercent > 60) {
      fontSizePercent -= 15;
      DOM.presLyricsArea.style.fontSize = `${fontSizePercent}%`;
    }
  });
  
  // Atajos de teclado en Presentación
  document.addEventListener('keydown', (e) => {
    if (!DOM.presentationMode.classList.contains('active')) return;
    
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      navigatePresentation(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigatePresentation(-1);
    } else if (e.key === 'Escape') {
      closePresentationMode();
    }
  });
  
  // Tabs móviles
  DOM.tabBtnSongs.addEventListener('click', () => switchMobilePanel('songs'));
  DOM.tabBtnMain.addEventListener('click', () => switchMobilePanel('main'));
  DOM.tabBtnRehearsal.addEventListener('click', () => switchMobilePanel('rehearsal'));
  
  // Controladores del Modal de Sincronización en la Nube
  DOM.btnOpenSync.addEventListener('click', () => {
    DOM.syncModal.style.display = 'flex';
    // Auto-rellenar configuraciones si existen
    const savedConfig = localStorage.getItem('lyricflow_sync_config');
    const savedCode = localStorage.getItem('lyricflow_sync_band_code');
    if (savedConfig) DOM.syncFirebaseConfig.value = savedConfig;
    if (savedCode) DOM.syncBandCode.value = savedCode;
  });
  
  DOM.btnCloseSyncModal.addEventListener('click', () => {
    DOM.syncModal.style.display = 'none';
  });
  
  DOM.btnSaveSyncConfig.addEventListener('click', () => {
    const configText = DOM.syncFirebaseConfig.value.trim();
    const bandCode = DOM.syncBandCode.value.trim();
    if (!configText || !bandCode) {
      showToast("Por favor ingresa todos los campos");
      return;
    }
    connectFirebase(configText, bandCode);
  });
  
  DOM.btnDisconnectSync.addEventListener('click', () => {
    disconnectFirebase();
  });
}

// ==========================================================================
// LÓGICA DE SINCRONIZACIÓN EN LA NUBE (FIREBASE FIRESTORE)
// ==========================================================================

function setSyncStatusUI(connected) {
  syncActive = connected;
  if (connected) {
    DOM.syncStatusIndicator.classList.add('sync-active-dot');
    DOM.syncModalStatusDot.style.backgroundColor = 'var(--color-success)';
    DOM.syncModalStatusText.innerHTML = `<span id="sync-modal-status-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--color-success);"></span> Conectado`;
    DOM.btnDisconnectSync.style.display = 'inline-flex';
    DOM.btnSaveSyncConfig.textContent = 'Actualizar Config';
  } else {
    DOM.syncStatusIndicator.classList.remove('sync-active-dot');
    DOM.syncStatusIndicator.style.backgroundColor = 'var(--color-danger)';
    DOM.syncModalStatusDot.style.backgroundColor = 'var(--color-danger)';
    DOM.syncModalStatusText.innerHTML = `<span id="sync-modal-status-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--color-danger);"></span> Desconectado`;
    DOM.btnDisconnectSync.style.display = 'none';
    DOM.btnSaveSyncConfig.textContent = 'Conectar';
  }
}

function autoConnectFirebase() {
  const savedConfig = localStorage.getItem('lyricflow_sync_config');
  const savedCode = localStorage.getItem('lyricflow_sync_band_code');
  
  if (savedConfig && savedCode) {
    connectFirebase(savedConfig, savedCode, true);
  }
}

function connectFirebase(configText, bandCode, isAuto = false) {
  try {
    let configObj;
    // Si ya viene de localStorage, se carga como objeto parsed
    if (typeof configText === 'object') {
      configObj = configText;
    } else {
      const cleanText = configText.trim();
      try {
        // 1. Intentar parsear directamente si es un JSON limpio y válido
        configObj = JSON.parse(cleanText);
      } catch (e) {
        // 2. Si falla, intentar limpiar formato JS object literal
        let jsText = cleanText;
        if (jsText.includes('const firebaseConfig =')) {
          jsText = jsText.substring(jsText.indexOf('{'), jsText.lastIndexOf('}') + 1);
        }
        
        // Agregar comillas solo a llaves de propiedades que no las tengan
        jsText = jsText.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        // Convertir comillas simples a dobles
        jsText = jsText.replace(/'/g, '"');
        // Quitar comas finales que rompen el parseador JSON
        jsText = jsText.replace(/,\s*([}\]])/g, '$1');
        
        configObj = JSON.parse(jsText);
      }
    }
    
    if (!configObj.apiKey || !configObj.projectId) {
      throw new Error("El JSON no tiene apiKey o projectId válidos.");
    }
    
    // Inicializar Firebase
    if (firebase.apps.length > 0) {
      firebase.app().delete().then(() => {
        setupFirebase(configObj, bandCode, isAuto);
      });
    } else {
      setupFirebase(configObj, bandCode, isAuto);
    }
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
    if (!isAuto) {
      showToast("Error en formato JSON. Verifica tu configuración.");
    }
    setSyncStatusUI(false);
  }
}

function setupFirebase(configObj, bandCode, isAuto) {
  try {
    firebase.initializeApp(configObj);
    db = firebase.firestore();
    setSyncStatusUI(true);
    
    localStorage.setItem('lyricflow_sync_config', JSON.stringify(configObj));
    localStorage.setItem('lyricflow_sync_band_code', bandCode);
    
    if (!isAuto) {
      showToast("Sincronización en la nube activada");
      DOM.syncModal.style.display = 'none';
    }
    
    startRealtimeSync(bandCode);
  } catch (error) {
    console.error("Error en configuración de Firebase:", error);
    showToast("Error de conexión. Revisa tus credenciales.");
    setSyncStatusUI(false);
  }
}

function disconnectFirebase() {
  if (syncUnsubscribe) {
    syncUnsubscribe();
    syncUnsubscribe = null;
  }
  
  localStorage.removeItem('lyricflow_sync_config');
  localStorage.removeItem('lyricflow_sync_band_code');
  
  db = null;
  setSyncStatusUI(false);
  showToast("Sincronización desactivada");
  DOM.syncModal.style.display = 'none';
}

function startRealtimeSync(bandCode) {
  if (!db) return;
  
  const docRef = db.collection('bands').doc(bandCode);
  
  syncUnsubscribe = docRef.onSnapshot((doc) => {
    if (!doc.exists) {
      uploadLocalData(docRef);
      return;
    }
    
    const cloudData = doc.data();
    const cloudTime = cloudData.lastUpdated || 0;
    
    // Sincronizar si la nube es más reciente
    if (cloudTime > lastSyncedTime) {
      lastSyncedTime = cloudTime;
      
      let changed = false;
      
      if (cloudData.songs && JSON.stringify(cloudData.songs) !== JSON.stringify(songs)) {
        songs = cloudData.songs;
        localStorage.setItem('lyricflow_songs', JSON.stringify(songs));
        changed = true;
      }
      
      if (cloudData.setlist && JSON.stringify(cloudData.setlist) !== JSON.stringify(rehearsalSetlist)) {
        rehearsalSetlist = cloudData.setlist;
        localStorage.setItem('lyricflow_setlist', JSON.stringify(rehearsalSetlist));
        changed = true;
      }
      
      if (changed) {
        renderSongsList(DOM.searchInput.value);
        renderRehearsalList();
        
        // Mantener seleccionada la canción
        if (currentSongId) {
          const songExists = songs.find(s => s.id === currentSongId);
          if (songExists) {
            selectSong(currentSongId);
          } else {
            currentSongId = null;
            DOM.detailView.style.display = 'none';
            DOM.welcomeView.style.display = 'flex';
          }
        }
        showToast("Nube sincronizada");
      }
    }
  }, (error) => {
    console.error("Error al recibir actualizaciones de la nube:", error);
    showToast("Error de red con la nube");
  });
}

function uploadLocalData(docRef = null) {
  if (!db) return;
  
  const bandCode = localStorage.getItem('lyricflow_sync_band_code');
  if (!bandCode) return;
  
  const ref = docRef || db.collection('bands').doc(bandCode);
  
  const now = Date.now();
  lastSyncedTime = now;
  
  ref.set({
    songs: songs,
    setlist: rehearsalSetlist,
    lastUpdated: now
  }).then(() => {
    console.log("Datos locales subidos a la nube.");
  }).catch((error) => {
    console.error("Error al subir datos locales:", error);
  });
}

