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
      const current = state[key] as unknown as ReadonlySet<V>;
      if (current.has(item)) return state as unknown as Partial<T>;
      const next = new Set(current);
      next.add(item);
      return { [key]: next } as unknown as Partial<T>;
    }),
  clear: () => set(() => ({ [key]: new Set<V>() }) as unknown as Partial<T>),
  remove: (item: V) =>
    set((state) => {
      const current = state[key] as unknown as ReadonlySet<V>;
      if (!current.has(item)) return state as unknown as Partial<T>;
      const next = new Set(current);
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
      const current = state[key] as unknown as ReadonlyMap<VK, VV>;
      if (!current.has(mapKey)) return state as unknown as Partial<T>;
      const next = new Map(current);
      next.delete(mapKey);
      return { [key]: next } as unknown as Partial<T>;
    }),
  set: (mapKey: VK, value: VV) =>
    set((state) => {
      const current = state[key] as unknown as ReadonlyMap<VK, VV>;
      if (current.get(mapKey) === value) return state as unknown as Partial<T>;
      const next = new Map(current);
      next.set(mapKey, value);
      return { [key]: next } as unknown as Partial<T>;
    }),
  setAll: (entries: ReadonlyArray<readonly [VK, VV]> | ReadonlyMap<VK, VV>) => set(() => ({ [key]: new Map(entries) }) as unknown as Partial<T>),
  upsert: (mapKey: VK, value: Partial<VV>) =>
    set((state) => {
      const next = new Map(state[key] as unknown as ReadonlyMap<VK, VV>);
      const existing = next.get(mapKey);
      next.set(mapKey, existing ? ({ ...existing, ...value } as VV) : (value as VV));
      return { [key]: next } as unknown as Partial<T>;
    }),
});

export const createListMapHandlers = <T extends object, LK extends keyof T, MK extends keyof T, IDK extends keyof V & string, V extends object>(
  set: (fn: (state: T) => Partial<T> | T) => void,
  listKey: LK,
  mapKey: MK,
  idKey: IDK,
  sortFn?: (a: V, b: V) => number,
) => {
  const syncMap = (list: ReadonlyArray<V>) => new Map(list.map((item) => [item[idKey], item]));

  return {
    clear: () => set(() => ({ [listKey]: [], [mapKey]: new Map() }) as unknown as Partial<T>),

    setAll: (items: ReadonlyArray<V>) =>
      set(() => {
        const list = sortFn ? [...items].sort(sortFn) : items;
        return {
          [listKey]: list,
          [mapKey]: syncMap(list),
        } as unknown as Partial<T>;
      }),

    upsert: (item: Partial<V> & { [P in IDK]: V[IDK] }) =>
      set((state) => {
        const id = item[idKey];
        const currentList = (state[listKey] as unknown as ReadonlyArray<V>) || [];
        const existingIndex = currentList.findIndex((existing) => existing[idKey] === id);

        let nextList: Array<V>;
        if (existingIndex !== -1) {
          nextList = [...currentList];
          nextList[existingIndex] = { ...nextList[existingIndex], ...item };
        } else {
          nextList = [...currentList, item as V];
        }

        if (sortFn) nextList.sort(sortFn);

        return {
          [listKey]: nextList,
          [mapKey]: syncMap(nextList),
        } as unknown as Partial<T>;
      }),

    remove: (id: V[IDK]) =>
      set((state) => {
        const currentList = (state[listKey] as unknown as ReadonlyArray<V>) || [];
        const nextList = currentList.filter((item) => item[idKey] !== id);

        if (nextList.length === currentList.length) return state as unknown as Partial<T>;

        return {
          [listKey]: nextList,
          [mapKey]: syncMap(nextList),
        } as unknown as Partial<T>;
      }),

    reorder: (draggedId: V[IDK], targetId: V[IDK]) =>
      set((state) => {
        const list = state[listKey] as unknown as ReadonlyArray<V>;
        const draggedIndex = list.findIndex((item) => item[idKey] === draggedId);
        const targetIndex = list.findIndex((item) => item[idKey] === targetId);

        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
          return state as unknown as Partial<T>;
        }

        const nextList = [...list];
        const [draggedItem] = nextList.splice(draggedIndex, 1);
        nextList.splice(targetIndex, 0, draggedItem);

        return {
          [listKey]: nextList,
          [mapKey]: syncMap(nextList),
        } as unknown as Partial<T>;
      }),
  };
};

export const persistStore = <T extends object>(useStore: UseBoundStore<StoreApi<T>>, options: PersistOptions<T>): (() => void) => {
  const { key, context, pick, onHydrate, equalityFn = shallowEqual, shouldPersist } = options;

  const unsubscribe = (
    useStore as StoreApi<T> & {
      subscribe: <U>(selector: (state: T) => U, listener: (selectedState: U, previousSelectedState: U) => void) => () => void;
    }
  ).subscribe(
    (state: T) => (pick ? (pick(state) as Partial<T>) : (state as Partial<T>)),
    (selectedState: Partial<T>, previousSelectedState: Partial<T>) => {
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
