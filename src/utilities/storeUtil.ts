import { storage } from '../app/container';
import { shallowEqual, toggleSetItem } from './objectUtil';

import type { StoreApi, UseBoundStore } from 'zustand';

const PERSIST_DEBOUNCE_MS = 250;

interface PendingWrite {
  readonly value: unknown;
  readonly context: string;
}

const pendingWrites = new Map<string, PendingWrite>();
let flushTimer: number | null = null;
let flushListenerRegistered = false;

const flushPendingWrites = (): void => {
  flushTimer = null;
  if (pendingWrites.size === 0) {
    return;
  }
  for (const [writeKey, { value, context }] of pendingWrites) {
    storage.set(writeKey, value, context);
  }
  pendingWrites.clear();
};

const schedulePersist = (writeKey: string, value: unknown, context: string): void => {
  pendingWrites.set(writeKey, { value, context });
  if (flushTimer !== null) {
    return;
  }
  flushTimer = window.setTimeout(flushPendingWrites, PERSIST_DEBOUNCE_MS);
  if (!flushListenerRegistered) {
    flushListenerRegistered = true;
    window.addEventListener('pagehide', flushPendingWrites);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushPendingWrites();
      }
    });
  }
};

interface PersistOptions<T, P> {
  readonly key: string;
  readonly context: string;
  readonly pick: (state: T) => P;
  readonly onHydrate?: (state: T) => void;
  readonly equalityFn?: (a: P, b: P) => boolean;
  readonly shouldPersist?: (state: T) => boolean;
  readonly autoHydrate?: boolean;
}

export const createSetHandlers = <T extends object, K extends keyof T, V>(set: (fn: (state: T) => Partial<T> | T) => void, key: K) => {
  const getSet = (state: T) => state[key] as unknown as ReadonlySet<V>;

  return {
    clear: () => set(() => ({ [key]: new Set<V>() }) as Partial<T>),
    remove: (item: V) =>
      set((state) => {
        const current = getSet(state);
        if (!current.has(item)) return state;
        const next = new Set(current);
        next.delete(item);
        return { [key]: next } as Partial<T>;
      }),
    set: (items: ReadonlyArray<V> | ReadonlySet<V>) => set(() => ({ [key]: new Set(items) }) as Partial<T>),
    toggle: (item: V) => set((state) => ({ [key]: toggleSetItem(getSet(state), item) }) as Partial<T>),
  };
};

export const createListHandlers = <T extends object, LK extends keyof T, IDK extends keyof V & string, V extends object>(
  set: (fn: (state: T) => Partial<T> | T) => void,
  listKey: LK,
  idKey: IDK,
  sortFn?: (a: V, b: V) => number,
) => {
  // The list is the only copy of the collection; callers that need lookup by
  // id scan it, which is cheaper than keeping a second structure in sync.
  const readList = (state: T): ReadonlyArray<V> => state[listKey] as unknown as ReadonlyArray<V>;

  return {
    setAll: (items: ReadonlyArray<V>) => set(() => ({ [listKey]: sortFn ? [...items].sort(sortFn) : items }) as Partial<T>),
    upsert: (item: Partial<V> & { [P in IDK]: V[IDK] }) =>
      set((state) => {
        const id = item[idKey] as V[IDK];
        const currentList = readList(state);
        const existingIndex = currentList.findIndex((listItem) => listItem[idKey] === id);

        if (existingIndex === -1) {
          const nextList = [...currentList, item as V];
          if (sortFn) {
            nextList.sort(sortFn);
          }
          return { [listKey]: nextList } as Partial<T>;
        }

        const existing = currentList[existingIndex];
        const updated = { ...existing, ...item } as V;

        if (shallowEqual(existing, updated)) {
          return state;
        }

        const nextList = [...currentList];
        nextList[existingIndex] = updated;

        return { [listKey]: nextList } as Partial<T>;
      }),
    remove: (id: V[IDK]) =>
      set((state) => {
        const currentList = readList(state);
        if (!currentList.some((listItem) => listItem[idKey] === id)) {
          return state;
        }

        return { [listKey]: currentList.filter((listItem) => listItem[idKey] !== id) } as Partial<T>;
      }),
    reorder: (draggedId: V[IDK], targetId: V[IDK]) =>
      set((state) => {
        if (draggedId === targetId) return state;

        const list = readList(state);
        const draggedIndex = list.findIndex((item) => item[idKey] === draggedId);
        const targetIndex = list.findIndex((item) => item[idKey] === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return state;

        const nextList = [...list];
        const [draggedItem] = nextList.splice(draggedIndex, 1);
        nextList.splice(targetIndex, 0, draggedItem);

        return { [listKey]: nextList } as Partial<T>;
      }),
  };
};

export const persistStore = <T extends object, P>(useStore: UseBoundStore<StoreApi<T>>, options: PersistOptions<T, P>): void => {
  const { key, context, pick, onHydrate, equalityFn = shallowEqual, shouldPersist, autoHydrate } = options;

  // Every persisted store is created with the subscribeWithSelector middleware,
  // which widens subscribe to the (selector, listener) form used below.
  const subscribeSelection = useStore.subscribe as unknown as (selector: (state: T) => P, listener: (selected: P, previous: P) => void) => () => void;

  subscribeSelection(pick, (selectedState, previousSelectedState) => {
    if (equalityFn(selectedState, previousSelectedState)) {
      return;
    }

    if (shouldPersist && !shouldPersist(useStore.getState())) {
      return;
    }

    schedulePersist(key, selectedState, context);
  });

  if (autoHydrate) {
    queueMicrotask(() => {
      const stored = storage.get<Partial<T>>(key, context);
      if (stored) {
        useStore.setState(stored as T);
      }
      onHydrate?.(useStore.getState());
    });
  } else {
    onHydrate?.(useStore.getState());
  }
};
