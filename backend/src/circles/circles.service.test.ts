import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CirclesService } from './circles.service';
import { buildWeeklyPrompt } from './weekly-prompt';

describe('CirclesService', () => {
  it('returns live member/post counts and the current membership state', async () => {
    const service = new CirclesService({
      circle: {
        findMany: async () => [{
          id: 'circle-1',
          slug: 'tech',
          name: 'Tech Innovators',
          description: 'Tech community',
          icon: '🚀',
          _count: { members: 7, posts: 12 },
          members: [{ id: 'membership-1' }],
        }],
      },
      user: {
        count: async () => 21,
        findUniqueOrThrow: async () => ({ interests: ['tech'] }),
      },
    } as any);

    const result = await service.list('user-1');

    assert.equal(result[0].memberCount, 21);
    assert.equal(result[0].slug, 'all');
    assert.equal(result[1].memberCount, 7);
    assert.equal(result[1].postCount, 12);
    assert.equal(result[1].isMember, true);
    assert.equal(result[1].recommended, true);
  });

  it('creates membership idempotently when joining', async () => {
    let upsertArgs: unknown;
    const service = new CirclesService({
      circle: { findUnique: async () => ({ id: 'circle-1', slug: 'tech' }) },
      circleMember: { upsert: async (args: unknown) => { upsertArgs = args; } },
    } as any);

    const result = await service.join('user-1', 'tech');

    assert.deepEqual(result, { joined: true, slug: 'tech' });
    assert.deepEqual(upsertArgs, {
      where: { circleId_userId: { circleId: 'circle-1', userId: 'user-1' } },
      create: { circleId: 'circle-1', userId: 'user-1' },
      update: {},
    });
  });

  it('removes only the current user membership when leaving', async () => {
    let deleteArgs: unknown;
    const service = new CirclesService({
      circle: { findUnique: async () => ({ id: 'circle-1', slug: 'tech' }) },
      circleMember: { deleteMany: async (args: unknown) => { deleteArgs = args; } },
    } as any);

    const result = await service.leave('user-1', 'tech');

    assert.deepEqual(result, { joined: false, slug: 'tech' });
    assert.deepEqual(deleteArgs, { where: { circleId: 'circle-1', userId: 'user-1' } });
  });

  it('rejects joining a circle that does not exist', async () => {
    const service = new CirclesService({
      circle: { findUnique: async () => null },
    } as any);

    await assert.rejects(() => service.join('user-1', 'missing'), NotFoundException);
  });

  it('creates a circle, makes its creator the owner, and starts the weekly prompt', async () => {
    const transactionWrites: unknown[] = [];
    const prisma = {
      circle: {
        findUnique: async () => null,
      },
      $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
        circle: { create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 'circle-new', ...data }) },
        circleMember: { create: async ({ data }: { data: unknown }) => { transactionWrites.push(data); } },
        circlePrompt: { create: async ({ data }: { data: unknown }) => { transactionWrites.push(data); } },
      }),
    };
    const service = new CirclesService(prisma as any);

    const result = await service.create('user-1', {
      name: '  Indie Game Devs ',
      category: 'gaming',
      description: 'A place to build games together.',
    });

    assert.equal(result.slug, 'indie-game-devs');
    assert.equal(result.isMember, true);
    assert.equal(result.memberCount, 1);
    assert.deepEqual(transactionWrites[0], { circleId: 'circle-new', userId: 'user-1', role: 'OWNER' });
    assert.equal((transactionWrites[1] as { circleId: string }).circleId, 'circle-new');
  });

  it('publishes a member-created game session and automatically RSVPs its host', async () => {
    let savedEvent: Record<string, unknown> | undefined;
    const service = new CirclesService({
      circle: { findUnique: async () => ({ id: 'circle-1', name: 'Game Lab', category: 'gaming' }) },
      circleMember: { findUnique: async () => ({ id: 'member-1' }), findMany: async () => [] },
      circleEvent: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          savedEvent = data;
          return { id: 'event-1', ...data, creator: { username: 'host' } };
        },
      },
    } as any);

    const event = await service.createEvent('user-1', 'game-lab', {
      kind: 'GAME',
      mode: 'ONLINE',
      title: 'Co-op puzzle night',
      description: 'Bring any co-op puzzle game and share the joining instructions.',
      startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      gameUrl: 'https://example.com/game',
      capacity: 8,
      durationMinutes: 90,
    });

    assert.equal(event.id, 'event-1');
    assert.equal(savedEvent?.kind, 'GAME');
    assert.equal(savedEvent?.mode, 'ONLINE');
    assert.deepEqual(savedEvent?.participants, { create: { userId: 'user-1' } });
  });

  it('stores creator-authored in-circle quiz rounds without returning their answers in circle details', async () => {
    let savedEvent: Record<string, any> | undefined;
    const service = new CirclesService({
      circle: { findUnique: async () => ({ id: 'circle-1', name: 'Game Lab', category: 'gaming' }) },
      circleMember: { findUnique: async () => ({ id: 'member-1' }), findMany: async () => [] },
      circleEvent: {
        create: async ({ data }: { data: Record<string, any> }) => {
          savedEvent = data;
          return { id: 'quiz-1', ...data, creator: { username: 'host' } };
        },
      },
    } as any);

    await service.createEvent('user-1', 'game-lab', {
      kind: 'GAME',
      gameMode: 'NATIVE_TRIVIA',
      mode: 'ONLINE',
      title: 'Trivia night',
      description: 'Two rounds made for this circle.',
      startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      rounds: [
        { prompt: 'Which planet is known as the red planet?', choices: ['Mars', 'Venus', 'Neptune'], answerIndex: 0 },
        { prompt: 'How many sides does a hexagon have?', choices: ['Five', 'Six', 'Seven'], answerIndex: 1 },
      ],
    });

    assert.equal(savedEvent?.gameMode, 'NATIVE_TRIVIA');
    assert.equal(savedEvent?.gameRounds.create.length, 2);
    assert.equal(savedEvent?.gameRounds.create[0].answerIndex, 0);
  });

  it('returns quiz options but never answer keys, and records one server-calculated score', async () => {
    const startsAt = new Date(Date.now() - 60_000);
    const rounds = [
      { id: 'round-1', position: 0, prompt: 'First question?', choices: ['Correct', 'Wrong'], answerIndex: 0 },
      { id: 'round-2', position: 1, prompt: 'Second question?', choices: ['Wrong', 'Correct'], answerIndex: 1 },
    ];
    let submission: unknown;
    const service = new CirclesService({
      circle: { findUnique: async () => ({ id: 'circle-1' }) },
      circleMember: { findUnique: async () => ({ id: 'member-1' }) },
      circleEvent: {
        findFirst: async () => ({
          id: 'quiz-1',
          title: 'Trivia night',
          startsAt,
          durationMinutes: 60,
          gameRounds: rounds,
          participants: [{ gameSubmission: null }],
        }),
      },
      circleEventGameSubmission: { findMany: async () => [] },
      $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
        circleEvent: { findFirst: async () => ({ id: 'quiz-1', startsAt, durationMinutes: 60, gameRounds: rounds }) },
        circleEventParticipant: { findUnique: async () => ({ gameSubmission: null }) },
        circleEventGameSubmission: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            submission = data;
            return { score: data.score, submittedAt: new Date() };
          },
        },
      }),
    } as any);

    const game = await service.getEventGame('user-1', 'game-lab', 'quiz-1');
    const result = await service.submitEventGame('user-1', 'game-lab', 'quiz-1', [0, 1]);

    assert.equal(game.canPlay, true);
    assert.deepEqual(game.rounds[0], { id: 'round-1', position: 0, prompt: 'First question?', choices: ['Correct', 'Wrong'] });
    assert.equal('answerIndex' in game.rounds[0], false);
    assert.deepEqual(result, { score: 2, totalRounds: 2, submittedAt: result.submittedAt });
    assert.equal((submission as { score: number }).score, 2);
  });

  it('registers a circle member once for an activity and enforces the activity capacity', async () => {
    let createArgs: unknown;
    const prisma = {
      circle: { findUnique: async () => ({ id: 'circle-1' }) },
      circleMember: { findUnique: async () => ({ id: 'member-1' }) },
      $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
        circleEvent: {
          findFirst: async () => ({
            id: 'event-1',
            capacity: 3,
            _count: { participants: 2 },
            participants: [],
          }),
        },
        circleEventParticipant: { upsert: async (args: unknown) => { createArgs = args; } },
      }),
    };
    const service = new CirclesService(prisma as any);

    const result = await service.joinEvent('user-1', 'game-lab', 'event-1');

    assert.deepEqual(result, { going: true, eventId: 'event-1' });
    assert.deepEqual(createArgs, {
      where: { eventId_userId: { eventId: 'event-1', userId: 'user-1' } },
      create: { eventId: 'event-1', userId: 'user-1' },
      update: {},
    });
  });

  it('rejects activity registration when a tournament is full', async () => {
    const service = new CirclesService({
      circle: { findUnique: async () => ({ id: 'circle-1' }) },
      circleMember: { findUnique: async () => ({ id: 'member-1' }) },
      $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
        circleEvent: {
          findFirst: async () => ({
            id: 'event-1',
            capacity: 2,
            _count: { participants: 2 },
            participants: [],
          }),
        },
        circleEventParticipant: { upsert: async () => { throw new Error('A full event cannot accept an RSVP'); } },
      }),
    } as any);

    await assert.rejects(
      () => service.joinEvent('user-1', 'game-lab', 'event-1'),
      BadRequestException,
    );
  });

  it('requires circle membership before joining a weekly prompt', async () => {
    const service = new CirclesService({
      circlePrompt: { findFirst: async () => ({ id: 'prompt-1', circleId: 'circle-1' }) },
      circleMember: { findUnique: async () => null },
    } as any);

    await assert.rejects(
      () => service.setPromptParticipation('user-1', 'tech', 'prompt-1', true),
      ForbiddenException,
    );
  });

  it('does not allow members to pin another member’s post', async () => {
    const service = new CirclesService({
      circle: { findUnique: async () => ({ id: 'circle-1' }) },
      circleMember: { findUnique: async () => ({ id: 'membership-1' }) },
      post: { findFirst: async () => null },
    } as any);

    await assert.rejects(() => service.pinPost('user-1', 'tech', 'post-1'), ForbiddenException);
  });

  it('creates a stable circle-specific prompt for the UTC week', () => {
    const first = buildWeeklyPrompt('circle-1', 'tech', new Date('2026-01-14T12:00:00.000Z'));
    const laterInWeek = buildWeeklyPrompt('circle-1', 'tech', new Date('2026-01-18T12:00:00.000Z'));

    assert.equal(first.slug, 'tech-2026-01-12');
    assert.equal(first.slug, laterInWeek.slug);
    assert.equal(first.endsAt.toISOString(), '2026-01-19T00:00:00.000Z');
  });
});
