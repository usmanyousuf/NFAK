const playlist = [
  { title: "Ali Maula Ali Maula Ali Dam Dam", src: "assets/songs/ali-maula.mp3" },
  { title: "Barsoon Kay Intizar Ka", src: "assets/songs/barsoon-kay-intizar-ka.mp3" },
  { title: "Doston Ki Shikayat", src: "assets/songs/doston-ki-shikayat.mp3" },
  { title: "Nothing Without You", src: "assets/songs/nothing-without-you.mp3" },
];

const audio = document.querySelector("#audio");
const playPause = document.querySelector("#play-pause");
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const rewind = document.querySelector("#rewind");
const forward = document.querySelector("#forward");
const progress = document.querySelector("#progress");
const volume = document.querySelector("#volume");
const muteButton = document.querySelector("#mute-button");
const title = document.querySelector("#track-title");
const currentTime = document.querySelector("#current-time");
const duration = document.querySelector("#duration");
const liveUsers = document.querySelector("#live-users");

const STORAGE_KEY = "nfak-player-state-v1";
const DEFAULT_VOLUME = 0.8;
const artworkUrl = new URL("assets/images/nfak-singer.png", window.location.href).href;

let trackIndex = 0;
let wasPlayingBeforeSeek = false;
let restoredPosition = 0;
let lastSavedSecond = -1;

function readSavedState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!state || typeof state !== "object") return null;

    const index = Number.isInteger(state.trackIndex) && state.trackIndex >= 0 && state.trackIndex < playlist.length
      ? state.trackIndex
      : 0;

    return {
      trackIndex: index,
      position: Number.isFinite(state.position) && state.position >= 0 ? state.position : 0,
      volume: Number.isFinite(state.volume) ? Math.min(1, Math.max(0, state.volume)) : DEFAULT_VOLUME,
      muted: typeof state.muted === "boolean" ? state.muted : false,
    };
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      trackIndex,
      position: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      volume: audio.volume,
      muted: audio.muted,
    }));
  } catch {
    // Storage can be unavailable in private browsing or embedded contexts.
  }
}

function setRangeFill(input, value) {
  input.style.setProperty("--value", `${value}%`);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function loadTrack(index, autoplay = false) {
  trackIndex = (index + playlist.length) % playlist.length;
  const track = playlist[trackIndex];
  audio.src = track.src;
  title.textContent = track.title;
  progress.value = 0;
  setRangeFill(progress, 0);
  currentTime.textContent = "0:00";
  duration.textContent = "0:00";
  updateMediaMetadata();
  if (autoplay) audio.play().catch(() => setPlayingState(false));
}

function updateMediaMetadata() {
  if (!("mediaSession" in navigator) || !("MediaMetadata" in window)) return;
  const track = playlist[trackIndex];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: "Nusrat Fateh Ali Khan",
    album: "NFAK Qawwali Player",
    artwork: [{ src: artworkUrl }],
  });
}

function updateMediaPosition() {
  if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") return;
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: Math.min(audio.duration, Math.max(0, audio.currentTime)),
    });
  } catch {
    // Some browsers reject position updates while metadata is still loading.
  }
}

function setPlayingState(isPlaying) {
  playPause.classList.toggle("is-playing", isPlaying);
  playPause.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function changeTrack(direction) {
  loadTrack(trackIndex + direction, !audio.paused);
  saveState();
}

function setVolume(value, persist = true) {
  audio.volume = Math.min(1, Math.max(0, value));
  audio.muted = audio.volume === 0;
  volume.value = audio.volume;
  muteButton.classList.toggle("is-muted", audio.muted);
  muteButton.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
  setRangeFill(volume, audio.volume * 100);
  if (persist) saveState();
}

function togglePlayback() {
  if (audio.paused) audio.play().catch(() => setPlayingState(false));
  else audio.pause();
}

playPause.addEventListener("click", togglePlayback);

previous.addEventListener("click", () => changeTrack(-1));
next.addEventListener("click", () => changeTrack(1));
rewind.addEventListener("click", () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
forward.addEventListener("click", () => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10); });

