/* ==========================================================================
   LYRICFLOW - LÓGICA Y ESTADO DE LA APLICACIÓN
   ========================================================================== */

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let songs = [];
let rehearsalSetlist = [];
let currentSongId = null;
let notationViewMode = 'all';
let isEditMode = false;
let currentTheme = 'dark';
let selectedInstrument = 'concert';
let manualTransposeSemitones = 0;

// Estado del Modo Presentación (Ensayo)
let presentationIndex = 0;
let fontSizePercent = 100;
let metronomeIntervalId = null;
let isMetronomePlaying = false;
let autoScrollIntervalId = null;
let isAutoScrolling = false;
let presentationNotationViewMode = 'all';

// Estado de Sincronización en la Nube (Firebase)
let syncActive = false;
let db = null;
let syncUnsubscribe = null;
let lastSyncedTime = 0;

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBQQlwDlSpFAie6u6j64RwzntuXyUiBIY',
  authDomain: 'lyric-flow-app-c6428.firebaseapp.com',
  projectId: 'lyric-flow-app-c6428',
  storageBucket: 'lyric-flow-app-c6428.firebasestorage.app',
  messagingSenderId: '7486793398',
  appId: '1:7486793398:web:fb1ff0ca79671918bbe817',
  measurementId: 'G-T3MPJQ5R4G'
};

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
  instrumentSelect: document.getElementById('instrument-select'),
  transposeSelect: document.getElementById('transpose-select'),
  btnNewSong: document.getElementById('btn-new-song'),
  
  // Detalle de canción
  songDetailTitle: document.getElementById('song-detail-title'),
  songDetailArtist: document.getElementById('song-detail-artist'),
  songDetailKey: document.getElementById('song-detail-key'),
  songDetailBpm: document.getElementById('song-detail-bpm'),
  melodyViewer: document.getElementById('melody-viewer'),
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
  songMelodyInput: document.getElementById('song-melody'),
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
  btnShareData: document.getElementById('btn-share-data'),
  btnExportDataLeft: document.getElementById('btn-export-data-left'),
  btnImportDataLeft: document.getElementById('btn-import-data-left'),
  btnShareDataLeft: document.getElementById('btn-share-data-left'),
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
  inputScrollSpeed: document.getElementById('input-scroll-speed'),
  scrollSpeedVal: document.getElementById('scroll-speed-val'),
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
  initTheme();
  initInstrumentSelector();
  runTranspositionConsoleTests();
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
const QUIET_TOAST_MESSAGES = new Set([
  'Operación realizada con éxito',
  'Canción guardada con éxito',
  'Canción creada con éxito',
  'Canción añadida al setlist de ensayo',
  'Canción quitada del setlist',
  'Nube sincronizada'
]);

function showToast(message) {
  if (QUIET_TOAST_MESSAGES.has(message)) return;

  DOM.toastMessage.textContent = message;
  DOM.toast.classList.add('show');
  setTimeout(() => {
    DOM.toast.classList.remove('show');
  }, 1800);
}

// --- TRANSPOSICIÓN PARA INSTRUMENTOS ---
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SOLFEGE_SCALE = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const SOLFEGE_TO_ENGLISH = {
  Do: 'C',
  Re: 'D',
  Mi: 'E',
  Fa: 'F',
  Sol: 'G',
  La: 'A',
  Si: 'B'
};

const ENHARMONIC_NOTES = {
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  'B#': 'C',
  'E#': 'F'
};

const SOLFEGE_ENHARMONIC_NOTES = {
  Dob: 'B',
  Reb: 'C#',
  Mib: 'D#',
  Fab: 'E',
  Solb: 'F#',
  Lab: 'G#',
  Sib: 'A#',
  'Si#': 'C',
  'Mi#': 'F'
};

const TRANSPOSING_INSTRUMENTS = {
  concert: { label: 'Violín / Flauta (Do)', semitones: 0 },
  bb: { label: 'Sib', semitones: 2 },
  eb: { label: 'Mib', semitones: -3 },
  f: { label: 'Fa', semitones: 7 }
};

const NOTATION_VIEW_MODES = ['all', 'lyrics', 'chords', 'melody'];

const NOTATION_VIEW_LABELS = {
  all: 'Todo',
  lyrics: 'Letra',
  chords: 'Acordes',
  melody: 'Melodía'
};

