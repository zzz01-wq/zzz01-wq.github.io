import { $, state, ui, save, log } from "../store.js";
import { icon } from "../icons.js";
import { ITEMS } from "../data.js";
import { CAST_ATLAS } from "../assets.js";
export function createLife(app) {
  const show = (...args) => app.show(...args);
  const openPanel = (...args) => app.openPanel(...args);
  const render = (...args) => app.render(...args);
  const toast = (...args) => app.toast(...args);
  const close = (...args) => app.close(...args);
  const duration = (...args) => app.duration(...args);
  const item = (...args) => app.item(...args);
  const FRIENDS = [
    {
      id: "rabbit",
      name: "小兔棉棉",
      sprite: 6,
      unlock: 0,
      like: "rice",
      hint: "喜欢清清淡淡、软软糯糯的味道。",
      hello: "河边的花开了，想来找你一起看看。",
      loved: "是梅子饭团！酸酸的，正好是我喜欢的味道。",
      chat: "我在河边看见一朵小花，像一只打哈欠的云。",
    },
    {
      id: "squirrel",
      name: "松鼠栗栗",
      sprite: 7,
      unlock: 3,
      like: "mushroom",
      hint: "闻到烤面包的香味，就会走不动路。",
      hello: "刚从林子里回来，你家闻起来好温暖。",
      loved: "蘑菇面包！连尾巴都忍不住开心地晃起来了。",
      chat: "我藏了好几颗橡果。至于藏在哪……等我想一想。",
    },
    {
      id: "hedgehog",
      name: "刺猬团团",
      sprite: 8,
      unlock: 6,
      like: "sandwich",
      hint: "总念叨着海风和一点点咸味。",
      hello: "路过这里，能坐一会儿吗？",
      loved: "海盐三明治！像在海边吃午饭一样。",
      chat: "走得慢一点，就能遇见藏在草丛里的小蘑菇。",
    },
  ];
  const ACTIONS = {
    read: {
      sprite: 0,
      label: "看书",
      line: "再翻一页，就知道山的另一边是什么了。",
      status: "阿獭在看书",
    },
    eat: {
      sprite: 1,
      label: "吃饭",
      line: "慢慢嚼，今天的小饭团也很好吃。",
      status: "阿獭在吃饭",
    },
    sleep: {
      sprite: 2,
      label: "打盹",
      line: "嘘……阿獭在梦里继续旅行。",
      status: "阿獭睡着了",
    },
    pack: {
      sprite: 3,
      label: "整理背包",
      line: "便当、围巾，还有一点点期待。",
      status: "阿獭在整理背包",
    },
  };
  const CAST_RECTS = [
    [0, 0, 418, 460],
    [418, 0, 418, 458],
    [836, 0, 418, 451],
    [0, 460, 418, 378],
    [418, 457, 418, 381],
    [836, 451, 418, 387],
    [0, 838, 418, 416],
    [418, 840, 418, 414],
    [836, 838, 418, 416],
  ];
  const VISITOR_RULES = {
    fast: { first: 60000, next: 240000, stay: 90000 },
    normal: { first: 1800000, next: 7200000, stay: 1200000 },
  };
  let actorKey = "",
    visitorKey = "",
    motion = null,
    visitorPreview = null;
  function castArt(index, extra = "") {
    const [x, y, w, h] = CAST_RECTS[index];
    return `<span class="cast-sprite ${extra}" style="aspect-ratio:${w}/${h}"><img src="${CAST_ATLAS}" alt="" draggable="false" style="width:${(1254 / w) * 100}%;height:${(1254 / h) * 100}%;left:${(-x / w) * 100}%;top:${(-y / h) * 100}%"></span>`;
  }
  function visitorTiming(first = false) {
    const rule = state.fast ? VISITOR_RULES.fast : VISITOR_RULES.normal;
    return first ? rule.first : rule.next;
  }
  function visitorDelay(first = false) {
    return Math.round(visitorTiming(first) * (0.8 + Math.random() * 0.6));
  }
  function scheduleNextVisitor(now, first = false) {
    state.visitorAt = now + visitorDelay(first);
    state.visitorScheduleMode = state.fast ? "fast" : "normal";
  }
  function souvenirProgress() {
    const keepsakes = Object.values(state.souvenirs || {}).filter(
      (count) => count > 0,
    ).length;
    const discoveredPlaces = Array.isArray(state.gifts)
      ? state.gifts.filter((count) => count > 0).length
      : 0;
    return Math.max(keepsakes, discoveredPlaces);
  }
  function isFriendUnlocked(friend) {
    return souvenirProgress() >= friend.unlock;
  }
  function availableFriends() {
    return FRIENDS.filter(isFriendUnlocked);
  }
  function pickVisitor() {
    const unlocked = availableFriends();
    const withoutLast = unlocked.filter(
      (friend) => friend.id !== state.visitorLastId,
    );
    const pool = withoutLast.length ? withoutLast : unlocked;
    return pool[Math.floor(Math.random() * pool.length)] || FRIENDS[0];
  }
  function ensureLife() {
    const now = Date.now();
    if (!state.life)
      state.life = { mode: "read", until: now + 18000, cycle: 0 };
    if (!ACTIONS[state.life.mode]) state.life.mode = "read";
    if (!state.friends) state.friends = {};
    FRIENDS.forEach((f) => {
      if (!state.friends[f.id])
        state.friends[f.id] = {
          bond: 0,
          visits: 0,
          known: false,
          rewardTier: 0,
          favorite: false,
        };
    });
    if (!Number.isInteger(state.visitorCursor)) state.visitorCursor = 0;
    if (state.visitorScheduleVersion !== 2) {
      state.visitorScheduleVersion = 2;
      if (!state.visitor) scheduleNextVisitor(now, true);
      save();
    }
    if (!state.visitorAt || !state.visitorScheduleMode) {
      if (!state.visitor) scheduleNextVisitor(now, true);
      save();
    }
    const scheduleMode = state.fast ? "fast" : "normal";
    if (!state.visitor && state.visitorScheduleMode !== scheduleMode) {
      scheduleNextVisitor(now, true);
      save();
    }
    if (state.visitor === true) {
      state.visitor = false;
      startVisit(now, "rabbit");
    }
  }
  function startVisit(now, id) {
    if (state.visitor) return;
    const f = FRIENDS.find((f) => f.id === id) || pickVisitor();
    state.visitorCursor++;
    state.visitor = {
      id: f.id,
      arrivedAt: now,
      leaveAt: now + (state.fast ? VISITOR_RULES.fast : VISITOR_RULES.normal).stay,
      chatted: false,
      fed: false,
      reaction: f.hello,
    };
    state.visitorAt = state.visitor.leaveAt;
    state.visitorLastId = f.id;
    const record = state.friends[f.id];
    record.known = true;
    record.visits++;
    log(`${f.name}来小屋串门了。`);
  }
  function endVisit(quiet = false) {
    if (visitorPreview) {
      visitorPreview = null;
      visitorKey = "";
      if (ui.activePanel === "friends") renderFriends();
      return;
    }
    if (!state.visitor) return;
    const f = FRIENDS.find((f) => f.id === state.visitor.id);
    state.visitor = false;
    scheduleNextVisitor(Date.now());
    visitorKey = "";
    if (!quiet) {
      log(`${f.name}挥挥手，沿着小路回家了。`);
      toast(`${f.name}：下次再来找你！`);
    }
    save();
    if (ui.activePanel === "friends") renderFriends();
  }
  function lifeTick(now) {
    ensureLife();
    if (motion && now >= motion.until) motion = null;
    if (state.status === "home" && !state.pending && now >= state.life.until) {
      const sequence = ["read", "eat", "sleep", "read", "pack"];
      do {
        state.life.cycle = (state.life.cycle + 1) % sequence.length;
      } while (sequence[state.life.cycle] === state.life.mode);
      state.life.mode = sequence[state.life.cycle];
      state.life.until = now + (state.fast ? 18000 : 65000);
      save();
    }
    if (state.visitor && now >= state.visitor.leaveAt) {
      endVisit(true);
      save();
      return;
    }
    if (
      !state.visitor &&
      (state.status !== "home" || state.pending) &&
      now >= state.visitorAt
    ) {
      scheduleNextVisitor(now);
    }
    if (
      state.status === "home" &&
      !state.pending &&
      !state.visitor &&
      (!ui.activePanel || ui.activePanel === "friends") &&
      now >= state.visitorAt
    ) {
      startVisit(now);
      save();
      if (ui.activePanel === "friends") renderFriends();
      else if (!ui.activePanel) openPanel("friends");
    }
  }
  function lifeRender() {
    const now = Date.now(),
      travel = state.status === "travel",
      ready = state.status === "ready";
    let mode = ready ? "pack" : state.life.mode,
      index = state.pending ? 5 : ACTIONS[mode].sprite;
    if (motion) {
      index = motion.kind === "leaving" ? 4 : 5;
      mode = motion.kind;
    } else if (state.pending) mode = "returned";
    const key = mode;
    const actor = $("#otter");
    if (actorKey !== key) {
      actor.innerHTML = castArt(index);
      actor.dataset.action = mode;
      actorKey = key;
    }
    actor.hidden = travel && !motion;
    $("#bubble").hidden = travel || !!motion;
    $("#travel-sign").hidden = !travel || !!motion;
    $("#bag-hotspot").hidden = travel || !!motion;
    actor.setAttribute(
      "aria-label",
      state.pending
        ? "阿獭带着礼物回来了"
        : "和阿獭互动，当前" + ACTIONS[state.life.mode].label,
    );
    $("#life-button").hidden = travel || !!motion || !!state.pending;
    if (!travel && !state.pending && !motion) {
      if (!ready) {
        $("#status-title").textContent = ACTIONS[mode].status;
        $("#status-description").textContent =
          mode === "sleep"
            ? "它会自己醒来。也可以提前准备下一份行囊。"
            : mode === "eat"
              ? "吃饱了，才有力气去看更远的风景。"
              : "点阿獭，可以陪它度过小屋里的时光。";
      }
      if (now > ui.speechUntil) $("#bubble").textContent = ACTIONS[mode].line;
    }
    if (motion) {
      $("#status-title").textContent =
        motion.kind === "leaving" ? "一路顺风，阿獭" : "欢迎回家，阿獭";
      $("#status-description").textContent =
        motion.kind === "leaving"
          ? "背好行囊，沿着小路慢慢走远。"
          : "远方的小礼物，马上就到你手里。";
    }
    const v = state.visitor;
    $("#visitor").hidden = !v;
    if (v) {
      const f = FRIENDS.find((f) => f.id === v.id),
        key = v.id + ":" + v.fed;
      if (visitorKey !== key) {
        $("#visitor").innerHTML =
          castArt(f.sprite) +
          `<span class="visitor-label">${v.fed ? "吃得好开心" : "正在做客"}</span>`;
        $("#visitor").dataset.fed = String(v.fed);
        $("#visitor").setAttribute("aria-label", "处理" + f.name + "的来访");
        visitorKey = key;
      }
    }
    $("#friend-dot").hidden = !v;
    $("#friends-button").setAttribute(
      "aria-label",
      v ? "朋友来访，点击处理" : "打开朋友手册",
    );
    if (ui.activePanel === "friends" && v && $("#visit-time"))
      $("#visit-time").textContent = duration(v.leaveAt - now);
  }
  function startMotion(kind) {
    if (document.hidden) return;
    motion = { kind, until: Date.now() + 3400 };
    actorKey = "";
  }
  function renderLife() {
    if (state.status === "travel") {
      openPanel("bag");
      return;
    }
    if (state.pending) {
      openPanel("reward");
      return;
    }
    const a = ACTIONS[state.status === "ready" ? "pack" : state.life.mode];
    show(
      "阿獭的小日常",
      "",
      `<div class="life-portrait">${castArt(a.sprite)}</div><p class="friend-quote">「${a.line}」</p><p class="intro">它会自己看书、吃饭和打盹，也很喜欢你陪它一会儿。日常吃饭不消耗旅行便当。</p><div class="life-actions">${Object.entries(
        ACTIONS,
      )
        .map(
          ([id, v]) =>
            `<button class="secondary ${state.life.mode === id ? "chosen" : ""}" data-life="${id}" ${state.status === "ready" ? "disabled" : ""}>${icon(id === "read" ? "journal" : id === "eat" ? "rice" : id === "sleep" ? "home" : "bag")}<span>${id === "read" ? "一起看书" : id === "eat" ? "陪它吃饭" : id === "sleep" ? "休息一会" : "整理背包"}</span></button>`,
        )
        .join(
          "",
        )}</div>${state.status === "ready" ? '<p class="intro">它正在做出发前的准备，先让它收拾好吧。</p>' : ""}<button class="primary full" data-go="bag">准备旅行行囊</button>`,
    );
  }
  function bondLabel(n) {
    return n >= 12
      ? "亲密伙伴"
      : n >= 6
        ? "熟悉的朋友"
        : n >= 2
          ? "渐渐熟悉"
          : "初次相识";
  }
  function friendCard(f) {
    const r = state.friends[f.id];
    if (!isFriendUnlocked(f))
      return `<button class="friend-card friend-locked" disabled>${castArt(f.sprite)}<strong>${f.name}</strong><small>收集 ${f.unlock} 件沿途小物后出现</small><span class="bond-track"><i style="width:${Math.min(100, (souvenirProgress() / f.unlock) * 100)}%"></i></span></button>`;
    return `<button class="friend-card" data-friend="${f.id}">${castArt(f.sprite)}<strong>${f.name}</strong><small>${r.known ? bondLabel(r.bond) : "还没有来访"}</small><span class="bond-track"><i style="width:${Math.min(100, (r.bond / 12) * 100)}%"></i></span></button>`;
  }
  function renderFriends() {
    const v = visitorPreview || state.visitor,
      preview = !!visitorPreview,
      f = v && FRIENDS.find((f) => f.id === v.id);
    let html = "";
    if (v) {
      const r = state.friends[f.id];
      html = `${preview ? '<p class="developer-preview-note">开发者预览 · 互动不会消耗物品、改变好感或保存进度。</p>' : ""}<div class="friend-welcome">${castArt(f.sprite)}<div><span class="guest-tag">${preview ? "开发者预览" : "正在做客"}</span><h3>${f.name}</h3><p>${bondLabel(r.bond)} · 好感 ${r.bond}</p><small>${preview ? "仅供查看" : `还会坐 <span id="visit-time">${duration(v.leaveAt - Date.now())}</span>`}</small></div></div><p class="friend-quote">「${v.reaction}」</p><div class="guest-actions"><button class="secondary" data-chat="${f.id}" ${v.chatted ? "disabled" : ""}>${v.chatted ? "已经聊过啦" : "聊聊天 · 好感 +1"}</button><button class="secondary" data-goodbye="${f.id}">挥手道别</button></div>`;
      if (!v.fed) {
        html += `<div class="section-label">${preview ? "预览互动" : "请它吃点什么 · 每次消耗一份"}</div><p class="intro">${preview ? "可以直接尝试不同食物的回应，实际游戏中的物品和好感不会改变。" : `${r.favorite ? "记住啦：最喜欢" + item(f.like).name + "。" : f.hint} 已装进行囊的最后一份便当会为阿獭保留。`}</p><div class="items">${ITEMS.filter(
          (i) => i.type === "food",
        )
          .map((i) => {
            const count = preview ? 1 : state.inventory[i.id] || 0,
              reserved = preview ? 0 : state.bag.food === i.id ? 1 : 0;
            return `<button class="item" data-feed="${i.id}" ${count <= reserved ? "disabled" : ""}><span class="item-icon">${i.icon}</span><span><strong>${i.name}</strong><small>可招待 ${Math.max(0, count - reserved)} 份</small><small class="cost">${r.favorite && i.id === f.like ? "最喜欢 · 好感 +3" : i.id === "bento" ? "丰盛款 · 好感 +2" : "请它尝尝"}</small></span></button>`;
          })
          .join(
            "",
          )}</div><button class="secondary full" data-go="shop">去杂货铺买点吃的</button>`;
      } else
        html +=
          '<div class="reward">已经招待过啦。它会再坐一会儿，不用重复准备食物。</div>';
    } else
      html = `<div class="empty"><span>${icon("rabbit")}</span>朋友们正在各自的小路上。<br>下一位客人，会带来什么故事呢？</div>`;
    html += `<div class="section-label">河畔朋友手册</div><div class="friend-roster">${FRIENDS.map(friendCard).join("")}</div><p class="friend-note">朋友不会频繁出现。先来的朋友会陪你熟悉小屋，收集沿途小物后，新的朋友才会偶尔来访；每次来访可聊天一次、招待一次。</p>`;
    show(
      v ? `${f.name}来串门啦` : "河畔的朋友们",
      "",
      html,
      v ? castArt(f.sprite, "panel-friend") : null,
    );
  }
  function renderFriendDetail(id) {
    ui.activePanel = "friendDetail";
    const f = FRIENDS.find((f) => f.id === id);
    if (!f) return;
    const r = state.friends[id];
    show(
      f.name,
      "",
      `<div class="life-portrait">${castArt(f.sprite)}</div><p class="friend-quote">「${r.known ? f.chat : "也许下一次，它就会敲响小屋的门。"}」</p><div class="reward">${bondLabel(r.bond)} · 好感 ${r.bond}<br>已经来访 ${r.visits} 次<br>${r.favorite ? "最喜欢：" + item(f.like).name : "口味线索：" + f.hint}</div><button class="secondary full" data-go="friends">回到朋友手册</button>`,
    );
  }
  function addBond(id, n) {
    const r = state.friends[id];
    r.bond += n;
    let tier = r.bond >= 12 ? 2 : r.bond >= 6 ? 1 : 0;
    if (tier > r.rewardTier) {
      let count = tier - r.rewardTier;
      state.inventory.charm = (state.inventory.charm || 0) + count;
      r.rewardTier = tier;
      log(
        `${FRIENDS.find((f) => f.id === id).name}送来 ${count} 枚四叶草护符，纪念你们的友谊。`,
      );
      return `，友谊礼物：护符 +${count}`;
    }
    return "";
  }
  function feedFriend(foodId) {
    if (visitorPreview) {
      const f = FRIENDS.find((friend) => friend.id === visitorPreview.id),
        food = item(foodId);
      if (!f || visitorPreview.fed || !food || food.type !== "food") return;
      visitorPreview.fed = true;
      visitorPreview.reaction =
        foodId === f.like
          ? f.loved
          : foodId === "bento"
            ? "这么丰盛的便当，肚子和心里都暖暖的。"
            : "谢谢你愿意分给我，坐在这里吃东西很安心。";
      renderFriends();
      return;
    }
    const v = state.visitor;
    if (!v || v.fed) return;
    const f = FRIENDS.find((f) => f.id === v.id),
      food = item(foodId);
    if (!food || food.type !== "food") return;
    const reserved = state.bag.food === foodId ? 1 : 0;
    if ((state.inventory[foodId] || 0) <= reserved) {
      toast("这一份已经为阿獭装进行囊啦。");
      return;
    }
    v.fed = true;
    state.inventory[foodId]--;
    const loved = foodId === f.like,
      rich = foodId === "bento",
      gain = loved ? 3 : rich ? 2 : 1,
      leaves = loved ? 18 : rich ? 12 : 8;
    state.leaves += leaves;
    if (loved) state.friends[f.id].favorite = true;
    v.reaction = loved
      ? f.loved
      : rich
        ? "这么丰盛的便当，肚子和心里都暖暖的。"
        : "谢谢你愿意分给我，坐在这里吃东西很安心。";
    v.leaveAt = Math.min(v.leaveAt, Date.now() + (state.fast ? 25000 : 90000));
    const extra = addBond(f.id, gain);
    log(
      `用${food.name}招待了${f.name}，好感 +${gain}，收到了 ${leaves} 片幸运叶。`,
    );
    save();
    renderFriends();
    render();
    toast(`好感 +${gain}，幸运叶 +${leaves}${extra}`);
  }
  function chatFriend(id) {
    if (visitorPreview) {
      if (visitorPreview.id !== id || visitorPreview.chatted) return;
      visitorPreview.chatted = true;
      const f = FRIENDS.find((friend) => friend.id === id);
      visitorPreview.reaction = f.chat;
      renderFriends();
      return;
    }
    const v = state.visitor;
    if (!v || v.id !== id || v.chatted) return;
    v.chatted = true;
    const f = FRIENDS.find((f) => f.id === id);
    v.reaction = f.chat;
    const extra = addBond(id, 1);
    log(`和${f.name}聊了聊路上的小事。`);
    save();
    renderFriends();
    toast(`好感 +1${extra}`);
  }
  function chooseLife(id) {
    if (!ACTIONS[id] || state.status !== "home" || state.pending) return;
    state.life.mode = id;
    state.life.until = Date.now() + (state.fast ? 20000 : 65000);
    ui.speechUntil = 0;
    actorKey = "";
    save();
    close();
    render();
    toast(
      id === "sleep"
        ? "轻轻盖好小毯子，让它睡一会儿。"
        : id === "eat"
          ? "坐下来，一起慢慢吃。"
          : id === "pack"
            ? "阿獭开始检查背包里的小物件。"
            : "阿獭往旁边挪了一点，给你留了位置。",
    );
  }

  function previewVisit(id) {
    if (!state.devMode) return;
    const f = FRIENDS.find((friend) => friend.id === id);
    if (!f) return;
    ensureLife();
    const now = Date.now();
    visitorPreview = {
      id: f.id,
      arrivedAt: now,
      leaveAt: now + 900000,
      chatted: false,
      fed: false,
      reaction: f.hello,
    };
    openPanel("friends");
  }

  function clearPreviewVisit() {
    visitorPreview = null;
    visitorKey = "";
  }

  function isMoving() {
    return !!motion;
  }

  return {
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
    previewVisitor: previewVisit,
    clearPreviewVisitor: clearPreviewVisit,
    chooseLife,
    isMoving,
  };
}
