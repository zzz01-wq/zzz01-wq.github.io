export const RESOURCE_MANIFEST = [
  {
    id: "cottage",
    label: "河畔小屋背景",
    url: "./assets/cottage.png",
    type: "image",
    bytes: 3668032,
  },
  {
    id: "otter",
    label: "小獭头像",
    url: "./assets/otter.png",
    type: "image",
    bytes: 1519656,
  },
  {
    id: "cat",
    label: "小猫主角",
    url: "./assets/cat.png",
    type: "image",
    bytes: 1644354,
  },
  {
    id: "cat-eat",
    label: "小猫吃饭插画",
    url: "./assets/cat-eat.png",
    type: "image",
    bytes: 1852356,
  },
  {
    id: "cat-sleep",
    label: "小猫打盹插画",
    url: "./assets/cat-sleep.png",
    type: "image",
    bytes: 1712460,
  },
  {
    id: "cat-pack",
    label: "小猫整理行囊插画",
    url: "./assets/cat-pack.png",
    type: "image",
    bytes: 2237448,
  },
  {
    id: "parrot",
    label: "小鹦鹉主角",
    url: "./assets/parrot.png",
    type: "image",
    bytes: 1640149,
  },
  {
    id: "parrot-eat",
    label: "小鹦鹉吃饭插画",
    url: "./assets/parrot-eat.png",
    type: "image",
    bytes: 1683006,
  },
  {
    id: "parrot-sleep",
    label: "小鹦鹉打盹插画",
    url: "./assets/parrot-sleep.png",
    type: "image",
    bytes: 1539788,
  },
  {
    id: "parrot-pack",
    label: "小鹦鹉整理行囊插画",
    url: "./assets/parrot-pack.png",
    type: "image",
    bytes: 1733909,
  },
  {
    id: "characters",
    label: "小獭与朋友角色",
    url: "./assets/characters.png",
    type: "image",
    bytes: 2130019,
  },
  {
    id: "postcards",
    label: "旅行明信片",
    url: "./assets/postcards.png",
    type: "image",
    bytes: 3872497,
  },
  {
    id: "music",
    label: "背景音乐",
    url: "./assets/gymnopedie-no-1.mp3",
    type: "audio",
    bytes: 2048567,
  },
];
export let BGM_DATA = "./assets/gymnopedie-no-1.mp3";
export let OTTER_AVATAR = "./assets/otter.png";
export let CAT_AVATAR = "./assets/cat.png";
export let PARROT_AVATAR = "./assets/parrot.png";
export const CAT_ACTIONS = {
  eat: "./assets/cat-eat.png",
  sleep: "./assets/cat-sleep.png",
  pack: "./assets/cat-pack.png",
};
export const PARROT_ACTIONS = {
  eat: "./assets/parrot-eat.png",
  sleep: "./assets/parrot-sleep.png",
  pack: "./assets/parrot-pack.png",
};
export let CAST_ATLAS = "./assets/characters.png";
export let POSTCARD_ATLAS = "./assets/postcards.png";
export const PHOTO_SCENES = [
  "./assets/photo-lake-moment.png",
  "./assets/photo-sea-moment.png",
  "./assets/photo-forest-moment.png",
  "./assets/photo-town-moment.png",
];
export const CAT_POSTCARD_SCENES = [
  "./assets/cat-postcard-lake.png",
  "./assets/cat-postcard-sea.png",
  "./assets/cat-postcard-forest.png",
  "./assets/cat-postcard-town.png",
];
export const PARROT_POSTCARD_SCENES = [
  "./assets/parrot-postcard-lake.png",
  "./assets/parrot-postcard-sea.png",
  "./assets/parrot-postcard-forest.png",
  "./assets/parrot-postcard-town.png",
];
// Route postcards have one dedicated illustration per route photo slot and protagonist.
export const ROUTE_PHOTO_SCENES = {
  otter: {
    "lake-mist": "./assets/route-otter-lake-mist.png",
    "lake-reflection": "./assets/route-otter-lake-reflection.png",
    "mountain-ribbon": "./assets/route-otter-mountain-ribbon.png",
    "mountain-rooftops": "./assets/route-otter-mountain-rooftops.png",
    "reed-birds": "./assets/route-otter-reed-birds.png",
    "reed-sunset": "./assets/route-otter-reed-sunset.png",
    "tide-shells": "./assets/route-otter-tide-shells.png",
    "tide-steps": "./assets/route-otter-tide-steps.png",
    "lighthouse-shadow": "./assets/route-otter-lighthouse-shadow.png",
    "lighthouse-boat": "./assets/route-otter-lighthouse-boat.png",
    "shell-market": "./assets/route-otter-shell-market.png",
    "shell-tea": "./assets/route-otter-shell-tea.png",
    "pine-path": "./assets/route-otter-pine-path.png",
    "pine-squirrel": "./assets/route-otter-pine-squirrel.png",
    "moss-creek": "./assets/route-otter-moss-creek.png",
    "moss-feet": "./assets/route-otter-moss-feet.png",
    "firefly-clearing": "./assets/route-otter-firefly-clearing.png",
    "firefly-leaf": "./assets/route-otter-firefly-leaf.png",
    "old-bridge": "./assets/route-otter-old-bridge.png",
    "bridge-puddle": "./assets/route-otter-bridge-puddle.png",
    "tea-alley": "./assets/route-otter-tea-alley.png",
    "tea-sign": "./assets/route-otter-tea-sign.png",
    "lantern-street": "./assets/route-otter-lantern-street.png",
    "lantern-card": "./assets/route-otter-lantern-card.png",
  },
  cat: {
    "lake-mist": "./assets/route-cat-lake-mist.png",
    "lake-reflection": "./assets/route-cat-lake-reflection.png",
    "mountain-ribbon": "./assets/route-cat-mountain-ribbon.png",
    "mountain-rooftops": "./assets/route-cat-mountain-rooftops.png",
    "reed-birds": "./assets/route-cat-reed-birds.png",
    "reed-sunset": "./assets/route-cat-reed-sunset.png",
    "tide-shells": "./assets/route-cat-tide-shells.png",
    "tide-steps": "./assets/route-cat-tide-steps.png",
    "lighthouse-shadow": "./assets/route-cat-lighthouse-shadow.png",
    "lighthouse-boat": "./assets/route-cat-lighthouse-boat.png",
    "shell-market": "./assets/route-cat-shell-market.png",
    "shell-tea": "./assets/route-cat-shell-tea.png",
    "pine-path": "./assets/route-cat-pine-path.png",
    "pine-squirrel": "./assets/route-cat-pine-squirrel.png",
    "moss-creek": "./assets/route-cat-moss-creek.png",
    "moss-feet": "./assets/route-cat-moss-feet.png",
    "firefly-clearing": "./assets/route-cat-firefly-clearing.png",
    "firefly-leaf": "./assets/route-cat-firefly-leaf.png",
    "old-bridge": "./assets/route-cat-old-bridge.png",
    "bridge-puddle": "./assets/route-cat-bridge-puddle.png",
    "tea-alley": "./assets/route-cat-tea-alley.png",
    "tea-sign": "./assets/route-cat-tea-sign.png",
    "lantern-street": "./assets/route-cat-lantern-street.png",
    "lantern-card": "./assets/route-cat-lantern-card.png",
  },
  parrot: {
    "lake-mist": "./assets/route-parrot-lake-mist.png",
    "lake-reflection": "./assets/route-parrot-lake-reflection.png",
    "mountain-ribbon": "./assets/route-parrot-mountain-ribbon.png",
    "mountain-rooftops": "./assets/route-parrot-mountain-rooftops.png",
    "reed-birds": "./assets/route-parrot-reed-birds.png",
    "reed-sunset": "./assets/route-parrot-reed-sunset.png",
    "tide-shells": "./assets/route-parrot-tide-shells.png",
    "tide-steps": "./assets/route-parrot-tide-steps.png",
    "lighthouse-shadow": "./assets/route-parrot-lighthouse-shadow.png",
    "lighthouse-boat": "./assets/route-parrot-lighthouse-boat.png",
    "shell-market": "./assets/route-parrot-shell-market.png",
    "shell-tea": "./assets/route-parrot-shell-tea.png",
    "pine-path": "./assets/route-parrot-pine-path.png",
    "pine-squirrel": "./assets/route-parrot-pine-squirrel.png",
    "moss-creek": "./assets/route-parrot-moss-creek.png",
    "moss-feet": "./assets/route-parrot-moss-feet.png",
    "firefly-clearing": "./assets/route-parrot-firefly-clearing.png",
    "firefly-leaf": "./assets/route-parrot-firefly-leaf.png",
    "old-bridge": "./assets/route-parrot-old-bridge.png",
    "bridge-puddle": "./assets/route-parrot-bridge-puddle.png",
    "tea-alley": "./assets/route-parrot-tea-alley.png",
    "tea-sign": "./assets/route-parrot-tea-sign.png",
    "lantern-street": "./assets/route-parrot-lantern-street.png",
    "lantern-card": "./assets/route-parrot-lantern-card.png",
  },
};
export function routePhotoScene(photo, characterId = "") {
  const rawId = String(photo?.id || "");
  const id = rawId.replace(/^(cat|parrot)-/, "");
  const character =
    characterId ||
    photo?.characterId ||
    (rawId.startsWith("cat-")
      ? "cat"
      : rawId.startsWith("parrot-")
        ? "parrot"
        : "otter");
  return ROUTE_PHOTO_SCENES[character]?.[id] || photo?.scene;
}
// Event illustrations are intentionally independent by event type and destination.
// They are referenced lazily by journey results instead of being part of the
// startup resource manifest, so the initial screen does not load all 28 images.
export const EVENT_SCENES = {
  journey: [
    "./assets/event-journey-lake.png",
    "./assets/event-journey-sea.png",
    "./assets/event-journey-forest.png",
    "./assets/event-journey-town.png",
  ],
  food: [
    "./assets/event-food-lake.png",
    "./assets/event-food-sea.png",
    "./assets/event-food-forest.png",
    "./assets/event-food-town.png",
  ],
  tool: [
    "./assets/event-tool-lake.png",
    "./assets/event-tool-sea.png",
    "./assets/event-tool-forest.png",
    "./assets/event-tool-town.png",
  ],
  weather: [
    "./assets/event-weather-lake.png",
    "./assets/event-weather-sea.png",
    "./assets/event-weather-forest.png",
    "./assets/event-weather-town.png",
  ],
  wildlife: [
    "./assets/event-wildlife-lake.png",
    "./assets/event-wildlife-sea.png",
    "./assets/event-wildlife-forest.png",
    "./assets/event-wildlife-town.png",
  ],
  night: [
    "./assets/event-night-lake.png",
    "./assets/event-night-sea.png",
    "./assets/event-night-forest.png",
    "./assets/event-night-town.png",
  ],
  rare: [
    "./assets/event-rare-lake.png",
    "./assets/event-rare-sea.png",
    "./assets/event-rare-forest.png",
    "./assets/event-rare-town.png",
  ],
};
export function setResourceUrl(id, url) {
  if (id === "music") BGM_DATA = url;
  if (id === "otter") OTTER_AVATAR = url;
  if (id === "cat") CAT_AVATAR = url;
  if (id === "parrot") PARROT_AVATAR = url;
  if (id === "cat-eat") CAT_ACTIONS.eat = url;
  if (id === "cat-sleep") CAT_ACTIONS.sleep = url;
  if (id === "cat-pack") CAT_ACTIONS.pack = url;
  if (id === "parrot-eat") PARROT_ACTIONS.eat = url;
  if (id === "parrot-sleep") PARROT_ACTIONS.sleep = url;
  if (id === "parrot-pack") PARROT_ACTIONS.pack = url;
  if (id === "characters") CAST_ATLAS = url;
  if (id === "postcards") POSTCARD_ATLAS = url;
}
