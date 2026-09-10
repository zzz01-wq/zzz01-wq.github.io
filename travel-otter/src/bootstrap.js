import { preloadAssets } from "./preload.js";

const screen = document.querySelector("#loading-screen");
const label = document.querySelector("#loading-resource");
const progress = document.querySelector("#loading-progress");
const count = document.querySelector("#loading-count");
const percent = document.querySelector("#loading-percent");
const retry = document.querySelector("#loading-retry");
retry.addEventListener("click", () => location.reload());

try {
  await preloadAssets((state) => {
    if (label.textContent !== state.label) label.textContent = state.label;
    count.textContent = state.count;
    progress.value = state.percent;
    percent.textContent = `${state.percent}%`;
  });
  label.textContent = "正在准备游戏与存档…";
  await import("./main.js");
  progress.value = 100;
  percent.textContent = "100%";
  label.textContent = "小屋准备好了";
  count.textContent = "全部资源加载完成";
  // Let the measured scene layout settle before revealing it.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  document.querySelector("#game").inert = false;
  document.body.classList.remove("booting");
  screen.setAttribute("aria-busy", "false");
  screen.hidden = true;
} catch (error) {
  const message = document.querySelector("#loading-error");
  message.hidden = false;
  message.textContent = "这份资源暂时没能送达，请检查网络后重试。";
  screen.setAttribute("aria-busy", "false");
  retry.hidden = false;
  retry.focus();
  console.error("小屋加载失败：", label.textContent, error);
}
