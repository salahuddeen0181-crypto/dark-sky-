// Background removal for dish photos, right in the admin's browser: BiRefNet (MIT) through Transformers.js.
// Nothing goes to a third-party service. The library comes from jsDelivr and the model (~115 MB) from Hugging Face
// on first use; the browser caches both after that.

const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';
// Load at runtime, outside the bundler: the package is large and only the admin ever needs it
const load = new Function('u', 'return import(u)');

// 1024 px model on a capable GPU; otherwise the 512 px one on the CPU (the 1024 one runs out of WASM memory).
// Apple GPUs in Chrome allow only 10 storage buffers per shader and the 1024 model needs 11.
const GPU = ['webgpu', 'fp16', 'onnx-community/BiRefNet_lite-ONNX'], CPU = ['wasm', 'fp16', 'onnx-community/BiRefNet_512x512-ONNX'];
const loaded = new Map();
let lib = null, works = null; // the plan that ran last time, tried first

async function gpuFits() {
  const a = typeof navigator !== 'undefined' && 'gpu' in navigator && (await navigator.gpu.requestAdapter().catch(() => null));
  return !!a && a.limits.maxStorageBuffersPerShaderStage >= 11;
}
function init([device, dtype, MODEL], onProgress) {
  const key = device + dtype + MODEL;
  if (!loaded.has(key)) {
    const p = (async () => {
      const T = await (lib ||= load(LIB));
      const files = new Map();
      const progress_callback = e => {
        if (e.status !== 'progress' || !e.total) return;
        files.set(e.file, [e.loaded, e.total]);
        const [l, t] = [...files.values()].reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
        onProgress?.(l / t);
      };
      const model = await T.AutoModel.from_pretrained(MODEL, { device, dtype, progress_callback });
      const processor = await T.AutoProcessor.from_pretrained(MODEL);
      return { T, model, processor };
    })();
    p.catch(() => loaded.delete(key)); // a failed download can be retried
    loaded.set(key, p);
  }
  return loaded.get(key);
}

// RawImage → alpha mask (RawImage, 1 channel) with the first plan that works on this device
async function predict(file, onProgress, onStage) {
  const plans = works ? [works] : (await gpuFits()) ? [GPU, CPU] : [CPU];
  let last;
  for (const plan of plans) {
    try {
      onStage?.('model');
      const { T, model, processor } = await init(plan, onProgress);
      onStage?.('cut');
      const image = await T.RawImage.fromBlob(file);
      const { pixel_values } = await processor(image);
      const out = Object.values(await model({ [model.sessions.model.inputNames[0]]: pixel_values }))[0];
      const mask = await T.RawImage.fromTensor(out[0].sigmoid().mul(255).to('uint8')).resize(image.width, image.height);
      works = plan;
      return { image, mask };
    } catch (e) { console.warn('cutout', plan[0], e); last = e; }
  }
  throw new Error('Не удалось вырезать фон на этом устройстве: ' + (last?.message || '').slice(0, 120));
}

// file → { blob (transparent WebP or PNG, cropped to the dish), url (preview) }
export async function cutout(file, { onProgress, onStage } = {}) {
  const { image, mask } = await predict(file, onProgress, onStage);

  // original pixels + mask as alpha
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = image.width; c.height = image.height;
  const g = c.getContext('2d');
  g.drawImage(bmp, 0, 0, c.width, c.height);
  const px = g.getImageData(0, 0, c.width, c.height);
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let i = 0, y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++, i++) {
      const a = mask.data[i * mask.channels];
      px.data[i * 4 + 3] = a;
      if (a > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  if (x1 < 0) throw new Error('На фото не найден предмет — загрузите оригинал');
  g.putImageData(px, 0, 0);

  // crop to the dish with a small margin, at most 900 px
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(c.width - 1, x1 + pad); y1 = Math.min(c.height - 1, y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(1, 900 / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.round(w * k); out.height = Math.round(h * k);
  out.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, out.width, out.height);
  // WebP keeps the transparency small; browsers that cannot encode it (older Safari) give PNG instead
  const blob = await new Promise(res => out.toBlob(b => res(b), 'image/webp', 0.86));
  return { blob, url: URL.createObjectURL(blob) };
}
