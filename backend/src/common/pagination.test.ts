import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCursorPageArgs } from './pagination';

describe('buildCursorPageArgs', () => {
  it('returns a cursor query with a trailing next cursor and bounded page size', () => {
    const page = buildCursorPageArgs({ cursor: 'abc', limit: 20, maxLimit: 50 });

    assert.equal(page.take, 20);
    assert.deepEqual(page.cursor, { id: 'abc' });
    assert.equal(page.skip, 1);
  });

  it('caps the page size and strips invalid limits', () => {
    const page = buildCursorPageArgs({ cursor: undefined, limit: 400, maxLimit: 50 });

    assert.equal(page.take, 50);
    assert.equal(page.cursor, undefined);
  });
});
