import { describe, expect, it } from 'bun:test';

import { selectVisibleLineItems } from './useLineNumber';

// Running visual-line totals for a textarea holding three logical lines where
// the second one wraps onto three visual rows: "abc", 25 chars, "d".
const PREFIX_SUM = [1, 4, 5];

describe('selectVisibleLineItems', () => {
  it('numbers only the first visual row of each logical line', () => {
    expect(selectVisibleLineItems(PREFIX_SUM, 0, 5)).toEqual([
      { key: 0, number: 1 },
      { key: 1, number: 2 },
      { key: 2, number: null },
      { key: 3, number: null },
      { key: 4, number: 3 },
    ]);
  });

  it('omits rows before the window while keeping the numbering intact', () => {
    expect(selectVisibleLineItems(PREFIX_SUM, 3, 5)).toEqual([
      { key: 3, number: null },
      { key: 4, number: 3 },
    ]);
  });

  it('returns nothing when the window starts past the last visual line', () => {
    expect(selectVisibleLineItems(PREFIX_SUM, 5, 5)).toEqual([]);
  });
});
