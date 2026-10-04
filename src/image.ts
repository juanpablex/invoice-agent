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
