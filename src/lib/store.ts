// src/trust/store.ts
import { createStore, get, set, del, clear } from "idb-keyval";

const store = createStore("pivault-trust", "trust");

export function trustGet<T>(key: string): Promise<T | undefined> {
  return get<T>(key, store);
}

export function trustSet(key: string, value: unknown): Promise<void> {
  return set(key, value, store);
}

export function trustDel(key: string): Promise<void> {
  return del(key, store);
}

export function trustClear(): Promise<void> {
  return clear(store);
}
