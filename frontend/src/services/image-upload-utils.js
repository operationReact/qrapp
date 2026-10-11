const MAX_UPLOAD_BYTES = 900 * 1024;
const MAX_IMAGE_DIMENSION = 1800;

export async function prepareImageForUpload(file) {
  if (!file) return file;
  const extension = file.name.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase();
  const baseName = file.name.replace(/(\.(?:png|jpe?g|webp))+$/i, "");
  const normalizedName = extension ? `${baseName}.${extension}` : file.name;
  if (file.size <= MAX_UPLOAD_BYTES) {
    return normalizedName === file.name ? file : new File([file], normalizedName, { type: file.type });
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare image");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > MAX_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large even after compression");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to compress image"));
    }, "image/jpeg", quality);
  });
}
