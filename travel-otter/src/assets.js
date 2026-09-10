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
export let CAST_ATLAS = "./assets/characters.png";
export let POSTCARD_ATLAS = "./assets/postcards.png";
export const PHOTO_SCENES = [
  "./assets/photo-lake-moment.png",
  "./assets/photo-sea-moment.png",
  "./assets/photo-forest-moment.png",
  "./assets/photo-town-moment.png",
];
export function setResourceUrl(id, url) {
  if (id === "music") BGM_DATA = url;
  if (id === "characters") CAST_ATLAS = url;
  if (id === "postcards") POSTCARD_ATLAS = url;
}