const SOLFEGE_NAME_PATTERN = '(?:Do|DO|do|Re|RE|re|Mi|MI|mi|Fa|FA|fa|Sol|SOL|sol|La|LA|la|Si|SI|si)';
const NOTE_NAME_PATTERN = `(?:${SOLFEGE_NAME_PATTERN}|[A-G])(?:#|b)?`;
const CHORD_SUFFIX_PATTERN = '(?:maj|min|dim|aug|sus|add|m|M|[0-9])*';
const CHORD_PATTERN = new RegExp(`^(${NOTE_NAME_PATTERN})(.*)$`);
const CHORD_NOTE_PATTERN = new RegExp(NOTE_NAME_PATTERN, 'g');
const CHORD_TOKEN_PATTERN = new RegExp(
  `\\b(${NOTE_NAME_PATTERN}${CHORD_SUFFIX_PATTERN}(?:\\/${NOTE_NAME_PATTERN})?)\\b`,
  'g'
);
const MELODY_NOTE_PATTERN = new RegExp(`(^|[^A-Za-z0-9#b])(${SOLFEGE_NAME_PATTERN}|[A-G])(#|b)?([0-9]?)(?=$|[^A-Za-z0-9#b])`, 'g');

function canonicalSolfegeName(name) {
  const normalized = name.toLowerCase();
  return {
    do: 'Do',
    re: 'Re',
    mi: 'Mi',
    fa: 'Fa',
    sol: 'Sol',
    la: 'La',
    si: 'Si'
  }[normalized] || name;
}

function normalizeNote(note) {
  const solfegeMatch = note.match(new RegExp(`^(${SOLFEGE_NAME_PATTERN})(#|b)?$`));
  if (solfegeMatch) {
    const canonicalName = canonicalSolfegeName(solfegeMatch[1]);
    const solfegeNote = `${canonicalName}${solfegeMatch[2] || ''}`;
    return SOLFEGE_ENHARMONIC_NOTES[solfegeNote] || `${SOLFEGE_TO_ENGLISH[canonicalName]}${solfegeMatch[2] || ''}`;
  }

  return ENHARMONIC_NOTES[note] || note;
}

function usesSolfege(note) {
  return new RegExp(`^(${SOLFEGE_NAME_PATTERN})(#|b)?$`).test(note);
}

function transposeNote(note, semitones) {
  const normalized = normalizeNote(note);
  const noteIndex = CHROMATIC_SCALE.indexOf(ENHARMONIC_NOTES[normalized] || normalized);
  if (noteIndex === -1) return note;
  
  const transposedIndex = (noteIndex + semitones + CHROMATIC_SCALE.length * 10) % CHROMATIC_SCALE.length;
  return usesSolfege(note) ? SOLFEGE_SCALE[transposedIndex] : CHROMATIC_SCALE[transposedIndex];
}

function transposeChord(chord, semitones) {
  return chord.replace(CHORD_NOTE_PATTERN, (note) => transposeNote(note, semitones));
}

function looksLikeChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (looksLikeMelodyLine(line)) return false;

  const hasBracketChord = /\[[^\]]+\]/.test(trimmed);
  const hasChordQuality = new RegExp(`\\b${NOTE_NAME_PATTERN}(?:m|maj|min|dim|aug|sus|add|M|[0-9])`).test(trimmed);
  const hasPositionedSpacing = /\S\s{2,}\S/.test(line) || /^\s{2,}\S/.test(line);
  const hasChord = hasBracketChord || hasChordQuality || (hasPositionedSpacing && CHORD_TOKEN_PATTERN.test(trimmed));
  CHORD_TOKEN_PATTERN.lastIndex = 0;
  if (!hasChord) return false;
  
  const withoutChords = trimmed
    .replace(/\[[^\]]+\]/g, '')
    .replace(CHORD_TOKEN_PATTERN, '')
    .replace(/[|\s,.\-]/g, '');
    
  return withoutChords.length === 0;
}

function looksLikeMelodyLine(line) {
  const trimmed = line.trim();
  if (!trimmed || /\[[^\]]+\]/.test(trimmed)) return false;

  const source = trimmed.startsWith('//') ? trimmed.slice(2).trim() : trimmed;
  const hasMelodySeparator = /[-,;/\\]/.test(source);
  const hasPositionedSpacing = /\S\s{2,}\S/.test(line) || /^\s{2,}\S/.test(line);
  const hasChordQuality = new RegExp(`\\b${NOTE_NAME_PATTERN}(?:m|maj|min|dim|aug|sus|add|M|[0-9])`).test(source);
  const notes = extractMelodyNotes(trimmed);
  const leftovers = source
    .replace(MELODY_NOTE_PATTERN, '')
    .replace(/[|\s,;/\\-]/g, '');

  if (leftovers !== '' || notes.length <= 1 || hasChordQuality || hasPositionedSpacing) {
    return false;
  }

  return hasMelodySeparator || notes.length >= 3;
}

