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
  const commandLog = $("#command-log");
  const commandHistoryList = $("#command-history-list");
  const commandHistoryCount = $("#command-history-count");
  const welcome = $("#welcome");
  const encounter = $("#encounter");
  const mapView = $("#map-view");
  const mapSvg = $("#map-svg");
  const mapGuides = $("#map-guides");
  const mapLinks = $("#map-links");
  const mapInk = $("#map-ink");
  const mapNodes = $("#map-nodes");
  const mapLegend = $("#map-legend");
  const mapNext = $("#map-next");
  const mapDrawButton = $("#map-draw");
  const mapEraseButton = $("#map-erase");
  const mapClearButton = $("#map-clear");
  const mapCloseButton = $("#map-close");
  const choice = $("#choice");
  const hand = $("#hand");
  const commands = ["help", "status", "look", "new", "play", "end", "choose", "take", "skip", "back", "map", "move", "proceed", "shop", "buy", "potion", "discard-potion", "hand", "deck", "draw", "discard", "exhaust", "relics", "potions", "inspect", "cards", "abandon", "clear"];
  const readOnlyWhileBusy = new Set(["help", "status", "look", "map", "hand", "deck", "draw", "discard", "exhaust", "relics", "potions", "inspect", "cards", "shop"]);
  const routeLabels = {Monster:"普通战斗", Elite:"精英战", Boss:"首领", Event:"事件", Unknown:"未知", Treasure:"宝箱", RestSite:"休息处", Shop:"商店", Ancient:"幕首事件", Unassigned:"未分配"};
  const routeMarks = {Monster:"战", Elite:"精", Boss:"首", Event:"事", Unknown:"?", Treasure:"宝", RestSite:"休", Shop:"商", Ancient:"古", Unassigned:"·"};
  const phaseLabels = {ready:"等待启程", combat:"战斗中", choice:"待选择", victory:"胜利", defeat:"旅程结束", error:"适配错误", Map:"地图", MapRoom:"地图", Monster:"战斗", Elite:"精英战", Boss:"首领战", Event:"事件", Shop:"商店", RestSite:"休息处", Treasure:"宝箱", CombatRoom:"战斗", EventRoom:"事件", RestSiteRoom:"休息处", TreasureRoom:"宝箱", MerchantRoom:"商店"};
  const historyKey = "spire-command-history-v1";
  const commandLogKey = "spire-command-log-v1";
  const mapInkPrefix = "spire-map-ink-v1:";
  const svgNs = "http://www.w3.org/2000/svg";
  let state = null;
  let connected = false;
  let submitting = false;
  let composing = false;
  let interactionStarted = false;
  let retryCount = 0;
  let retryTimer = 0;
  let history = readHistory();
  let commandLogEntries = readCommandLog();
  let historyCursor = history.length;
  let historyDraft = "";
  let tabBase = null;
  let tabCurrent = "";
  let tabMatches = [];
  let tabIndex = -1;
  let mapOpen = false;
  let mapTool = "none";
  let mapStrokes = [];
  let mapStateKey = "";
  let activeMapStroke = null;
  let activeMapPointer = null;
  let mapAutoKey = "";
  let mapSuppressedKey = "";
  let selectionDraftKey = "";
  let selectionDraftIndices = new Set();

  function readHistory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(historyKey) || "[]");
      return Array.isArray(saved) ? saved.filter((x) => typeof x === "string").slice(-60) : [];
    } catch (_) { return []; }
  }
  function readCommandLog() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(commandLogKey) || "null");
      if (Array.isArray(saved)) {
        return saved.map((entry) => typeof entry === "string"
          ? {command:entry,timestamp:0}
          : {command:entry && typeof entry.command === "string" ? entry.command : "",timestamp:Number(entry && entry.timestamp) || 0})
          .filter((entry) => entry.command)
          .slice(-60);
      }
    } catch (_) {}
    return history.map((command) => ({command,timestamp:0}));
  }
  function saveHistory() {
    try { sessionStorage.setItem(historyKey, JSON.stringify(history.slice(-60))); } catch (_) {}
  }
  function saveCommandLog() {
    try { sessionStorage.setItem(commandLogKey, JSON.stringify(commandLogEntries.slice(-60))); } catch (_) {}
  }
  function recordCommand(command) {
    if (!command) return;
    commandLogEntries.push({command,timestamp:Date.now()});
    commandLogEntries = commandLogEntries.slice(-60);
    saveCommandLog();
    renderCommandHistory();
  }
  function addHistory(value) {
    if (!value || history[history.length - 1] === value) return;
    history.push(value);
    history = history.slice(-60);
    historyCursor = history.length;
    historyDraft = "";
    saveHistory();
  }
  function renderCommandHistory() {
    commandHistoryCount.textContent = commandLogEntries.length + " 条";
    commandHistoryList.replaceChildren();
    if (!commandLogEntries.length) {
      commandHistoryList.append(el("li", "command-history-empty", "提交的命令会显示在这里"));
      return;
    }
    for (let index = commandLogEntries.length - 1; index >= 0; index -= 1) {
      const row = el("li", "command-history-row");
      const button = el("button", "command-history-item");
      button.type = "button";
      const entry = commandLogEntries[index];
      button.dataset.command = entry.command;
      button.setAttribute("aria-label", "填入历史命令：" + entry.command);
      button.append(
        el("span", "command-history-index", String(index + 1).padStart(2, "0")),
        el("code", "", entry.command)
      );
      if (entry.timestamp) {
        button.append(el("time", "command-history-time",
          new Intl.DateTimeFormat("zh-CN", {hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(entry.timestamp))));
      }
      row.append(button);
      commandHistoryList.append(row);
    }
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
  function addEntry(messages, isError) {
    const list = Array.isArray(messages) ? messages : [messages];
    if (!list.some((x) => value(x).trim())) return;
    const entry = el("div", "log-entry" + (isError ? " error" : ""));
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
  function fillCommand(command) {
    if (!command || !connected || submitting) return;
    input.value = String(command).trim();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    syncInput();
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
  function mapContext(s) {
    const current = s && s.map && s.map.current;
    const coord = current ? current.col + "," + current.row : "start";
    return [value(s && s.seed, "—"), value(s && s.act, 0), value(s && s.phase), coord].join(":");
  }
  function mapInkStorageKey() {
    return mapInkPrefix + encodeURIComponent(mapStateKey || "unknown");
  }
  function readMapStrokes() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(mapInkStorageKey()) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((stroke) => Array.isArray(stroke) && stroke.length > 1)
        .map((stroke) => stroke.filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y)))
        .filter((stroke) => stroke.length > 1);
    } catch (_) { return []; }
  }
  function saveMapStrokes() {
    try { sessionStorage.setItem(mapInkStorageKey(), JSON.stringify(mapStrokes)); } catch (_) {}
  }
  function setMapTool(tool) {
    mapTool = tool;
    mapDrawButton.setAttribute("aria-pressed", tool === "draw" ? "true" : "false");
    mapEraseButton.setAttribute("aria-pressed", tool === "erase" ? "true" : "false");
    mapSvg.parentElement.dataset.tool = tool;
  }
  function syncMapVisibility(s) {
    const points = s && s.map && Array.isArray(s.map.points) ? s.map.points : [];
    if (!points.length) {
      mapOpen = false;
      mapView.hidden = true;
      document.body.classList.remove("map-is-open");
      return;
    }
    const nextStateKey = value(s.seed, "—") + ":" + value(s.act, 0);
    if (nextStateKey !== mapStateKey) {
      mapStateKey = nextStateKey;
      mapStrokes = readMapStrokes();
      activeMapStroke = null;
      activeMapPointer = null;
      setMapTool("none");
    }
    const context = mapContext(s);
    const canShowRoutes = (s.phase === "Map" || s.phase === "MapRoom" || s.canLeave) && Array.isArray(s.routes) && s.routes.length > 0;
    if (canShowRoutes && mapAutoKey !== context) {
      mapAutoKey = context;
      if (mapSuppressedKey !== context) mapOpen = true;
    }
    mapView.hidden = !mapOpen;
    document.body.classList.toggle("map-is-open", mapOpen);
    mapDrawButton.setAttribute("aria-pressed", mapTool === "draw" ? "true" : "false");
    mapEraseButton.setAttribute("aria-pressed", mapTool === "erase" ? "true" : "false");
    mapSvg.parentElement.dataset.tool = mapTool;
  }
  function svgEl(name, attributes) {
    const node = document.createElementNS(svgNs, name);
    Object.entries(attributes || {}).forEach(([key, val]) => node.setAttribute(key, String(val)));
    return node;
  }
  function mapPosition(point, layout) {
    return {
      x: layout.marginX + (Number(point.col) - layout.minCol) * layout.colGap,
      y: layout.marginY + (layout.maxRow - Number(point.row)) * layout.rowGap
    };
  }
  function mapLayout(points) {
    const cols = points.map((point) => Number(point.col));
    const rows = points.map((point) => Number(point.row));
    const minCol = Math.min(...cols), maxCol = Math.max(...cols);
    const minRow = Math.min(...rows), maxRow = Math.max(...rows);
    const layout = {minCol,maxCol,minRow,maxRow,marginX:46,marginY:32,colGap:96,rowGap:48};
    layout.width = Math.max(300, layout.marginX * 2 + (maxCol - minCol) * layout.colGap);
    layout.height = Math.max(240, layout.marginY * 2 + (maxRow - minRow) * layout.rowGap);
    return layout;
  }
  function renderMapInk() {
    mapInk.replaceChildren();
    const strokes = activeMapStroke ? [...mapStrokes, activeMapStroke] : mapStrokes;
    strokes.forEach((stroke, index) => {
      if (!Array.isArray(stroke) || stroke.length < 2) return;
      const d = stroke.map((point, i) => (i ? "L" : "M") + point.x.toFixed(1) + " " + point.y.toFixed(1)).join(" ");
      mapInk.append(svgEl("path", {d,class:"map-ink-stroke","data-stroke-index":index}));
    });
  }
  function renderMap(s) {
    const map = s.map;
    if (mapView.hidden || !map || !Array.isArray(map.points) || !map.points.length) return;
    const points = map.points;
    const layout = mapLayout(points);
    mapSvg.setAttribute("viewBox", "0 0 " + layout.width + " " + layout.height);
    mapSvg.setAttribute("aria-label", "第 " + value(map.act, "?") + " 幕路线图，共 " + points.length + " 个节点");
    mapGuides.replaceChildren();
    mapLinks.replaceChildren();
    mapNodes.replaceChildren();
    const byCoord = new Map(points.map((point) => [point.col + "," + point.row, point]));
    const rows = [...new Set(points.map((point) => Number(point.row)))].sort((a,b) => a-b);
    rows.forEach((row) => {
      const y = mapPosition({col:layout.minCol,row}, layout).y;
      mapGuides.append(svgEl("line", {x1:24,y1:y,x2:layout.width-22,y2:y,class:"map-row-guide"}));
    });
    const visitedPath = Array.isArray(map.visitedPath) ? map.visitedPath : [];
    const traveledEdges = new Set();
    for (let i=1;i<visitedPath.length;i++) {
      traveledEdges.add(visitedPath[i-1].col + "," + visitedPath[i-1].row + ">" + visitedPath[i].col + "," + visitedPath[i].row);
    }
    const currentKey = map.current ? map.current.col + "," + map.current.row : "";
    points.forEach((point) => {
      const parent = mapPosition(point, layout);
      (Array.isArray(point.children) ? point.children : []).forEach((child) => {
        const childPoint = byCoord.get(child.col + "," + child.row);
        if (!childPoint) return;
        const target = mapPosition(childPoint, layout);
        const key = point.col + "," + point.row + ">" + child.col + "," + child.row;
        const curve = Math.min(18, Math.max(5, Math.abs(target.y-parent.y)*0.22));
        const classes = ["map-link"];
        if (traveledEdges.has(key)) classes.push("traveled");
        if (s.canLeave && point.col + "," + point.row === currentKey && Number(childPoint.routeIndex) > 0) classes.push("available");
        mapLinks.append(svgEl("path", {d:"M "+parent.x+" "+parent.y+" C "+parent.x+" "+(parent.y-curve)+" "+target.x+" "+(target.y+curve)+" "+target.x+" "+target.y,class:classes.join(" ")}));
      });
    });
    const presentTypes = new Set(points.map((point) => point.type));
    const legendItems = [{type:"Ancient",mark:"古",label:"幕首事件"}, ...Object.entries(routeLabels)
      .filter(([type]) => type !== "Ancient" && presentTypes.has(type))
      .map(([type,label]) => ({type,mark:routeMarks[type] || "·",label}))];
    mapLegend.replaceChildren();
    legendItems.forEach((item) => {
      const chip = el("span", "map-legend-item");
      chip.append(el("i", "map-mark mark-" + item.type.toLowerCase(), item.mark), el("span", "", item.label));
      mapLegend.append(chip);
    });
    mapLegend.append(el("span", "map-legend-state", s.canLeave ? "实线为已走路线 · 铜色为可前往" : "实线为已走路线 · 编号路线需完成当前房间后前往"));
    points.forEach((point) => {
      const position = mapPosition(point, layout);
      const routeIndex = Number(point.routeIndex) || 0;
      const canSelectRoute = routeIndex > 0 && Boolean(s.canLeave) && !s.busy && connected && !submitting;
      const node = svgEl("g", {class:"map-node" + (point.visited ? " visited" : "") + (point.current ? " current" : "") + (canSelectRoute ? " available" : routeIndex > 0 ? " route-preview" : "") + (point.start ? " start" : "") + (point.boss ? " boss" : "")});
      const type = String(point.type || "Unassigned");
      const mark = point.start ? "起" : point.boss ? "首" : (routeMarks[type] || "·");
      const status = routeIndex > 0 ? (canSelectRoute ? "可前往：move " + routeIndex : "路线预览：完成当前房间后可 move " + routeIndex) : point.current ? "当前位置" : point.visited ? "已经过" : "";
      const title = [routeLabels[type] || type, "坐标 ("+point.col+", "+point.row+")", status].filter(Boolean).join(" · ");
      const svgTitle = svgEl("title");
      svgTitle.textContent = title;
      if (canSelectRoute) {
        node.dataset.command = "move " + routeIndex;
        node.setAttribute("role", "button");
        node.setAttribute("tabindex", "0");
        node.setAttribute("aria-label", title + "；点击立即前往，也可手动输入 move " + routeIndex);
      }
      node.append(svgTitle, svgEl("circle", {cx:position.x,cy:position.y,r:13}));
      const label = svgEl("text", {x:position.x,y:position.y+4,"text-anchor":"middle",class:"map-node-mark"});
      label.textContent = mark;
      node.append(label);
      if (routeIndex > 0) {
        node.append(svgEl("circle", {cx:position.x+13,cy:position.y-12,r:8,class:"map-route-badge"}));
        const badge = svgEl("text", {x:position.x+13,y:position.y-9,"text-anchor":"middle",class:"map-route-number"});
        badge.textContent = String(routeIndex);
        node.append(badge);
      }
      mapNodes.append(node);
    });
    mapNext.replaceChildren();
    const routes = Array.isArray(s.routes) ? s.routes : [];
    mapNext.append(el("span", "map-next-label", routes.length ? (s.canLeave ? "可前往" : "完成当前房间后可前往") : "当前无可前往路线"));
    routes.forEach((route, index) => {
      const item = el("button", "map-route-item");
      item.type = "button";
      item.dataset.command = "move " + value(route.index, index+1);
      item.disabled = !s.canLeave || Boolean(s.busy) || !connected || submitting;
      item.title = item.disabled ? "完成当前房间后可前往" : "点击立即前往；也可手动输入 move " + value(route.index, index+1);
      item.append(el("b", "", "move " + value(route.index, index+1)), el("span", "", routeLabels[route.name] || value(route.name, "路线")));
      mapNext.append(item);
    });
    renderMapInk();
  }
  function svgEventPoint(event) {
    const matrix = mapSvg.getScreenCTM();
    if (!matrix) return null;
    const point = mapSvg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    return {x:mapped.x,y:mapped.y};
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
    const piles = el("div", "piles");
    [["回合",player.turn],["卡组",player.deck],["抽牌",player.draw],["弃牌",player.discard],["消耗",player.exhaust]].forEach(([label,count]) => {
      const metric = el("div", "pile-metric");
      metric.append(el("span", "", label), el("strong", "", value(count, "—")));
      piles.append(metric);
    });
    status.append(piles);
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
      if (Array.isArray(enemy.intents)) {
        enemy.intents.forEach((intent) => {
          if (intent.hasIntentTip === false) return;
          const label = typeof intent.label === "string" ? intent.label.trim() : "";
          const title = typeof intent.title === "string" ? intent.title.trim() : "";
          const description = typeof intent.description === "string" ? intent.description.trim() : "";
          const headline = [title, label].filter(Boolean).join(" · ");
          const visibleText = headline || description;
          if (!visibleText) return;
          const row = el("div", "intent");
          row.append(el("span", "intent-primary", "意图 · " + visibleText));
          if (headline && !label && description) {
            row.classList.add("intent-with-description");
            row.append(el("span", "intent-description", description));
          }
          row.title = [headline, description].filter(Boolean).join(" · ");
          row.setAttribute("aria-label", "意图：" + [headline, description].filter(Boolean).join("，"));
          unit.append(row);
        });
      } else if (enemy.intent) {
        unit.append(el("div", "intent", "意图 · " + enemy.intent));
      }
      const powerDetails = Array.isArray(enemy.powerDetails) ? enemy.powerDetails : [];
      if (powerDetails.length) {
        const group = el("div", "enemy-powers");
        powerDetails.forEach((power) => {
          const type = power.type === "Debuff" ? "debuff" : power.type === "Buff" ? "buff" : "status";
          const typeLabel = type === "debuff" ? "减益" : type === "buff" ? "增益" : "状态";
          const row = el("div", "power-detail " + type);
          const name = value(power.name, "状态");
          const description = value(power.description);
          row.append(el("strong", "power-name", typeLabel + " · " + name));
          if (description) row.append(el("span", "power-description", description));
          else if (power.amount !== undefined && power.amount !== null) row.append(el("span", "power-description", "数值 " + power.amount));
          group.append(row);
        });
        unit.append(group);
      } else if (Array.isArray(enemy.powers) && enemy.powers.length) {
        unit.append(el("div", "powers", "状态 · " + enemy.powers.join(" · ")));
      }
      list.append(unit);
    });
    encounter.append(list);
  }
  function cardRow(card) {
    const row = el("div", "card-row");
    row.append(el("span", "card-index", String(card.index || "—").padStart(2, "0")));
    row.append(el("span", "card-cost", value(card.cost, "—")));
    const details = el("div", "card-details");
    const title = el("div", "card-name");
    title.append(el("span", "card-title", value(card.name, "卡牌")));
    if (card.type) title.append(el("span", "card-type", card.type));
    const description = value(card.description).replace(/[\r\n]+/g, " · ").replace(/\s{2,}/g, " ").trim();
    details.append(title, el("div", "card-description", description));
    row.title = [value(card.name, "卡牌"), value(card.cost, "—") + " 能量", value(card.description)].filter(Boolean).join(" · ");
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
    const actions = Array.isArray(s.actions) ? s.actions : [];
    const selection = s.selection && typeof s.selection === "object" ? s.selection : null;
    const nextSelectionKey = selection
      ? JSON.stringify([s.prompt,selection.min,selection.max,options.map((option) => String(option.id || option.name || option.index))])
      : "";
    if (nextSelectionKey !== selectionDraftKey) {
      selectionDraftKey = nextSelectionKey;
      selectionDraftIndices = new Set();
    }
    const routes = Array.isArray(s.routes) ? s.routes : [];
    const showRouteList = routes.length > 0 && mapView.hidden;
    const eventText = value(s.eventText).trim();
    choice.hidden = !options.length && !actions.length && !showRouteList && !eventText;
    if (choice.hidden) return;
    if (options.length) {
      choice.append(sectionHeading(s.phase === "RestSite" ? "营火行动" : "当前选项", value(s.prompt)));
      if (eventText) choice.append(el("div", "event-text", eventText));
      const list = el("div", "option-list");
      options.forEach((option, index) => {
        const actionable = Boolean(option.command);
        const row = el(actionable ? "button" : "div", "option" + (option.disabled ? " disabled" : ""));
        if (actionable) {
          row.type = "button";
          row.dataset.command = option.command;
          row.disabled = Boolean(option.disabled || s.busy || !connected || submitting);
          row.title = row.disabled ? value(option.type, "当前不可用") : "点击立即选择；也可在命令框手动输入 " + option.command;
          row.setAttribute("aria-label", "立即执行 " + option.command + "：" + value(option.name, "选项"));
          if (selection && option.multiSelect) {
            const optionIndex = Number(option.index || index + 1);
            const selected = selectionDraftIndices.has(optionIndex);
            row.dataset.multiSelect = "true";
            row.dataset.choiceIndex = String(optionIndex);
            row.classList.toggle("selected", selected);
            row.setAttribute("aria-pressed", String(selected));
            row.setAttribute("aria-label", (selected ? "取消待选卡牌 " : "添加待选卡牌 ") + optionIndex + "：" + value(option.name, "卡牌") + "；完成后点击确认选择");
            row.title = "点击添加或取消这张牌；选好后点击确认选择";
          }
        }
        row.append(el("span", "option-number", String(option.index || index + 1).padStart(2, "0")));
        const detail = el("span", "option-details");
        const title = el("b", "", value(option.name, "选项"));
        if (option.cost !== undefined && option.cost !== null) title.append(el("span", "option-cost", option.cost + " " + value(option.costLabel, "能量")));
        detail.append(title);
        if (option.description) detail.append(el("span", "option-description", option.description));
        if (option.type) detail.append(el("span", "option-type", option.type));
        row.append(detail);
        list.append(row);
      });
      choice.append(list);
      if (selection && Number(selection.max) > 1) {
        choice.append(el("div", "choice-selection-count", `已选 ${selectionDraftIndices.size} 张 · 本次需选 ${selection.min}–${selection.max} 张`));
      }
    } else if (eventText) {
      choice.append(sectionHeading("事件", phaseLabels[s.phase] || value(s.phase)), el("div", "event-text", eventText));
    }
    const hasMultiSelect = Boolean(selection && Number(selection.max) > 1);
    if (actions.length || hasMultiSelect) {
      const actionList = el("div", "choice-actions");
      if (hasMultiSelect) {
        const selected = [...selectionDraftIndices].sort((a,b) => a-b);
        const minimum = Number(selection.min) || 0;
        const maximum = Number(selection.max);
        const confirm = el("button", "choice-action choice-confirm", selected.length ? `确认选择（${selected.length}）` : "确认选择");
        confirm.type = "button";
        confirm.dataset.selectionSubmit = "true";
        confirm.dataset.command = "choose" + (selected.length ? " " + selected.join(" ") : "");
        confirm.disabled = selected.length < minimum || selected.length === 0 || selected.length > maximum || Boolean(s.busy) || !connected || submitting;
        confirm.title = confirm.disabled ? `至少选择 ${minimum} 张牌后确认` : "提交当前已选卡牌；也可在命令框手动输入对应 choose 命令";
        actionList.append(confirm);
      }
      actions.forEach((action) => {
        if (!action || !action.command) return;
        const button = el("button", "choice-action", value(action.label, action.command));
        button.type = "button";
        button.dataset.command = action.command;
        button.disabled = Boolean(s.busy || !connected || submitting);
        button.title = "点击立即执行；也可在命令框手动输入：" + action.command;
        actionList.append(button);
      });
      if (actionList.childElementCount) choice.append(actionList);
    }
    if (showRouteList) {
      const section = el("div", "route-section");
      section.append(sectionHeading(s.canLeave ? "可前往路线" : "路线预览", s.canLeave ? "move 编号" : "完成当前房间后可前往"));
      const list = el("div", "route-list");
      routes.forEach((route, index) => {
        const row = el("button", "route-row");
        row.type = "button";
        row.dataset.command = "move " + value(route.index, index+1);
        row.disabled = !s.canLeave || Boolean(s.busy) || !connected || submitting;
        row.title = row.disabled ? "完成当前房间后可前往" : "点击立即前往；也可手动输入 " + row.dataset.command;
        row.setAttribute("aria-label", "立即执行 " + row.dataset.command + "：" + (routeLabels[route.name] || value(route.name, "路线")));
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
    const mapWasOpen = mapOpen;
    state = s;
    connected = true;
    retryCount = 0;
    if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }
    setConnection("online", "规则引擎在线");
    prompt.textContent = value(s.prompt, "输入 help 查看命令");
    working.hidden = !submitting;
    welcome.hidden = Boolean(s.player) || interactionStarted;
    syncMapVisibility(s);
    renderEncounter(s);
    renderMap(s);
    renderHand(s);
    renderChoices(s);
    updateStatus(s);
    [encounter, hand, choice, $("#character-status"), $("#relics"), $("#potions")].forEach(animateState);
    syncInput();
    if (includeMessages !== false && Array.isArray(s.messages) && s.messages.length) addEntry(s.messages, s.phase === "error");
    if (!mapWasOpen && mapOpen) mapCloseButton.focus();
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
      if (!quiet) addEntry([error.message || "无法连接到规则引擎。"], true);
      scheduleRetry();
    }
  }
  async function send(command) {
    if (!connected || submitting) return;
    const verb = command.split(/\s+/, 1)[0].toLowerCase();
    if (state && state.busy && !readOnlyWhileBusy.has(verb) && verb !== "clear") {
      addEntry(["规则仍在结算。请等待状态更新，或输入 status 查看当前状态。"], true);
      return;
    }
    if (command.toLowerCase() === "clear") {
      recordCommand(command);
      addHistory(command);
      journal.replaceChildren();
      input.value = "";
      syncInput();
      return;
    }
    // A map-node click already closes the overlay before sending `move`, but
    // commands typed into the terminal must do the same. Otherwise the next
    // room's choices (notably Heal/Smith at a rest site) render underneath the
    // full-screen map and appear to have been skipped.
    if (verb === "move" && mapOpen) mapCloseButton.click();
    if (state && state.selection) {
      selectionDraftKey = "";
      selectionDraftIndices = new Set();
    }
    if (verb === "new" || verb === "continue") {
      mapOpen = false;
      mapAutoKey = "";
      mapSuppressedKey = "";
    }
    interactionStarted = true;
    welcome.hidden = true;
    recordCommand(command);
    addHistory(command);
    input.value = "";
    submitting = true;
    working.hidden = false;
    if (state) {
      renderMap(state);
      renderChoices(state);
    }
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
        addEntry([value(body.error, "命令请求失败（HTTP " + response.status + "）")], true);
        if (!connected) scheduleRetry();
        return;
      }
      if (verb === "map") {
        mapOpen = true;
        mapSuppressedKey = "";
      }
      if (verb === "move" && body.phase === "RestSite") {
        // Keep the rest-site action menu in front when arriving. The player
        // must first see the original Heal/Smith choices; the route map can
        // open after a successful choice or on an explicit `map` command.
        mapOpen = false;
        mapSuppressedKey = mapContext(body);
      } else if (body.phase === "RestSite" && body.canLeave && (!Array.isArray(body.options) || body.options.length === 0)) {
        mapAutoKey = "";
        mapSuppressedKey = "";
      }
      const routeMapReplacesText = verb === "map" || (verb === "proceed" && body.canLeave && Array.isArray(body.routes) && body.routes.length > 0);
      applySnapshot(body, routeMapReplacesText ? false : undefined);
    } catch (error) {
      connected = false;
      setConnection("offline", "连接中断");
      addEntry([error.message || "命令请求连接中断；该命令可能已经执行。请使用 status 查看当前状态，前端不会自动重发命令。"], true);
      scheduleRetry();
    } finally {
      submitting = false;
      working.hidden = true;
      if (state) {
        renderMap(state);
        renderChoices(state);
      }
      syncInput();
      if (connected) (mapView.hidden ? input : mapCloseButton).focus();
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
  mapDrawButton.addEventListener("click", () => setMapTool(mapTool === "draw" ? "none" : "draw"));
  mapEraseButton.addEventListener("click", () => setMapTool(mapTool === "erase" ? "none" : "erase"));
  mapClearButton.addEventListener("click", () => {
    mapStrokes = [];
    activeMapStroke = null;
    saveMapStrokes();
    renderMapInk();
  });
  mapCloseButton.addEventListener("click", () => {
    mapOpen = false;
    mapSuppressedKey = state ? mapContext(state) : "";
    mapView.hidden = true;
    setMapTool("none");
    renderChoices(state || {});
    document.body.classList.remove("map-is-open");
    scrollArea.scrollTo({top:scrollArea.scrollHeight,behavior:"smooth"});
    input.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (mapView.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      mapCloseButton.click();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(mapView.querySelectorAll("button:not([disabled]), .map-node[tabindex='0'], .map-canvas[tabindex='0']"));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  mapSvg.addEventListener("pointerdown", (event) => {
    if (mapTool === "erase") {
      const path = event.target.closest && event.target.closest("[data-stroke-index]");
      if (!path) return;
      const index = Number(path.getAttribute("data-stroke-index"));
      if (Number.isInteger(index) && index >= 0 && index < mapStrokes.length) {
        mapStrokes.splice(index, 1);
        saveMapStrokes();
        renderMapInk();
      }
      event.preventDefault();
      return;
    }
    if (mapTool !== "draw" || (event.button !== undefined && event.button !== 0)) return;
    const point = svgEventPoint(event);
    if (!point) return;
    activeMapPointer = event.pointerId;
    activeMapStroke = [point];
    mapSvg.setPointerCapture(event.pointerId);
    renderMapInk();
    event.preventDefault();
  });
  mapSvg.addEventListener("pointermove", (event) => {
    if (activeMapPointer !== event.pointerId || !activeMapStroke) return;
    const point = svgEventPoint(event);
    if (!point) return;
    const previous = activeMapStroke[activeMapStroke.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 2) return;
    activeMapStroke.push(point);
    renderMapInk();
  });
  function finishMapStroke(event) {
    if (activeMapPointer !== event.pointerId) return;
    if (activeMapStroke && activeMapStroke.length > 1) {
      mapStrokes.push(activeMapStroke);
      saveMapStrokes();
    }
    activeMapStroke = null;
    activeMapPointer = null;
    if (mapSvg.hasPointerCapture(event.pointerId)) mapSvg.releasePointerCapture(event.pointerId);
    renderMapInk();
  }
  mapSvg.addEventListener("pointerup", finishMapStroke);
  mapSvg.addEventListener("pointercancel", finishMapStroke);
  mapSvg.addEventListener("click", (event) => {
    if (mapTool !== "none") return;
    const node = event.target.closest && event.target.closest(".map-node[data-command]");
    if (!node) return;
    const command = node.dataset.command;
    mapCloseButton.click();
    send(command);
  });
  mapSvg.addEventListener("keydown", (event) => {
    if (mapTool !== "none" || (event.key !== "Enter" && event.key !== " ")) return;
    const node = event.target.closest && event.target.closest(".map-node[data-command]");
    if (!node) return;
    event.preventDefault();
    const command = node.dataset.command;
    mapCloseButton.click();
    send(command);
  });
  choice.addEventListener("click", (event) => {
    const button = event.target.closest && event.target.closest("button[data-command]");
    if (!button || button.disabled || submitting) return;
    if (button.dataset.multiSelect === "true" && state && state.selection) {
      const index = Number(button.dataset.choiceIndex);
      const max = Number(state.selection.max);
      if (!Number.isInteger(index) || index < 1 || !Number.isInteger(max) || max < 1) return;
      if (selectionDraftIndices.has(index)) selectionDraftIndices.delete(index);
      else if (selectionDraftIndices.size >= max) return;
      else selectionDraftIndices.add(index);
      const keepFocus = document.activeElement === button;
      renderChoices(state);
      if (keepFocus) choice.querySelector(`button[data-choice-index="${index}"]`)?.focus();
      return;
    }
    send(button.dataset.command);
  });
  mapNext.addEventListener("click", (event) => {
    const button = event.target.closest && event.target.closest("button[data-command]");
    if (!button || button.disabled) return;
    const command = button.dataset.command;
    mapCloseButton.click();
    send(command);
  });
  commandHistoryList.addEventListener("click", (event) => {
    const button = event.target.closest && event.target.closest("button.command-history-item");
    if (!button) return;
    fillCommand(button.dataset.command || "");
  });
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
  const commandLogDesktop = window.matchMedia("(min-width: 701px)");
  commandLog.open = commandLogDesktop.matches;
  commandLogDesktop.addEventListener("change", (event) => { commandLog.open = event.matches; });
  renderCommandHistory();
  syncInput();
  fetchState(true);
})();
