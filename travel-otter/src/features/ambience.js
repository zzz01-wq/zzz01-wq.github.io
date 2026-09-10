import { $, state, ui, save } from "../store.js";
import { icon } from "../icons.js";
import { BGM_DATA } from "../assets.js";
export function createAmbience(app) {
  const show = (...args) => app.show(...args);
  const openPanel = (...args) => app.openPanel(...args);
  const toast = (...args) => app.toast(...args);
  const ensureGrowth = (...args) => app.ensureGrowth(...args);
  const growthLevel = (...args) => app.growthLevel(...args);
  let lastAmbience = "",
    musicPlayer = null;
  function currentPeriod() {
    if (state.ambience.time !== "auto") return state.ambience.time;
    const h = new Date().getHours();
    return h >= 7 && h < 17 ? "day" : h >= 17 && h < 20 ? "sunset" : "night";
  }
  function atmosphereRender() {
    ensureGrowth();
    const period = currentPeriod();
    $("#game").dataset.period = period;
    $("#game").dataset.environmentMotion = String(state.ambience.motion);
    $("#weather-label").textContent = {
      day: "晴 · 微风",
      sunset: "黄昏 · 暖风",
      night: "夜深 · 静谧",
    }[period];
    $("#profile-subtitle").textContent = state.growth.title || "阿獭的河畔小屋";
    $("#profile-level").textContent = "LV." + (growthLevel() + 1);
    $("#growth-dot").hidden = !app.GOALS.some(
      (g) => g.value() >= g.need && !state.growth.claimed.includes(g.id),
    );
    ensureAudio();
    const enabled = !state.ambience.muted;
    $("#sound-button").innerHTML =
      icon(enabled ? "music" : "mute") +
      `<span>${enabled ? "声音" : "静音"}</span>`;
    $("#sound-button").setAttribute(
      "aria-label",
      enabled ? "静音全部声音" : "恢复音乐与音效",
    );
    $("#sound-button").setAttribute("aria-pressed", String(enabled));
    if (lastAmbience !== period) {
      $("#weather-icon").innerHTML = icon(period === "night" ? "moon" : "sun");
      lastAmbience = period;
    }
  }
  let audioContext = null,
    musicGain = null,
    musicSource = null,
    audioUnlocked = false,
    audioRevision = 0,
    lastFxAt = 0;
  function ensureAudio() {
    ensureGrowth();
    const a = state.ambience;
    if (typeof a.muted !== "boolean") {
      a.muted = !a.music;
      a.music = true;
    }
    if (typeof a.effects !== "boolean") a.effects = true;
    if (!Number.isFinite(a.sfxVolume)) a.sfxVolume = 0.4;
    a.volume = Math.max(
      0,
      Math.min(1, Number.isFinite(a.volume) ? a.volume : 0.35),
    );
    a.sfxVolume = Math.max(0, Math.min(1, a.sfxVolume));
  }
  function soundContext() {
    if (!audioContext) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C)
        try {
          audioContext = new C();
        } catch {}
    }
    return audioContext;
  }
  function updateAudioGain() {
    const a = state.ambience;
    if (musicGain)
      musicGain.gain.setTargetAtTime(
        a.muted ? 0 : a.volume,
        audioContext.currentTime,
        0.035,
      );
    else if (musicPlayer) musicPlayer.volume = a.muted ? 0 : a.volume;
  }
  function getMusic() {
    if (!musicPlayer) {
      musicPlayer = new Audio(BGM_DATA);
      musicPlayer.loop = true;
      musicPlayer.preload = "none";
      musicPlayer.addEventListener("error", () => {
        toast("音乐暂时无法播放，可重新点击播放。");
      });
    }
    const ctx = soundContext();
    if (ctx && !musicSource)
      try {
        musicSource = ctx.createMediaElementSource(musicPlayer);
        musicGain = ctx.createGain();
        musicSource.connect(musicGain);
        musicGain.connect(ctx.destination);
        musicPlayer.volume = 1;
      } catch {}
    updateAudioGain();
    return musicPlayer;
  }
  function wantsMusic() {
    return !document.hidden && !state.ambience.muted && state.ambience.music;
  }
  async function restoreAudio() {
    ensureAudio();
    const revision = audioRevision;
    if (!wantsMusic()) {
      if (musicPlayer) musicPlayer.pause();
      return;
    }
    if (!audioUnlocked) return;
    const a = getMusic();
    try {
      if (audioContext?.state === "suspended") await audioContext.resume();
      if (revision !== audioRevision || !wantsMusic()) return;
      await a.play();
      if (!wantsMusic()) a.pause();
    } catch {
      /* Keep the saved preference; retry on the next user gesture. */
    }
    atmosphereRender();
  }
  function toggleMasterSound() {
    ensureAudio();
    state.ambience.muted = !state.ambience.muted;
    audioRevision++;
    audioUnlocked = true;
    save();
    updateAudioGain();
    if (state.ambience.muted) {
      if (musicPlayer) musicPlayer.pause();
      if (audioContext?.state === "running")
        audioContext.suspend().catch(() => {});
    } else restoreAudio();
    atmosphereRender();
    if (ui.activePanel === "ambience") renderAmbience();
  }
  async function toggleMusic() {
    ensureAudio();
    audioUnlocked = true;
    state.ambience.music = state.ambience.muted ? true : !state.ambience.music;
    if (state.ambience.music) state.ambience.muted = false;
    audioRevision++;
    save();
    updateAudioGain();
    await restoreAudio();
    atmosphereRender();
    if (ui.activePanel === "ambience") renderAmbience();
  }
  function playEffect(kind = "tap") {
    ensureAudio();
    const a = state.ambience;
    if (a.muted || !a.effects || a.sfxVolume === 0 || document.hidden) return;
    const now = Date.now();
    if (now - lastFxAt < 65) return;
    lastFxAt = now;
    const ctx = soundContext();
    if (!ctx) return;
    const revision = audioRevision;
    const sound = () => {
      if (
        revision !== audioRevision ||
        state.ambience.muted ||
        ctx.state !== "running"
      )
        return;
      const notes =
        kind === "reward"
          ? [523.25, 659.25, 783.99]
          : kind === "leaf"
            ? [740, 988]
            : kind === "buy"
              ? [440, 660]
              : kind === "close"
                ? [420]
                : [620];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          t = ctx.currentTime + i * 0.065;
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(
          freq * (kind === "tap" ? 0.72 : 1.03),
          t + 0.095,
        );
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(
          Math.max(0.0002, a.sfxVolume * 0.13),
          t + 0.008,
        );
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.18);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      });
    };
    if (ctx.state === "suspended")
      ctx
        .resume()
        .then(sound)
        .catch(() => {});
    else sound();
  }
  function setupAudio() {
    ensureAudio();
    save();
    $("#sound-button").onclick = toggleMasterSound;
    document.addEventListener(
      "click",
      (e) => {
        const target = e.target.closest?.('button,[role="button"]');
        if (!target || target.disabled) return;
        if (target.id === "sound-button" || target.dataset.music) return;
        audioUnlocked = true;
        if (!state.ambience.muted) {
          restoreAudio();
          const d = target.dataset;
          if (d.previewSound) return;
          playEffect(
            target.id === "claim" || d.goal
              ? "reward"
              : d.harvest !== undefined
                ? "leaf"
                : d.buy
                  ? "buy"
                  : target.id === "close"
                    ? "close"
                    : "tap",
          );
        }
      },
      true,
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        audioUnlocked = true;
        restoreAudio();
      }
    });
    document.addEventListener("visibilitychange", () => {
      audioRevision++;
      if (document.hidden) {
        if (musicPlayer) musicPlayer.pause();
        if (audioContext?.state === "running")
          audioContext.suspend().catch(() => {});
      } else restoreAudio();
    });
    atmosphereRender();
  }

  function renderAmbience() {
    ensureGrowth();
    show(
      "小屋的光与声音",
      "",
      `<div class="section-label">窗外的时光</div><div class="time-choices">${[
        ["auto", "随本地时间", "clock"],
        ["day", "晴朗白昼", "sun"],
        ["sunset", "温柔黄昏", "sun"],
        ["night", "安静夜晚", "moon"],
      ]
        .map(
          ([id, name, i]) =>
            `<button class="secondary ${state.ambience.time === id ? "chosen" : ""}" data-time="${id}">${icon(i)}<span>${name}</span></button>`,
        )
        .join(
          "",
        )}</div><p class="intro">自动：7–17 点白昼，17–20 点黄昏，其余时间为夜晚。只影响氛围，不改变旅行和奖励。</p><label class="checkrow"><input id="environment-motion" type="checkbox" ${state.ambience.motion ? "checked" : ""}><span>环境动效<small style="display:block">白昼光尘、黄昏暖光，夜里有轻轻闪动的微光。</small></span></label><div class="section-label">留一点音乐在小屋里</div><div class="music-card"><span>${icon("music")}</span><div><h3>Gymnopédie No. 1</h3><p>Erik Satie · 钢琴 · 约 3 分钟</p></div><button class="primary" data-music="toggle">${state.ambience.music && !state.ambience.muted ? "关闭音乐" : "开启音乐"}</button></div><label class="volume-control">音乐音量 <input id="music-volume" type="range" min="0" max="100" value="${Math.round(state.ambience.volume * 100)}"><b id="volume-number">${Math.round(state.ambience.volume * 100)}%</b></label><label class="checkrow"><input id="master-sound" type="checkbox" ${!state.ambience.muted ? "checked" : ""}><span>开启声音<small style="display:block">关闭后音乐和按钮音效都会静音。</small></span></label><label class="checkrow"><input id="button-effects" type="checkbox" ${state.ambience.effects ? "checked" : ""}><span>按钮音效<small style="display:block">轻点、采摘、购买、领奖，声音各不相同。</small></span></label><label class="volume-control">音效音量 <input id="sfx-volume" type="range" min="0" max="100" value="${Math.round(state.ambience.sfxVolume * 100)}"><b id="sfx-number">${Math.round(state.ambience.sfxVolume * 100)}%</b></label><button class="secondary full" data-preview-sound="1">试听按钮音效</button><p class="intro">声音开关和两种音量会自动记住。重新打开时，在第一次点击游戏后恢复；切到后台会暂停。可离线播放。</p><details class="music-credit"><summary>音乐来源与使用说明</summary><p>作曲：Erik Satie。录音提供者：Teknopazzo。来自 Wikimedia Commons，使用 CC0 1.0。此版本转为 MP3 并做首尾淡入淡出，未使用 AI 生成音乐。</p><a href="https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1..ogg" target="_blank" rel="noopener">查看原始录音</a> · <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener">CC0 许可</a></details>`,
    );
  }
  function setupAtmosphere() {
    const world = $(".world");
    const overlay = document.createElement("div");
    overlay.className = "ambience-layer";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="light-wash"></div><div class="glowing-dust">' +
      Array.from(
        { length: 12 },
        (_, i) =>
          `<i style="left:${(i * 29 + 7) % 94}%;top:${(i * 17 + 12) % 77}%;animation-delay:${-(i * 1.7)}s;animation-duration:${9 + (i % 5)}s"></i>`,
      ).join("") +
      "</div>";
    world.append(overlay);
    $("#sound-button").onclick = toggleMusic;
    $("#weather-button").onclick = () => openPanel("ambience");
    const profile = $(".profile");
    profile.onclick = () => {
      ui.collectionTab = "goals";
      openPanel("collection");
    };
    profile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        profile.click();
      }
    });
    atmosphereRender();
  }

  return {
    atmosphereRender,
    renderAmbience,
    setupAtmosphere,
    setupAudio,
    toggleMusic,
    toggleMasterSound,
    playEffect,
    updateAudioGain,
  };
}