function transposeLyricsAndChords(text, semitones) {
  if (!semitones) return text;
  
  return text.split('\n').map(line => {
    if (looksLikeMelodyLine(line)) {
      return transposeMelodyNotes(line, semitones);
    }

    const hasBracketChords = /\[[^\]]+\]/.test(line);
    let transposedLine = line.replace(/\[([^\]]+)\]/g, (match, chord) => {
      const chordMatch = chord.trim().match(CHORD_PATTERN);
      return chordMatch ? `[${transposeChord(chord, semitones)}]` : match;
    });

    transposedLine = transposedLine.replace(/\{([^\}]+)\}/g, (match, note) => {
      return `{${transposeMelodyNotes(note, semitones)}}`;
    });
    
    if (!hasBracketChords && looksLikeChordLine(transposedLine)) {
      transposedLine = transposedLine.replace(CHORD_TOKEN_PATTERN, chord => transposeChord(chord, semitones));
    }
    
    return transposedLine;
  }).join('\n');
}

function transposeMelodyNotes(text, semitones) {
  if (!text || !semitones) return text || '';
  return text.replace(MELODY_NOTE_PATTERN, (match, prefix = '', note, accidental = '', octave = '') => {
    return `${prefix}${transposeNote(`${note}${accidental}`, semitones)}${octave}`;
  });
}

function getSelectedTransposition() {
  return (TRANSPOSING_INSTRUMENTS[selectedInstrument]?.semitones || 0) + manualTransposeSemitones;
}

function getDisplayKey(key) {
  return key ? transposeChord(key, getSelectedTransposition()) : key;
}

function getDisplayLyrics(lyrics) {
  return transposeLyricsAndChords(lyrics, getSelectedTransposition());
}

function getDisplayMelody(melody) {
  return transposeMelodyNotes(melody, getSelectedTransposition());
}

function runTranspositionConsoleTests() {
  console.group('LyricFlow transposition tests');
  console.log('C para Sib (+2):', transposeNote('C', 2));
  console.log('[C] [F] [G] para Sib:', transposeLyricsAndChords('[C] [F] [G]', 2));
  console.log('[Rem] [Sib] para Sib:', transposeLyricsAndChords('[Rem] [Sib]', 2));
  console.log('[C]{E}Santo para Sib:', transposeLyricsAndChords('[C]{E}Santo', 2));
  console.log('C para Mib (-3):', transposeNote('C', -3));
  console.log('[C] [Am] [F#m] para Mib:', transposeLyricsAndChords('[C] [Am] [F#m]', -3));
  console.log('[C]{E}Santo para Mib:', transposeLyricsAndChords('[C]{E}Santo', -3));
  console.log('Melodía C D E para Sib:', transposeMelodyNotes('C D E', 2));
  console.log('Melodía C4 D4 E4 para Mib:', transposeMelodyNotes('C4 D4 E4', -3));
  console.log('Melodía Re-Re-La para Sib:', transposeMelodyNotes('Re-Re-La', 2));
  console.log('Melodía Re-Re-La para Mib:', transposeMelodyNotes('Re-Re-La', -3));
  console.groupEnd();
}

// --- PARSER DE ACORDES Y LETRAS ---
// Convierte una letra con corchetes en HTML estructurado para mostrar acordes flotantes
function parseLyricsHTML(lyrics) {
  const lines = lyrics.split('\n');
  const htmlLines = [];
  let pendingChords = [];
  let pendingMelody = [];

  lines.forEach(line => {
    if (line.trim() === '') {
      htmlLines.push('<div class="lyrics-line">&nbsp;</div>');
      pendingChords = [];
      pendingMelody = [];
      return;
    }

    if (looksLikeChordLine(line)) {
      pendingChords = extractChordSequence(line);
      return;
    }

    const standaloneMelody = extractStandaloneMelodyLine(line);
    if (standaloneMelody.length) {
      pendingMelody = standaloneMelody;
      return;
    }

    htmlLines.push(renderLyricLine(line, pendingChords, pendingMelody));
    pendingChords = [];
    pendingMelody = [];
  });

  if (pendingChords.length || pendingMelody.length) {
    htmlLines.push(renderNotationSequenceLine(pendingChords, pendingMelody));
  }

  return htmlLines.join('');
}

function renderLyricLine(line, chordSequence = [], melodySequence = []) {
  if (chordSequence.length || melodySequence.length) {
    return renderLineWithSequences(line, chordSequence, melodySequence);
  }

  return renderInlineNotationLine(line);
}

