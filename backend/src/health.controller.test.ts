import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HealthController } from './health.controller';

describe('HealthController readiness', () => {
  it('does not expose raw database errors in the readiness response', async () => {
    const controller = new HealthController({
      $queryRaw: async () => {
        throw new Error('postgres://user:secret@internal-db:5432/app');
      },
    } as any);

    await assert.rejects(
      () => controller.ready(),
      (error: any) => {
        const response = error.getResponse();
        assert.equal(response.error, 'Database unavailable');
        assert.equal(JSON.stringify(response).includes('secret'), false);
        return true;
      },
    );
  });
});