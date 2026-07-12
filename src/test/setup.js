import '@testing-library/jest-dom';

// Node 22+ expose un `localStorage` global expérimental qui prend le pas sur
// celui de jsdom mais lève sur setItem/clear sans fichier configuré. On le
// remplace par un stockage en mémoire pour que les tests touchant
// localStorage fonctionnent de façon fiable.
class MemoryStorage {
  #store = new Map();
  get length() {
    return this.#store.size;
  }
  clear() {
    this.#store.clear();
  }
  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }
  setItem(key, value) {
    this.#store.set(key, String(value));
  }
  removeItem(key) {
    this.#store.delete(key);
  }
  key(index) {
    return [...this.#store.keys()][index] ?? null;
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, writable: true, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, writable: true, configurable: true });
}
