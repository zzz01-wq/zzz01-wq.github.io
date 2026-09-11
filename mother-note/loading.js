'use strict';

(() => {
  const uiFiles = [
    ['客厅图标', 'assets/ui-icons/living.png'],
    ['卧室图标', 'assets/ui-icons/bedroom.png'],
    ['厨房图标', 'assets/ui-icons/kitchen.png'],
    ['门口图标', 'assets/ui-icons/door.png'],
    ['衣柜图标', 'assets/ui-icons/wardrobe.png'],
    ['纸条图标', 'assets/ui-icons/paper.png'],
    ['记录图标', 'assets/ui-icons/journal.png'],
    ['菜单图标', 'assets/ui-icons/menu.png'],
    ['猫猫标记', 'assets/ui-icons/cat.png']
  ];
  const eventFiles = [
    ['床铺插画', 'bed.jpg'],
    ['猫猫卧室插画', 'cat-bedroom.jpg'],
    ['猫碗插画', 'cat-bowl.jpg'],
    ['钟表插画', 'clock.jpg'],
    ['白天门口插画', 'day-door.jpg'],
    ['逃离插画', 'escape.jpg'],
    ['归家插画', 'home.jpg'],
    ['厨房插画', 'kitchen.jpg'],
    ['客厅插画', 'living.jpg'],
    ['镜子插画', 'mirror.jpg'],
    ['妈妈插画', 'mother.jpg'],
    ['邻居插画', 'neighbor.jpg'],
    ['夜晚门口插画', 'night-door.jpg'],
    ['纸条插画', 'notes.jpg'],
    ['收音机插画', 'radio.jpg'],
    ['楼梯插画', 'stairs.jpg'],
    ['衣柜插画', 'wardrobe.jpg'],
    ['白光插画', 'white-light.jpg'],
    ['窗边插画', 'window.jpg']
  ].map(([label, file]) => [label, `assets/events/${file}`]);
  const audioLabels = {
    music: '背景环境循环', paper: '纸条音效', door: '门声', doorOpen: '开门声', doorClose: '关门声',
    wardrobe: '衣柜木响', static: '白噪声', distortion: '侵蚀异响', machine: '机械环境声', metal: '金属环境声', uiClick: '按钮确认音',
    catPurr: '猫猫呼噜', catMew: '猫猫叫声', heartbeat: '低清醒度心跳'
  };
  const audioFiles = (window.AudioManager?.manifest || []).map(({ key, src }) => [audioLabels[key] || key, src]);
  const resources = [
    ...uiFiles.map(([label, src]) => ({ group: '界面', label, src, type: 'image' })),
    ...eventFiles.map(([label, src]) => ({ group: '事件插画', label, src, type: 'image' })),
    ...audioFiles.map(([label, src]) => ({ group: '声音', label, src, type: 'audio' }))
  ];
  const overlay = document.querySelector('#game-loading');
  const list = document.querySelector('#loading-assets');
  const status = document.querySelector('#loading-status');
  const current = document.querySelector('#loading-current');
  const count = document.querySelector('#loading-count');
  const total = document.querySelector('#loading-total');
  const failed = document.querySelector('#loading-failed');
  const bar = document.querySelector('#loading-progress-bar');
  const game = document.querySelector('.game');
  const entries = resources.map(resource => ({ ...resource, state: 'pending', node: null }));
  const audioCache = window.__MothersNotePreloadedAudio || Object.create(null);
  const imageCache = window.__MothersNotePreloadedImages || [];
  window.__MothersNotePreloadedAudio = audioCache;
  window.__MothersNotePreloadedImages = imageCache;

  function stateText(state) { return ({ pending: '待命', loading: '读取中', loaded: '已就绪', error: '读取失败' })[state]; }
  function renderEntry(entry) {
    entry.node.className = `loading-asset is-${entry.state}`;
    entry.node.title = `${entry.label} · ${stateText(entry.state)}`;
    entry.node.querySelector('span').textContent = `${entry.label} · ${stateText(entry.state)}`;
  }
  function renderProgress() {
    const complete = entries.filter(entry => entry.state === 'loaded' || entry.state === 'error').length;
    const errors = entries.filter(entry => entry.state === 'error').length;
    const percent = entries.length ? Math.round(complete / entries.length * 100) : 100;
    count.textContent = String(complete);
    total.textContent = String(entries.length);
    bar.style.width = `${percent}%`;
    failed.textContent = errors ? `${errors} 项异常` : '';
    if (complete < entries.length) status.textContent = `正在读取本地资源 · ${percent}%`;
    else status.textContent = errors ? `资源读取完成 · ${errors} 项失败` : '全部资源已就绪';
  }
  function setState(entry, state) {
    entry.state = state;
    renderEntry(entry);
    current.textContent = `${entry.group} / ${entry.label}`;
    renderProgress();
  }
  function loadImage(entry) {
    return new Promise(resolve => {
      const image = new Image();
      image.decoding = 'async';
      const finish = ok => { entry.state = ok ? 'loaded' : 'error'; if (ok) imageCache.push(image); resolve(); };
      image.addEventListener('load', () => finish(true), { once: true });
      image.addEventListener('error', () => finish(false), { once: true });
      image.src = entry.src;
    });
  }
  function loadAudio(entry) {
    return new Promise(resolve => {
      if (typeof Audio !== 'function') { entry.state = 'error'; resolve(); return; }
      let audio;
      try { audio = new Audio(); } catch { entry.state = 'error'; resolve(); return; }
      audio.preload = 'auto';
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        if (ok) audioCache[entry.src] = audio;
        entry.state = ok ? 'loaded' : 'error';
        resolve();
      };
      audio.addEventListener('loadeddata', () => finish(true), { once: true });
      audio.addEventListener('canplaythrough', () => finish(true), { once: true });
      audio.addEventListener('error', () => finish(false), { once: true });
      audio.src = entry.src;
      audio.load();
    });
  }
  async function load(entry) {
    setState(entry, 'loading');
    if (entry.type === 'audio') await loadAudio(entry);
    else await loadImage(entry);
    renderEntry(entry);
    renderProgress();
  }
  function reveal() {
    const errors = entries.filter(entry => entry.state === 'error').length;
    current.textContent = errors ? `仍有 ${errors} 项资源读取失败` : '房间已经准备好';
    status.textContent = errors ? `资源读取完成 · ${errors} 项失败` : '全部资源已就绪';
    window.AudioManager?.restore?.();
    document.body.classList.remove('resource-loading');
    document.body.classList.add('resource-ready');
    document.body.setAttribute('aria-busy', 'false');
    if (game) { game.inert = false; game.removeAttribute('aria-hidden'); }
    window.setTimeout(() => overlay?.setAttribute('aria-hidden', 'true'), 800);
  }
  function start() {
    list.replaceChildren();
    total.textContent = String(entries.length);
    for (const entry of entries) {
      const item = document.createElement('li');
      item.className = 'loading-asset';
      item.innerHTML = '<span></span>';
      entry.node = item;
      list.append(item);
      renderEntry(entry);
    }
    renderProgress();
    const ready = Promise.all(entries.map(load));
    window.GameLoader = { manifest: resources.map(({ group, label, src, type }) => ({ group, label, src, type })), ready };
    ready.then(() => window.setTimeout(reveal, 220));
  }
  start();
})();
