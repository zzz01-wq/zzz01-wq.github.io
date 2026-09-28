(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const connection = $("#connection");
  const connectionText = connection.querySelector("span");
  const input = $("#command");
  const submit = $("#submit");
  const prompt = $("#prompt");
  const working = $("#working");
  const intentDialog = $("#intent-dialog");
  const intentDialogTitle = $("#intent-dialog-title");
  const intentDialogContent = $("#intent-dialog-content");
  const cardPreviewDialog = $("#card-preview-dialog");
  const cardPreviewTitle = $("#card-preview-title");
  const cardPreviewBody = $("#card-preview-body");
  const cardPreviewActions = $("#card-preview-actions");
  const runControls = $("#run-controls");
  const runAbandonButton = $("#run-abandon");
  const runAbandonDialog = $("#run-abandon-dialog");
  const runAbandonTitle = $("#run-abandon-title");
  const runAbandonBody = $("#run-abandon-body");
  const runAbandonConfirm = $("#run-abandon-confirm");
  const runAbandonCancel = $("#run-abandon-cancel");
  const scrollArea = $("#scroll-area");
  const commandLog = $("#command-log");
  const commandHistoryList = $("#command-history-list");
  const commandHistoryCount = $("#command-history-count");
  const welcome = $("#welcome");
  const encounter = $("#encounter");
  const mapView = $("#map-view");
  const mapCanvas = $(".map-canvas");
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
  const mapZoomOutButton = $("#map-zoom-out");
  const mapZoomResetButton = $("#map-zoom-reset");
  const mapZoomInButton = $("#map-zoom-in");
  const mapZoomLabel = $("#map-zoom-label");
  const mapCloseButton = $("#map-close");
  const choice = $("#choice");
  const routePreview = $("#route-preview");
  const hand = $("#hand");
  const commands = ["help", "status", "look", "new", "unlock", "reveal", "play", "end", "choose", "take", "skip", "back", "map", "move", "proceed", "shop", "buy", "potion", "discard-potion", "scry", "hand", "deck", "draw", "discard", "exhaust", "relics", "potions", "inspect", "cards", "abandon", "clear"];
  const readOnlyWhileBusy = new Set(["help", "status", "look", "map", "hand", "deck", "draw", "discard", "exhaust", "relics", "potions", "inspect", "cards", "shop"]);
  const routeLabels = {Monster:"普通战斗", Elite:"精英战", Boss:"首领", Event:"事件", Unknown:"未知", Treasure:"宝箱", RestSite:"休息处", Shop:"商店", Ancient:"幕首事件", Unassigned:"未分配"};
  const routeMarks = {Monster:"战", Elite:"精", Boss:"首", Event:"事", Unknown:"?", Treasure:"宝", RestSite:"休", Shop:"商", Ancient:"古", Unassigned:"·"};
  const phaseLabels = {ready:"等待启程", combat:"战斗中", choice:"待选择", victory:"胜利", defeat:"旅程结束", error:"适配错误", Map:"地图", MapRoom:"地图", Monster:"战斗", Elite:"精英战", Boss:"首领战", Event:"事件", Shop:"商店", RestSite:"休息处", Treasure:"宝箱", CombatRoom:"战斗", EventRoom:"事件", RestSiteRoom:"休息处", TreasureRoom:"宝箱", MerchantRoom:"商店"};
  const historyKey = "spire-command-history-v1";
  const commandLogKey = "spire-command-log-v1";
  const mapInkPrefix = "spire-map-ink-v1:";
  const svgNs = "http://www.w3.org/2000/svg";
  const mapZoomMin = 0.75;
  const mapZoomMax = 2.5;
  const mapZoomStep = 0.25;
  let state = null;
  let connected = false;
  let submitting = false;
  let composing = false;
  let startMenuView = "landing";
  let characterParentView = "landing";
  let selectedCharacterId = "ironclad";
  let timelineAutoKey = "";
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
  let mapChoiceContext = "";
  let mapManualKey = "";
  let mapZoom = 1;
  let mapFocusKey = "";
  let mapFocusFrame = 0;
  let selectionDraftKey = "";
  let selectionDraftIndices = new Set();
  let eventResultContext = "";
  let eventResults = [];
  // A targeted card is selected locally until the player chooses the target.
  // The engine remains authoritative: the eventual `play` command is still
  // validated by the original card target rules in the bridge.
  let targetingCard = null;

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
  function menuButton(label, action, className, disabled = false) {
    const button = el("button", className || "menu-button", label);
    button.type = "button";
    button.dataset.menuAction = action;
    button.disabled = Boolean(disabled || !connected || submitting);
    return button;
  }
  function menuEntry(label, action, options = {}) {
    const button = el("button", "start-menu-entry" + (options.primary ? " is-primary" : "") + (options.disabled ? " is-unavailable" : ""));
    button.type = "button";
    button.dataset.menuAction = action;
    button.disabled = Boolean(options.disabled || !connected || submitting);
    button.append(el("span", "start-menu-entry-copy"));
    button.firstElementChild.append(el("strong", "start-menu-entry-title", label));
    if (options.description) button.firstElementChild.append(el("span", "start-menu-entry-description", options.description));
    if (options.locked) button.classList.add("is-locked");
    return button;
  }
  function renderWelcome(s) {
    const ended = s.phase === "victory" || s.phase === "defeat";
    const showMenu = !s.player || ended;
    welcome.hidden = !showMenu;
    if (!showMenu) return;
    const characters = Array.isArray(s.characters) ? s.characters : [];
    if (!characters.some((character) => character.id === selectedCharacterId)) selectedCharacterId = "ironclad";
    welcome.replaceChildren();
    welcome.dataset.view = startMenuView;
    const mainMenu = s.mainMenu || {};
    const labels = s.mainMenuLabels || {};
    const modes = s.modeOptions || {};
    const abandonConfirmation = s.abandonConfirmation || {};
    const title = startMenuView === "confirm-abandon"
      ? (abandonConfirmation.header || "你确定吗？")
      : startMenuView === "timeline" ? (labels.timeline || "时间线") : "";
    if (title) {
      const heading = el("div", "start-menu-heading");
      heading.append(el("h2", "", startMenuView === "confirm-abandon" && ended ? "旅程已结束" : title));
      welcome.append(heading);
    }

    if (startMenuView === "landing") {
      const layout = el("div", "start-menu-layout");
      const nav = el("nav", "start-menu-nav");
      nav.setAttribute("aria-label", "主菜单");
      if (mainMenu.continueVisible && s.hasRunSave) {
        nav.append(menuEntry(labels.continueGame || "继续游戏", "continue", {primary:true}));
      }
      if (mainMenu.abandonVisible && s.hasRunSave) {
        nav.append(menuEntry(labels.abandonRun || "放弃当前游戏", "abandon-run"));
      }
      if (mainMenu.singleplayerVisible && !s.hasRunSave) {
        nav.append(menuEntry(labels.singleplayer || "单人模式", "singleplayer", {
          primary:true, disabled:mainMenu.singleplayerEnabled === false
        }));
      }
      nav.append(menuEntry(labels.multiplayer || "多人模式", "unavailable", {disabled:true}));
      if (mainMenu.timelineVisible) nav.append(menuEntry(labels.timeline || "时间线", "timeline", {disabled:mainMenu.timelineEnabled !== true}));
      nav.append(menuEntry(labels.settings || "设置", "unavailable", {disabled:true}));
      if (mainMenu.compendiumVisible) nav.append(menuEntry(labels.compendium || "百科大全", "unavailable", {disabled:true}));
      nav.append(menuEntry(labels.quit || "退出", "unavailable", {disabled:true}));
      layout.append(nav);
      welcome.append(layout);
    } else if (startMenuView === "modes") {
      const top = el("div", "start-menu-subhead");
      top.append(menuButton("返回", "back", "menu-button menu-back"));
      welcome.append(top);
      const modeGrid = el("div", "mode-menu-grid");
      const standard = modes.standard || {title:"标准模式", description:""};
      const daily = modes.daily || {title:"每日挑战", description:"", unlocked:false};
      const custom = modes.custom || {title:"自定模式", description:"", unlocked:false};
      modeGrid.append(menuEntry(standard.title, "standard", {primary:true, description:standard.description}));
      modeGrid.append(menuEntry(daily.title, "unavailable", {
        description:daily.description, disabled:true, locked:!daily.unlocked
      }));
      modeGrid.append(menuEntry(custom.title, "unavailable", {
        description:custom.description, disabled:true, locked:!custom.unlocked
      }));
      welcome.append(modeGrid);
    } else if (startMenuView === "timeline") {
      const top = el("div", "start-menu-subhead");
      top.append(menuButton("返回", "back", "menu-button menu-back"));
      welcome.append(top);
      const epochs = Array.isArray(s.timelineCharacterUnlocks) ? s.timelineCharacterUnlocks : [];
      const list = el("nav", "start-menu-nav timeline-unlock-list");
      list.setAttribute("aria-label", labels.timeline || "时间线");
      epochs.forEach((epoch) => {
        const entry = menuEntry(value(epoch.title, "历史节点"), "reveal-epoch", {description:epoch.unlockInfo});
        entry.dataset.epochId = value(epoch.id);
        entry.append(el("span", "start-menu-entry-action", value(epoch.revealLabel, "解锁")));
        list.append(entry);
      });
      if (epochs.length) welcome.append(list);
    } else if (startMenuView === "characters") {
      const top = el("div", "start-menu-subhead");
      top.append(menuButton("返回", "back", "menu-button menu-back"));
      welcome.append(top);
      const grid = el("div", "character-choice-grid");
      characters.forEach((character) => {
        const selected = character.id === selectedCharacterId;
        const button = el("button", "character-choice" + (selected ? " is-selected" : "") + (character.unlocked ? "" : " is-locked"));
        button.type = "button";
        button.dataset.character = value(character.id);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.append(el("strong", "character-choice-name", value(character.name, character.id)));
        if (character.unlocked) {
          button.append(el("span", "character-choice-stats", "生命 " + value(character.hp, "—") + "　·　" + value(character.gold, "—") + " 金币　·　起始牌 " + value(character.deckSize, "—") + " 张"));
        }
        grid.append(button);
      });
      welcome.append(grid);
      const selected = characters.find((character) => character.id === selectedCharacterId) || characters[0];
      if (selected) {
        const details = el("section", "selected-character");
        const charHeading = el("div", "selected-character-heading");
        charHeading.append(el("div", "selected-character-name", value(selected.name)));
        charHeading.append(el("div", "selected-character-stats", selected.unlocked
          ? "生命 " + value(selected.hp) + "　·　金币 " + value(selected.gold) + "　·　起始牌 " + value(selected.deckSize) + " 张"
          : "生命 " + value(selected.hp) + "　·　金币 " + value(selected.gold)));
        details.append(charHeading);
        details.append(el("p", "selected-character-description", value(selected.description)));
        if (selected.relic) {
          const relic = el("div", "starting-relic");
          relic.append(el("b", "", (selected.unlocked ? "初始遗物　" : "") + value(selected.relic)));
          if (selected.relicDescription) relic.append(el("span", "", value(selected.relicDescription)));
          details.append(relic);
        }
        if (selected.unlocked) {
          const action = el("div", "selected-character-action");
          action.append(menuButton("以" + value(selected.name) + "开始", "start", "menu-button menu-primary"));
          details.append(action);
        }
        welcome.append(details);
      }
    } else if (startMenuView === "confirm-abandon") {
      const confirm = el("section", "menu-confirm-panel");
      confirm.append(el("p", "", abandonConfirmation.body || "放弃游戏会被视为本局失败。"));
      const actions = el("div", "selected-character-action");
      actions.append(menuButton(abandonConfirmation.confirm || "好的", "confirm-abandon", "menu-button menu-primary"));
      actions.append(menuButton(abandonConfirmation.cancel || "不了", "cancel-abandon", "menu-button menu-secondary"));
      confirm.append(actions);
      welcome.append(confirm);
    }
    if (s.messageError && Array.isArray(s.messages) && s.messages.length)
      welcome.append(el("p", "menu-error", s.messages.join("\n")));
  }
  function cardTypeLabel(type) {
    return value(type).trim();
  }
  function setPrompt(text, isError = false) {
    prompt.textContent = String(text || "");
    prompt.classList.toggle("prompt-error", Boolean(isError));
  }
  function appendTextWithTooltips(element, text, tooltips) {
    const source = String(text || "");
    const usableTips = (Array.isArray(tooltips) ? tooltips : [])
      .filter((tip) => tip && typeof tip.title === "string" && tip.title && typeof tip.description === "string" && tip.description)
      .sort((a, b) => b.title.length - a.title.length);
    let cursor = 0;
    while (cursor < source.length) {
      let nextIndex = -1;
      let nextTip = null;
      usableTips.forEach((tip) => {
        const index = source.indexOf(tip.title, cursor);
        if (index >= 0 && (nextIndex < 0 || index < nextIndex || (index === nextIndex && tip.title.length > nextTip.title.length))) {
          nextIndex = index;
          nextTip = tip;
        }
      });
      if (nextIndex < 0 || !nextTip) {
        element.append(document.createTextNode(source.slice(cursor)));
        break;
      }
      if (nextIndex > cursor) element.append(document.createTextNode(source.slice(cursor, nextIndex)));
      const keyword = el("span", "card-keyword", nextTip.title);
      keyword.title = nextTip.title + "：" + nextTip.description;
      keyword.setAttribute("aria-label", nextTip.title + "，" + nextTip.description);
      element.append(keyword);
      cursor = nextIndex + nextTip.title.length;
    }
  }
  function updateEventResults(s) {
    const isEventRoom = Boolean(s && s.eventState && typeof s.eventState === "object");
    if (!isEventRoom) {
      eventResultContext = "";
      eventResults = [];
      return [];
    }
    const current = s.map && s.map.current;
    const context = [value(s.seed, "—"), value(s.act, 0), value(s.floor, 0),
      current ? current.col + "," + current.row : "start"].join(":");
    if (context !== eventResultContext) {
      eventResultContext = context;
      eventResults = [];
    }
    const prefix = "原版变化结果：";
    (Array.isArray(s.messages) ? s.messages : []).forEach((message) => {
      const text = String(message || "");
      if (!text.startsWith(prefix)) return;
      const result = text.slice(prefix.length).trim();
      if (result && !eventResults.includes(result)) eventResults.push(result);
    });
    return [...eventResults];
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
  function cardTargetType(card) {
    return card && typeof card.targetType === "string" ? card.targetType : "";
  }
  function cardNeedsTarget(card) {
    const targetType = cardTargetType(card);
    return targetType === "AnyEnemy" || targetType === "AnyAlly";
  }
  function syncTargeting(s) {
    if (!targetingCard) return;
    const cards = Array.isArray(s && s.hand) ? s.hand : [];
    if (s?.phase !== "combat" || !cards.some((card) => Number(card.index) === targetingCard.index)) {
      targetingCard = null;
    }
  }
  function syncAllyTargetState(s) {
    const target = $("#character-status");
    if (!target) return;
    const active = Boolean(targetingCard && targetingCard.targetType === "AnyAlly" && s?.phase === "combat" && !s.busy && !submitting && s.player);
    target.classList.toggle("targetable", active);
    if (active) {
      target.dataset.targetIndex = "1";
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", "0");
      target.setAttribute("aria-label", "选择战士作为卡牌目标");
      target.title = "点击选择战士作为目标";
    } else {
      delete target.dataset.targetIndex;
      target.removeAttribute("role");
      target.removeAttribute("tabindex");
      target.removeAttribute("aria-label");
      target.removeAttribute("title");
    }
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
  function mapCurrentKey(s) {
    const current = s && s.map && s.map.current;
    if (!current) return "";
    return [value(s && s.seed, "—"), value(s && s.act, 0), current.col, current.row].join(":");
  }
  function updateMapZoomUi() {
    const percentage = Math.round(mapZoom * 100);
    mapZoomLabel.textContent = percentage + "%";
    mapZoomOutButton.disabled = mapZoom <= mapZoomMin;
    mapZoomResetButton.disabled = Math.abs(mapZoom - 1) < 0.001;
    mapZoomInButton.disabled = mapZoom >= mapZoomMax;
    mapCanvas.dataset.zoomed = Math.abs(mapZoom - 1) < 0.001 ? "false" : "true";
  }
  function focusCurrentMapNode(force) {
    if (mapView.hidden || !state || !state.map || !state.map.current) return false;
    const key = mapCurrentKey(state);
    if (!force && key && key === mapFocusKey) return true;
    const node = mapNodes.querySelector(".map-node.current");
    if (!node) return false;
    const canvasRect = mapCanvas.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const maxLeft = Math.max(0, mapCanvas.scrollWidth - mapCanvas.clientWidth);
    const maxTop = Math.max(0, mapCanvas.scrollHeight - mapCanvas.clientHeight);
    const left = mapCanvas.scrollLeft
      + nodeRect.left + nodeRect.width / 2
      - (canvasRect.left + canvasRect.width / 2);
    const top = mapCanvas.scrollTop
      + nodeRect.top + nodeRect.height / 2
      - (canvasRect.top + canvasRect.height / 2);
    mapCanvas.scrollTo({
      left: Math.max(0, Math.min(maxLeft, left)),
      top: Math.max(0, Math.min(maxTop, top)),
      behavior: "auto"
    });
    mapFocusKey = key;
    return true;
  }
  function scheduleMapFocus(force) {
    if (mapView.hidden) return;
    if (force) mapFocusKey = "";
    if (mapFocusFrame) window.cancelAnimationFrame(mapFocusFrame);
    mapFocusFrame = window.requestAnimationFrame(() => {
      mapFocusFrame = 0;
      focusCurrentMapNode(Boolean(force));
    });
  }
  function setMapZoom(next) {
    const zoom = Math.max(mapZoomMin, Math.min(mapZoomMax, Number(next)));
    if (!Number.isFinite(zoom) || Math.abs(zoom - mapZoom) < 0.001) return;
    mapZoom = Math.round(zoom * 100) / 100;
    updateMapZoomUi();
    if (state && !mapView.hidden) {
      mapFocusKey = "";
      renderMap(state);
      scheduleMapFocus(true);
    }
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
      mapFocusKey = "";
      mapZoom = 1;
      mapSvg.style.removeProperty("margin-left");
      mapSvg.style.removeProperty("margin-right");
      mapSvg.style.removeProperty("margin-top");
      mapSvg.style.removeProperty("margin-bottom");
      updateMapZoomUi();
      return;
    }
    const nextStateKey = value(s.seed, "—") + ":" + value(s.act, 0);
    if (nextStateKey !== mapStateKey) {
      mapStateKey = nextStateKey;
      mapStrokes = readMapStrokes();
      activeMapStroke = null;
      activeMapPointer = null;
      mapChoiceContext = "";
      mapManualKey = "";
      mapZoom = 1;
      mapFocusKey = "";
      updateMapZoomUi();
      setMapTool("none");
    }
    const context = mapContext(s);
    if (mapManualKey && mapManualKey !== context) mapManualKey = "";
    const manualMap = mapManualKey === context;
    const hasRoomChoices = Array.isArray(s.options) && s.options.length > 0;
    const eventRoom = s.phase === "Event" || s.phase === "EventRoom";
    const eventState = s.eventState && typeof s.eventState === "object" ? s.eventState : null;
    const eventInitializing = eventRoom && eventState && eventState.initialized === false;
    const eventCompleted = eventRoom && eventState && eventState.finished === true;
    const eventChoicesVisible = eventRoom && (eventInitializing || hasRoomChoices || !s.canLeave || eventCompleted);
    const restRoom = s.phase === "RestSite" || s.phase === "RestSiteRoom";
    const restState = s.restState && typeof s.restState === "object" ? s.restState : null;
    const restChoicesVisible = restRoom && (hasRoomChoices || !s.canLeave || (restState && restState.actionCompleted === false));
    const treasureChoicesVisible = (s.phase === "Treasure" || s.phase === "TreasureRoom") && hasRoomChoices;
    const shopChoicesVisible = (s.phase === "Shop" || s.phase === "MerchantRoom") && hasRoomChoices;
    // Events, rest sites and treasure rooms must show their original choices
    // before navigation. Shops allow leaving before buying, but their goods
    // still take precedence in the main workspace. An explicit `map` command
    // remains allowed and keeps the overlay open.
    const roomChoicesVisible = eventChoicesVisible || restChoicesVisible || treasureChoicesVisible || shopChoicesVisible;
    // A stale route overlay must not survive a room transition that still
    // requires interaction. This also covers a transient RestSite snapshot
    // whose original option list has not been exposed yet.
    const navigationRoom = s.phase === "Map" || s.phase === "MapRoom" || s.phase === "ready";
    if (!navigationRoom && s.canLeave === false && !manualMap) mapOpen = false;
    if (roomChoicesVisible) {
      mapChoiceContext = context;
      mapSuppressedKey = context;
      if (!manualMap) mapOpen = false;
    }
    const canShowRoutes = !roomChoicesVisible
      && (s.phase === "Map" || s.phase === "MapRoom" || s.canLeave)
      && Array.isArray(s.routes) && s.routes.length > 0;
    if (canShowRoutes && (mapAutoKey !== context || mapChoiceContext === context)) {
      mapAutoKey = context;
      if (mapChoiceContext === context) {
        // The same room has just transitioned from an unresolved choice to a
        // completed state (for example an Unknown event). Open navigation
        // automatically instead of retaining the previous suppression key.
        mapChoiceContext = "";
        mapSuppressedKey = "";
      }
      if (manualMap || mapSuppressedKey !== context) mapOpen = true;
    }
    if (manualMap) mapOpen = true;
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
    mapSvg.style.removeProperty("margin-left");
    mapSvg.style.removeProperty("margin-right");
    mapSvg.style.removeProperty("margin-top");
    mapSvg.style.removeProperty("margin-bottom");
    if (Math.abs(mapZoom - 1) < 0.001) {
      mapSvg.style.removeProperty("width");
      mapSvg.style.removeProperty("height");
    } else {
      mapSvg.style.width = Math.round(layout.width * mapZoom) + "px";
      mapSvg.style.height = Math.round(layout.height * mapZoom) + "px";
    }
    updateMapZoomUi();
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
      } else if (point.current) {
        node.setAttribute("aria-current", "location");
        node.setAttribute("aria-label", title);
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
    scheduleMapFocus();
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
    updateRunControls(s);
    const player = s.player;
    $("#location").textContent = value(s.location, player ? "尖塔" : "尖塔入口");
    if (!player) {
      $("#stage").textContent = "等待启程";
      $("#player-name").textContent = "铁甲战士";
      $("#player-class").textContent = "铁甲";
      $("#seed").textContent = "SEED —";
      $("#character-status").replaceChildren(el("div", "empty-status", "尚未踏入尖塔"));
      syncAllyTargetState(s);
      $("#relic-count").textContent = "—";
      $("#relics").replaceChildren(el("span", "muted", "旅程开始后显示"));
      $("#potions").replaceChildren(el("span", "muted", "—"));
      return;
    }
    const parts = [];
    if (Number(s.act) > 0) {
      const actCount = Number(s.actCount) > 0 ? "/" + s.actCount : "";
      parts.push("第 " + s.act + actCount + " 幕");
    }
    if (Number(s.floor) > 0) parts.push("第 " + s.floor + " 层");
    if (s.phase) parts.push(phaseLabels[s.phase] || String(s.phase));
    $("#stage").textContent = parts.join(" · ") || "旅程进行中";
    $("#player-name").textContent = value(player.name, "战士");
    $("#player-class").textContent = player.character === "silent" ? "猎手"
      : player.character === "regent" ? "储君" : "铁甲";
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
    if (player.showStarCounter && Number.isFinite(Number(player.stars))) {
      stats.classList.add("has-stars");
      const starCounter = stat(value(player.starTitle, "辉星"), player.stars);
      starCounter.title = value(player.starDescription, "");
      starCounter.setAttribute("aria-label", value(player.starTitle, "辉星") + "：" + value(player.stars, "0") + "。" + value(player.starDescription, ""));
      stats.append(starCounter);
    }
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
    syncAllyTargetState(s);

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
  function updateRunControls(s) {
    const abandon = s && s.runAbandon ? s.runAbandon : {};
    runControls.hidden = !Boolean(s && s.player && abandon.visible);
    runAbandonButton.textContent = value(abandon.label, "放弃");
    runAbandonButton.disabled = !connected || submitting || Boolean(s && s.busy) || abandon.enabled !== true;
    const confirmation = s && s.abandonConfirmation ? s.abandonConfirmation : {};
    runAbandonTitle.textContent = value(confirmation.header, "你确定吗？");
    runAbandonBody.textContent = value(confirmation.body, "放弃游戏会被视为本局失败。");
    runAbandonConfirm.textContent = value(confirmation.confirm, "好的");
    runAbandonCancel.textContent = value(confirmation.cancel, "不了");
    runAbandonConfirm.disabled = !runAbandonDialog.open || !connected || submitting
      || Boolean(s && s.busy) || abandon.enabled !== true;
  }
  function renderEncounter(s) {
    encounter.replaceChildren();
    const enemies = Array.isArray(s.enemies) ? s.enemies : [];
    const combat = s.combat && typeof s.combat === "object" ? s.combat : null;
    const isBoss = Boolean(combat && combat.isBoss);
    const combatActive = Boolean(combat && combat.active);
    const autoPlayedCards = Array.isArray(combat && combat.autoPlayedCards)
      ? combat.autoPlayedCards.filter((name) => typeof name === "string" && name.trim()) : [];
    const showEncounter = enemies.length > 0 || combatActive;
    encounter.hidden = !showEncounter && autoPlayedCards.length === 0;
    if (encounter.hidden) return;
    if (showEncounter) encounter.append(sectionHeading(isBoss ? "首领战" : "敌方单位", enemies.length ? enemies.length + " 个" : "准备中"));
    if (showEncounter && isBoss && combat && combat.name) {
      encounter.append(el("div", "boss-title", combat.name));
    }
    if (enemies.length) {
      const list = el("div", "enemies");
      enemies.forEach((enemy, enemyPosition) => {
      const enemyIndex = enemy && enemy.index !== undefined && enemy.index !== null
        ? String(enemy.index) : String(enemyPosition + 1);
      const canTargetEnemy = Boolean(targetingCard && targetingCard.targetType === "AnyEnemy" && !s.busy && !submitting);
      const unit = el("article", "enemy" + (canTargetEnemy ? " targetable" : ""));
      if (canTargetEnemy) {
        unit.dataset.targetIndex = enemyIndex;
        unit.setAttribute("role", "button");
        unit.setAttribute("tabindex", "0");
        unit.setAttribute("aria-label", "选择敌人 " + enemyIndex + "：" + value(enemy.name, "敌人"));
        unit.title = "点击选择此敌人作为目标";
      }
      const top = el("div", "enemy-top");
      const name = el("div", "enemy-name");
      name.append(el("span", "index", enemyIndex.padStart(2, "0")), document.createTextNode(value(enemy.name, "敌人")));
      top.append(name);
      const block = Number(enemy.block) > 0 ? " · 格挡 " + enemy.block : "";
      top.append(el("span", "enemy-hp", "HP " + value(enemy.hp, "—") + " / " + value(enemy.maxHp, "—") + block));
      unit.append(top);
      const stolenCards = Array.isArray(enemy.stolenCards)
        ? enemy.stolenCards.filter((card) => card && typeof card === "object") : [];
      if (stolenCards.length) {
        const stolen = el("div", "stolen-cards");
        stolen.append(el("strong", "", "偷走的牌："));
        stolenCards.forEach((card, cardIndex) => {
          if (cardIndex) stolen.append(document.createTextNode("、"));
          const preview = el("button", "stolen-card-link", value(card.name, "卡牌"));
          preview.type = "button";
          preview.dataset.stolenCardEnemy = enemyIndex;
          preview.dataset.stolenCardIndex = String(cardIndex);
          preview.title = "点击查看卡牌；战斗结束后可决定是否取回";
          preview.setAttribute("aria-label", "查看被偷走的卡牌：" + value(card.name, "卡牌"));
          stolen.append(preview);
        });
        unit.append(stolen);
      }
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
          const help = el("button", "intent-help", "?");
          help.type = "button";
          help.dataset.intentTitle = headline || "敌人意图";
          help.dataset.intentDescription = description || headline || visibleText;
          help.title = "点击查看完整意图说明";
          help.setAttribute("aria-label", "查看意图说明：" + (headline || visibleText));
          row.append(help);
          unit.append(row);
        });
      } else if (enemy.intent) {
        const row = el("div", "intent");
        row.append(el("span", "intent-primary", "意图 · " + enemy.intent));
        row.title = enemy.intent;
        const help = el("button", "intent-help", "?");
        help.type = "button";
        help.dataset.intentTitle = "敌人意图";
        help.dataset.intentDescription = enemy.intent;
        help.title = "点击查看完整意图说明";
        help.setAttribute("aria-label", "查看意图说明：" + enemy.intent);
        row.append(help);
        unit.append(row);
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
    if (autoPlayedCards.length) {
      const summary = el("div", "auto-play-summary");
      summary.append(el("strong", "", "自动打出："), document.createTextNode(autoPlayedCards.join("、")));
      encounter.append(summary);
    }
  }
  function cardRow(card, s) {
    const inCombat = s && s.phase === "combat";
    const needsTarget = cardNeedsTarget(card);
    const interactive = inCombat && connected && !s.busy && !submitting;
    const selected = Boolean(targetingCard && Number(card.index) === targetingCard.index);
    const row = el(inCombat ? "button" : "div", "card-row" + (selected ? " selected" : ""));
    if (inCombat) {
      row.type = "button";
      row.disabled = !interactive;
      row.dataset.cardIndex = String(card.index);
      row.dataset.targetType = cardTargetType(card);
      row.setAttribute("aria-label", value(card.name, "卡牌") + (needsTarget ? "，点击后选择目标" : "，点击出牌"));
      row.title = interactive
        ? (needsTarget ? "点击卡牌后选择目标" : "点击立即出牌；也可在命令框输入 play " + value(card.index, ""))
        : "等待规则结算完成";
    }
    row.append(el("span", "card-index", String(card.index || "—").padStart(2, "0")));
    row.append(el("span", "card-cost", value(card.cost, "—")));
    const details = el("div", "card-details");
    const title = el("div", "card-name");
    title.append(el("span", "card-title", value(card.name, "卡牌")));
    if (card.type) title.append(el("span", "card-type", cardTypeLabel(card.type)));
    const description = value(card.description).replace(/[\r\n]+/g, " · ").replace(/\s{2,}/g, " ").trim();
    const cardDescription = el("div", "card-description");
    appendTextWithTooltips(cardDescription, description, card.hoverTips);
    details.append(title, cardDescription);
    row.title = [value(card.name, "卡牌"), value(card.cost, "—") + " 能量", value(card.description)].filter(Boolean).join(" · ");
    row.append(details);
    return row;
  }
  function openCardPreview(card, options = {}) {
    if (!card || typeof card !== "object") return;
    cardPreviewTitle.textContent = value(card.name, "卡牌");
    cardPreviewBody.replaceChildren();
    cardPreviewActions.replaceChildren();
    const meta = el("div", "card-preview-meta");
    if (card.type) meta.append(el("span", "", cardTypeLabel(card.type)));
    if (card.cost !== undefined && card.cost !== null) meta.append(el("span", "", card.cost + " 能量"));
    if (meta.childElementCount) cardPreviewBody.append(meta);
    const description = el("div", "card-preview-description");
    appendTextWithTooltips(description, value(card.description), card.hoverTips);
    cardPreviewBody.append(description);
    if (options.note) cardPreviewBody.append(el("p", "card-preview-note", options.note));
    if (options.command) {
      const take = el("button", "choice-action choice-confirm", value(options.claimLabel, "领取这张牌"));
      take.type = "button";
      take.dataset.command = options.command;
      take.disabled = Boolean(!connected || submitting || (state && state.busy));
      cardPreviewActions.append(take);
    }
    const close = el("button", "choice-action", options.command ? "返回奖励列表" : "关闭");
    close.type = "button";
    close.dataset.cardPreviewClose = "true";
    cardPreviewActions.append(close);
    if (!cardPreviewDialog.open) cardPreviewDialog.showModal();
  }
  function renderHand(s) {
    hand.replaceChildren();
    const cards = Array.isArray(s.hand) ? s.hand : [];
    const combatTurn = s.phase === "combat";
    hand.hidden = cards.length === 0 && !combatTurn;
    if (hand.hidden) return;
    const handHint = targetingCard
      ? (targetingCard.targetType === "AnyAlly" ? "点击战士选择目标" : "点击敌人选择目标")
      : combatTurn ? (cards.length ? "点击卡牌出牌" : "暂无手牌") : "play 手牌编号";
    const toolbar = el("div", "hand-toolbar");
    toolbar.append(sectionHeading("手牌", cards.length + " 张 · " + handHint));
    if (combatTurn) {
      const endTurn = el("button", "end-turn-button", "结束回合");
      endTurn.type = "button";
      endTurn.dataset.command = "end";
      endTurn.disabled = Boolean(s.busy || !connected || submitting);
      endTurn.title = s.busy ? "原版动作结算完成后可结束回合"
        : !connected ? "规则引擎未连接"
        : submitting ? "命令提交中"
        : "结束当前回合";
      toolbar.append(endTurn);
    }
    hand.append(toolbar);
    if (!cards.length) return;
    const list = el("div", "card-list");
    cards.forEach((card) => list.append(cardRow(card, s)));
    hand.append(list);
  }
  function renderCrystalSphere(game, s) {
    if (!game || typeof game !== "object") return null;
    const panel = el("section", "crystal-sphere-panel");
    const heading = el("div", "crystal-sphere-heading");
    heading.append(el("span", "crystal-sphere-title", "水晶球占卜"));
    if (game.remainingLabel) heading.append(el("span", "crystal-sphere-count", game.remainingLabel));
    panel.append(heading);

    const remaining = Number(game.remaining) || 0;
    if (remaining > 0) {
      if (game.instructionsTitle) panel.append(el("h3", "crystal-sphere-instructions-title", game.instructionsTitle));
      if (game.instructions) panel.append(el("p", "crystal-sphere-instructions", game.instructions));
      const tools = el("div", "crystal-sphere-tools");
      [["small",game.smallLabel],["big",game.bigLabel]].forEach(([tool,label]) => {
        if (!label) return;
        const button = el("button", "choice-action crystal-sphere-tool" + (String(game.tool).toLowerCase() === tool ? " is-active" : ""), label);
        button.type = "button";
        button.dataset.command = "scry " + tool;
        button.disabled = Boolean(s.busy || !connected || submitting);
        button.setAttribute("aria-pressed", String(String(game.tool).toLowerCase() === tool));
        button.title = value(game.instructions, "选择占卜范围");
        tools.append(button);
      });
      if (tools.childElementCount) panel.append(tools);
    }

    const cells = Array.isArray(game.cells) ? game.cells : [];
    const columns = Math.max(1, Number(game.width) || 11);
    const rows = Math.max(1, Number(game.height) || 11);
    const board = el("div", "crystal-sphere-board");
    board.style.setProperty("--crystal-columns", String(columns));
    board.style.setProperty("--crystal-rows", String(rows));
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", "水晶球占卜格子");
    cells.forEach((cell) => {
      const x = Number(cell.x);
      const y = Number(cell.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) return;
      const isHidden = Boolean(cell.hidden);
      const isItem = cell.itemIndex !== null && cell.itemIndex !== undefined;
      const button = el("button", "crystal-sphere-cell" + (isHidden ? " is-hidden" : " is-cleared") + (isItem ? " has-item" : ""));
      button.type = "button";
      button.style.gridColumn = String(x);
      button.style.gridRow = String(y);
      button.dataset.x = String(x);
      button.dataset.y = String(y);
      button.disabled = !isHidden || remaining <= 0 || Boolean(s.busy || !connected || submitting);
      if (isHidden && remaining > 0) button.dataset.command = "scry " + x + " " + y;
      const label = `第 ${x} 列、第 ${y} 行` + (isHidden ? "，尚未揭开" : isItem ? "，物品已揭示" : "，已揭开");
      button.setAttribute("aria-label", label);
      button.title = label;
      board.append(button);
    });
    const revealedItems = Array.isArray(game.revealedItems) ? game.revealedItems : [];
    revealedItems.forEach((item) => {
      const tile = el("div", "crystal-sphere-revealed-item");
      tile.style.gridColumn = `${Number(item.x)} / span ${Number(item.width)}`;
      tile.style.gridRow = `${Number(item.y)} / span ${Number(item.height)}`;
      tile.dataset.good = String(Boolean(item.good));
      tile.textContent = value(item.label, "物品");
      tile.setAttribute("aria-label", "已揭示：" + value(item.label, "物品"));
      tile.title = value(item.label, "物品");
      board.append(tile);
    });
    const clearPreview = () => board.querySelectorAll(".crystal-sphere-cell.is-preview").forEach((cell) => cell.classList.remove("is-preview"));
    const previewFrom = (target) => {
      const cell = target && target.closest ? target.closest(".crystal-sphere-cell.is-hidden") : null;
      clearPreview();
      if (!cell || !board.contains(cell)) return;
      const x = Number(cell.dataset.x);
      const y = Number(cell.dataset.y);
      const big = String(game.tool).toLowerCase() === "big";
      board.querySelectorAll(".crystal-sphere-cell.is-hidden").forEach((candidate) => {
        const dx = Math.abs(Number(candidate.dataset.x) - x);
        const dy = Math.abs(Number(candidate.dataset.y) - y);
        if (big ? dx <= 1 && dy <= 1 : dx === 0 && dy === 0) candidate.classList.add("is-preview");
      });
    };
    board.addEventListener("pointerover", (event) => previewFrom(event.target));
    board.addEventListener("pointerleave", clearPreview);
    board.addEventListener("focusin", (event) => previewFrom(event.target));
    board.addEventListener("focusout", (event) => { if (!board.contains(event.relatedTarget)) clearPreview(); });
    panel.append(board);
    return panel;
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
    const eventText = value(s.eventText).trim();
    const eventDialogue = s.eventDialogue && typeof s.eventDialogue === "object" ? s.eventDialogue : null;
    const eventCardResults = Array.isArray(s.eventCardResults) ? s.eventCardResults : [];
    const crystalSphere = s.crystalSphere && typeof s.crystalSphere === "object" ? s.crystalSphere : null;
    choice.hidden = !options.length && !actions.length && !eventText && !eventDialogue && !eventCardResults.length && !crystalSphere;
    if (choice.hidden) return;
    if (options.length) {
      const optionHeading = eventDialogue ? "终局对话"
        : (s.phase === "RestSite" || s.phase === "RestSiteRoom") ? "营火行动"
        : (s.phase === "Treasure" || s.phase === "TreasureRoom") ? "宝箱"
        : (s.phase === "Shop" || s.phase === "MerchantRoom") ? "商店商品" : "当前选项";
      choice.append(sectionHeading(optionHeading, value(s.prompt)));
      if (eventText) choice.append(el("div", "event-text", eventText));
      if (eventDialogue) {
        const conversation = el("div", "architect-conversation");
        if (value(eventDialogue.speaker).trim()) conversation.append(el("div", "architect-speaker", eventDialogue.speaker));
        conversation.append(el("div", "architect-line", value(eventDialogue.text)));
        choice.append(conversation);
      }
      const list = el("div", "option-list");
      options.forEach((option, index) => {
        const specialCardReward = (option.kind === "specialCard" || option.kind === "stolenCard")
          && option.cardPreview && typeof option.cardPreview === "object";
        const actionable = Boolean(option.command) && !specialCardReward;
        const rowClass = "option" + (option.disabled ? " disabled" : "") + (specialCardReward ? " special-card-reward" : "");
        const row = el(actionable ? "button" : "div", rowClass);
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
        const detail = el("div", "option-details");
        const title = el("div", "option-title-row");
        title.append(el("span", "option-name", value(option.name, "选项")));
        if (option.type) title.append(el("span", "option-type", cardTypeLabel(option.type)));
        if (option.cost !== undefined && option.cost !== null) title.append(el("span", "option-cost", option.cost + " " + value(option.costLabel, "能量")));
        detail.append(title);
        if (option.description) {
          const description = el("span", "option-description");
          appendTextWithTooltips(description, option.description, option.hoverTips);
          detail.append(description);
        }
        if (specialCardReward) {
          const rewardActions = el("div", "special-reward-actions");
          const previewButton = el("button", "choice-action", "查看牌面");
          previewButton.type = "button";
          previewButton.dataset.cardPreviewIndex = String(option.index || index + 1);
          previewButton.disabled = Boolean(s.busy || submitting);
          previewButton.title = "查看被偷卡牌的牌面，再决定是否取回";
          rewardActions.append(previewButton);
          const takeButton = el("button", "choice-action choice-confirm", value(option.claimLabel, "领取"));
          takeButton.type = "button";
          takeButton.dataset.command = option.command;
          takeButton.disabled = Boolean(option.disabled || s.busy || !connected || submitting);
          takeButton.title = "领取原版特殊卡牌奖励";
          rewardActions.append(takeButton);
          detail.append(rewardActions);
        }
        row.append(detail);
        list.append(row);
      });
      choice.append(list);
      if (selection && Number(selection.max) > 1) {
        choice.append(el("div", "choice-selection-count", `已选 ${selectionDraftIndices.size} 张 · 本次需选 ${selection.min}–${selection.max} 张`));
      }
    } else if (eventText || eventDialogue || eventCardResults.length) {
      choice.append(sectionHeading(eventDialogue ? "终局对话" : "事件", phaseLabels[s.phase] || value(s.phase)));
      if (eventText) choice.append(el("div", "event-text", eventText));
      if (eventDialogue) {
        const conversation = el("div", "architect-conversation");
        if (value(eventDialogue.speaker).trim()) conversation.append(el("div", "architect-speaker", eventDialogue.speaker));
        conversation.append(el("div", "architect-line", value(eventDialogue.text)));
        choice.append(conversation);
      }
    }
    if (eventCardResults.length) {
      const results = el("div", "event-results");
      results.append(sectionHeading("卡牌变化结果"));
      eventCardResults.forEach((result) => results.append(el("div", "event-result", result)));
      choice.append(results);
    }
    const crystalPanel = renderCrystalSphere(crystalSphere, s);
    if (crystalPanel) choice.append(crystalPanel);
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
  }
  function renderRoutePreview(s) {
    routePreview.replaceChildren();
    const routes = Array.isArray(s && s.routes) ? s.routes : [];
    if (!routes.length || !mapView.hidden) {
      routePreview.hidden = true;
      return;
    }
    routePreview.hidden = false;
    const openMap = el("button", "route-map-open", "查看地图");
    openMap.type = "button";
    openMap.dataset.command = "map";
    openMap.disabled = Boolean(s.busy || !connected || submitting);
    openMap.title = "打开可滚动路线图；也可在命令框输入 map";
    routePreview.append(openMap);
  }
  function applySnapshot(s) {
    validateSnapshot(s);
    const mapWasOpen = mapOpen;
    const crystalSphereWasVisible = Boolean(state && state.crystalSphere);
    s.eventCardResults = updateEventResults(s);
    const timelineUnlocks = Array.isArray(s.timelineCharacterUnlocks) ? s.timelineCharacterUnlocks : [];
    const timelinePending = Boolean(s.mainMenu && s.mainMenu.timelineForced && timelineUnlocks.length);
    const nextTimelineKey = timelinePending ? timelineUnlocks.map((epoch) => value(epoch.id)).join("|") : "";
    if (timelinePending && nextTimelineKey !== timelineAutoKey) {
      startMenuView = "timeline";
      timelineAutoKey = nextTimelineKey;
    } else if (!timelinePending) {
      timelineAutoKey = "";
      if (startMenuView === "timeline") startMenuView = "landing";
    }
    state = s;
    if (crystalSphereWasVisible && !s.crystalSphere) scrollArea.scrollTop = 0;
    syncTargeting(s);
    connected = true;
    retryCount = 0;
    if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }
    setConnection("online", "规则引擎在线");
    const messages = Array.isArray(s.messages) ? s.messages.filter(Boolean) : [];
    setPrompt(s.messageError && messages.length ? messages.join("\n") : value(s.prompt, "输入 help 查看命令"), Boolean(s.messageError && messages.length));
    working.hidden = !submitting;
    renderWelcome(s);
    syncMapVisibility(s);
    renderEncounter(s);
    renderMap(s);
    renderHand(s);
    renderChoices(s);
    renderRoutePreview(s);
    updateStatus(s);
    [encounter, hand, choice, routePreview, $("#character-status"), $("#relics"), $("#potions")].forEach(animateState);
    syncInput();
    if (!mapWasOpen && mapOpen) scheduleMapFocus(true);
  }
  async function fetchState(quiet) {
    try {
      const response = await fetch("/api/state", {headers:{Accept:"application/json"}, cache:"no-store"});
      const body = await readJson(response);
      if (!response.ok || body.error) throw new Error(value(body.error, "无法读取游戏状态（HTTP " + response.status + "）"));
      applySnapshot(body);
      if (!quiet && welcome.hidden) input.focus();
    } catch (error) {
      connected = false;
      setConnection("offline", "无法连接规则引擎");
      setPrompt("服务暂不可用。可使用顶部连接状态重试。", true);
      scheduleRetry();
    }
  }
  async function send(command) {
    if (!connected || submitting) return;
    const verb = command.split(/\s+/, 1)[0].toLowerCase();
    if (state && state.busy && !readOnlyWhileBusy.has(verb) && verb !== "clear") {
      setPrompt("规则仍在结算。请等待状态更新，或输入 status 查看当前状态。", true);
      return;
    }
    if (command.toLowerCase() === "clear") {
      recordCommand(command);
      addHistory(command);
      input.value = "";
      setPrompt(value(state && state.prompt, "输入 help 查看命令"));
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
    if (targetingCard && verb !== "play") {
      targetingCard = null;
      if (state) {
        renderEncounter(state);
        renderHand(state);
        updateStatus(state);
      }
    }
    if (verb === "new" || verb === "continue") {
      startMenuView = "landing";
      mapOpen = false;
      mapAutoKey = "";
      mapSuppressedKey = "";
      mapChoiceContext = "";
      mapManualKey = "";
    }
    recordCommand(command);
    addHistory(command);
    input.value = "";
    submitting = true;
    working.hidden = false;
    if (state) {
      renderMap(state);
      renderChoices(state);
      renderRoutePreview(state);
      renderEncounter(state);
      renderHand(state);
      updateStatus(state);
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
        setPrompt(value(body.error, "命令请求失败（HTTP " + response.status + "）"), true);
        if (!connected) scheduleRetry();
        return;
      }
      if (verb === "play") targetingCard = null;
      if (verb === "map") {
        mapOpen = true;
        mapSuppressedKey = "";
        mapManualKey = mapContext(body);
      }
      const isRestSite = body.phase === "RestSite" || body.phase === "RestSiteRoom";
      const isEventRoom = body.phase === "Event" || body.phase === "EventRoom";
      const isShopRoom = body.phase === "Shop" || body.phase === "MerchantRoom";
      const leaveShop = verb === "proceed" && isShopRoom && body.canLeave
        && Array.isArray(body.routes) && body.routes.length > 0;
      if (leaveShop) {
        // NMerchantRoom's original Proceed button opens the map while the
        // merchant room remains the current room. Treat this as an explicit
        // map request so the shop action list does not immediately close it.
        mapOpen = true;
        mapSuppressedKey = "";
        mapManualKey = mapContext(body);
      }
      if (verb === "move" && isEventRoom) {
        // A route click must never leave the full-screen map above a newly
        // entered event, even if a stale/manual map key survived the click.
        mapOpen = false;
        mapManualKey = "";
        mapSuppressedKey = mapContext(body);
      } else if (verb === "move" && isRestSite) {
        // Keep the rest-site action menu in front when arriving. The player
        // must first see the original Heal/Smith choices; the route map can
        // open after a successful choice or on an explicit `map` command.
        mapOpen = false;
        mapSuppressedKey = mapContext(body);
      } else if (isRestSite && body.canLeave && (!Array.isArray(body.options) || body.options.length === 0)) {
        mapAutoKey = "";
        mapSuppressedKey = "";
        mapChoiceContext = "";
      }
      applySnapshot(body);
    } catch (error) {
      connected = false;
      setConnection("offline", "连接中断");
      setPrompt(error.message || "命令请求连接中断；该命令可能已经执行。请使用 status 查看当前状态，前端不会自动重发命令。", true);
      scheduleRetry();
    } finally {
      submitting = false;
      working.hidden = true;
      if (state) {
        renderWelcome(state);
        renderMap(state);
        renderChoices(state);
        renderRoutePreview(state);
        renderEncounter(state);
        renderHand(state);
        updateStatus(state);
      }
      syncInput();
      if (connected) {
        if (!welcome.hidden) input.blur();
        else if (mapView.hidden) input.focus();
        else scheduleMapFocus(true);
      }
    }
  }
  async function startSelectedCharacter() {
    const selected = state && Array.isArray(state.characters)
      ? state.characters.find((character) => character.id === selectedCharacterId)
      : null;
    if (!selected) return;
    if (state.hasRunSave) {
      startMenuView = "landing";
      renderWelcome(state);
      return;
    }
    const freshSelection = state && Array.isArray(state.characters)
      ? state.characters.find((character) => character.id === selectedCharacterId)
      : null;
    if (freshSelection && freshSelection.unlocked) await send("new " + freshSelection.id);
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
  mapZoomOutButton.addEventListener("click", () => setMapZoom(mapZoom - mapZoomStep));
  mapZoomResetButton.addEventListener("click", () => setMapZoom(1));
  mapZoomInButton.addEventListener("click", () => setMapZoom(mapZoom + mapZoomStep));
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
    mapManualKey = "";
    mapFocusKey = "";
    mapView.hidden = true;
    setMapTool("none");
    renderChoices(state || {});
    renderRoutePreview(state || {});
    document.body.classList.remove("map-is-open");
    scrollArea.scrollTo({top:scrollArea.scrollHeight,behavior:"smooth"});
    input.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (mapView.hidden) return;
    if (event.key === "+" || (event.key === "=" && event.shiftKey)) {
      event.preventDefault();
      setMapZoom(mapZoom + mapZoomStep);
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      setMapZoom(mapZoom - mapZoomStep);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      setMapZoom(1);
      return;
    }
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
  function chooseCard(cardIndex) {
    if (!state || state.phase !== "combat" || state.busy || submitting) return;
    const index = Number(cardIndex);
    const card = Array.isArray(state.hand) ? state.hand.find((item) => Number(item.index) === index) : null;
    if (!card) return;
    if (cardNeedsTarget(card)) {
      if (targetingCard && targetingCard.index === index) {
        targetingCard = null;
      } else {
        targetingCard = {index, targetType: cardTargetType(card)};
      }
      renderEncounter(state);
      renderHand(state);
      updateStatus(state);
      return;
    }
    targetingCard = null;
    send("play " + index);
  }
  function chooseEnemyTarget(targetIndex) {
    if (!targetingCard || targetingCard.targetType !== "AnyEnemy" || !state || state.phase !== "combat" || state.busy || submitting) return;
    const index = Number(targetIndex);
    if (!Number.isInteger(index)) return;
    send("play " + targetingCard.index + " " + index);
  }
  hand.addEventListener("click", (event) => {
    const commandButton = event.target.closest && event.target.closest("button[data-command]");
    if (commandButton && hand.contains(commandButton)) {
      if (!commandButton.disabled && !submitting) send(commandButton.dataset.command);
      return;
    }
    const button = event.target.closest && event.target.closest("button[data-card-index]");
    if (!button || button.disabled) return;
    chooseCard(button.dataset.cardIndex);
  });
  encounter.addEventListener("click", (event) => {
    const stolenCard = event.target.closest && event.target.closest("button[data-stolen-card-enemy]");
    if (stolenCard && encounter.contains(stolenCard) && state) {
      const enemy = (Array.isArray(state.enemies) ? state.enemies : [])
        .find((item) => String(item.index) === stolenCard.dataset.stolenCardEnemy);
      const cardIndex = Number(stolenCard.dataset.stolenCardIndex);
      const card = enemy && Array.isArray(enemy.stolenCards) ? enemy.stolenCards[cardIndex] : null;
      if (card) openCardPreview(card, {note:"击败偷窃草蜢后，可在战斗奖励中取回这张牌。"});
      return;
    }
    const help = event.target.closest && event.target.closest(".intent-help");
    if (help && encounter.contains(help)) {
      event.stopPropagation();
      intentDialogTitle.textContent = help.dataset.intentTitle || "敌人意图";
      intentDialogContent.textContent = help.dataset.intentDescription || "暂无意图说明。";
      if (!intentDialog.open) intentDialog.showModal();
      return;
    }
    const target = event.target.closest && event.target.closest("[data-target-index]");
    if (!target || !encounter.contains(target)) return;
    chooseEnemyTarget(target.dataset.targetIndex);
  });
  encounter.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest && event.target.closest(".intent-help")) return;
    const target = event.target.closest && event.target.closest("[data-target-index]");
    if (!target || !encounter.contains(target)) return;
    event.preventDefault();
    chooseEnemyTarget(target.dataset.targetIndex);
  });
  cardPreviewActions.addEventListener("click", (event) => {
    const button = event.target.closest && event.target.closest("button");
    if (!button || button.disabled || !cardPreviewActions.contains(button)) return;
    if (button.dataset.cardPreviewClose === "true") {
      cardPreviewDialog.close();
      return;
    }
    if (button.dataset.command) {
      const command = button.dataset.command;
      cardPreviewDialog.close();
      send(command);
    }
  });
  $("#card-preview-close").addEventListener("click", () => cardPreviewDialog.close());
  cardPreviewDialog.addEventListener("click", (event) => {
    if (event.target === cardPreviewDialog) cardPreviewDialog.close();
  });
  $("#intent-dialog-close").addEventListener("click", () => intentDialog.close());
  intentDialog.addEventListener("click", (event) => {
    if (event.target === intentDialog) intentDialog.close();
  });
  runAbandonButton.addEventListener("click", () => {
    if (!state || runAbandonButton.disabled || !state.runAbandon || !state.runAbandon.enabled) return;
    updateRunControls(state);
    runAbandonDialog.showModal();
    updateRunControls(state);
  });
  runAbandonCancel.addEventListener("click", () => runAbandonDialog.close());
  runAbandonDialog.addEventListener("click", (event) => {
    if (event.target === runAbandonDialog) runAbandonDialog.close();
  });
  runAbandonConfirm.addEventListener("click", () => {
    if (!state || !state.runAbandon || !state.runAbandon.enabled || submitting || state.busy) return;
    runAbandonDialog.close();
    send("abandon");
  });
  $("#character-status").addEventListener("click", (event) => {
    const target = event.target.closest && event.target.closest("#character-status[data-target-index]");
    if (!target || target !== $("#character-status")) return;
    if (targetingCard && targetingCard.targetType === "AnyAlly") {
      send("play " + targetingCard.index + " " + target.dataset.targetIndex);
    }
  });
  $("#character-status").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest && event.target.closest("#character-status[data-target-index]");
    if (!target || target !== $("#character-status")) return;
    event.preventDefault();
    if (targetingCard && targetingCard.targetType === "AnyAlly") {
      send("play " + targetingCard.index + " " + target.dataset.targetIndex);
    }
  });
  choice.addEventListener("click", (event) => {
    const previewButton = event.target.closest && event.target.closest("button[data-card-preview-index]");
    if (previewButton && choice.contains(previewButton) && state) {
      const rewardIndex = Number(previewButton.dataset.cardPreviewIndex);
      const option = (Array.isArray(state.options) ? state.options : [])
        .find((item) => Number(item.index) === rewardIndex && item.cardPreview);
      if (option) {
        openCardPreview(option.cardPreview, {
          command:option.command,
          claimLabel:option.claimLabel
        });
      }
      return;
    }
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
  routePreview.addEventListener("click", (event) => {
    const button = event.target.closest && event.target.closest("button[data-command]");
    if (!button || button.disabled || submitting) return;
    send(button.dataset.command);
  });
  mapNext.addEventListener("click", (event) => {
    const button = event.target.closest && event.target.closest("button[data-command]");
    if (!button || button.disabled) return;
    const command = button.dataset.command;
    mapCloseButton.click();
    send(command);
  });
  welcome.addEventListener("click", async (event) => {
    const characterButton = event.target.closest && event.target.closest("button[data-character]");
    if (characterButton) {
      selectedCharacterId = characterButton.dataset.character || "ironclad";
      if (state) renderWelcome(state);
      return;
    }
    const button = event.target.closest && event.target.closest("button[data-menu-action]");
    if (!button || button.disabled || !state) return;
    const action = button.dataset.menuAction;
    if (action === "singleplayer") {
      const numberOfRuns = Number(state.mainMenu && state.mainMenu.numberOfRuns || 0);
      characterParentView = numberOfRuns > 0 ? "modes" : "landing";
      startMenuView = characterParentView === "modes" ? "modes" : "characters";
      renderWelcome(state);
    } else if (action === "standard") {
      characterParentView = "modes";
      startMenuView = "characters";
      renderWelcome(state);
    } else if (action === "timeline") {
      startMenuView = "timeline";
      renderWelcome(state);
    } else if (action === "reveal-epoch") {
      const epochId = button.dataset.epochId;
      if (!epochId) return;
      await send("reveal " + epochId);
      startMenuView = state && state.mainMenu && state.mainMenu.timelineForced ? "timeline" : "landing";
      if (state) renderWelcome(state);
    } else if (action === "back") {
      startMenuView = startMenuView === "characters" ? characterParentView : "landing";
      renderWelcome(state);
    } else if (action === "continue") {
      await send("continue");
    } else if (action === "start") {
      await startSelectedCharacter();
    } else if (action === "abandon-run") {
      startMenuView = "confirm-abandon";
      renderWelcome(state);
    } else if (action === "confirm-abandon") {
      await send("abandon");
      if (state) {
        const unlocks = Array.isArray(state.timelineCharacterUnlocks) ? state.timelineCharacterUnlocks : [];
        const timelinePending = Boolean(state.mainMenu && state.mainMenu.timelineForced && unlocks.length);
        if (timelinePending) startMenuView = "timeline";
        else if (!state.hasRunSave && (!state.player || state.phase === "victory" || state.phase === "defeat")) {
          startMenuView = "landing";
        }
        renderWelcome(state);
      }
    } else if (action === "cancel-abandon") {
      startMenuView = "landing";
      renderWelcome(state);
    }
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
  updateMapZoomUi();
  syncInput();
  fetchState(true);
})();
