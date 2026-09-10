import { state, ui, save, log } from "../store.js";
import { icon } from "../icons.js";
import { PLACES, TRAVEL_CONTENT } from "../data.js";
import { allSouvenirs } from "./journey.js";
export function createGrowth(app) {
  const show = (...args) => app.show(...args);
  const render = (...args) => app.render(...args);
  const toast = (...args) => app.toast(...args);
  const GOALS = [
    {
      id: "first",
      name: "第一封远方来信",
      desc: "完成 1 次旅行",
      need: 1,
      value: () => state.trips,
      xp: 20,
      leaves: 20,
      title: "初行旅人",
      icon: "mail",
    },
    {
      id: "three",
      name: "小路越来越熟悉",
      desc: "完成 3 次旅行",
      need: 3,
      value: () => state.trips,
      xp: 30,
      leaves: 40,
      icon: "bag",
    },
    {
      id: "two",
      name: "去看另一种风景",
      desc: "发现 2 个目的地",
      need: 2,
      value: () => new Set(state.photos.map((p) => p.place)).size,
      xp: 35,
      leaves: 30,
      icon: "album",
    },
    {
      id: "four",
      name: "把四季装进行囊",
      desc: "发现全部 4 个目的地",
      need: 4,
      value: () => new Set(state.photos.map((p) => p.place)).size,
      xp: 60,
      leaves: 60,
      title: "风景收藏家",
      icon: "tent",
    },
    {
      id: "gifts",
      name: "小小博物馆",
      desc: "集齐 4 种旅行特产",
      need: 4,
      value: () => state.gifts.filter((n) => n > 0).length,
      xp: 50,
      charms: 2,
      title: "河畔收藏家",
      icon: "collection",
    },
    {
      id: "moments",
      name: "把路走出花来",
      desc: "发现 6 个旅途瞬间",
      need: 6,
      value: () =>
        new Set(state.photos.map((photo) => photo.photoId).filter(Boolean))
          .size,
      xp: 45,
      leaves: 35,
      icon: "album",
    },
    {
      id: "keepsakes",
      name: "给小屋添一件东西",
      desc: "收集 6 件沿途小物",
      need: 6,
      value: () =>
        Object.values(state.souvenirs || {}).filter((count) => count > 0)
          .length,
      xp: 55,
      charms: 1,
      title: "沿途拾光者",
      icon: "stone",
    },
    {
      id: "letters",
      name: "远方会回信",
      desc: "收下 3 封旅行来信",
      need: 3,
      value: () => (state.letters || []).length,
      xp: 40,
      leaves: 30,
      icon: "journal",
    },
    {
      id: "friends",
      name: "小屋里的新朋友",
      desc: "认识全部 3 位朋友",
      need: 3,
      value: () => Object.values(state.friends).filter((f) => f.known).length,
      xp: 30,
      leaves: 30,
      title: "暖心邻居",
      icon: "rabbit",
    },
    {
      id: "bond",
      name: "总想来你家坐坐",
      desc: "任意朋友好感达到 6",
      need: 6,
      value: () =>
        Math.max(0, ...Object.values(state.friends).map((f) => f.bond)),
      xp: 40,
      charms: 1,
      icon: "charm",
    },
    {
      id: "ten",
      name: "还有更远的风",
      desc: "完成 10 次旅行",
      need: 10,
      value: () => state.trips,
      xp: 80,
      leaves: 100,
      title: "悠游旅人",
      icon: "journal",
    },
  ];
  const LEVELS = [
    { xp: 0, name: "河畔新住客" },
    { xp: 40, name: "小路探索者" },
    { xp: 100, name: "森林老朋友" },
    { xp: 200, name: "远方的收藏家" },
    { xp: 345, name: "小屋故事家" },
  ];
  function ensureGrowth() {
    if (!state.growth) state.growth = { claimed: [], title: "", display: 0 };
    if (!Array.isArray(state.growth.claimed)) state.growth.claimed = [];
    if (!state.souvenirs) state.souvenirs = {};
    if (!state.discoveries) state.discoveries = {};
    if (!Array.isArray(state.letters)) state.letters = [];
    if (state.growth.displaySouvenir === undefined)
      state.growth.displaySouvenir = "";
    if (!state.ambience)
      state.ambience = {
        time: "auto",
        motion: true,
        music: false,
        volume: 0.35,
      };
  }
  function growthXP() {
    return GOALS.filter((g) => state.growth.claimed.includes(g.id)).reduce(
      (n, g) => n + g.xp,
      0,
    );
  }
  function growthLevel() {
    const xp = growthXP();
    return LEVELS.reduce((a, l, i) => (xp >= l.xp ? i : a), 0);
  }
  function availableTitles() {
    return GOALS.filter(
      (g) => g.title && state.growth.claimed.includes(g.id),
    ).map((g) => g.title);
  }
  function renderGrowth() {
    ensureGrowth();
    let xp = growthXP(),
      lv = growthLevel(),
      next = LEVELS[lv + 1],
      keepsakes = allSouvenirs(),
      foundKeepsakes = keepsakes.filter(
        (souvenir) => state.souvenirs[souvenir.id] > 0,
      ).length,
      percent = next
        ? ((xp - LEVELS[lv].xp) / (next.xp - LEVELS[lv].xp)) * 100
        : 100;
    let found = state.gifts.filter((n) => n > 0).length;
    let html = `<div class="growth-hero"><span class="level-medal">${icon("charm")}<b>${lv + 1}</b></span><div><small>小屋成长 · LV.${lv + 1}</small><h3>${LEVELS[lv].name}</h3><div class="growth-meter"><i style="width:${percent}%"></i></div><p>${next ? `${xp} / ${next.xp} 成长点 · 下一阶段：${next.name}` : "全部阶段已达成 · 谢谢你珍藏这些日常"}</p></div></div><div class="tabs growth-tabs">${[
      ["treasures", "特产收藏"],
      ["goals", "旅途里程碑"],
      ["titles", "我的称号"],
    ]
      .map(
        ([id, name]) =>
          `<button data-growth-tab="${id}" class="${ui.collectionTab === id ? "active" : ""}">${name}${id === "goals" && GOALS.some((g) => g.value() >= g.need && !state.growth.claimed.includes(g.id)) ? " · 有奖励" : ""}</button>`,
      )
      .join("")}</div>`;
    if (ui.collectionTab === "treasures") {
      let display =
        state.gifts[state.growth.display] > 0
          ? state.growth.display
          : state.gifts.findIndex((n) => n > 0);
      const displayedKeepsake = keepsakes.find(
        (souvenir) =>
          souvenir.id === state.growth.displaySouvenir &&
          state.souvenirs[souvenir.id] > 0,
      );
      html += displayedKeepsake
        ? `<div class="display-shelf"><span>${icon(displayedKeepsake.icon)}</span><div><small>今日陈列 · 沿途发现</small><h3>${displayedKeepsake.name}</h3><p>${displayedKeepsake.story}</p></div></div>`
        : display >= 0
          ? `<div class="display-shelf"><span>${PLACES[display].icon}</span><div><small>今日陈列</small><h3>${PLACES[display].gift}</h3><p>来自${PLACES[display].name} · 一份值得记住的小礼物</p></div></div>`
          : `<p class="intro">架子已擦干净，等阿獭带回第一份小礼物。点击藏品能查看来历并换上陈列。</p>`;
      html += `<div class="collection-summary"><b>目的地特产 ${found} / 4</b><span>累计 ${state.gifts.reduce((a, b) => a + b, 0)} 份</span></div><div class="items">${PLACES.map((p, i) => `<button class="souvenir" data-treasure="${i}" ${!state.gifts[i] ? "disabled" : ""}><span>${state.gifts[i] ? p.icon : icon("lock")}</span><strong>${state.gifts[i] ? p.gift : "尚未发现"}</strong><small>${p.name} · ${state.gifts[i] ? "珍藏 " + state.gifts[i] + " 份" : "等一份远方礼物"}</small></button>`).join("")}</div><div class="section-label">沿途小物 · ${foundKeepsakes} / ${keepsakes.length}</div><p class="intro">不同的小路，会留下不同的东西。带上帐篷，有机会把第二件小物也带回家。</p><div class="discovery-grid">${keepsakes
        .map((souvenir) => {
          const count = state.souvenirs[souvenir.id] || 0;
          return `<button class="discovery-card ${count ? "found" : ""}" data-souvenir="${souvenir.id}" ${!count ? "disabled" : ""}><span>${count ? icon(souvenir.icon) : icon("lock")}</span><div><strong>${count ? souvenir.name : "未发现的小物"}</strong><small>${count ? `${souvenir.rarity === "rare" ? "稀有发现" : "沿途小物"} · 珍藏 ${count} 件` : "沿着不同的小路再走走"}</small></div></button>`;
        })
        .join("")}</div>`;
    } else if (ui.collectionTab === "goals") {
      html +=
        '<p class="intro">已完成的旅行和交友记录都会计入。每个里程碑只领取一次，成长点用于提升小屋等级。</p><div class="goal-list">' +
        GOALS.map((g) => {
          let claimed = state.growth.claimed.includes(g.id),
            value = Math.min(g.need, g.value()),
            ready = value >= g.need;
          return `<article class="goal-card ${claimed ? "claimed" : ""}"><span class="goal-icon">${icon(g.icon)}</span><div class="goal-copy"><h3>${g.name}</h3><p>${g.desc} · ${value}/${g.need}</p><div class="growth-meter"><i style="width:${(value / g.need) * 100}%"></i></div><small>成长 +${g.xp}${g.leaves ? " · 幸运叶 +" + g.leaves : ""}${g.charms ? " · 护符 +" + g.charms : ""}${g.title ? " · 称号「" + g.title + "」" : ""}</small></div><button class="${ready && !claimed ? "primary" : "secondary"}" data-goal="${g.id}" ${!ready || claimed ? "disabled" : ""}>${claimed ? "已领取" : ready ? "领取" : "进行中"}</button></article>`;
        }).join("") +
        "</div>";
    } else {
      let titles = availableTitles();
      html += `<p class="intro">称号会显示在左上角的小屋名牌上。完成里程碑并领取奖励后解锁。</p><div class="title-list"><button class="title-card ${!state.growth.title ? "selected" : ""}" data-title=""><span>${icon("home")}</span><div><b>阿獭的河畔小屋</b><small>默认名牌</small></div><em>${!state.growth.title ? "使用中" : "使用"}</em></button>${GOALS.filter(
        (g) => g.title,
      )
        .map(
          (g) =>
            `<button class="title-card ${state.growth.title === g.title ? "selected" : ""}" data-title="${g.title}" ${!titles.includes(g.title) ? "disabled" : ""}><span>${icon(titles.includes(g.title) ? g.icon : "lock")}</span><div><b>${g.title}</b><small>${g.desc}${titles.includes(g.title) ? " · 已解锁" : ""}</small></div><em>${state.growth.title === g.title ? "使用中" : titles.includes(g.title) ? "佩戴" : "未解锁"}</em></button>`,
        )
        .join("")}</div>`;
    }
    show("小屋收藏与成长", "", html);
  }
  function renderTreasure(i) {
    if (!PLACES[i] || !state.gifts[i]) return;
    let p = PLACES[i];
    const stories = [
      "手心里凉凉的小石头，磨得很圆，像湖面落下的一颗月亮。",
      "把贝壳贴近耳边，仿佛还能听到那天的浪声。",
      "森林里捡来的橡果。阿獭说，挑它的时候还遇见了一只松鼠。",
      "小镇铺子里的手绘风铃。轻轻晃一晃，就想起桥边那场雨。",
    ];
    show(
      p.gift,
      "",
      `<div class="detail-art" style="background-position:${p.pos}"></div><p class="quote">${stories[i]}</p><div class="reward">${p.icon} 已珍藏 ${state.gifts[i]} 份 · 来自${p.name}</div><button class="primary full" data-display="${i}">${state.growth.display === i ? "正在陈列" : "放上收藏柜的展示位"}</button><button class="secondary full" data-go="collection">回到收藏柜</button>`,
    );
  }
  function renderSouvenir(id) {
    ensureGrowth();
    const souvenir = allSouvenirs().find((item) => item.id === id);
    if (!souvenir || !state.souvenirs[souvenir.id]) return;
    const pack = TRAVEL_CONTENT.find((content) =>
      content.souvenirs.some((item) => item.id === id),
    );
    const route = pack?.routes.find((route) => route.id === souvenir.route);
    const place = pack && PLACES[pack.place];
    show(
      souvenir.name,
      "A LITTLE THING FROM THE ROAD",
      `<div class="souvenir-detail"><span>${icon(souvenir.icon)}</span><div><b>${souvenir.rarity === "rare" ? "稀有发现" : "沿途小物"}</b><p>${souvenir.desc}</p></div></div><p class="quote">${souvenir.story}</p><div class="reward">来自${place?.name || "远方"} · ${route?.name || "一条小路"}<br>已经珍藏 ${state.souvenirs[souvenir.id]} 件</div><button class="primary full" data-display-souvenir="${souvenir.id}">${state.growth.displaySouvenir === souvenir.id ? "正在陈列" : "放上收藏柜的展示位"}</button><button class="secondary full" data-go="collection">回到收藏柜</button>`,
    );
  }
  function claimGoal(id) {
    ensureGrowth();
    const g = GOALS.find((g) => g.id === id);
    if (!g || state.growth.claimed.includes(id) || g.value() < g.need) return;
    let old = growthLevel();
    state.growth.claimed.push(id);
    state.leaves += g.leaves || 0;
    if (g.charms)
      state.inventory.charm = (state.inventory.charm || 0) + g.charms;
    log(`达成「${g.name}」，获得 ${g.xp} 成长点。`);
    save();
    render();
    renderGrowth();
    toast(
      growthLevel() > old
        ? "小屋成长啦：" + LEVELS[growthLevel()].name
        : "已领取「" + g.name + "」的奖励",
    );
  }

  return {
    growthXP,
    renderGrowth,
    renderTreasure,
    renderSouvenir,
    claimGoal,
    ensureGrowth,
    growthLevel,
    GOALS,
    LEVELS,
    availableTitles,
  };
}
