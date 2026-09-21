(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const connection = $("#connection");
  const connectionText = connection.querySelector("span");
  const input = $("#command");
  const submit = $("#submit");
  const prompt = $("#prompt");
  const working = $("#working");
  const journal = $("#journal");
  const scrollArea = $("#scroll-area");
  const welcome = $("#welcome");
  const encounter = $("#encounter");
  const choice = $("#choice");
  const hand = $("#hand");
  const commands = ["help", "status", "look", "new", "play", "end", "choose", "take", "skip", "back", "map", "move", "proceed", "shop", "buy", "potion", "discard-potion", "hand", "deck", "draw", "discard", "exhaust", "relics", "potions", "inspect", "cards", "abandon", "clear"];
  const readOnlyWhileBusy = new Set(["help", "status", "look", "map", "hand", "deck", "draw", "discard", "exhaust", "relics", "potions", "inspect", "cards", "shop"]);
  const routeLabels = {Monster:"普通战斗", Elite:"精英战", Boss:"首领", Event:"事件", Unknown:"未知", Treasure:"宝箱", RestSite:"休息处", Shop:"商店"};
  const phaseLabels = {ready:"等待启程", combat:"战斗中", choice:"待选择", victory:"胜利", defeat:"旅程结束", error:"适配错误", Monster:"战斗", Elite:"精英战", Boss:"首领战", Event:"事件", Shop:"商店", RestSite:"休息处", Treasure:"宝箱", CombatRoom:"战斗", EventRoom:"事件", RestSiteRoom:"休息处", TreasureRoom:"宝箱", MerchantRoom:"商店"};
  const historyKey = "spire-command-history-v1";
  let state = null;
  let connected = false;
  let submitting = false;
  let composing = false;
  let interactionStarted = false;
  let retryCount = 0;
  let retryTimer = 0;
  let history = readHistory();
  let historyCursor = history.length;
  let historyDraft = "";
  let tabBase = null;
  let tabCurrent = "";
  let tabMatches = [];
  let tabIndex = -1;

  function readHistory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
      return Array.isArray(saved) ? saved.filter((x) => typeof x === "string").slice(-60) : [];
    } catch (_) { return []; }
  }
  function saveHistory() {
    try { sessionStorage.setItem(historyKey, JSON.stringify(history.slice(-60))); } catch (_) {}
  }
  function addHistory(value) {
    if (!value || history[history.length - 1] === value) return;
    history.push(value);
    history = history.slice(-60);
    historyCursor = history.length;
    historyDraft = "";
    saveHistory();
  }
  function el(tag, cls, value) {
    const out = document.createElement(tag);
    if (cls) out.className = cls;
    if (value !== undefined && value !== null) out.textContent = String(value);
    return out;
  }
  function value(x, fallback) {
    return x === undefined || x === null || x === "" ? (fallback || "") : String(x);
  }
  function addEntry(command, messages, isError) {
    const list = Array.isArray(messages) ? messages : [messages];
    if (!command && !list.some((x) => value(x).trim())) return;
    const entry = el("div", "log-entry" + (isError ? " error" : ""));
    if (command) {
      const line = el("div", "log-command");
      line.append(el("span", "log-marker", "›"), el("span", "", command));
      line.append(el("time", "", new Intl.DateTimeFormat("zh-CN", {hour:"2-digit", minute:"2-digit", hour12:false}).format(new Date())));
      entry.append(line);
    }
    list.forEach((message) => {
      if (message !== null && message !== undefined && String(message) !== "") entry.append(el("div", "log-text", message));
    });
    journal.append(entry);
    while (journal.childElementCount > 300) journal.firstElementChild.remove();
    scrollArea.scrollTop = scrollArea.scrollHeight;
  }
  function syncInput() {
    const verb = input.value.trim().split(/\s+/, 1)[0].toLowerCase();
    const busyBlocked = Boolean(state && state.busy && verb && !readOnlyWhileBusy.has(verb) && verb !== "clear");
    input.disabled = !connected || submitting;
    submit.disabled = !connected || submitting || busyBlocked;
    if (!connected) input.placeholder = "连接规则引擎后输入命令";
    else if (submitting) input.placeholder = "命令正在执行…";
    else if (state && state.busy) input.placeholder = "规则仍在结算；可输入 status 查看状态";
    else input.placeholder = "输入 help 查看命令";
  }
  function setConnection(kind, label) {
    connection.classList.remove("online", "offline", "warning");
    connection.classList.add(kind);
    connectionText.textContent = label;
    connection.setAttribute("aria-label", label + "，按 Enter 重试连接");
    connection.title = "重新读取规则引擎状态";
    connection.setAttribute("aria-disabled", connected || submitting ? "true" : "false");
    syncInput();
  }
  function scheduleRetry() {
    if (retryTimer || connected) return;
    const delay = Math.min(30000, 1200 * Math.pow(2, Math.min(retryCount, 5)));
    retryCount += 1;
    connectionText.textContent = "连接失败 · " + Math.ceil(delay / 1000) + " 秒后重试";
    retryTimer = window.setTimeout(() => { retryTimer = 0; fetchState(true); }, delay);
  }
  async function readJson(response) {
    const raw = await response.text();
    if (!raw) return {};
    try { return JSON.parse(raw); }
    catch (_) { throw new Error("服务返回了无法读取的数据（HTTP " + response.status + "）"); }
  }
  function validateSnapshot(s) {
    if (!s || typeof s !== "object" || Array.isArray(s) ||
        (!Object.prototype.hasOwnProperty.call(s, "phase") && !Object.prototype.hasOwnProperty.call(s, "prompt"))) {
      throw new Error("规则引擎没有返回游戏状态。请稍后重试。");
    }
  }
  function stat(label, number) {
    const item = el("div", "stat");
    item.append(el("span", "", label), el("strong", "", value(number, "—")));
    return item;
  }
  function sectionHeading(label, detail) {
    const out = el("div", "section-label");
    out.append(el("span", "", label));
    if (detail) out.append(el("span", "section-detail", detail));
    return out;
  }
  function animateState(element) {
    if (element.hidden) return;
    element.classList.remove("state-enter");
    void element.offsetWidth;
    element.classList.add("state-enter");
  }
  function updateStatus(s) {
    const player = s.player;
    $("#location").textContent = value(s.location, player ? "尖塔" : "尖塔入口");
    if (!player) {
      $("#stage").textContent = "等待启程";
      $("#player-name").textContent = "战士";
      $("#seed").textContent = "SEED —";
      $("#character-status").replaceChildren(el("div", "empty-status", "尚未踏入尖塔"), el("span", "empty-status-note", "输入 new ironclad 开始"));
      $("#relic-count").textContent = "—";
      $("#relics").replaceChildren(el("span", "muted", "旅程开始后显示"));
      $("#potions").replaceChildren(el("span", "muted", "—"));
      return;
    }
    const parts = [];
    if (Number(s.act) > 0) parts.push("第 " + s.act + " 幕");
    if (Number(s.floor) > 0) parts.push("第 " + s.floor + " 层");
    if (s.phase) parts.push(phaseLabels[s.phase] || String(s.phase));
    $("#stage").textContent = parts.join(" · ") || "旅程进行中";
    $("#player-name").textContent = value(player.name, "战士");
    $("#seed").textContent = "SEED " + value(s.seed, "—");

    const status = el("div", "character-readout");
    const hpLine = el("div", "hp-line");
    hpLine.append(el("strong", "", "HP"));
    const hpValue = el("span");
    hpValue.append(document.createTextNode(value(player.hp, "—")));
    hpValue.append(el("small", "", " / " + value(player.maxHp, "—")));
    hpLine.append(hpValue);
    status.append(hpLine);
    const maxHp = Number(player.maxHp) || 0;
    const hp = Number(player.hp) || 0;
    const bar = el("div", "hp-bar");
    const fill = el("span");
    fill.style.width = (maxHp ? Math.max(0, Math.min(100, 100 * hp / maxHp)) : 0) + "%";
    bar.append(fill);
    status.append(bar);
    const stats = el("div", "stats");
    stats.append(stat("格挡", player.block), stat("能量", value(player.energy, "—") + " / " + value(player.maxEnergy, "—")), stat("金币", player.gold));
    status.append(stats);
    status.append(el("div", "piles", "回合 " + value(player.turn, "—") + "\n卡组 " + value(player.deck, "—") + " · 抽牌堆 " + value(player.draw, "—") + "\n弃牌堆 " + value(player.discard, "—") + " · 消耗堆 " + value(player.exhaust, "—")));
    const playerPowers = Array.isArray(player.powers) ? player.powers : [];
    if (playerPowers.length) {
      const powerList = el("div", "player-powers");
      playerPowers.forEach((power) => powerList.append(el("div", "power-line", power)));
      status.append(powerList);
    }
    $("#character-status").replaceChildren(status);

    const relics = Array.isArray(player.relics) ? player.relics : [];
    $("#relic-count").textContent = String(relics.length);
    const relicList = $("#relics");
    relicList.replaceChildren();
    if (!relics.length) relicList.append(el("span", "muted", "暂无遗物"));
    relics.forEach((relic) => {
      const row = el("div", "relic");
      row.append(el("span", "", value(relic && relic.name, "遗物")));
      if (relic && relic.description) row.append(el("small", "", relic.description));
      relicList.append(row);
    });

    const potions = Array.isArray(player.potions) ? player.potions : [];
    const potionList = $("#potions");
    potionList.replaceChildren();
    if (!potions.length) potionList.append(el("span", "muted", "暂无药水槽信息"));
    potions.forEach((potion, index) => {
      const row = el("div", "potion-line");
      row.append(el("span", "potion-index", String(index + 1).padStart(2, "0")), el("span", "", value(potion, "空槽")));
      potionList.append(row);
    });
  }
  function renderEncounter(s) {
    encounter.replaceChildren();
    const enemies = Array.isArray(s.enemies) ? s.enemies : [];
    encounter.hidden = enemies.length === 0;
    if (!enemies.length) return;
    encounter.append(sectionHeading("敌方单位", enemies.length + " 个"));
    const list = el("div", "enemies");
    enemies.forEach((enemy) => {
      const unit = el("article", "enemy");
      const top = el("div", "enemy-top");
      const name = el("div", "enemy-name");
      name.append(el("span", "index", String(enemy.index || "—").padStart(2, "0")), document.createTextNode(value(enemy.name, "敌人")));
      top.append(name);
      const block = Number(enemy.block) > 0 ? " · 格挡 " + enemy.block : "";
      top.append(el("span", "enemy-hp", "HP " + value(enemy.hp, "—") + " / " + value(enemy.maxHp, "—") + block));
      unit.append(top);
      if (enemy.intent) unit.append(el("div", "intent", "意图 · " + enemy.intent));
      if (Array.isArray(enemy.powers) && enemy.powers.length) unit.append(el("div", "powers", "状态 · " + enemy.powers.join(" · ")));
      list.append(unit);
    });
    encounter.append(list);
  }
  function cardRow(card) {
    const row = el("div", "card-row");
    row.append(el("span", "card-index", String(card.index || "—").padStart(2, "0")));
    row.append(el("span", "card-cost", value(card.cost, "—")));
    const details = el("div", "card-details");
    const title = el("div", "card-name", value(card.name, "卡牌"));
    if (card.type) title.append(el("span", "card-type", card.type));
    details.append(title, el("div", "card-description", value(card.description)));
    row.append(details);
    return row;
  }
  function renderHand(s) {
    hand.replaceChildren();
    const cards = Array.isArray(s.hand) ? s.hand : [];
    hand.hidden = cards.length === 0;
    if (!cards.length) return;
    hand.append(sectionHeading("手牌", cards.length + " 张 · play 手牌编号"));
    const list = el("div", "card-list");
    cards.forEach((card) => list.append(cardRow(card)));
    hand.append(list);
  }
  function renderChoices(s) {
    choice.replaceChildren();
    const options = Array.isArray(s.options) ? s.options : [];
    const routes = Array.isArray(s.routes) ? s.routes : [];
    const eventText = value(s.eventText).trim();
    choice.hidden = !options.length && !routes.length && !eventText;
    if (choice.hidden) return;
    if (options.length) {
      choice.append(sectionHeading("当前选项", value(s.prompt)));
      if (eventText) choice.append(el("div", "event-text", eventText));
      const list = el("div", "option-list");
      options.forEach((option, index) => {
        const row = el("div", "option" + (option.disabled ? " disabled" : ""));
        row.append(el("span", "option-number", String(option.index || index + 1).padStart(2, "0")));
        const detail = el("div", "option-details");
        const title = el("b", "", value(option.name, "选项"));
        if (option.cost !== undefined && option.cost !== null) title.append(el("span", "option-cost", option.cost + " 能量"));
        detail.append(title);
        if (option.description) detail.append(el("p", "", option.description));
        if (option.type) detail.append(el("span", "option-type", option.type));
        row.append(detail);
        list.append(row);
      });
      choice.append(list);
    } else if (eventText) {
      choice.append(sectionHeading("事件", phaseLabels[s.phase] || value(s.phase)), el("div", "event-text", eventText));
    }
    if (routes.length) {
      const section = el("div", "route-section");
      section.append(sectionHeading("可行路线", "move 编号"));
      const list = el("div", "route-list");
      routes.forEach((route, index) => {
        const row = el("div", "route-row");
        row.append(el("span", "option-number", String(route.index || index + 1).padStart(2, "0")));
        row.append(el("span", "route-name", routeLabels[route.name] || value(route.name, "路线")));
        row.append(el("span", "route-coord", "(" + value(route.col, "?") + ", " + value(route.row, "?") + ")"));
        list.append(row);
      });
      section.append(list);
      choice.append(section);
    }
  }
  function applySnapshot(s, includeMessages) {
    validateSnapshot(s);
    state = s;
    connected = true;
    retryCount = 0;
    if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }
    setConnection("online", "规则引擎在线");
    prompt.textContent = value(s.prompt, "输入 help 查看命令");
    working.hidden = !submitting;
    welcome.hidden = Boolean(s.player) || interactionStarted;
    renderEncounter(s);
    renderHand(s);
    renderChoices(s);
    updateStatus(s);
    [encounter, hand, choice, $("#character-status"), $("#relics"), $("#potions")].forEach(animateState);
    syncInput();
    if (includeMessages !== false && Array.isArray(s.messages) && s.messages.length) addEntry("", s.messages, s.phase === "error");
  }
  async function fetchState(quiet) {
    try {
      const response = await fetch("/api/state", {headers:{Accept:"application/json"}, cache:"no-store"});
      const body = await readJson(response);
      if (!response.ok || body.error) throw new Error(value(body.error, "无法读取游戏状态（HTTP " + response.status + "）"));
      applySnapshot(body, state === null);
      if (!quiet) input.focus();
    } catch (error) {
      connected = false;
      setConnection("offline", "无法连接规则引擎");
      prompt.textContent = "服务暂不可用。可使用顶部连接状态重试。";
      if (!quiet) addEntry("", [error.message || "无法连接到规则引擎。"], true);
      scheduleRetry();
    }
  }
  async function send(command) {
    if (!connected || submitting) return;
    const verb = command.split(/\s+/, 1)[0].toLowerCase();
    if (state && state.busy && !readOnlyWhileBusy.has(verb) && verb !== "clear") {
      addEntry("", ["规则仍在结算。请等待状态更新，或输入 status 查看当前状态。"], true);
      return;
    }
    if (command.toLowerCase() === "clear") {
      journal.replaceChildren();
      input.value = "";
      syncInput();
      return;
    }
    interactionStarted = true;
    welcome.hidden = true;
    addHistory(command);
    addEntry(command, []);
    input.value = "";
    submitting = true;
    working.hidden = false;
    syncInput();
    try {
      const response = await fetch("/api/command", {
        method:"POST",
        headers:{"Content-Type":"application/json", Accept:"application/json"},
        body:JSON.stringify({command})
      });
      const body = await readJson(response);
      if (!response.ok || body.error) {
        connected = response.status < 500;
        setConnection(connected ? "warning" : "offline", connected ? "命令请求异常" : "服务暂不可用");
        addEntry("", [value(body.error, "命令请求失败（HTTP " + response.status + "）")], true);
        if (!connected) scheduleRetry();
        return;
      }
      applySnapshot(body);
    } catch (error) {
      connected = false;
      setConnection("offline", "连接中断");
      addEntry("", [error.message || "命令请求连接中断；该命令可能已经执行。请使用 status 查看当前状态，前端不会自动重发命令。"], true);
      scheduleRetry();
    } finally {
      submitting = false;
      working.hidden = true;
      syncInput();
      if (connected) input.focus();
    }
  }
  function completeCommand() {
    const match = /^(\s*)([^\s]*)(.*)$/.exec(input.value);
    if (!match || match[3].trim() || !match[2]) return;
    const leading = match[1];
    const fragment = match[2].toLowerCase();
    if (tabBase === null || (input.value !== tabBase && input.value !== tabCurrent)) {
      tabBase = input.value;
      tabMatches = commands.filter((name) => name.startsWith(fragment));
      tabIndex = -1;
    }
    if (!tabMatches.length) return;
    tabIndex = (tabIndex + 1) % tabMatches.length;
    const exact = tabMatches.length === 1 && tabMatches[0] === fragment;
    input.value = leading + tabMatches[tabIndex] + (exact ? " " : "");
    tabCurrent = input.value;
    input.setSelectionRange(input.value.length, input.value.length);
    syncInput();
  }
  $("#command-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (composing || event.isComposing || (event.submitter && event.submitter.disabled)) return;
    const command = input.value.trim();
    if (command) send(command);
  });
  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; });
  input.addEventListener("input", () => { tabBase = null; syncInput(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (composing || event.isComposing || event.keyCode === 229)) {
      event.preventDefault();
      return;
    }
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === "Tab") { event.preventDefault(); completeCommand(); return; }
    if (event.key === "ArrowUp" && history.length) {
      event.preventDefault();
      if (historyCursor === history.length) historyDraft = input.value;
      historyCursor = Math.max(0, historyCursor - 1);
      input.value = history[historyCursor];
      input.setSelectionRange(input.value.length, input.value.length);
      syncInput();
    } else if (event.key === "ArrowDown" && historyCursor < history.length) {
      event.preventDefault();
      historyCursor += 1;
      input.value = historyCursor === history.length ? historyDraft : history[historyCursor];
      input.setSelectionRange(input.value.length, input.value.length);
      syncInput();
    }
  });
  function retry(event) {
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
    if (event.type === "keydown") event.preventDefault();
    if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }
    fetchState(false);
  }
  connection.addEventListener("click", retry);
  connection.addEventListener("keydown", retry);
  syncInput();
  fetchState(true);
})();
