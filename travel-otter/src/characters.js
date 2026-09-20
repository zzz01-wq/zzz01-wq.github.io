import { state } from "./store.js";
import { CAT_AVATAR, OTTER_AVATAR, PARROT_AVATAR } from "./assets.js";

const CHARACTER_META = {
  otter: {
    id: "otter",
    name: "阿獭",
    species: "小水獭",
    role: "河畔旅行家",
    description: "熟悉河边每一条小路的老朋友。",
  },
  cat: {
    id: "cat",
    name: "小猫",
    species: "橘白旅行猫",
    role: "新来的小旅伴",
    description: "带着相机和好奇心，想把远方画下来。",
  },
  parrot: {
    id: "parrot",
    name: "小鹦鹉",
    species: "灰蓝小鹦鹉",
    role: "会唱歌的远行家",
    description: "喜欢把路上的声音和颜色，都带回小屋。",
  },
};

export const CHARACTER_OPTIONS = Object.values(CHARACTER_META);

export function characterFor(id = state.character) {
  const key = CHARACTER_META[id] ? id : "otter";
  const meta = CHARACTER_META[key];
  return {
    ...meta,
    avatar:
      key === "cat" ? CAT_AVATAR : key === "parrot" ? PARROT_AVATAR : OTTER_AVATAR,
  };
}

export function currentCharacter() {
  return characterFor(state.character);
}
