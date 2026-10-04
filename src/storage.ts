import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * The API key never leaves the device. On phones it goes to the secure keychain/keystore.
 * On the web it stays in this browser: sessionStorage by default (gone when the tab closes),
 * localStorage only if the person asks to remember it.
 */
const KEY = "invoice-agent.apiKey";
const MODEL = "invoice-agent.model";

export interface StoredSettings {
  apiKey: string | null;
  model: string | null;
  remembered: boolean;
}

export async function loadSettings(): Promise<StoredSettings> {
  try {
    if (Platform.OS === "web") {
      const remembered = localStorage.getItem(KEY);
      return { apiKey: remembered ?? sessionStorage.getItem(KEY), model: localStorage.getItem(MODEL), remembered: !!remembered };
    }
    return { apiKey: await SecureStore.getItemAsync(KEY), model: await SecureStore.getItemAsync(MODEL), remembered: true };
  } catch {
    return { apiKey: null, model: null, remembered: false };
  }
}

export async function saveSettings(apiKey: string, model: string, remember: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
      (remember ? localStorage : sessionStorage).setItem(KEY, apiKey);
      localStorage.setItem(MODEL, model);
    } else {
      await SecureStore.setItemAsync(KEY, apiKey);
      await SecureStore.setItemAsync(MODEL, model);
    }
  } catch {
    /* storage blocked: the key stays in memory for this session only */
  }
}

export async function clearKey(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    /* nothing to clear */
  }
}
