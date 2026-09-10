export const $ = (s) => document.querySelector(s);
export const SAVE_KEY = "otter-journey-v1";
export const ui = {
  activePanel: "",
  collectionTab: "treasures",
  albumPlace: "all",
  speechUntil: 0,
  devPreview: null,
};
function fresh() {
  return {
    v: 1,
    leaves: 180,
    inventory: { rice: 2 },
    bag: { food: null, tool: null, charm: null },
    status: "home",
    readyAt: 0,
    trip: null,
    pending: null,
    photos: [],
    gifts: [0, 0, 0, 0],
    souvenirs: {},
    discoveries: {},
    letters: [],
    trips: 0,
    fast: true,
    devMode: false,
    garden: Array(6).fill(0),
    visitorAt: Date.now() + 60000,
    visitorScheduleVersion: 2,
    visitorScheduleMode: "fast",
    visitorLastId: "",
    visitor: false,
    log: [
      {
        at: Date.now(),
        text: "阿獭搬进了河畔小屋。第一段旅程，就从这里开始。",
      },
    ],
  };
}
export let state;
function isSave(value) {
  return (
    value &&
    value.v === 1 &&
    Array.isArray(value.garden) &&
    Array.isArray(value.photos) &&
    value.inventory
  );
}
try {
  let v = JSON.parse(localStorage.getItem(SAVE_KEY));
  state = isSave(v) ? v : fresh();
} catch {
  state = fresh();
}
export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    $("#save-label").textContent = "未能保存，请检查浏览器存储";
  }
}
export function adoptSaved(raw) {
  let next;
  try {
    next = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return false;
  }
  if (!isSave(next)) return false;
  Object.assign(state, next);
  return true;
}
export function log(text) {
  state.log.unshift({ at: Date.now(), text });
  state.log = state.log.slice(0, 60);
}
