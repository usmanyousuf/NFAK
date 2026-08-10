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

let trackIndex = 0;
let wasPlayingBeforeSeek = false;

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
  if (autoplay) audio.play().catch(() => setPlayingState(false));
}

function setPlayingState(isPlaying) {
  playPause.classList.toggle("is-playing", isPlaying);
  playPause.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function changeTrack(direction) {
  loadTrack(trackIndex + direction, !audio.paused);
}

function setVolume(value) {
  audio.volume = Math.min(1, Math.max(0, value));
  audio.muted = audio.volume === 0;
  volume.value = audio.volume;
  muteButton.classList.toggle("is-muted", audio.muted);
  muteButton.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
  setRangeFill(volume, audio.volume * 100);
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

audio.addEventListener("play", () => setPlayingState(true));
audio.addEventListener("pause", () => setPlayingState(false));
audio.addEventListener("ended", () => { loadTrack(trackIndex + 1, true); });
audio.addEventListener("loadedmetadata", () => { duration.textContent = formatTime(audio.duration); });
audio.addEventListener("durationchange", () => { duration.textContent = formatTime(audio.duration); });
audio.addEventListener("timeupdate", () => {
  if (!progress.matches(":active")) {
    const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progress.value = percent;
    setRangeFill(progress, percent);
  }
  currentTime.textContent = formatTime(audio.currentTime);
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
});

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

setVolume(Number(volume.value));
loadTrack(0);
