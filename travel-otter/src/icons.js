const ICONS = {
  bag: `<path fill="#c8854d" d="M20 16v-4c0-8 24-8 24 0v4"/><rect x="12" y="17" width="40" height="40" rx="12" fill="#e0aa69"/><path fill="#91a775" d="M12 28V22q0-9 10-9h20q10 0 10 9v6q-20 12-40 0Z"/><rect x="23" y="35" width="18" height="17" rx="5" fill="#f5d29b"/><path d="M25 15v15m14-15v15"/><rect x="23" y="25" width="6" height="8" rx="2" fill="#f9e2ab"/><rect x="37" y="25" width="6" height="8" rx="2" fill="#f9e2ab"/>`,
  shop: `<rect x="12" y="26" width="40" height="29" rx="4" fill="#f4d6a4"/><path fill="#d88863" d="m13 10-6 17q0 9 10 6 8 6 15 0 8 6 15 0 10 3 10-6l-6-17Z"/><path d="m22 10-3 18m13-18v18m10-18 3 18" stroke="#f8e5b7" stroke-width="6"/><path d="M7 27h50"/><rect x="18" y="39" width="12" height="16" rx="2" fill="#93a884"/><rect x="37" y="38" width="10" height="9" rx="2" fill="#ffecc7"/>`,
  mail: `<rect x="7" y="17" width="50" height="36" rx="6" fill="#f7deb0"/><path fill="#fff0cf" d="m9 19 23 20 23-20"/><path d="m8 51 17-17m31 17L39 34"/><circle cx="33" cy="39" r="7" fill="#c8755c"/><path d="m30 39 2 2 4-5" stroke="#ffe6bc"/>`,
  album: `<rect x="12" y="9" width="43" height="48" rx="5" fill="#819779"/><rect x="8" y="6" width="42" height="48" rx="5" fill="#b2bf95"/><path d="M16 7v45"/><path fill="#fff2d3" d="m23 17 23 3-3 24-23-3Z"/><path fill="#8fab8a" d="m23 34 7-7 5 5 5-4 3 10-21-3Z"/><circle cx="39" cy="25" r="3" fill="#dfb870"/>`,
  collection: `<rect x="10" y="8" width="44" height="46" rx="5" fill="#d7a779"/><path d="M15 55v4m34-4v4"/><rect x="15" y="13" width="34" height="33" rx="2" fill="#f7dfb0"/><path d="M14 31h36m-18-18v33"/><path fill="#91a573" d="m23 18 5 9H18Z"/><circle cx="41" cy="22" r="5" fill="#d79371"/><path fill="#9caba4" d="m19 40 3-5 6 3-1 5h-9Z"/><path d="m38 37 6 6m0-6-6 6"/>`,
  journal: `<path fill="#ecd4a8" d="M8 12q12-5 24 2 12-7 24-2v40q-13-5-24 1-12-6-24-1Z"/><path fill="#fff0d1" d="M12 9q10-3 20 4 10-7 20-4v37q-10-3-20 3-10-6-20-3Z"/><path d="M32 14v33m-15-27 9 2m-9 6 9 2m-9 6 9 2m12-17 8-2m-8 10 8-2m-8 10 8-2"/><path d="M37 8v16l4-3 4 1V6" fill="#c57960"/>`,
  leaf: `<path d="M31 33q4 15-5 25" fill="none"/><path fill="#86a666" d="M31 30C5 34 6 12 19 13 17 0 38 3 32 28Z"/><path fill="#a4bb76" d="M34 30C29 4 52 5 51 17 64 16 60 37 35 32Z"/><path fill="#70935d" d="M30 34C34 60 12 59 13 47 0 48 3 27 28 32Z"/><path fill="#95ae67" d="M35 35C61 31 60 53 48 52 49 65 28 61 33 36Z"/><path d="m20 19 10 11m14-10-9 11M20 45l10-11m15 12L35 35" stroke="#c7d99a"/>`,
  camera: `<path d="m22 19 4-8h14l4 8" fill="#cfa670"/><rect x="8" y="18" width="48" height="35" rx="7" fill="#95aaa3"/><path fill="#e5d5b4" d="M8 27h48v17H8Z"/><circle cx="32" cy="35" r="13" fill="#f7e5c2"/><circle cx="32" cy="35" r="8" fill="#688e8d"/><circle cx="29" cy="32" r="2" fill="#e8f2df" stroke="none"/><path d="M46 23h5"/>`,
  tent: `<path fill="#bba47c" d="m32 8 26 45H6Z"/><path fill="#9eaf7b" d="M32 8 16 53H6Z"/><path fill="#e6c389" d="m32 8 26 45H16Z"/><path fill="#718776" d="m32 27 12 26H21Z"/><path d="M32 8V4M6 53l-3 5m55-5 3 5"/>`,
  rice: `<path fill="#fff1d0" d="M26 10q6-6 12 0l20 33q4 11-8 13H14Q2 54 6 43Z"/><path fill="#718a62" d="M23 35h18v21H23Z"/><path d="m18 35 1 1m25-6 1 1M29 19l1 1m-16 26 1 1" stroke="#d3bd8f"/>`,
  sandwich: `<path fill="#d1a46d" d="m8 18 44 2 5 29-8 7-42-6Z"/><path fill="#92a66e" d="m8 31 47 3v7L8 42Z"/><path fill="#e5a574" d="m8 37 47 2v6L8 46Z"/><path fill="#fff0c9" d="m9 9 46 6-6 23-42-5Z"/><path d="m15 17 32 4-3 10-29-3Z" stroke="#e3c189"/>`,
  mushroom: `<path fill="#dca564" d="M8 36Q3 12 24 13q10-9 23 4 15 3 10 24-3 15-25 15Q9 55 8 36Z"/><path fill="#f5cc88" d="M15 37Q10 20 24 21q11-8 19 1 12 5 5 17Z"/><path d="m24 20 4 12m10-10 4 9"/>`,
  bento: `<rect x="7" y="15" width="50" height="41" rx="9" fill="#be7657"/><rect x="7" y="9" width="50" height="36" rx="9" fill="#f5dcac"/><path d="M34 12v30m1-16h18"/><path fill="#fff4d8" d="M13 20q10-12 15 1v17H13Z"/><circle cx="21" cy="25" r="4" fill="#d48061"/><path d="m41 17 5 3m-5 14 7 2" stroke="#8ca572" stroke-width="5"/>`,
  charm: `<path d="M25 15q-5-17 7-10 12-7 7 10" fill="none"/><path fill="#d7a66b" d="m19 13-8 13 5 31h32l5-31-8-13Z"/><path fill="#91aa76" d="m23 19-6 9 4 22h22l4-22-6-9Z"/><path d="m26 30 6 7 6-7m-6 7v6" stroke="#f7e4b0"/><circle cx="32" cy="26" r="3" fill="#f6deb0"/>`,
  stone: `<path fill="#9bacac" d="m7 42 10-22 23-6 17 18-7 19-29 3Z"/><path fill="#c8d0c4" d="m17 20 9 18 14-24Z"/><path d="m7 42 19-4 24 15m-24-15 31-4"/>`,
  shell: `<path fill="#e6b69a" d="M32 55Q-2 44 8 22q6-17 17-8 7-19 15-5 16-5 18 15 8 23-26 31Z"/><path d="m13 25 19 30m-7-36 7 36m9-38-9 38m19-28L32 55" stroke="#be927b"/>`,
  acorn: `<path fill="#cb9c66" d="M15 30q-1 20 17 28 18-8 17-28Z"/><path fill="#8d8460" d="M11 31q0-21 21-19 21-2 21 19Z"/><path d="M32 12q-2-8 5-10m-17 21 6-5m6 5 6-5m5 7 4-4"/>`,
  chime: `<path d="M32 5v10"/><path fill="#bdd0bd" d="M15 36q-1-24 17-24 18 0 17 24Z"/><path d="M32 37v11"/><path fill="#dca17e" d="m27 45 13 4-7 14-13-4Z"/><path d="M23 30q4-12 8-7" stroke="#eef2d3"/>`,
  home: `<path fill="#f4d4a0" d="M13 29h38v28H13Z"/><path fill="#9cab7a" d="m5 30 27-23 27 23Z"/><rect x="27" y="37" width="12" height="20" rx="3" fill="#ac855d"/><rect x="17" y="36" width="6" height="8" rx="1" fill="#fff1c9"/>`,
  help: `<circle cx="32" cy="32" r="24" fill="#f4deb2"/><path d="M24 25q0-12 12-8 12 7-3 16v5" fill="none" stroke-width="4"/><circle cx="33" cy="47" r="2" fill="#76634c"/>`,
  close: `<path d="m21 21 22 22m0-22L21 43" stroke="#785a3f" stroke-width="5"/>`,
  lock: `<path d="M21 27V18c0-15 22-15 22 0v9" fill="none" stroke-width="5"/><rect x="13" y="25" width="38" height="31" rx="7" fill="#d2b382"/><path d="M32 37v8" stroke-width="5"/>`,
  plus: `<path d="M32 18v28M18 32h28" stroke-width="4"/>`,
  sun: `<circle cx="32" cy="32" r="13" fill="#f5c56c"/><path d="M32 5v7m0 40v7M5 32h7m40 0h7M13 13l5 5m28 28 5 5m0-38-5 5M18 46l-5 5" stroke="#e7b258" stroke-width="4"/>`,
  clock: `<circle cx="32" cy="32" r="24" fill="#f2dfb8"/><path d="M32 17v16l10 6"/><path d="M28 4h8"/>`,
  rabbit: `<path fill="#eee4cb" d="M19 28Q3-4 16 3l13 23Q25-7 36 3l4 26q18 3 14 19-3 12-23 12-23 0-25-13-2-13 13-19Z"/><path d="m15 10 7 15m11-16 2 15" stroke="#d6a598"/><circle cx="23" cy="39" r="2" fill="#79634d"/><circle cx="41" cy="39" r="2" fill="#79634d"/><path d="m29 46 3 2 3-2"/>`,
};
export function icon(name, extra = "") {
  return `<svg class="ico ${extra}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}
export function installIcons() {
  const el = document.createElement("div");
  el.hidden = true;
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${Object.entries(
    ICONS,
  )
    .map(
      ([id, shape]) =>
        `<symbol id="i-${id}" viewBox="0 0 64 64"><g stroke="#79664f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${shape}</g></symbol>`,
    )
    .join("")}</defs></svg>`;
  document.body.prepend(el);
  document
    .querySelectorAll("[data-icon]")
    .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
}
ICONS.music = `<path fill="#e4bf7d" d="M25 14v32m0-29 26-8v28M25 26l26-8"/><ellipse cx="17" cy="47" rx="9" ry="7" fill="#d4a56c"/><ellipse cx="43" cy="39" rx="9" ry="7" fill="#9eae7d"/>`;
ICONS.mute = `<path fill="#d8bd89" d="M10 24h11l13-11v38L21 40H10Z"/><path d="m43 25 13 14m0-14L43 39" stroke-width="4"/>`;
ICONS.moon = `<path fill="#f2dca0" d="M43 8A25 25 0 1 0 56 43 24 24 0 0 1 43 8Z"/><path d="m48 13 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" fill="#f7e8bc"/>`;
