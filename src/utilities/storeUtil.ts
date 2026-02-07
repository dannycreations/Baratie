import { storage } from '../app/container';
import { shallowEqual, toggleSetItem } from './objectUtil';

import type { StoreApi, UseBoundStore } from 'zustand';

export interface PersistOptions<T> {
  readonly key: string;
  readonly context: string;
  readonly pick?: (state: T) => unknown;
  readonly onHydrate?: (state: T) => void;
  readonly equalityFn?: (a: Partial<T>, b: Partial<T>) => boolean;
  readonly shouldPersist?: (state: T) => boolean;
}

export const createSetHandlers = <T extends object, K extends keyof T, V>(set: (fn: (state: T) => Partial<T> | T) => void, key: K) => ({
  add: (item: V) =>
    set((state) => {
      const next = new Set(state[key] as unknown as ReadonlySet<V>);
      next.add(item);
      return { [key]: next } as unknown as Partial<T>;
    }),
  clear: () => set(() => ({ [key]: new Set<V>() }) as unknown as Partial<T>),
  remove: (item: V) =>
    set((state) => {
      const next = new Set(state[key] as unknown as ReadonlySet<V>);
      next.delete(item);
      return { [key]: next } as unknown as Partial<T>;
    }),
  set: (items: ReadonlyArray<V> | ReadonlySet<V>) => set(() => ({ [key]: new Set(items) }) as unknown as Partial<T>),
  toggle: (item: V) =>
    set(
      (state) =>
        ({
          [key]: toggleSetItem(state[key] as unknown as ReadonlySet<V>, item),
        }) as unknown as Partial<T>,
    ),
});

export const createMapHandlers = <T extends object, K extends keyof T, VK, VV>(set: (fn: (state: T) => Partial<T> | T) => void, key: K) => ({
  clear: () => set(() => ({ [key]: new Map<VK, VV>() }) as unknown as Partial<T>),
  remove: (mapKey: VK) =>
    set((state) => {
      const next = new Map(state[key] as unknown as ReadonlyMap<VK, VV>);
      if (next.delete(mapKey)) {
        return { [key]: next } as unknown as Partial<T>;
      }
      return state as unknown as Partial<T>;
    }),
  set: (mapKey: VK, value: VV) =>
    set((state) => {
      const next = new Map(state[key] as unknown as ReadonlyMap<VK, VV>);
      next.set(mapKey, value);
      return { [key]: next } as unknown as Partial<T>;
    }),
  setAll: (entries: ReadonlyArray<readonly [VK, VV]> | ReadonlyMap<VK, VV>) => set(() => ({ [key]: new Map(entries) }) as unknown as Partial<T>),
});

export const persistStore = <T extends object>(useStore: UseBoundStore<StoreApi<T>>, options: PersistOptions<T>): (() => void) => {
  const { key, context, pick, onHydrate, equalityFn = shallowEqual, shouldPersist } = options;

  const unsubscribe = (useStore as any).subscribe(
    (state: T) => (pick ? pick(state) : (state as any)),
    (selectedState: any, previousSelectedState: any) => {
      if (equalityFn(selectedState, previousSelectedState)) {
        return;
      }

      if (shouldPersist && !shouldPersist(useStore.getState())) {
        return;
      }

      storage.set(key, selectedState, context);
    },
  );

  if (onHydrate) {
    onHydrate(useStore.getState());
  }

  return unsubscribe;
};
