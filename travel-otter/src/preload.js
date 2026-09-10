import { RESOURCE_MANIFEST, setResourceUrl } from "./assets.js";

/** Read actual response bytes; a stalled or failed transfer never reports completion. */
export async function readResource(
  resource,
  onProgress,
  fetchResource = fetch,
) {
  const controller = new AbortController();
  let timeout;
  const heartbeat = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 30000);
  };
  heartbeat();
  try {
    const response = await fetchResource(resource.url, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const total =
      Number(response.headers.get("content-length")) || resource.bytes;
    if (!response.body) {
      const blob = await response.blob();
      onProgress(1);
      return blob;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      heartbeat();
      chunks.push(value);
      received += value.byteLength;
      onProgress(Math.min(0.99, received / total));
    }
    onProgress(1);
    return new Blob(chunks, {
      type:
        response.headers.get("content-type") ||
        (resource.type === "image" ? "image/png" : "audio/mpeg"),
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function preloadAssets(report) {
  const total = RESOURCE_MANIFEST.reduce(
    (sum, resource) => sum + resource.bytes,
    0,
  );
  let completed = 0;
  for (const [index, resource] of RESOURCE_MANIFEST.entries()) {
    const update = (fraction, stage = "正在加载") =>
      report({
        label: `${stage} · ${resource.label}`,
        percent: Math.floor(
          (95 * (completed + resource.bytes * fraction)) / total,
        ),
        count: `资源 ${index + 1} / ${RESOURCE_MANIFEST.length}`,
      });
    update(0);
    const blob = await readResource(resource, (fraction) => update(fraction));
    const url = URL.createObjectURL(blob);
    try {
      if (resource.type === "image") {
        update(1, "正在准备画面");
        const image = new Image();
        image.src = url;
        await image.decode();
      }
      setResourceUrl(resource.id, url);
      document
        .querySelectorAll(`[data-asset="${resource.id}"]`)
        .forEach((image) => {
          image.src = url;
        });
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    completed += resource.bytes;
  }
}
