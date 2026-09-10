import { $, state, ui, save, log, SAVE_KEY, adoptSaved } from "./store.js";
import { icon, installIcons } from "./icons.js";
import { ITEMS, PHOTO_TYPES, PLACES, travelContent } from "./data.js";
import { POSTCARD_ATLAS } from "./assets.js";
import { buildJourneyOutcome } from "./features/journey.js";
import { createGrowth } from "./features/growth.js";
import { createAmbience } from "./features/ambience.js";
import { createLife } from "./features/life.js";
import { setupLayout } from "./layout.js";
let shopTab = "food";
const app = {
  show,
  openPanel,
  render,
  toast,
  close,
  duration: (...args) => duration(...args),
  item: (...args) => item(...args),
};
const growth = createGrowth(app);
Object.assign(app, growth);
const {
  renderGrowth,
  renderTreasure,
  renderSouvenir,
  claimGoal,
  availableTitles,
} = growth;
const {
  atmosphereRender,
  renderAmbience,
  setupAtmosphere,
  setupAudio,
  toggleMusic,
  toggleMasterSound,
  playEffect,
  updateAudioGain,
} = createAmbience(app);
const {
  ensureLife,
  lifeTick,
  lifeRender,
  startMotion,
  renderLife,
  renderFriends,
  renderFriendDetail,
  feedFriend,
  chatFriend,
  endVisit,
  previewVisitor,
  clearPreviewVisitor,
  chooseLife,
  isMoving,
} = createLife(app);
installIcons();
if (typeof state.devMode !== "boolean") state.devMode = false;
// Gameplay toast is temporarily disabled; persistent panels and event windows
// remain the feedback surface and the API stays in place for easy restoration.
function toast() {}
const DEV_FRIENDS = [
  ["rabbit", "小兔棉棉"],
  ["squirrel", "松鼠栗栗"],
  ["hedgehog", "刺猬团团"],
];
function developerTools() {
  if (!state.devMode) return "";
  return `<div class="developer-preview"><p class="developer-preview-note">预览只打开事件窗口，不领取奖励、不消耗物品，也不会写入存档。</p><div class="developer-preview-group"><b>归来结果</b><div class="developer-preview-actions">${PLACES.map((place, i) => `<button class="secondary" data-dev-preview="reward" data-place="${i}">${place.name}</button>`).join("")}</div></div><div class="developer-preview-group"><b>伙伴串门</b><div class="developer-preview-actions">${DEV_FRIENDS.map(([id, name]) => `<button class="secondary" data-dev-preview="visitor" data-visitor="${id}">${name}</button>`).join("")}</div></div><div class="developer-preview-group"><b>其他窗口</b><div class="developer-preview-actions"><button class="secondary" data-go="life">小屋日常</button><button class="secondary" data-go="ambience">昼夜与声音</button><button class="secondary" data-go="album">相册浏览</button><button class="secondary" data-go="collection">收藏柜</button></div></div></div>`;
}
function setFastMode(enabled) {
  if (state.status !== "home" || state.pending) return false;
  state.fast = enabled;
  save();
  render();
  return true;
}
function toggleFastMode() {
  setFastMode(!state.fast);
}
const item = (id) => ITEMS.find((i) => i.id === id),
  duration = (ms) => {
    let s = Math.max(0, Math.ceil(ms / 1000));
    return s >= 60 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒` : `${s} 秒`;
  },
  date = (t) =>
    new Date(t).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
let previousFocus = null;
const panelMeta = {
  bag: ["bag", "出发前的小仪式"],
  shop: ["shop", "旅途所需，都在这里"],
  album: ["album", "把远方寄给你"],
  collection: ["collection", "每份礼物都有来处"],
  journal: ["journal", "记录每一个小日子"],
  help: ["help", "在这里，慢慢生活"],
  reward: ["mail", "远方的来信到了"],
  life: ["home", "一起度过小屋里的时光"],
  friends: ["rabbit", "每次见面，都更熟悉一点"],
  friendDetail: ["rabbit", "把朋友的喜好记在心里"],
  ambience: ["moon", "给小屋留一点温柔"],
};
function show(title, kicker, html, emblem = null) {
  const layer = $("#panel-layer"),
    fresh = layer.hidden,
    meta = panelMeta[ui.activePanel] || panelMeta.album,
    panelScroll = $("#modal-body"),
    scrollTop = panelScroll.scrollTop;
  if (fresh) previousFocus = document.activeElement;
  const focused = document.activeElement,
    focusId = focused?.id,
    dataKey = ["pack", "buy", "tab", "go", "albumPlace"].find(
      (k) => focused?.dataset?.[k] !== undefined,
    ),
    dataValue = dataKey ? focused.dataset[dataKey] : null;
  $("#modal-title").textContent = title;
  $("#modal-kicker").textContent = meta[1];
  $("#panel-emblem").innerHTML = emblem || icon(meta[0]);
  $("#dialog").dataset.view = ui.activePanel;
  panelScroll.innerHTML = html.replace(
    /<div class="(postcard-art|detail-art)" style="background-position:([^";]+);?"><\/div>/g,
    (_, kind, pos) => {
      const [x, y] = pos.trim().split(/\s+/).map(parseFloat);
      return `<div class="${kind}"><img class="postcard-image" src="${POSTCARD_ATLAS}" alt="阿獭旅行寄回的风景明信片" style="left:${-x}%;top:${-y}%" draggable="false"></div>`;
    },
  );
  layer.hidden = false;
  $("#game").inert = true;
  if (fresh) {
    panelScroll.scrollTop = 0;
    $("#close").focus({ preventScroll: true });
  } else {
    panelScroll.scrollTop = scrollTop;
    if (focusId) {
      document.getElementById(focusId)?.focus({ preventScroll: true });
    } else if (dataKey) {
      const dataAttribute = dataKey.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`,
      );
      panelScroll
        .querySelector(`[data-${dataAttribute}="${dataValue}"]`)
        ?.focus({ preventScroll: true });
    }
  }
}
function close() {
  const closingPanel = ui.activePanel;
  $("#panel-layer").hidden = true;
  $("#game").inert = false;
  ui.activePanel = "";
  ui.devPreview = null;
  clearPreviewVisitor();
  if (previousFocus?.isConnected && !previousFocus.hidden)
    previousFocus.focus({ preventScroll: true });
  else $("#primary").focus({ preventScroll: true });
  if (closingPanel !== "friends" && state.status === "home" && !state.pending) {
    if (state.visitor) openPanel("friends");
    else lifeTick(Date.now());
  }
}
function openPanel(panel) {
  if (ui.activePanel !== panel) $("#modal-body").scrollTop = 0;
  if (panel !== "help" && panel !== "reward") ui.devPreview = null;
  ui.activePanel = panel;
  ({
    bag: renderBag,
    shop: renderShop,
    album: renderAlbum,
    collection: renderCollection,
    journal: renderJournal,
    help: renderHelp,
    reward: renderReward,
    life: renderLife,
    friends: renderFriends,
    ambience: renderAmbience,
  })[panel]?.();
}
function render() {
  ensureLife();
  const traveling = state.status === "travel",
    ready = state.status === "ready";
  $("#leaves").textContent = state.leaves;
  $("#fast-mode").checked = state.fast;
  $("#fast-mode").disabled = state.status !== "home" || !!state.pending;
  const unlockedPhotoCount = new Set(
    state.photos.map((photo, index) => photoKey(photo, index)),
  ).size;
  $("#album-count").textContent = unlockedPhotoCount;
  $("#album-count").dataset.empty = String(!unlockedPhotoCount);
  $("#mail-badge").hidden = !state.pending;
  $("#otter").hidden = traveling;
  $("#bubble").hidden = traveling;
  $("#travel-sign").hidden = !traveling;
  $("#bag-hotspot").hidden = traveling;
  $("#visitor").hidden = !state.visitor;
  $("#trip-progress").hidden = !traveling;
  $("#primary").disabled = false;
  if (traveling) {
    const left = state.trip.end - Date.now();
    $("#status-title").textContent = "阿獭在路上";
    $("#status-description").textContent =
      `预计 ${duration(left)} 后到家 · 可以先去收幸运叶`;
    $("#primary").textContent = "看看旅途";
    $("#status-icon").innerHTML = icon("tent");
    $("#trip-progress i").style.width =
      Math.min(
        100,
        ((Date.now() - state.trip.start) /
          (state.trip.end - state.trip.start)) *
          100,
      ) + "%";
  } else if (state.pending) {
    $("#status-title").textContent = "阿獭回来啦";
    $("#status-description").textContent =
      "带回了远方的风景，还有送给你的小礼物。";
    $("#primary").textContent = "收下旅行礼物";
    $("#bubble").textContent = "我回来啦！给你带了礼物。";
    $("#status-icon").innerHTML = icon("mail");
  } else if (ready) {
    $("#status-title").textContent = "行囊准备好了";
    $("#status-description").textContent =
      `阿獭收拾好心情，会在 ${duration(state.readyAt - Date.now())} 后自己出发。`;
    $("#primary").textContent = "调整行囊";
    $("#bubble").textContent = "再翻两页，就出发。";
    $("#status-icon").innerHTML = icon("bag");
  } else {
    $("#status-title").textContent = "阿獭在家";
    $("#status-description").textContent = "装一份便当，让下一段旅程慢慢开始。";
    $("#primary").textContent = "准备行囊";
    if (Date.now() > ui.speechUntil)
      $("#bubble").textContent = "阿獭正在翻看旅行手册";
    $("#status-icon").innerHTML = icon("home");
  }
  if (!$("#clovers").children.length) {
    $("#clovers").innerHTML = state.garden
      .map(
        (t, i) =>
          `<button class="clover" data-harvest="${i}" style="left:${[0, 35, 70, 7, 42, 77][i]}%;top:${[0, 5, 0, 48, 53, 48][i]}%;animation-delay:${i * 0.31}s">${icon("leaf")}</button>`,
      )
      .join("");
  }
  $("#clovers")
    .querySelectorAll("button")
    .forEach((el, i) => {
      el.disabled = state.garden[i] > Date.now();
      el.setAttribute(
        "aria-label",
        el.disabled ? "幸运叶生长中" : "采摘幸运叶，获得10叶",
      );
    });
  if (
    ui.activePanel === "bag" &&
    state.status === "travel" &&
    $("#travel-countdown")
  )
    $("#travel-countdown").textContent = duration(state.trip.end - Date.now());
  let readyLeaves = state.garden.filter((t) => t <= Date.now()).length;
  $("#garden-note").textContent = readyLeaves
    ? "点一点幸运叶"
    : `幸运叶生长中 · ${duration(Math.min(...state.garden) - Date.now())}`;
  lifeRender();
  atmosphereRender();
}
function renderBag() {
  if (state.status === "travel") {
    show(
      "在路上的阿獭",
      "SOMEWHERE UNDER THE SAME SKY",
      `<div class="empty"><span>${icon("mail")}</span>目的地还是一个小秘密。<br>预计 <b id="travel-countdown">${duration(state.trip.end - Date.now())}</b> 后回来。<br>准备的食物会影响它想去的地方。</div><button class="secondary full" data-go="journal">翻翻旅行手记</button>`,
    );
    return;
  }
  if (state.pending) {
    renderReward();
    return;
  }
  const slots = [
    ["food", "便当 · 必带"],
    ["tool", "道具 · 可选"],
    ["charm", "护符 · 可选"],
  ]
    .map(([type, label]) => {
      let v = item(state.bag[type]);
      return `<div class="slot"><span class="${v ? "filled" : ""}">${v?.icon || icon("plus")}</span><strong>${v?.name || "还没放东西"}</strong><small>${label}</small></div>`;
    })
    .join("");
  const owned = ITEMS.filter((i) => (state.inventory[i.id] || 0) > 0);
  const food = item(state.bag.food),
    tool = item(state.bag.tool),
    charm = item(state.bag.charm),
    forecast = food
      ? `<div class="packing-forecast"><div><small>这次旅途的线索</small><strong>${PLACES[food.place].name}</strong><p>${food.travelHint}</p></div><div class="forecast-tags"><span>${icon("bag")} ${food.name}</span>${tool ? `<span>${tool.icon} ${tool.travelHint}</span>` : "<span>还可以带一件小道具</span>"}${charm ? `<span>${charm.icon} ${charm.travelHint}</span>` : "<span>护符会让好运多停留一会儿</span>"}</div></div>`
      : `<div class="packing-forecast empty-forecast"><span>${icon("journal")}</span><div><strong>先放一份便当</strong><p>便当会给阿獭一条大致的方向，沿途的细节仍然是个小秘密。</p></div></div>`;
  show(
    "准备行囊",
    "A LITTLE PREPARATION",
    `<p class="intro">带上喜欢的便当，远方的故事就会慢慢发生。道具可以重复使用，便当和护符每次消耗一份。</p><div class="slots">${slots}</div>${forecast}<div class="section-label">我的物品 · 点击放入 / 取出</div><div class="items">${owned.map((i) => `<button class="item ${state.bag[i.type] === i.id ? "selected" : ""}" data-pack="${i.id}"><span class="item-icon">${i.icon}</span><span><strong>${i.name} ×${state.inventory[i.id]}</strong><small>${i.desc}</small>${i.travelHint ? `<small class="item-hint">${i.travelHint}</small>` : ""}</span></button>`).join("")}</div><button class="secondary full" data-go="shop">去杂货铺补充物品</button><button class="primary full" id="ready" ${state.bag.food ? "" : "disabled"}>${state.status === "ready" ? "保存调整，重新等待" : "准备好了，让阿獭自己出发"}</button>${state.status === "ready" ? '<button class="secondary full" id="cancel-ready">先不出发，收起行囊</button>' : ""}`,
  );
}
function renderShop() {
  show(
    "河畔杂货铺",
    "SOMETHING FOR THE ROAD",
    `<p class="intro">口袋里还有 <b>${state.leaves}</b> 片幸运叶。不同的便当，会让阿獭想起不同的远方。</p><div class="tabs">${[
      ["food", "旅行便当"],
      ["tool", "小道具"],
      ["charm", "幸运物"],
    ]
      .map(
        ([v, n]) =>
          `<button data-tab="${v}" class="${shopTab === v ? "active" : ""}">${n}</button>`,
      )
      .join("")}</div><div class="items">${ITEMS.filter(
      (i) => i.type === shopTab,
    )
      .map((i) => {
        let owned = i.type === "tool" && state.inventory[i.id];
        return `<button class="item" data-buy="${i.id}" ${owned || state.leaves < i.price ? "disabled" : ""}><span class="item-icon">${i.icon}</span><span><strong>${i.name}</strong><small>${i.desc}</small><small class="cost">${owned ? "已拥有 · 永久使用" : `☘ ${i.price}　·　购买`}</small></span></button>`;
      })
      .join(
        "",
      )}</div><button class="secondary full" data-go="bag">回去整理行囊</button>`,
  );
}
function photoCatalog() {
  return PLACES.flatMap((place, placeIndex) =>
    travelContent(placeIndex).routes.flatMap((route) =>
      route.photos.map((photo) => ({
        ...photo,
        type: "landmark",
        photoType: "landmark",
        place: placeIndex,
        pos: place.pos,
        routeId: route.id,
        routeName: route.name,
      })),
    ),
  );
}
function photoKey(photo, index) {
  return photo.photoId || photo.id || `saved-photo-${index}`;
}
function photoHTML(view) {
  const p = view.photo,
    d = PLACES[p.place] || PLACES[0];
  if (!view.unlocked)
    return `<button class="postcard postcard-locked" type="button" disabled aria-label="${d.name}，未解锁照片">${photoArt(p, "postcard-art", d.pos)}<span class="postcard-lock" aria-hidden="true">${icon("lock")}</span><strong>未解锁照片</strong><small>${d.name} · ${p.routeName || "旅行后发现"}</small><small>完成旅途后解锁</small></button>`;
  const type = PHOTO_TYPES[p.photoType || p.type] || PHOTO_TYPES.landmark;
  return `<button class="postcard" type="button" data-photo="${view.stateIndex}">${photoArt(p, "postcard-art", d.pos)}<strong>${p.photoTitle || p.title || d.name}</strong><small>${type.label} · ${p.routeName || d.name}${p.conditionName ? ` · ${p.conditionName}` : ""}</small><small>第 ${p.trip} 次远行 · ${date(p.at)}</small></button>`;
}
function renderAlbum() {
  const catalog = photoCatalog(),
    catalogIds = new Set(catalog.map((photo) => photo.id)),
    unlockedById = new Map();
  state.photos.forEach((photo, index) => {
    unlockedById.set(photoKey(photo, index), { photo, index });
  });
  const photoSlots = [
      ...catalog.map((photo) => {
        const saved = unlockedById.get(photo.id);
        return {
          photo: saved
            ? {
                ...photo,
                ...saved.photo,
                id: photo.id,
                place: photo.place,
                pos: saved.photo.pos || photo.pos,
                photoType: saved.photo.photoType || saved.photo.type || photo.photoType,
              }
            : photo,
          unlocked: !!saved,
          stateIndex: saved?.index,
        };
      }),
      ...[...unlockedById.entries()]
        .filter(([id]) => !catalogIds.has(id))
        .map(([id, saved]) => ({
          photo: { ...saved.photo, id },
          unlocked: true,
          stateIndex: saved.index,
          extra: true,
        })),
    ],
    unlockedCount = photoSlots.filter((slot) => slot.unlocked).length,
    foundPlaces = new Set(
      photoSlots.filter((slot) => slot.unlocked).map((slot) => slot.photo.place),
    ).size,
    foundTypes = new Set(
      photoSlots
        .filter((slot) => slot.unlocked)
        .map((slot) => slot.photo.photoType || slot.photo.type || "landmark"),
    ).size,
    placeFilter = PLACES[Number(ui.albumPlace)] ? String(ui.albumPlace) : "all",
    filteredPhotos = photoSlots.filter(
      (slot) => placeFilter === "all" || String(slot.photo.place) === placeFilter,
    ),
    filteredUnlocked = filteredPhotos.filter((slot) => slot.unlocked).length,
    placeFilters = PLACES.map((place, i) => {
      const slots = photoSlots.filter((slot) => slot.photo.place === i),
        unlocked = slots.filter((slot) => slot.unlocked).length;
      return `<button class="album-filter ${placeFilter === String(i) ? "active" : ""}" data-album-place="${i}" aria-selected="${placeFilter === String(i)}" aria-label="${place.name}，已解锁 ${unlocked} / ${slots.length} 张照片">${place.name} · ${unlocked}/${slots.length}</button>`;
    }).join(""),
    filterName = placeFilter === "all" ? "全部照片" : PLACES[Number(placeFilter)].name,
    emptyHint = unlockedCount
      ? ""
      : `<p class="album-catalog-hint">带上一份便当出发，第一张明信片就会解锁。</p><button class="primary full" data-go="bag">准备第一次旅行</button>`;
  show(
    "远方的明信片",
    "",
    `<p class="intro">${foundPlaces} / 4 处风景 · ${foundTypes} / ${Object.keys(PHOTO_TYPES).length} 类照片主题 · 已解锁 ${unlockedCount} / ${photoSlots.length} 张</p><div class="album-filter-row" role="tablist" aria-label="按目的地筛选"><button class="album-filter ${placeFilter === "all" ? "active" : ""}" data-album-place="all" aria-selected="${placeFilter === "all"}">全部 · ${unlockedCount}/${photoSlots.length}</button>${placeFilters}</div><p class="album-filter-result">${filterName} · 已解锁 ${filteredUnlocked}/${filteredPhotos.length} 张</p><div class="postcards">${filteredPhotos
      .map((view) => photoHTML(view))
      .reverse()
      .join("")}</div>${emptyHint}`,
  );
}
function photoArt(photo, kind, fallbackPos) {
  return photo?.scene
    ? `<div class="${kind} photo-scene"><img class="photo-scene-image" src="${photo.scene}" alt="" draggable="false"></div>`
    : `<div class="${kind}" style="background-position:${photo?.pos || fallbackPos}"></div>`;
}
function renderCollection() {
  renderGrowth();
}
function renderJournal() {
  const letters = state.letters || [];
  show(
    "阿獭的旅行手记",
    "EVERY LITTLE DAY COUNTS",
    `<p class="intro">已经走过 ${state.trips} 段旅程。日子轻轻翻页，故事慢慢变多。</p>${
      letters.length
        ? `<div class="section-label">远方寄来的话</div>${letters
            .slice(0, 3)
            .map(
              (letter) =>
                `<article class="letter-card"><small>${date(letter.at)} · ${letter.placeName}</small><p>「${letter.text}」</p><span>${letter.routeName}</span></article>`,
            )
            .join("")}`
        : ""
    }${state.log.map((l) => `<div class="journal-entry"><small>${date(l.at)}</small><p>${l.text}</p></div>`).join("")}`,
  );
}
function renderHelp() {
  show(
    "小屋生活指南",
    "",
    `<div class="help-steps">${[
      ["leaf", "收下庭院的好运", "点幸运叶收集旅费，叶子会慢慢长回来。"],
      ["bag", "给阿獭准备行囊", "放一份便当，也可以带上道具和护符。"],
      ["tent", "让它慢慢出发", "食物影响目的地。相机多带照片，帐篷多带特产。"],
      [
        "rabbit",
        "招待河畔的朋友",
        "点右侧朋友按钮，聊天或分享食物。喜欢的食物会增加更多好感。",
      ],
      [
        "home",
        "陪阿獭过日子",
        "点阿獭一起看书、吃饭、打盹；它也会自己安排日常。",
      ],
      ["album", "等一封远方的信", "归来后收下礼物，照片和特产会一直珍藏。"],
    ]
      .map(
        ([i, t, d]) =>
          `<div class="help-step">${icon(i)}<div><b>${t}</b><p>${d}</p></div></div>`,
      )
      .join(
        "",
      )}</div><div class="section-label">切换快速体验</div><p class="intro">快速体验会缩短出发、旅行和小屋事件的等待时间，更快看到完整内容；目的地、奖励和玩法不会改变。</p><div class="fast-mode-effects"><div><b>开启</b><span>等待 8 秒出发<br>旅行约 1 分钟</span></div><div><b>关闭</b><span>等待 1 分钟出发<br>旅行约 30 分钟</span></div></div><p class="intro">离开页面后，旅行也会按时间推进，游戏不联网，不能跨设备保存进度。</p><div class="section-label">开发者模式</div><label class="checkrow developer-toggle"><input id="developer-mode" type="checkbox" ${state.devMode ? "checked" : ""}><span><b>开启事件预览</b><small>仅本机生效，用于检查各个事件窗口</small></span></label>${developerTools()}`,
  );
}
function renderReward(preview = ui.devPreview?.kind === "reward" ? ui.devPreview.pending : null) {
  const r = preview || state.pending;
  if (!r) {
    openPanel("album");
    return;
  }
  ui.activePanel = "reward";
  const isPreview = !!preview;
  let d = PLACES[r.place],
    outcome = r.outcome,
    souvenirs = outcome?.souvenirs || [],
    photos = outcome?.photos || [];
  const recap = outcome
    ? `<div class="journey-recap"><div class="journey-route"><span>${icon(outcome.conditionIcon || "journal")}</span><div><small>这次走的是</small><strong>${outcome.routeName}</strong><p>${outcome.conditionName} · ${outcome.conditionDesc}</p></div></div><p class="journey-moment">${outcome.moment}</p></div><div class="section-label">旅途照片 · ${photos.length} 张</div><div class="return-photos">${photos
        .map((photo) => {
          const type = PHOTO_TYPES[photo.type] || PHOTO_TYPES.landmark;
          return `<article class="return-photo">${photoArt(photo, "postcard-art", d.pos)}<div class="return-photo-copy"><span class="return-photo-type">${icon(type.icon)} ${type.label}</span><strong>${photo.title || d.name}</strong><small>${photo.routeName || d.name}${photo.conditionName ? ` · ${photo.conditionName}` : ""}</small></div></article>`;
        })
        .join("")}</div><div class="section-label">带回来的东西</div><div class="return-goods"><div class="return-specialty">${outcome.specialty ? `${outcome.specialty.icon}<div><strong>${outcome.specialty.name}</strong><small>目的地特产 · 收进收藏柜</small></div>` : r.gifts ? `${d.icon}<div><strong>${d.gift}</strong><small>目的地特产 · 收进收藏柜</small></div>` : `<span>${icon("leaf")}</span><div><strong>这次没有带回目的地特产</strong><small>下一段旅程，也许会遇见它</small></div>`}</div><div class="journey-discoveries">${souvenirs
        .map(
          (s) =>
            `<div class="journey-discovery"><span>${icon(s.icon)}</span><div><strong>${s.name}</strong><small>${s.rarity === "rare" ? "稀有发现" : "沿途小物"}</small></div></div>`,
        )
        .join(
          "",
        ) || `<div class="return-empty">这次没有带回沿途小物</div>`}</div></div>${outcome.letter ? `<p class="return-note"><small>旅途留言</small>「${outcome.letter}」</p>` : ""}`
    : `<p class="quote">「${d.quote}」</p>`;
  const specialtyLine = outcome?.specialty
    ? `${d.icon} ${outcome.specialty.name} × 1`
    : r.gifts
      ? `${d.icon} ${d.gift} × ${r.gifts}`
      : `${icon("leaf")} 暂无目的地特产`;
  const rewardLine = outcome
    ? `${specialtyLine}　·　${icon("leaf")} 幸运叶 +${r.leaves}`
    : `${d.icon} ${d.gift} × ${r.gifts}　·　${icon("leaf")} 幸运叶 +${r.leaves}<br>${icon("mail")} ${r.photos} 张明信片，来自${d.name}`;
  show(
    "欢迎回家，阿獭",
    "A LITTLE GIFT FOR YOU",
    `${photoArt(photos[0], "detail-art", d.pos)}${recap}<div class="reward">${rewardLine}${outcome ? `<br>${icon("mail")} ${photos.length} 张明信片，来自${d.name}` : ""}</div>${isPreview ? `<p class="developer-preview-note">开发者预览 · 不会领取礼物或写入存档。</p><button class="secondary full" data-go="help">返回开发者预览</button>` : `<button class="primary full" id="claim">收下礼物，放进相册</button>`}`,
  );
}
function previewReward(placeIndex) {
  if (!state.devMode) return;
  const place = Math.max(
      0,
      Math.min(PLACES.length - 1, Number(placeIndex) || 0),
    ),
    food = ITEMS.find((candidate) => candidate.type === "food" && candidate.place === place) || ITEMS.find((candidate) => candidate.type === "food"),
    now = Date.now(),
    outcome = buildJourneyOutcome({
      place,
      food: food?.id,
      tool: "camera",
      charm: "charm",
      seed: 90210 + place,
      start: now - 3600000,
      end: now,
    });
  ui.devPreview = {
    kind: "reward",
    pending: {
      place,
      gifts: outcome.specialty ? 1 : 0,
      photos: outcome.photos.length,
      leaves: 60,
      outcome,
      at: now,
    },
  };
  renderReward();
}
function depart(now) {
  let food = item(state.bag.food);
  if (!food || !state.inventory[food.id]) {
    state.status = "home";
    return;
  }
  let tool = state.bag.tool,
    charm = state.bag.charm;
  state.inventory[food.id]--;
  if (charm) state.inventory[charm]--;
  let place = Math.random() < 0.72 ? food.place : Math.floor(Math.random() * 4),
    length = state.fast
      ? 60000 + Math.floor(Math.random() * 20000)
      : 1800000 + Math.floor(Math.random() * 600000);
  state.trip = {
    start: now,
    end: now + length,
    place,
    food: food.id,
    tool,
    charm,
    seed: Math.floor(Math.random() * 2147483647),
  };
  state.status = "travel";
  if (Date.now() - now < 5000) startMotion("leaving");
  state.bag = { food: null, tool: null, charm: null };
  log("阿獭背好行囊，沿着河边的小路出发了。");
  save();
  if (ui.activePanel === "bag") close();
}
function arrive() {
  let t = state.trip;
  const outcome = buildJourneyOutcome(t);
  state.status = "home";
  state.pending = {
    place: t.place,
    gifts: outcome.specialty ? 1 : 0,
    photos: outcome.photos.length,
    leaves: 35 + (t.charm ? 25 : 0),
    outcome,
    at: t.end,
  };
  state.trip = null;
  startMotion("returning");
  log(
    `阿獭从${PLACES[t.place].name}的${outcome.routeName}回来了，带着一段新的回忆。`,
  );
  save();
  toast("阿獭回来啦！去收下远方的礼物吧。");
  if (ui.activePanel === "bag") close();
}
function tick() {
  const now = Date.now();
  let changed = false;
  if (state.status === "ready" && now >= state.readyAt) depart(state.readyAt);
  if (state.status === "travel" && now >= state.trip.end) arrive();
  lifeTick(now);
  if (changed) save();
  render();
}
$("#modal-body").addEventListener("click", (e) => {
  let b = e.target.closest("button");
  if (!b || b.disabled) return;
  let d = b.dataset;
  if (d.devPreview === "reward") {
    previewReward(d.place);
    return;
  }
  if (d.devPreview === "visitor") {
    previewVisitor(d.visitor);
    return;
  }
  if (d.previewSound) {
    playEffect("reward");
    if (state.ambience.muted || !state.ambience.effects)
      toast("请先开启声音和按钮音效。");
    return;
  }
  if (d.growthTab) {
    ui.collectionTab = d.growthTab;
    renderGrowth();
    return;
  }
  if (d.goal) {
    claimGoal(d.goal);
    return;
  }
  if (d.treasure !== undefined) {
    renderTreasure(Number(d.treasure));
    return;
  }
  if (d.souvenir) {
    renderSouvenir(d.souvenir);
    return;
  }
  if (d.display !== undefined) {
    const i = Number(d.display);
    if (state.gifts[i] > 0) {
      state.growth.display = i;
      save();
      renderGrowth();
      toast("已换上今天的陈列");
    }
    return;
  }
  if (d.displaySouvenir) {
    state.growth.displaySouvenir = d.displaySouvenir;
    save();
    renderGrowth();
      toast("已换上今天的沿途收藏");
    return;
  }
  if (d.albumPlace !== undefined) {
    ui.albumPlace = d.albumPlace;
    renderAlbum();
    return;
  }
  if (d.title !== undefined) {
    if (d.title === "" || availableTitles().includes(d.title)) {
      state.growth.title = d.title;
      save();
      render();
      renderGrowth();
    }
    return;
  }
  if (d.time) {
    if (["auto", "day", "sunset", "night"].includes(d.time)) {
      state.ambience.time = d.time;
      save();
      atmosphereRender();
      renderAmbience();
    }
    return;
  }
  if (d.music) {
    toggleMusic();
    return;
  }
  if (d.life) {
    chooseLife(d.life);
    return;
  }
  if (d.chat) {
    chatFriend(d.chat);
    return;
  }
  if (d.feed) {
    feedFriend(d.feed);
    return;
  }
  if (d.friend) {
    renderFriendDetail(d.friend);
    return;
  }
  if (d.goodbye) {
    endVisit();
    render();
    return;
  }
  if (d.go) {
    openPanel(d.go);
    return;
  }
  if (d.tab) {
    shopTab = d.tab;
    renderShop();
    return;
  }
  if (d.pack) {
    if (state.status === "travel" || state.pending) return;
    let i = item(d.pack);
    if (!state.inventory[i.id]) return;
    state.bag[i.type] = state.bag[i.type] === i.id ? null : i.id;
    if (state.status === "ready") {
      state.status = "home";
      state.readyAt = 0;
    }
    save();
    renderBag();
    render();
    return;
  }
  if (d.buy) {
    let i = item(d.buy);
    if (state.leaves < i.price || (i.type === "tool" && state.inventory[i.id]))
      return;
    state.leaves -= i.price;
    state.inventory[i.id] = (state.inventory[i.id] || 0) + 1;
    save();
    renderShop();
    render();
    toast(`已放入物品栏：${i.name}`);
    return;
  }
  if (d.photo !== undefined) {
    let p = state.photos[+d.photo],
      v = PLACES[p?.place] || PLACES[0];
    if (!p) return;
    const type = PHOTO_TYPES[p.photoType || p.type] || PHOTO_TYPES.landmark;
    show(
      p.photoTitle || p.title || v.name,
      "A POSTCARD FROM OTTER",
      `${photoArt(p, "detail-art", v.pos)}${p.caption ? `<p class="intro">${p.caption}</p>` : ""}<p class="quote">「${p.quote || v.quote}」</p><div class="journey-meta"><span>${type.label}</span><span>${p.routeName || v.name}</span>${p.conditionName ? `<span>${p.conditionName}</span>` : ""}<small>第 ${p.trip} 次远行 · ${date(p.at)}</small></div><button class="secondary full" data-go="album">回到明信片册</button>`,
    );
    return;
  }
  if (b.id === "ready") {
    if (!state.bag.food || !state.inventory[state.bag.food]) return;
    state.status = "ready";
    state.readyAt = Date.now() + (state.fast ? 8000 : 60000);
    save();
    close();
    render();
    toast("行囊准备好了，阿獭会自己出发。");
  }
  if (b.id === "cancel-ready") {
    state.status = "home";
    state.readyAt = 0;
    save();
    renderBag();
    render();
  }
  if (b.id === "claim" && state.pending) {
    let r = state.pending;
    state.leaves += r.leaves;
    state.gifts[r.place] += r.gifts;
    state.trips++;
    state.souvenirs ||= {};
    state.discoveries ||= {};
    state.letters ||= [];
    const outcome = r.outcome;
    if (outcome) {
      outcome.souvenirs.forEach((souvenir) => {
        state.souvenirs[souvenir.id] = (state.souvenirs[souvenir.id] || 0) + 1;
      });
      state.discoveries[outcome.routeId] =
        (state.discoveries[outcome.routeId] || 0) + 1;
      outcome.photos.forEach((photo) =>
        state.photos.push({
          ...photo,
          photoId: photo.id,
          photoType: photo.type || "landmark",
          pos: PLACES[r.place].pos,
          at: r.at,
          trip: state.trips,
        }),
      );
      if (outcome.letter)
        state.letters.unshift({
          at: r.at,
          placeName: PLACES[r.place].name,
          routeName: outcome.routeName,
          text: outcome.letter,
        });
    } else {
      for (let n = 0; n < r.photos; n++)
        state.photos.push({ place: r.place, at: r.at, trip: state.trips });
    }
    state.pending = null;
    ui.albumPlace = "all";
    log(
      outcome
        ? `收好了${outcome.routeName}的明信片和沿途小物。一起期待下一次出发。`
        : `收好了明信片和${PLACES[r.place].gift}。一起期待下一次出发。`,
    );
    save();
    close();
    render();
    toast(
      outcome
        ? "新的旅途回忆已收进手记和收藏柜。"
        : "礼物已收进明信片册和收藏柜。",
    );
  }
});
$("#modal-body").addEventListener("change", (e) => {
  if (e.target.id === "developer-mode") {
    state.devMode = e.target.checked;
    if (!state.devMode) {
      ui.devPreview = null;
      clearPreviewVisitor();
    }
    save();
    renderHelp();
    return;
  }
  if (e.target.id === "master-sound") {
    toggleMasterSound();
    return;
  }
  if (e.target.id === "button-effects") {
    state.ambience.effects = e.target.checked;
    save();
    if (e.target.checked) playEffect();
    return;
  }
  if (e.target.id === "environment-motion") {
    state.ambience.motion = e.target.checked;
    save();
    atmosphereRender();
    return;
  }
});
$("#clovers").addEventListener("click", (e) => {
  let b = e.target.closest("[data-harvest]");
  if (!b) return;
  let i = +b.dataset.harvest;
  if (state.garden[i] > Date.now()) return;
  state.garden[i] = Date.now() + (state.fast ? 45000 : 300000);
  state.leaves += 10;
  save();
  render();
  toast("☘ 幸运叶 +10");
});
$("#visitor").onclick = () => openPanel("friends");
$("#friends-button").onclick = () => openPanel("friends");
$("#life-button").onclick = () => openPanel("life");
$("#otter").onclick = () => {
  if (isMoving()) return;
  openPanel(state.pending ? "reward" : "life");
};
$("#primary").onclick = () => openPanel(state.pending ? "reward" : "bag");
$("#bag-hotspot").onclick = () => openPanel("bag");
$("#wallet").onclick = () => openPanel("shop");
$("#mailbox").onclick = () => openPanel(state.pending ? "reward" : "album");
$("#help").onclick = () => openPanel("help");
$("#fast-mode").onchange = (e) => setFastMode(e.target.checked);
$("#close").onclick = close;
$("#panel-layer").addEventListener("click", (e) => {
  if (e.target === $("#panel-layer")) close();
});
document.addEventListener("keydown", (e) => {
  if ($("#panel-layer").hidden) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close();
    return;
  }
  if (e.key === "Tab") {
    let nodes = [
        ...$("#dialog").querySelectorAll(
          'button:not(:disabled),input:not(:disabled),a[href],summary,[tabindex="0"]',
        ),
      ].filter((n) => n.getClientRects().length),
      first = nodes[0],
      last = nodes[nodes.length - 1];
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        !$("#dialog").contains(document.activeElement))
    ) {
      e.preventDefault();
      last?.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last ||
        !$("#dialog").contains(document.activeElement))
    ) {
      e.preventDefault();
      first?.focus();
    }
  }
});
document
  .querySelectorAll("[data-panel]")
  .forEach((b) => (b.onclick = () => openPanel(b.dataset.panel)));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});
window.addEventListener("storage", (event) => {
  if (event.key !== SAVE_KEY || !event.newValue) return;
  const hadVisitor = !!state.visitor;
  if (!adoptSaved(event.newValue)) return;
  if (!hadVisitor && state.visitor) {
    if (ui.activePanel === "friends") renderFriends();
    else if (!ui.activePanel) openPanel("friends");
  }
  else if (ui.activePanel === "friends") renderFriends();
  render();
});
window.addEventListener("pagehide", save);
tick();
save();
setInterval(tick, 1000);
$("#modal-body").addEventListener("input", (e) => {
  if (e.target.id === "sfx-volume") {
    state.ambience.sfxVolume = Math.max(
      0,
      Math.min(1, Number(e.target.value) / 100),
    );
    $("#sfx-number").textContent =
      Math.round(state.ambience.sfxVolume * 100) + "%";
    save();
    return;
  }
  if (e.target.id === "music-volume") {
    state.ambience.volume = Math.max(
      0,
      Math.min(1, Number(e.target.value) / 100),
    );
    updateAudioGain();
    $("#volume-number").textContent =
      Math.round(state.ambience.volume * 100) + "%";
    save();
  }
});
setupAtmosphere();

setupAudio();

setupLayout();
