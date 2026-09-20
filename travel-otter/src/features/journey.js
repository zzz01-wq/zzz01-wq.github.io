import { ITEMS, PLACES, travelContent } from "../data.js";
import { EVENT_SCENES, routePhotoScene } from "../assets.js";
import { characterFor } from "../characters.js";
import { catTravelContent } from "../cat-journey.js";
import { parrotTravelContent } from "../parrot-journey.js";

// The result is seeded when a character leaves. This keeps an offline journey
// stable across reloads while still letting the player discover the contents
// only when the traveler comes home.
function randomFor(seed) {
  let value = (Math.abs(Math.floor(Number(seed) || 1)) || 1) >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseWeighted(items, random, weight) {
  if (!items.length) return null;
  const weights = items.map((item) => Math.max(0.01, weight(item)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = random() * total;
  for (let i = 0; i < items.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return items[i];
  }
  return items[items.length - 1];
}

function itemFor(id) {
  return ITEMS.find((item) => item.id === id);
}

function normalizeCharacterId(id) {
  return id === "cat" || id === "parrot" ? id : "otter";
}

function routeWeight(route, food, tool, charm) {
  const affinity = food?.routeTags || [];
  let weight = 1;
  weight += route.tags.filter((tag) => affinity.includes(tag)).length * 3;
  if (tool === "camera" && route.tags.includes("open")) weight += 0.8;
  if (charm === "charm" && route.tags.includes("quiet")) weight += 0.6;
  return weight;
}

function souvenirWeight(souvenir, route, charm) {
  let weight = souvenir.route === route.id ? 5 : 1;
  if (souvenir.rarity === "rare") weight *= charm === "charm" ? 3.4 : 0.35;
  return weight;
}

function pickSouvenir(pool, route, charm, random, used) {
  const available = pool.filter((item) => !used.has(item.id));
  const candidates = available.length ? available : pool;
  return chooseWeighted(candidates, random, (souvenir) =>
    souvenirWeight(souvenir, route, charm),
  );
}

function routePhoto(photo) {
  return {
    ...photo,
    scene: routePhotoScene(photo),
  };
}

function contextPhoto(
  type,
  { place, route, condition, food, tool, characterId = "otter" },
) {
  const placeName = PLACES[place]?.name || "远方";
  const travelerName = characterFor(characterId).name;
  const photoPrefix =
    characterId === "cat"
      ? "cat-"
      : characterId === "parrot"
        ? "parrot-"
        : "";
  const copy = {
    journey: {
      title: "路边的小发现",
      caption: `${placeName}的路还没有走完，${travelerName}在${route.name}旁停下来歇了歇。`,
      quote: "有时不是去哪里，光是走一段路也很好。",
    },
    food: {
      title: `${food?.name || "便当"}时间`,
      caption: `${travelerName}在${route.name}旁打开了${food?.name || "便当"}，风把香味带到了很远的地方。`,
      quote: "先吃饱，再慢慢看下一段风景。",
    },
    tool: {
      title: `${tool?.name || "小道具"}派上用场`,
      caption: `在${route.name}，${tool?.name || "小道具"}替${travelerName}留住了一小段${condition.label}。`,
      quote: "带对了一件东西，旅途就多了一种看法。",
    },
    weather: {
      title: `${condition.label}的天空`,
      caption: `${route.name}的天气忽然有了变化，${travelerName}停下来，把这一刻也寄回了家。`,
      quote: "天气不会重复，今天的天空也值得收进相册。",
    },
    wildlife: {
      title: "路过的小客人",
      caption: `${route.name}旁的草丛动了一下，${travelerName}遇见了一个不肯久留的小客人。`,
      quote: "它没有留下名字，只留下了一阵窸窸窣窣的声音。",
    },
    night: {
      title: "灯影落在水边",
      caption: `${route.name}慢慢安静下来，远处的灯影替${travelerName}照亮了回去的路。`,
      quote: "天黑以后，风景只是换了一种说法。",
    },
    rare: {
      title: "远处的身影",
      caption: `${placeName}的风里，出现了一个来不及打招呼的小小身影。`,
      quote: "没来得及问名字，不过它也看见我了。",
    },
  }[type];
  return {
    id: `${photoPrefix}${route.id}-${condition.id}-${type}-${food?.id || tool?.id || "any"}`,
    type,
    ...copy,
    place,
    scene: EVENT_SCENES[type]?.[place] || EVENT_SCENES.journey[place],
    routeId: route.id,
    routeName: route.name,
    conditionName: condition.label,
    characterId,
  };
}

function chooseContextType(trip, condition, random) {
  if (random() < 0.08) return null;
  const options = [
    { type: "journey", weight: 1.4 },
    { type: "weather", weight: 1.2 },
    { type: "wildlife", weight: 1.1 },
    {
      type: "night",
      weight:
        condition.id.includes("evening") || condition.id.includes("lamp")
          ? 2
          : 0.65,
    },
    { type: "food", weight: trip.food ? 1.5 : 0.4 },
    { type: "tool", weight: trip.tool ? 1.5 : 0.4 },
    { type: "rare", weight: trip.charm === "charm" ? 2.5 : 0.45 },
  ];
  return (
    chooseWeighted(options, random, (option) => option.weight)?.type ||
    "journey"
  );
}

export function buildJourneyOutcome(trip) {
  const characterId = normalizeCharacterId(trip?.characterId);
  const content = travelContentForCharacter(characterId, trip.place);
  const random = randomFor(trip.seed);
  const food = itemFor(trip.food);
  const route = chooseWeighted(content.routes, random, (candidate) =>
    routeWeight(candidate, food, trip.tool, trip.charm),
  );
  const condition = chooseWeighted(content.conditions, random, (candidate) => {
    let weight = 1;
    if (route.tags.includes("evening") && candidate.id.includes("evening"))
      weight += 1.5;
    if (route.tags.includes("rain") && candidate.id.includes("rain"))
      weight += 1.5;
    return weight;
  });
  const photoIndex = Math.floor(random() * route.photos.length);
  const primaryPhoto = {
    ...routePhoto(route.photos[photoIndex]),
    type: "landmark",
    place: trip.place,
    routeId: route.id,
    routeName: route.name,
    conditionName: condition.label,
    characterId,
  };
  const photos = [primaryPhoto];
  const contextType = chooseContextType(trip, condition, random);
  if (contextType)
    photos.push(
      contextPhoto(contextType, {
        place: trip.place,
        route,
        condition,
        food,
        tool: itemFor(trip.tool),
        characterId,
      }),
    );
  if (trip.tool === "camera" && route.photos.length > 1) {
    photos.push({
      ...routePhoto(route.photos[(photoIndex + 1) % route.photos.length]),
      type: "landmark",
      place: trip.place,
      routeId: route.id,
      routeName: route.name,
      conditionName: condition.label,
      characterId,
    });
  }

  const specialty =
    random() < (trip.charm === "charm" ? 0.92 : 0.8)
      ? {
          name: PLACES[trip.place].gift,
          icon: PLACES[trip.place].icon,
        }
      : null;
  const giftCount =
    random() < (trip.charm === "charm" ? 0.9 : 0.74)
      ? trip.tool === "tent"
        ? 2
        : 1
      : 0;
  const used = new Set();
  const souvenirs = [];
  for (let i = 0; i < giftCount; i++) {
    const souvenir = pickSouvenir(
      content.souvenirs,
      route,
      trip.charm,
      random,
      used,
    );
    if (souvenir) {
      souvenirs.push(souvenir);
      used.add(souvenir.id);
    }
  }

  return {
    characterId,
    place: trip.place,
    routeId: route.id,
    routeName: route.name,
    conditionId: condition.id,
    conditionName: condition.label,
    conditionIcon: condition.icon,
    conditionDesc: condition.desc,
    moment: route.moment,
    letter: route.letter,
    specialty,
    photos: photos.map((photo) => ({
      ...photo,
      place: trip.place,
      routeId: route.id,
      routeName: route.name,
      conditionName: condition.label,
    })),
    souvenirs,
  };
}

export function travelContentForCharacter(characterId, place) {
  return characterId === "cat"
    ? catTravelContent(place)
    : characterId === "parrot"
      ? parrotTravelContent(place)
      : travelContent(place);
}

export function allSouvenirs() {
  return [
    ...new Map(
      [0, 1, 2, 3]
        .flatMap((place) => travelContent(place).souvenirs)
        .map((souvenir) => [souvenir.id, souvenir]),
    ).values(),
  ];
}
