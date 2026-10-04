import { router } from "expo-router";

/** Goes back, or to the home screen when there is nothing to go back to (page opened or reloaded directly on this route). */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
