import { describe, expect, it } from 'bun:test';

import { createListHandlers } from './storeUtil';

interface Step {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
}

interface StepState {
  readonly steps: ReadonlyArray<Step>;
}

const ALPHA = { id: 'a', label: 'Alpha', enabled: true } as const;
const BETA = { id: 'b', label: 'Beta', enabled: false } as const;

const createHarness = (initial: ReadonlyArray<Step> = [], sortByLabel = false) => {
  let state: StepState = { steps: initial };

  const set = (fn: (current: StepState) => Partial<StepState> | StepState): void => {
    state = { ...state, ...fn(state) } as StepState;
  };

  return {
    getState: () => state,
    handlers: createListHandlers<StepState, 'steps', 'id', Step>(
      set,
      'steps',
      'id',
      sortByLabel ? (x, y) => x.label.localeCompare(y.label) : undefined,
    ),
  };
};

describe('createListHandlers', () => {
  it('keeps one entry per id when an item is inserted then updated', () => {
    const { handlers, getState } = createHarness([ALPHA]);

    handlers.upsert(BETA);
    handlers.upsert({ id: 'b', label: 'Beta Renamed' });

    expect(getState().steps).toEqual([ALPHA, { id: 'b', label: 'Beta Renamed', enabled: false }]);
  });

  it('leaves the list untouched when an update changes nothing', () => {
    const { handlers, getState } = createHarness([ALPHA]);
    const before = getState().steps;

    handlers.upsert({ id: 'a', label: 'Alpha' });

    expect(getState().steps).toBe(before);
  });

  it('removes only the matching id and keeps state when the id is absent', () => {
    const { handlers, getState } = createHarness([ALPHA, BETA]);

    handlers.remove('missing');
    expect(getState().steps).toEqual([ALPHA, BETA]);

    handlers.remove('a');
    expect(getState().steps).toEqual([BETA]);
  });

  it('re-sorts an updated item when a sort function is supplied', () => {
    const { handlers, getState } = createHarness([ALPHA, BETA], true);

    handlers.upsert({ id: 'b', label: 'Aardvark' });

    expect(getState().steps.map((step) => step.id)).toEqual(['b', 'a']);
  });

  it('reorders by moving the dragged step onto the target position', () => {
    const { handlers, getState } = createHarness([ALPHA, BETA, { id: 'c', label: 'Gamma', enabled: true }], true);

    handlers.reorder('c', 'a');

    expect(getState().steps.map((step) => step.id)).toEqual(['c', 'a', 'b']);
  });
});
