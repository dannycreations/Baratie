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
  readonly autoHydrate?: boolean;
}

const asPartial = <T>(obj: any): Partial<T> => obj as unknown as Partial<T>;

export const createSetHandlers = <T extends object, K extends keyof T, V>(set: (fn: (state: T) => Partial<T> | T) => void, key: K) => {
  const getSet = (state: T) => state[key] as unknown as ReadonlySet<V>;

  return {
    add: (item: V) =>
      set((state) => {
        const current = getSet(state);
        if (current.has(item)) return state;
        const next = new Set(current);
        next.add(item);
        return asPartial<T>({ [key]: next });
      }),
    clear: () => set(() => asPartial<T>({ [key]: new Set<V>() })),
    remove: (item: V) =>
      set((state) => {
        const current = getSet(state);
        if (!current.has(item)) return state;
        const next = new Set(current);
        next.delete(item);
        return asPartial<T>({ [key]: next });
      }),
    set: (items: ReadonlyArray<V> | ReadonlySet<V>) => set(() => asPartial<T>({ [key]: new Set(items) })),
    toggle: (item: V) =>
      set((state) =>
        asPartial<T>({
          [key]: toggleSetItem(getSet(state), item),
        }),
      ),
  };
};

export const createMapHandlers = <T extends object, K extends keyof T, VK, VV>(set: (fn: (state: T) => Partial<T> | T) => void, key: K) => {
  const getMap = (state: T) => state[key] as unknown as ReadonlyMap<VK, VV>;

  return {
    clear: () => set(() => asPartial<T>({ [key]: new Map<VK, VV>() })),
    remove: (mapKey: VK) =>
      set((state) => {
        const current = getMap(state);
        if (!current.has(mapKey)) return state;
        const next = new Map(current);
        next.delete(mapKey);
        return asPartial<T>({ [key]: next });
      }),
    set: (mapKey: VK, value: VV) =>
      set((state) => {
        const current = getMap(state);
        if (current.get(mapKey) === value) return state;
        const next = new Map(current);
        next.set(mapKey, value);
        return asPartial<T>({ [key]: next });
      }),
    setAll: (entries: ReadonlyArray<readonly [VK, VV]> | ReadonlyMap<VK, VV>) => set(() => asPartial<T>({ [key]: new Map(entries) })),
    upsert: (mapKey: VK, value: Partial<VV>) =>
      set((state) => {
        const next = new Map(getMap(state));
        const existing = next.get(mapKey);
        next.set(mapKey, existing ? ({ ...existing, ...value } as VV) : (value as VV));
        return asPartial<T>({ [key]: next });
      }),
  };
};

export const createListHandlers = <T extends object, LK extends keyof T, MK extends keyof T, IDK extends keyof V & string, V extends object>(
  set: (fn: (state: T) => Partial<T> | T) => void,
  listKey: LK,
  mapKey: MK,
  idKey: IDK,
  sortFn?: (a: V, b: V) => number,
) => {
  const syncMap = (list: ReadonlyArray<V>) => new Map(list.map((item) => [item[idKey], item]));

  return {
    clear: () => set(() => asPartial<T>({ [listKey]: [], [mapKey]: new Map() })),

    setAll: (items: ReadonlyArray<V>) =>
      set(() => {
        const list = sortFn ? [...items].sort(sortFn) : items;
        return asPartial<T>({
          [listKey]: list,
          [mapKey]: syncMap(list),
        });
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

        return asPartial<T>({
          [listKey]: nextList,
          [mapKey]: syncMap(nextList),
        });
      }),

    remove: (id: V[IDK]) =>
      set((state) => {
        const currentList = (state[listKey] as unknown as ReadonlyArray<V>) || [];
        const nextList = currentList.filter((item) => item[idKey] !== id);

        if (nextList.length === currentList.length) return state;

        return asPartial<T>({
          [listKey]: nextList,
          [mapKey]: syncMap(nextList),
        });
      }),

    reorder: (draggedId: V[IDK], targetId: V[IDK]) =>
      set((state) => {
        const list = state[listKey] as unknown as ReadonlyArray<V>;
        const draggedIndex = list.findIndex((item) => item[idKey] === draggedId);
        const targetIndex = list.findIndex((item) => item[idKey] === targetId);

        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
          return state as unknown as Partial<T> | T;
        }

        const nextList = [...list];
        const [draggedItem] = nextList.splice(draggedIndex, 1);
        nextList.splice(targetIndex, 0, draggedItem);

        return asPartial<T>({
          [listKey]: nextList,
          [mapKey]: syncMap(nextList),
        });
      }),
  };
};

export const createStackHandlers = <T extends object, K extends keyof T, V>(set: (fn: (state: T) => Partial<T> | T) => void, key: K) => {
  const getStack = (state: T) => (state[key] as unknown as ReadonlyArray<V>) || [];

  return {
    push: (item: V) =>
      set((state) => {
        const current = getStack(state);
        return asPartial<T>({ [key]: [...current, item] });
      }),
    pop: () =>
      set((state) => {
        const current = getStack(state);
        if (current.length === 0) return state;
        return asPartial<T>({ [key]: current.slice(0, -1) });
      }),
    remove: (item: V) =>
      set((state) => {
        const current = getStack(state);
        const next = current.filter((i) => i !== item);
        if (next.length === current.length) return state;
        return asPartial<T>({ [key]: next });
      }),
    clear: () => set(() => asPartial<T>({ [key]: [] })),
  };
};

export const persistStore = <T extends object>(useStore: UseBoundStore<StoreApi<T>>, options: PersistOptions<T>): (() => void) => {
  const { key, context, pick, onHydrate, equalityFn = shallowEqual, shouldPersist, autoHydrate } = options;

  if (autoHydrate) {
    queueMicrotask(() => {
      const stored = storage.get<Partial<T>>(key, context);
      if (stored) {
        useStore.setState(stored as T);
        onHydrate?.(useStore.getState());
      }
    });
  }

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
