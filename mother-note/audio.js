'use strict';

(() => {
  const preferenceKey = 'mothers-note-audio-enabled-v1';
  function readPreference() {
    try { return localStorage.getItem(preferenceKey) === '1'; } catch { return false; }
  }
  function writePreference(value) {
    try { localStorage.setItem(preferenceKey, value ? '1' : '0'); } catch {}
  }
  const files = {
    music: 'assets/audio/horror-atmosphere.ogg',
    paper: 'assets/audio/sfx/paper_01.ogg',
    door: 'assets/audio/sfx/door_01.ogg',
    doorOpen: 'assets/audio/sfx/door_open.ogg',
    doorClose: 'assets/audio/sfx/door_close_01.ogg',
    wardrobe: 'assets/audio/sfx/wooden_01.ogg',
    static: 'assets/audio/sfx/noise_01.ogg',
    distortion: 'assets/audio/sfx/weird_02.ogg',
    machine: 'assets/audio/sfx/machine_01.ogg',
    metal: 'assets/audio/sfx/metal_04.ogg',
    uiClick: 'assets/audio/sfx/switch_01.ogg',
    catPurr: 'assets/audio/cat-purrsleepy-loop.wav',
    catMew: 'assets/audio/cat-mewfood.wav',
    heartbeat: 'assets/audio/heartbeat-slow-reverb.wav'
  };
  const labels = {
    music: '背景环境循环', paper: '纸条音效', door: '门声', doorOpen: '开门声', doorClose: '关门声',
    wardrobe: '衣柜木响', static: '白噪声', distortion: '侵蚀异响', machine: '机械环境声', metal: '金属环境声',
    uiClick: '按钮确认音', catPurr: '猫猫呼噜', catMew: '猫猫叫声', heartbeat: '低清醒度心跳'
  };
  const volumes = {
    paper: 0.20,
    door: 0.24,
    doorOpen: 0.18,
    doorClose: 0.22,
    wardrobe: 0.18,
    static: 0.16,
    distortion: 0.18,
    machine: 0.10,
    metal: 0.12,
    uiClick: 0.12,
    catPurr: 0.22,
    catMew: 0.24,
    heartbeat: 0.15
  };
  const eventSounds = { 2: 'door', 5: 'door', 8: 'catMew', 12: 'static', 17: 'door', 22: 'distortion', 27: 'door' };
  let enabled = readPreference();
  let music = null;
  let heartbeat = null;
  let mood = { phase: 0, erosion: 0, sanity: 100 };
  const oneShots = new Set();
  const warned = new Set();
  const sharedKeys = new Set(['music', 'heartbeat']);

  function supported() { return typeof Audio === 'function'; }
  function warn(key) {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(`[妈妈留的纸条] 音频加载失败：${key}`);
  }
  function create(key, loop = false) {
    if (!supported() || !files[key]) return null;
    try {
      const preloaded = window.__MothersNotePreloadedAudio?.[files[key]];
      const audio = sharedKeys.has(key) && preloaded ? preloaded : new Audio(files[key]);
      audio.preload = loop ? 'auto' : 'none';
      audio.loop = loop;
      audio.addEventListener('error', () => warn(key));
      return audio;
    } catch {
      warn(key);
      return null;
    }
  }
  function playSafe(audio) {
    if (!audio) return;
    const task = audio.play();
    if (task?.catch) task.catch(() => {});
  }
  function stop(audio) {
    if (!audio) return;
    audio.pause();
    try { audio.currentTime = 0; } catch {}
  }
  function musicVolume() {
    return Math.min(0.12, 0.055 + (mood.phase === 2 ? 0.015 : 0) + mood.erosion * 0.012);
  }
  function updateMood(next = {}) {
    mood = { ...mood, ...next };
    if (!enabled) return;
    if (music) music.volume = musicVolume();
    const shouldHeartbeat = mood.sanity < 35;
    if (shouldHeartbeat && !heartbeat) {
      heartbeat = create('heartbeat', true);
      if (heartbeat) {
        heartbeat.volume = volumes.heartbeat;
        playSafe(heartbeat);
      }
    } else if (!shouldHeartbeat && heartbeat) {
      stop(heartbeat);
      heartbeat = null;
    }
  }
  function ensureAmbience() {
    if (!enabled) return;
    if (!music) music = create('music', true);
    if (music) {
      music.volume = musicVolume();
      playSafe(music);
    }
    updateMood();
  }
  function enable() {
    if (!supported()) return false;
    enabled = true;
    writePreference(true);
    ensureAmbience();
    return true;
  }
  function disable() {
    enabled = false;
    writePreference(false);
    stop(music);
    stop(heartbeat);
    heartbeat = null;
    oneShots.forEach(stop);
    oneShots.clear();
    return false;
  }
  function toggle() { return enabled ? disable() : enable(); }
  function play(key, multiplier = 1) {
    if (!enabled || !files[key]) return false;
    ensureAmbience();
    return playOneShot(key, multiplier);
  }
  function playOneShot(key, multiplier = 1) {
    if (!files[key]) return false;
    const audio = create(key);
    if (!audio) return false;
    audio.volume = Math.max(0, Math.min(1, (volumes[key] || 0.16) * multiplier));
    const release = () => {
      oneShots.delete(audio);
      audio.removeEventListener('ended', release);
    };
    oneShots.add(audio);
    audio.addEventListener('ended', release, { once: true });
    playSafe(audio);
    return true;
  }
  function preview(key, multiplier = 1) {
    if (!files[key]) return false;
    if (key === 'music' || key === 'heartbeat') {
      const current = key === 'music' ? music : heartbeat;
      const audio = current || create(key, true);
      if (!audio) return false;
      if (key === 'music') music = audio;
      else heartbeat = audio;
      audio.volume = Math.max(0, Math.min(1, (key === 'music' ? musicVolume() : volumes.heartbeat) * multiplier));
      playSafe(audio);
      return true;
    }
    return playOneShot(key, multiplier);
  }
  function stopAll() {
    stop(music);
    stop(heartbeat);
    oneShots.forEach(stop);
    oneShots.clear();
  }
  function status() {
    return {
      enabled,
      musicPlaying: !!music && !music.paused,
      heartbeatPlaying: !!heartbeat && !heartbeat.paused,
      oneShots: oneShots.size,
      preferenceKey
    };
  }
  function playEvent(day) { return play(eventSounds[day]); }
  function handleButtonClick(event) {
    const button = event.target?.closest?.('button');
    if (!button || button.disabled || button.id === 'sound') return;
    play('uiClick', button.matches('.hotspot') ? 0.85 : 1);
  }
  function handleVisibility() {
    if (!enabled) return;
    if (document.hidden) {
      music?.pause();
      heartbeat?.pause();
      oneShots.forEach(audio => audio.pause());
    } else {
      playSafe(music);
      playSafe(heartbeat);
    }
  }
  function restore() { if (enabled) ensureAmbience(); return enabled; }

  document.addEventListener('visibilitychange', handleVisibility);
  document.addEventListener('click', handleButtonClick, true);
  const manifest = Object.entries(files).map(([key, src]) => ({ key, src, type: 'audio', label: labels[key] || key, loop: key === 'music' || key === 'heartbeat', volume: key === 'music' ? musicVolume() : (volumes[key] || 0.16) }));
  window.AudioManager = { enable, disable, toggle, play, preview, stopAll, status, playEvent, updateMood, handleVisibility, restore, isEnabled: () => enabled, manifest, labels, eventSounds };
})();
