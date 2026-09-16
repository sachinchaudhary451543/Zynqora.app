import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SanitizedHttpExceptionFilter } from './http-exception.filter';
import { BadRequestException } from '@nestjs/common';

describe('SanitizedHttpExceptionFilter', () => {
  it('overrides response body to avoid leaking internal details', () => {
    const filter = new SanitizedHttpExceptionFilter();
    const calls: any[] = [];
    const response = {
      status: (code: number) => {
        calls.push(['status', code]);
        return { json: (body: any) => calls.push(['json', body]) };
      },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/posts',
          headers: { 'x-request-id': 'req-123' },
        }),
      }),
    };

    filter.catch(new BadRequestException('Sensitive stack detail'), host as any);

    assert.deepEqual(calls[0], ['status', 400]);
    assert.equal(calls[1][1].message, 'Sensitive stack detail');
    assert.equal(calls[1][1].requestId, 'req-123');
  });
});
