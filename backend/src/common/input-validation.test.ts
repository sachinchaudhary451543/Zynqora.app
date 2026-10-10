import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMessageDto } from '../chat/dto/create-message.dto';
import { CreateStoryDto } from '../stories/dto/create-story.dto';

describe('write input validation', () => {
  it('rejects oversized chat messages and accepts valid messages', () => {
    const valid = plainToInstance(CreateMessageDto, { content: 'Hello' });
    const oversized = plainToInstance(CreateMessageDto, { content: 'x'.repeat(4001) });

    assert.equal(validateSync(valid).length, 0);
    assert.equal(validateSync(oversized).length > 0, true);
  });

  it('rejects oversized story captions and unsupported visibility values', () => {
    const invalid = plainToInstance(CreateStoryDto, {
      videoUrl: '/uploads/story.mp4',
      caption: 'x'.repeat(1001),
      visibility: 'EVERYONE',
    });

    assert.equal(validateSync(invalid).length > 0, true);
  });
});
