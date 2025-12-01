import { writable } from "svelte/store";

interface ShareContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

function createShareStore() {
  const { subscribe, set, update } = writable<number>(0);

  return {
    subscribe,
    triggerRefresh: () => update((prev) => prev + 1),
    reset: () => set(0),
  };
}

export const shareStore = createShareStore();