function renderInlineNotationLine(line) {
    // Separar usando la expresión regular que captura [Acorde] y {Melodía}
    const parts = line.split(/(\[[^\]]+\]|\{[^\}]+\})/);
    let lineHtml = '<div class="lyrics-line">';
    let currentChord = null;
    let currentMelody = null;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('[') && part.endsWith(']')) {
        currentChord = part.slice(1, -1);
      } else if (part.startsWith('{') && part.endsWith('}')) {
        currentMelody = part.slice(1, -1);
      } else {
        const text = part;
        if (currentChord || currentMelody) {
          lineHtml += renderTextWithNotation(text, currentChord, currentMelody);
          currentChord = null;
          currentMelody = null;
        } else {
          if (text) {
            lineHtml += `<span>${escapeHTML(text)}</span>`;
          }
        }
      }
    }
    
    // Si quedó un acorde o nota colgando al final de la línea
    if (currentChord || currentMelody) {
      lineHtml += renderNotationToken('\u00A0', currentChord, currentMelody);
    }
    
    lineHtml += '</div>';
    return lineHtml;
}

function renderLineWithSequences(line, chordSequence, melodySequence) {
  const tokens = line.split(/(\s+)/);
  const wordPositions = getWordPositions(line);
  const chordByWordIndex = mapPositionedItemsToWords(chordSequence, wordPositions);
  const sequentialChords = normalizeNotationSequence(chordSequence).filter(item => item.index == null);
  const melodyByWord = distributeMelodyAcrossWords(melodySequence, wordPositions.length);
  let sequentialChordIndex = 0;
  let wordIndex = 0;
  let lineHtml = '<div class="lyrics-line">';

  tokens.forEach(token => {
    if (!token) return;
    if (/^\s+$/.test(token)) {
      lineHtml += `<span>${escapeHTML(token)}</span>`;
      return;
    }

    const positionedChord = chordByWordIndex.get(wordIndex) || '';
    const sequentialChord = sequentialChords[sequentialChordIndex]?.value || '';
    const chord = positionedChord || sequentialChord;
    const melody = melodyByWord[wordIndex] || '';
    if (!positionedChord && sequentialChord) sequentialChordIndex += 1;
    wordIndex += 1;
    lineHtml += renderNotationToken(token, chord, melody);
  });

  lineHtml += '</div>';
  return lineHtml;
}

function distributeMelodyAcrossWords(melodySequence, wordCount) {
  if (!melodySequence.length || wordCount <= 0) return [];
  if (melodySequence.length <= wordCount) return melodySequence;

  const groups = [];
  let noteIndex = 0;

  for (let wordIndex = 0; wordIndex < wordCount; wordIndex++) {
    const remainingNotes = melodySequence.length - noteIndex;
    const remainingWords = wordCount - wordIndex;
    const takeCount = Math.ceil(remainingNotes / remainingWords);
    groups.push(melodySequence.slice(noteIndex, noteIndex + takeCount).join('-'));
    noteIndex += takeCount;
  }

  return groups;
}

function renderNotationSequenceLine(chordSequence, melodySequence) {
  const normalizedChords = normalizeNotationSequence(chordSequence);
  const maxLength = Math.max(normalizedChords.length, melodySequence.length);
  let lineHtml = '<div class="lyrics-line notation-only-line">';

  for (let i = 0; i < maxLength; i++) {
    lineHtml += renderNotationToken('\u00A0', normalizedChords[i]?.value || '', melodySequence[i] || '');
  }

  lineHtml += '</div>';
  return lineHtml;
}

function extractChordSequence(line) {
  const bracketChords = [...line.matchAll(/\[([^\]]+)\]/g)]
    .map(match => ({ value: match[1].trim(), index: match.index }));

  if (bracketChords.length) {
    return bracketChords;
  }

  return [...line.matchAll(CHORD_TOKEN_PATTERN)]
    .map(match => ({ value: match[1], index: match.index }));
}

function normalizeNotationSequence(sequence) {
  return sequence.map((item, index) => {
    if (typeof item === 'string') {
      return { value: item, index: null, order: index };
    }

    return {
      value: item?.value || '',
      index: Number.isFinite(item?.index) ? item.index : null,
      order: index
    };
  }).filter(item => item.value);
}

function getWordPositions(line) {
  return [...line.matchAll(/\S+/g)].map((match, index) => ({
    index,
    start: match.index,
    end: match.index + match[0].length
  }));
}

