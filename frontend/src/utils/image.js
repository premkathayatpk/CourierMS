// Shrink photos in the browser before upload: phone pictures are often 3–8 MB,
// a 1600px JPEG is ~200–400 KB and plenty for profile / parcel photos.
const MAX_SIDE = 1600;
const QUALITY = 0.85;

export const compressImage = async (file) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image format isn't supported. Use JPG, PNG or WebP.");
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  // White background so transparent PNGs don't turn black as JPEG
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("Could not process this image.");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
};
