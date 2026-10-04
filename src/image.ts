import { Asset } from "expo-asset";
import type { ImageInput } from "./core/agent";

/** Reads a bundled asset (or any image URI) and returns base64 for the model. Works on phones and on the web. */
export type Img = number | string | { uri: string };

/** Turns what require() or the picker gave us into an Image source (a bare string is a URI). */
export const toSource = (x: Img) => (typeof x === "string" ? { uri: x } : x);

export async function imageToBase64(source: Img): Promise<ImageInput> {
  let uri: string;
  if (typeof source !== "string") {
    const asset = Asset.fromModule(source as number);
    await asset.downloadAsync();
    uri = asset.localUri ?? asset.uri;
  } else uri = source;
  const blob = await (await fetch(uri)).blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  const [head, data] = dataUrl.split(",");
  const mediaType = /image\/(png|jpeg|webp|gif)/.exec(head ?? "")?.[0] ?? "image/png";
  return { base64: data ?? "", mediaType: mediaType as ImageInput["mediaType"] };
}

const MAX_SIDE = 1568; // larger images are downscaled by the API anyway, and the API rejects files over 5 MB

/** Web only: shrinks a picked image to a JPEG the API accepts. Phones already compress through the picker's quality option. */
export async function shrinkForApi(uri: string): Promise<ImageInput> {
  const bitmap = await createImageBitmap(await (await fetch(uri)).blob());
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
  return { base64: data, mediaType: "image/jpeg" };
}

export const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Reads a picked PDF as base64. Refuses very large files before sending them. */
export async function pdfToBase64(uri: string): Promise<ImageInput> {
  const blob = await (await fetch(uri)).blob();
  if (blob.size > MAX_PDF_BYTES) throw new Error("PDF_TOO_LARGE");
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { base64: dataUrl.split(",")[1] ?? "", mediaType: "application/pdf" };
}