function mapPositionedItemsToWords(sequence, wordPositions) {
  const mapped = new Map();
  const positionedItems = normalizeNotationSequence(sequence).filter(item => item.index != null);

  positionedItems.forEach(item => {
    const nearestWord = wordPositions.reduce((best, word) => {
      const distance = Math.abs(word.start - item.index);
      if (!best || distance < best.distance) {
        return { word, distance };
      }

      return best;
    }, null);

    if (nearestWord) {
      mapped.set(nearestWord.word.index, item.value);
    }
  });

  return mapped;
}

function extractStandaloneMelodyLine(line) {
  const trimmed = line.trim();
  const source = trimmed.startsWith('//') ? trimmed.slice(2).trim() : trimmed;
  const bracedNotes = [...source.matchAll(/\{([^\}]+)\}/g)]
    .flatMap(match => extractMelodyNotes(match[1]));

  if (bracedNotes.length && source.replace(/\{[^\}]+\}/g, '').trim() === '') {
    return bracedNotes;
  }

  const notes = extractMelodyNotes(source);
  const leftovers = source
    .replace(MELODY_NOTE_PATTERN, '')
    .replace(/[|\s,;/\\-]/g, '');

  return notes.length && leftovers === '' ? notes : [];
}

function extractMelodyNotes(text) {
  return [...text.matchAll(MELODY_NOTE_PATTERN)]
    .map(match => `${match[2]}${match[3] || ''}${match[4] || ''}`);
}

function renderTextWithNotation(text, chord, melody) {
  const melodyNotes = melody ? melody.trim().split(/\s+/).filter(Boolean) : [];
  if (melodyNotes.length <= 1) {
    return renderNotationToken(text || '\u00A0', chord, melody);
  }

  const tokens = (text || '\u00A0').split(/(\s+)/);
  let melodyIndex = 0;
  let chordWasUsed = false;
  let renderedAnyWord = false;

  const html = tokens.map(token => {
    if (!token) return '';
    if (/^\s+$/.test(token)) return `<span>${escapeHTML(token)}</span>`;

    renderedAnyWord = true;
    const noteForWord = melodyNotes[melodyIndex] || '';
    const chordForWord = chordWasUsed ? '' : chord;
    melodyIndex += 1;
    chordWasUsed = true;
    return renderNotationToken(token, chordForWord, noteForWord);
  }).join('');

  return renderedAnyWord ? html : renderNotationToken('\u00A0', chord, melody);
}