audio.addEventListener("play", () => {
  setPlayingState(true);
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
});
audio.addEventListener("pause", () => {
  setPlayingState(false);
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  saveState();
});
audio.addEventListener("ended", () => { loadTrack(trackIndex + 1, true); });
audio.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audio.duration);
  if (restoredPosition > 0) {
    audio.currentTime = Math.min(restoredPosition, Math.max(0, audio.duration - 0.1));
    restoredPosition = 0;
  }
  updateMediaPosition();
});
audio.addEventListener("durationchange", () => { duration.textContent = formatTime(audio.duration); });
audio.addEventListener("timeupdate", () => {
  if (!progress.matches(":active")) {
    const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.value = percent;
    setRangeFill(progress, percent);
  }
  currentTime.textContent = formatTime(audio.currentTime);
  updateMediaPosition();
  const wholeSecond = Math.floor(audio.currentTime);
  if (wholeSecond !== lastSavedSecond && wholeSecond % 5 === 0) {
    lastSavedSecond = wholeSecond;
    saveState();
  }
});

progress.addEventListener("pointerdown", () => { wasPlayingBeforeSeek = !audio.paused; });
progress.addEventListener("input", () => {
  const preview = audio.duration ? (Number(progress.value) / 100) * audio.duration : 0;
  currentTime.textContent = formatTime(preview);
  setRangeFill(progress, Number(progress.value));
});
progress.addEventListener("change", () => {
  if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  if (wasPlayingBeforeSeek) audio.play().catch(() => {});
});

volume.addEventListener("input", () => {
  setVolume(Number(volume.value));
});

muteButton.addEventListener("click", () => {
  audio.muted = !audio.muted;
  muteButton.classList.toggle("is-muted", audio.muted);
  muteButton.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
  saveState();
});

if ("mediaSession" in navigator) {
  const handlers = {
    play: () => audio.play(),
    pause: () => audio.pause(),
    previoustrack: () => changeTrack(-1),
    nexttrack: () => changeTrack(1),
    seekbackward: (details) => { audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10)); },
    seekforward: (details) => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + (details.seekOffset || 10)); },
    seekto: (details) => {
      if (Number.isFinite(details.seekTime)) audio.currentTime = Math.min(audio.duration || Infinity, Math.max(0, details.seekTime));
    },
  };

  Object.entries(handlers).forEach(([action, handler]) => {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Unsupported action. */ }
  });
}

function connectPresence() {
  if (!("EventSource" in window) || window.location.protocol === "file:") return;
  const source = new EventSource("/api/presence");
  source.addEventListener("presence", (event) => {
    let count;
    try { count = Number(JSON.parse(event.data).count); } catch { return; }
    if (!Number.isInteger(count) || count < 1) return;
    liveUsers.textContent = `${count.toLocaleString()} LIVE`;
    liveUsers.hidden = false;
    liveUsers.setAttribute("aria-label", `${count} ${count === 1 ? "person is" : "people are"} listening now`);
  });
  source.addEventListener("error", () => { liveUsers.hidden = true; });
}

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  switch (event.code) {
    case "Space":
      event.preventDefault();
      if (!event.repeat) togglePlayback();
      break;
    case "ArrowUp":
      event.preventDefault();
      setVolume(audio.volume + 0.05);
      break;
    case "ArrowDown":
      event.preventDefault();
      setVolume(audio.volume - 0.05);
      break;
    case "ArrowRight":
      event.preventDefault();
      audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10);
      break;
    case "ArrowLeft":
      event.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      break;
  }
});

const savedState = readSavedState();
restoredPosition = savedState?.position || 0;
loadTrack(savedState?.trackIndex || 0);
setVolume(savedState?.volume ?? DEFAULT_VOLUME, false);
audio.muted = savedState?.muted || false;
muteButton.classList.toggle("is-muted", audio.muted);
muteButton.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
window.addEventListener("pagehide", saveState);
document.addEventListener("visibilitychange", () => { if (document.hidden) saveState(); });
connectPresence();
