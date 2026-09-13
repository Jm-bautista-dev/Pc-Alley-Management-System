import { apiUrl } from "./api";

/**
 * Resolves a product or image source to a reliable, fully-qualified URL.
 * 
 * @param {object|string|null} source - Product object, inventory item, or direct path string
 * @param {('default'|'medium'|'thumbnail'|'original')} [size='default'] - Desired image size variant
 * @returns {string|null} Fully-qualified URL or null if no image is available
 */
export function resolveProductImageUrl(source, size = "default") {
  if (!source) return null;

  let rawPath = null;

  if (typeof source === "string") {
    rawPath = source.trim();
  } else if (typeof source === "object") {
    // Handle inventory item with nested Product
    const prod = source.Product || source;
    rawPath = prod.image_url || prod.product_image || prod.image || null;
  }

  if (!rawPath || typeof rawPath !== "string") {
    return null;
  }

  // If already a data URI, blob URI, or external HTTP/HTTPS URL, return directly
  if (
    rawPath.startsWith("data:") ||
    rawPath.startsWith("blob:") ||
    rawPath.startsWith("http://") ||
    rawPath.startsWith("https://")
  ) {
    return rawPath;
  }

  // Format size variant if it's a webp image in /uploads/products/
  let formattedPath = rawPath;
  if (formattedPath.endsWith(".webp") && size && size !== "default") {
    const cleanBase = formattedPath.replace(/(_original|_medium|_thumbnail)?\.webp$/i, "");
    if (size === "thumbnail") {
      formattedPath = `${cleanBase}_thumbnail.webp`;
    } else if (size === "medium") {
      formattedPath = `${cleanBase}_medium.webp`;
    } else if (size === "original") {
      formattedPath = `${cleanBase}_original.webp`;
    }
  }

  return apiUrl(formattedPath);
}

/**
 * Robust onError handler for product images.
 * Intelligently falls back through available size variants (thumbnail -> medium -> base)
 * and hides the broken element so the underlying placeholder icon displays cleanly.
 * 
 * @param {Event} e - Image onError event
 */
export function handleProductImageError(e) {
  const target = e.currentTarget;
  if (!target) return;

  const currentSrc = target.src || "";
  const retryStep = parseInt(target.dataset.errorRetry || "0", 10);

  if (retryStep === 0 && currentSrc.includes("_thumbnail.webp")) {
    target.dataset.errorRetry = "1";
    target.src = currentSrc.replace("_thumbnail.webp", "_medium.webp");
    return;
  }

  if ((retryStep === 0 || retryStep === 1) && currentSrc.includes("_medium.webp")) {
    target.dataset.errorRetry = "2";
    target.src = currentSrc.replace("_medium.webp", ".webp");
    return;
  }

  if (retryStep <= 2 && currentSrc.includes("_original.webp")) {
    target.dataset.errorRetry = "3";
    target.src = currentSrc.replace("_original.webp", ".webp");
    return;
  }

  // Terminal failure: hide image gracefully so broken icon is never visible
  target.style.display = "none";
  if (target.parentElement) {
    target.parentElement.classList.add("image-load-failed");
  }
}