function renderNotationToken(text, chord, melody) {
  const safeText = escapeHTML(text || '\u00A0');
  const safeChord = chord ? escapeHTML(chord) : '';
  const safeMelody = melody ? escapeHTML(melody) : '';
  return `
    <span class="notation-wrapper">
      <span class="inline-chord">${safeChord}</span>
      <span class="inline-melody">${safeMelody}</span>
      <span class="inline-lyric">${safeText}</span>
    </span>
  `;
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
      ${song.key ? `<span class="song-item-badge">${escapeHTML(getDisplayKey(song.key))}</span>` : ''}
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
  DOM.songDetailKey.textContent = getDisplayKey(song.key) || 'N/A';
  DOM.songDetailBpm.textContent = song.bpm ? `${song.bpm} BPM` : 'Sin tempo';
  const displayMelody = getDisplayMelody(song.melody || '');
  DOM.melodyViewer.dataset.hasMelody = displayMelody.trim() ? 'true' : 'false';
  DOM.melodyViewer.innerHTML = displayMelody.trim()
    ? `<div class="melody-label">Melodía</div><pre>${escapeHTML(displayMelody)}</pre>`
    : '';
  
  // Renderizar letras con acordes
  DOM.lyricsViewer.innerHTML = parseLyricsHTML(getDisplayLyrics(song.lyrics));
  
  // Configurar visualización de acordes y melodía
  updateNotationVisibility();
  
  // Actualizar clase activa en la barra lateral
  document.querySelectorAll('.song-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Buscar y marcar activo el elemento en la lista
  renderSongsList(DOM.searchInput.value);
  
  // Cambiar de pestaña en móvil a la del detalle (Main Panel)
  switchMobilePanel('main');
}

function applyNotationModeToElements(mode, lyricsElement, melodyElement, buttonElement) {
  const showChords = mode === 'all' || mode === 'chords';
  const showMelody = (mode === 'all' || mode === 'melody') && melodyElement?.dataset.hasMelody === 'true';
  const showInlineMelody = mode === 'all' || mode === 'melody';
  
  lyricsElement.classList.toggle('hide-chords', !showChords);
  lyricsElement.classList.toggle('hide-melody', !showInlineMelody);
  if (melodyElement) {
    melodyElement.style.display = showMelody ? 'block' : 'none';
  }
  
  if (buttonElement) {
    buttonElement.classList.toggle('btn-accent', mode !== 'lyrics');
    buttonElement.classList.toggle('btn-secondary', mode === 'lyrics');
    const label = buttonElement.querySelector('span') || buttonElement;
    label.textContent = NOTATION_VIEW_LABELS[mode];
    buttonElement.title = `Vista: ${NOTATION_VIEW_LABELS[mode]}`;
  }
}

function getNextNotationMode(currentMode) {
  const currentIndex = NOTATION_VIEW_MODES.indexOf(currentMode);
  return NOTATION_VIEW_MODES[(currentIndex + 1) % NOTATION_VIEW_MODES.length];
}

function updateNotationVisibility() {
  applyNotationModeToElements(notationViewMode, DOM.lyricsViewer, DOM.melodyViewer, DOM.btnToggleChords);
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
      <div class="rehearsal-song-title" style="cursor: pointer; text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color var(--transition-fast);" onmouseover="this.style.textDecorationColor='var(--color-accent)'" onmouseout="this.style.textDecorationColor='transparent'">${escapeHTML(song.title)}</div>
      ${song.key ? `<div class="rehearsal-song-key">${escapeHTML(getDisplayKey(song.key))}</div>` : ''}
      
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
    
    // Al hacer clic en el título de la canción del setlist, se abre el modo ensayo en esa canción directamente
    const titleEl = item.querySelector('.rehearsal-song-title');
    titleEl.addEventListener('click', () => {
      startPresentationModeAtIndex(index);
    });
    
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
  DOM.songMelodyInput.value = '';
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
  DOM.songMelodyInput.value = song.melody || '';
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
  const melody = DOM.songMelodyInput.value.trim();
  const lyrics = DOM.songLyricsInput.value;
  const updatedAt = Date.now();
  
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
        melody,
        lyrics,
        updatedAt
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
      melody,
      lyrics,
      updatedAt
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
  startPresentationModeAtIndex(0);
}

function startPresentationModeAtIndex(index) {
  if (rehearsalSetlist.length === 0) return;
  
  presentationIndex = index;
  presentationNotationViewMode = notationViewMode;
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
  DOM.presArtist.textContent = `${song.artist} | Tono: ${getDisplayKey(song.key) || 'N/A'}`;
  
  // Renderizar melodía y letras
  const presentationMelody = getDisplayMelody(song.melody || '');
  DOM.presLyricsArea.innerHTML = `
    ${presentationMelody.trim() ? `<div class="presentation-melody" data-has-melody="true"><div class="melody-label">Melodía</div><pre>${escapeHTML(presentationMelody)}</pre></div>` : ''}
    ${parseLyricsHTML(getDisplayLyrics(song.lyrics))}
  `;
  
  // Aplicar escala de fuente
  DOM.presLyricsArea.style.fontSize = `${fontSizePercent}%`;
  
  // Alternar acordes y melodía
  updatePresentationNotationVisibility();
  
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

function updatePresentationNotationVisibility() {
  const melodyElement = DOM.presLyricsArea.querySelector('.presentation-melody');
  if (melodyElement) melodyElement.dataset.hasMelody = 'true';
  applyNotationModeToElements(presentationNotationViewMode, DOM.presLyricsArea, melodyElement, DOM.btnPresChords);
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

// Desplazamiento Automático (AutoScroll) con Velocidad Ajustable
function toggleAutoScroll() {
  if (isAutoScrolling) {
    stopAutoScroll();
  } else {
    isAutoScrolling = true;
    DOM.btnPresScroll.classList.add('btn-primary');
    DOM.btnPresScroll.classList.remove('btn-accent');
    DOM.btnPresScroll.textContent = "Pausar Scroll";
    
    runScrollInterval();
  }
}

function runScrollInterval() {
  if (autoScrollIntervalId) clearInterval(autoScrollIntervalId);
  
  const speed = parseInt(DOM.inputScrollSpeed.value);
  // Mapear velocidad 1-10 a milisegundos de intervalo (1 -> 150ms, 10 -> 15ms)
  const intervalMs = 160 - (speed * 14);
  
  autoScrollIntervalId = setInterval(() => {
    DOM.presLyricsScroll.scrollTop += 1;
    
    // Detener al final del scroll
    const maxScroll = DOM.presLyricsScroll.scrollHeight - DOM.presLyricsScroll.clientHeight;
    if (DOM.presLyricsScroll.scrollTop >= maxScroll - 1) {
      stopAutoScroll();
    }
  }, intervalMs);
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
function getExportFileName() {
  return `lyricflow_songs_${new Date().toISOString().slice(0,10)}.json`;
}

function getExportJson() {
  return JSON.stringify(songs, null, 2);
}

function exportSongsData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(getExportJson());
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", getExportFileName());
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Base de datos exportada");
}

async function shareSongsData() {
  const fileName = getExportFileName();
  const jsonBlob = new Blob([getExportJson()], { type: 'application/json' });
  const jsonFile = new File([jsonBlob], fileName, { type: 'application/json' });
  
  if (navigator.canShare && navigator.canShare({ files: [jsonFile] })) {
    try {
      await navigator.share({
        files: [jsonFile],
        title: 'Copia de LyricFlow',
        text: 'Copia de seguridad de canciones de LyricFlow'
      });
      showToast("Copia lista para compartir");
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  
  exportSongsData();
  showToast("Si no ves el panel de compartir, revisa Descargas");
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

function refreshTransposedViews() {
  if (currentSongId && DOM.detailView.style.display !== 'none') {
    selectSong(currentSongId);
  }
  
  renderRehearsalList();
  
  if (DOM.presentationMode.classList.contains('active')) {
    renderPresentationSong();
  }
}

function initInstrumentSelector() {
  const savedInstrument = localStorage.getItem('lyricflow_selected_instrument') || 'concert';
  selectedInstrument = TRANSPOSING_INSTRUMENTS[savedInstrument] ? savedInstrument : 'concert';
  if (DOM.instrumentSelect) {
    DOM.instrumentSelect.value = selectedInstrument;
  }

  const savedManualTranspose = localStorage.getItem('lyricflow_manual_transpose') || '0';
  manualTransposeSemitones = parseInt(savedManualTranspose, 10) || 0;
  if (DOM.transposeSelect) {
    DOM.transposeSelect.value = String(manualTransposeSemitones);
  }
}

// --- CONFIGURAR LISTENERS ---
function setupEventListeners() {
  // Buscador
  DOM.searchInput.addEventListener('input', (e) => {
    renderSongsList(e.target.value);
  });

  if (DOM.instrumentSelect) {
    DOM.instrumentSelect.addEventListener('change', (e) => {
      selectedInstrument = e.target.value;
      localStorage.setItem('lyricflow_selected_instrument', selectedInstrument);
      refreshTransposedViews();
    });
  }

  if (DOM.transposeSelect) {
    DOM.transposeSelect.addEventListener('change', (e) => {
      manualTransposeSemitones = parseInt(e.target.value, 10) || 0;
      localStorage.setItem('lyricflow_manual_transpose', String(manualTransposeSemitones));
      refreshTransposedViews();
    });
  }
  
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
    notationViewMode = getNextNotationMode(notationViewMode);
    updateNotationVisibility();
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
  if (DOM.btnShareData) DOM.btnShareData.addEventListener('click', shareSongsData);
  if (DOM.btnExportDataLeft) DOM.btnExportDataLeft.addEventListener('click', exportSongsData);
  if (DOM.btnImportDataLeft) DOM.btnImportDataLeft.addEventListener('click', triggerImportFileInput);
  if (DOM.btnShareDataLeft) DOM.btnShareDataLeft.addEventListener('click', shareSongsData);
  DOM.importFileInput.addEventListener('change', importSongsData);
  
  // Presentación
  DOM.btnClosePresentation.addEventListener('click', closePresentationMode);
  DOM.btnPresPrev.addEventListener('click', () => navigatePresentation(-1));
  DOM.btnPresNext.addEventListener('click', () => navigatePresentation(1));
  DOM.btnPresMetroToggle.addEventListener('click', toggleMetronome);
  DOM.btnPresScroll.addEventListener('click', toggleAutoScroll);
  
  // Sintonizador de velocidad del AutoScroll
  DOM.inputScrollSpeed.addEventListener('input', (e) => {
    DOM.scrollSpeedVal.textContent = e.target.value;
    if (isAutoScrolling) {
      runScrollInterval();
    }
  });
  
  DOM.btnPresChords.addEventListener('click', () => {
    presentationNotationViewMode = getNextNotationMode(presentationNotationViewMode);
    updatePresentationNotationVisibility();
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
  
  // Botón de alternar tema claro/oscuro
  document.getElementById('btn-toggle-theme').addEventListener('click', toggleTheme);
  
  // Controladores del Modal de Sincronización en la Nube
  DOM.btnOpenSync.addEventListener('click', () => {
    DOM.syncModal.style.display = 'flex';
    // Auto-rellenar configuraciones si existen
    const savedConfig = localStorage.getItem('lyricflow_sync_config');
    const savedCode = localStorage.getItem('lyricflow_sync_band_code');
    DOM.syncFirebaseConfig.value = savedConfig || JSON.stringify(DEFAULT_FIREBASE_CONFIG);
    if (savedCode) DOM.syncBandCode.value = savedCode;
  });
  
  DOM.btnCloseSyncModal.addEventListener('click', () => {
    DOM.syncModal.style.display = 'none';
  });
  
  DOM.btnSaveSyncConfig.addEventListener('click', () => {
    const configText = DOM.syncFirebaseConfig.value.trim() || JSON.stringify(DEFAULT_FIREBASE_CONFIG);
    const bandCode = DOM.syncBandCode.value.trim();
    if (!bandCode) {
      showToast("Escribe un código de banda o sala");
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
  const savedConfig = localStorage.getItem('lyricflow_sync_config') || JSON.stringify(DEFAULT_FIREBASE_CONFIG);
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

function mergeSongsPreferLocal(localSongs, cloudSongs) {
  const mergedById = new Map();
  let changed = false;

  (cloudSongs || []).forEach(song => {
    if (song?.id) mergedById.set(song.id, song);
  });

  (localSongs || []).forEach(localSong => {
    if (!localSong?.id) return;
    const cloudSong = mergedById.get(localSong.id);

    if (!cloudSong) {
      mergedById.set(localSong.id, localSong);
      changed = true;
      return;
    }

    const localTime = localSong.updatedAt || 0;
    const cloudTime = cloudSong.updatedAt || 0;
    const preferredSong = localTime >= cloudTime ? localSong : cloudSong;
    if (JSON.stringify(preferredSong) !== JSON.stringify(cloudSong)) {
      changed = true;
    }
    mergedById.set(localSong.id, preferredSong);
  });

  return {
    songs: Array.from(mergedById.values()),
    needsUpload: changed || JSON.stringify(cloudSongs || []) !== JSON.stringify(Array.from(mergedById.values()))
  };
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
    
    // Sincronizar si la nube es más reciente o si es la primera sincronización
    if (cloudTime > lastSyncedTime) {
      const firstSync = (lastSyncedTime === 0);
      lastSyncedTime = cloudTime;
      
      let changed = false;
      
      if (cloudData.songs) {
        if (firstSync) {
          // 1. Crear respaldo local de seguridad en localStorage antes de sincronizar por primera vez
          if (localStorage.getItem('lyricflow_songs')) {
            localStorage.setItem('lyricflow_songs_backup', localStorage.getItem('lyricflow_songs'));
          }
          if (localStorage.getItem('lyricflow_setlist')) {
            localStorage.setItem('lyricflow_setlist_backup', localStorage.getItem('lyricflow_setlist'));
          }
          
          // 2. Fusión inteligente en la primera sincronización.
          // Si una misma canción existe local y en nube, gana la copia más reciente.
          // Las canciones que existan solo en la nube se añaden sin borrar las locales.
          const merged = mergeSongsPreferLocal(songs, cloudData.songs);

          if (merged.needsUpload || JSON.stringify(merged.songs) !== JSON.stringify(songs)) {
            songs = merged.songs;
            localStorage.setItem('lyricflow_songs', JSON.stringify(songs));
            if (merged.needsUpload) uploadLocalData(docRef);
            changed = true;
          }
        } else {
          // Sincronización normal posterior
          if (JSON.stringify(cloudData.songs) !== JSON.stringify(songs)) {
            songs = cloudData.songs;
            localStorage.setItem('lyricflow_songs', JSON.stringify(songs));
            changed = true;
          }
        }
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
        if (!firstSync) {
          showToast("Nube sincronizada");
        }
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

// ==========================================================================
// LÓGICA DEL TEMA VISUAL (CLARO / OSCURO)
// ==========================================================================

function initTheme() {
  const savedTheme = localStorage.getItem('lyricflow_theme') || 'dark';
  setTheme(savedTheme);
}

function setTheme(theme) {
  currentTheme = theme;
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    document.getElementById('theme-icon-sun').style.display = 'inline-block';
    document.getElementById('theme-icon-moon').style.display = 'none';
  } else {
    document.body.classList.remove('light-theme');
    document.getElementById('theme-icon-sun').style.display = 'none';
    document.getElementById('theme-icon-moon').style.display = 'inline-block';
  }
  localStorage.setItem('lyricflow_theme', theme);
}

function toggleTheme() {
  if (currentTheme === 'light') {
    setTheme('dark');
  } else {
    setTheme('light');
  }
}
