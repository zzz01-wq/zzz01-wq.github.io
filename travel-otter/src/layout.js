/** Anchor the action row and scene to the measured status card, including wrapped text. */
export function setupLayout() {
  const game = document.querySelector("#game");
  const card = document.querySelector(".home-status");
  const nav = document.querySelector(".bottom-nav");
  const actions = document.querySelector(".garden-actions");
  let frame;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const anchor = card.hidden ? nav : card;
      const bottom = game.clientHeight - anchor.offsetTop + 16;
      game.style.setProperty("--actions-bottom", `${bottom}px`);
      game.style.setProperty(
        "--scene-bottom",
        `${bottom + actions.offsetHeight + 16}px`,
      );
    });
  };
  const observer = new ResizeObserver(update);
  [game, card, nav, actions].forEach((element) => observer.observe(element));
  window.addEventListener("resize", update);
  update();
}
