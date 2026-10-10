import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCircleEventDto } from './dto/create-circle-event.dto';
import { CreateCircleDto } from './dto/create-circle.dto';
import { recommendCircleActivities } from './activity-recommender';
import { buildWeeklyPrompt } from './weekly-prompt';

@Injectable()
export class CirclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const [circles, userCount, user] = await Promise.all([
      this.prisma.circle.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { members: true, posts: true } },
          members: { where: { userId }, select: { id: true } },
        },
      }),
      this.prisma.user.count(),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { interests: true } }),
    ]);
    const circleSlugsByInterest: Record<string, string[]> = {
      tech: ['tech'],
      creative: ['creative'],
      gaming: ['gaming'],
      wellness: ['zen'],
      family: ['family'],
    };
    const recommendedSlugs = new Set(user.interests.flatMap((interest) => circleSlugsByInterest[interest.toLowerCase()] ?? []));
    return [
      {
        id: 'global',
        slug: 'all',
        name: 'Global Sync',
        description: 'A live stream of the wider Zynqora community.',
        icon: '🌍',
        memberCount: userCount,
        postCount: null,
        isMember: true,
        recommended: false,
      },
      ...circles.map((circle) => ({
        id: circle.id,
        slug: circle.slug,
        name: circle.name,
        category: circle.category,
        description: circle.description,
        icon: null,
        memberCount: circle._count.members,
        postCount: circle._count.posts,
        isMember: circle.members.length > 0,
        recommended: recommendedSlugs.has(circle.slug),
      })),
    ];
  }

  async create(userId: string, data: CreateCircleDto) {
    const name = data.name.trim();
    const slugBase = name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36);
    if (slugBase.length < 3) throw new BadRequestException('Circle name must contain at least three letters or numbers');

    let slug = slugBase;
    let suffix = 2;
    while (await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${slugBase.slice(0, 34)}-${suffix}`;
      suffix += 1;
    }

    const circle = await this.prisma.$transaction(async (tx) => {
      const created = await tx.circle.create({
        data: {
          name,
          slug,
          category: data.category,
          description: data.description.trim(),
        },
      });
      await tx.circleMember.create({
        data: { circleId: created.id, userId, role: 'OWNER' },
      });
      await tx.circlePrompt.create({ data: buildWeeklyPrompt(created.id, created.slug) });
      return created;
    });
    return {
      id: circle.id,
      slug: circle.slug,
      name: circle.name,
      category: circle.category,
      description: circle.description,
      icon: null,
      memberCount: 1,
      postCount: 0,
      isMember: true,
      recommended: false,
    };
  }

  async getDetails(userId: string, slug: string) {
    const circle = await this.prisma.circle.findUnique({
      where: { slug },
      include: {
        events: {
          where: { startsAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          orderBy: { startsAt: 'asc' },
          take: 20,
          include: {
            creator: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } },
            _count: { select: { participants: true, gameRounds: true } },
            gameRounds: { select: { id: true } },
            participants: {
              where: { user: { profileVisibility: 'PUBLIC' } },
              orderBy: { joinedAt: 'desc' },
              take: 6,
              include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
            },
          },
        },
        pinnedPosts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            post: { include: { author: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } }, _count: { select: { likes: true, comments: true } } } },
            pinnedBy: { select: { id: true, username: true, name: true } },
          },
        },
        prompts: {
          where: { weekStartsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
          orderBy: { weekStartsAt: 'desc' },
          take: 1,
          include: {
            _count: { select: { participants: true } },
            participants: { where: { userId }, select: { id: true } },
          },
        },
        members: {
          where: { user: { profileVisibility: 'PUBLIC' } },
          orderBy: { joinedAt: 'desc' },
          take: 12,
          include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true, category: true } } },
        },
        _count: { select: { members: true, posts: true } },
      },
    });
    if (!circle) throw new NotFoundException('Circle not found');
    if (circle.prompts.length === 0) {
      const weeklyPrompt = buildWeeklyPrompt(circle.id, circle.slug);
      await this.prisma.circlePrompt.upsert({
        where: { slug: weeklyPrompt.slug },
        create: weeklyPrompt,
        update: {
          title: weeklyPrompt.title,
          body: weeklyPrompt.body,
          category: weeklyPrompt.category,
          weekStartsAt: weeklyPrompt.weekStartsAt,
          endsAt: weeklyPrompt.endsAt,
        },
      });
      return this.getDetails(userId, slug);
    }
    const [membership, currentUser, recentTemplates, eventRsvps] = await Promise.all([
      this.prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId: circle.id, userId } },
        select: { id: true },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { interests: true } }),
      this.prisma.circleEvent.findMany({
        where: { circleId: circle.id, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, templateId: { not: null } },
        select: { templateId: true },
      }),
      circle.events.length
        ? this.prisma.circleEventParticipant.findMany({
          where: { userId, eventId: { in: circle.events.map(({ id }) => id) } },
          select: { eventId: true },
        })
        : Promise.resolve([]),
    ]);
    const eventRsvpIds = new Set(eventRsvps.map(({ eventId }) => eventId));

    return {
      id: circle.id,
      slug: circle.slug,
      name: circle.name,
      category: circle.category,
      description: circle.description,
      icon: circle.icon,
      memberCount: circle._count.members,
      postCount: circle._count.posts,
      isMember: Boolean(membership),
      members: circle.members.map(({ user: member }) => member),
      events: circle.events.map(({ _count, participants, ...event }) => ({
        ...event,
        participantCount: _count.participants,
        gameRoundCount: _count.gameRounds,
        status: event.startsAt > new Date()
          ? 'UPCOMING'
          : event.startsAt.getTime() + (event.durationMinutes ?? 60) * 60 * 1000 >= Date.now()
            ? 'LIVE'
            : 'ENDED',
        isGoing: eventRsvpIds.has(event.id),
        attendees: participants.map(({ user: attendee }) => attendee),
      })),
      activityIdeas: recommendCircleActivities(
        circle.category,
        currentUser.interests,
        recentTemplates.flatMap(({ templateId }) => templateId ? [templateId] : []),
      ),
      pinnedPosts: circle.pinnedPosts,
      prompt: circle.prompts[0] ? {
        ...circle.prompts[0],
        participantCount: circle.prompts[0]._count.participants,
        isParticipating: circle.prompts[0].participants.length > 0,
        participants: undefined,
        _count: undefined,
      } : null,
    };
  }

  async createEvent(userId: string, slug: string, data: CreateCircleEventDto) {
    const circle = await this.prisma.circle.findUnique({ where: { slug }, select: { id: true, name: true, category: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    const membership = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Join this circle to create an event');
    const startsAt = new Date(data.startsAt);
    if (startsAt <= new Date()) throw new BadRequestException('Event must start in the future');
    const kind = data.kind ?? 'EVENT';
    if ((kind === 'GAME' || kind === 'TOURNAMENT') && (data.description?.trim().length ?? 0) < 12) {
      throw new BadRequestException('Add at least 12 characters of game rules or tournament details');
    }
    if (kind === 'TOURNAMENT' && data.tournamentFormat && !['SINGLE_ELIMINATION', 'ROUND_ROBIN'].includes(data.tournamentFormat)) {
      throw new BadRequestException('Choose a supported tournament format');
    }
    if (kind !== 'TOURNAMENT' && data.tournamentFormat) {
      throw new BadRequestException('Tournament format is only available for tournaments');
    }
    const gameMode = kind === 'GAME' ? data.gameMode ?? 'EXTERNAL' : 'EXTERNAL';
    if (kind !== 'GAME' && (data.gameMode || data.rounds?.length)) {
      throw new BadRequestException('Game rules can only be added to a game session');
    }
    if (gameMode === 'NATIVE_TRIVIA') {
      if (!data.rounds || data.rounds.length < 2) {
        throw new BadRequestException('An in-circle quiz needs at least two rounds');
      }
      if (data.rounds.some((round) => {
        const choices = round.choices.map((choice) => choice.trim());
        return round.prompt.trim().length < 5
          || choices.some((choice) => !choice)
          || new Set(choices).size !== choices.length
          || round.answerIndex >= choices.length;
      })) {
        throw new BadRequestException('Choose a correct answer from each round’s options');
      }
    } else if (data.rounds?.length) {
      throw new BadRequestException('Game rounds are only available for an in-circle quiz');
    }

    const event = await this.prisma.circleEvent.create({
      data: {
        circleId: circle.id,
        creatorId: userId,
        kind,
        mode: data.mode ?? 'IN_PERSON',
        gameMode,
        templateId: data.templateId ?? null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        startsAt,
        location: data.location?.trim() || null,
        gameUrl: data.gameUrl ?? null,
        capacity: data.capacity ?? null,
        durationMinutes: data.durationMinutes ?? null,
        tournamentFormat: kind === 'TOURNAMENT' ? data.tournamentFormat ?? 'SINGLE_ELIMINATION' : null,
        participants: { create: { userId } },
        gameRounds: gameMode === 'NATIVE_TRIVIA'
          ? { create: data.rounds?.map((round, position) => ({ position, prompt: round.prompt.trim(), choices: round.choices.map((choice) => choice.trim()), answerIndex: round.answerIndex })) }
          : undefined,
      },
      include: { creator: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } } },
    });
    const recipients = await this.prisma.circleMember.findMany({
      where: { circleId: circle.id, userId: { not: userId }, user: { notifyCircleActivity: true } },
      select: { userId: true },
    });
    if (recipients.length) {
      await this.prisma.notification.createMany({
        data: recipients.map(({ userId: recipientId }) => ({
          recipientId,
          actorId: userId,
          type: 'CIRCLE_EVENT',
          message: `A new ${kind.toLowerCase()} was added to ${circle.name}: ${event.title}.`,
        })),
      });
    }
    return event;
  }

  async joinEvent(userId: string, slug: string, eventId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    const membership = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Join this circle to take part');

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.circleEvent.findFirst({
        where: { id: eventId, circleId: circle.id, startsAt: { gt: new Date() } },
        select: {
          id: true,
          capacity: true,
          _count: { select: { participants: true } },
          participants: { where: { userId }, select: { id: true } },
        },
      });
      if (!event) throw new NotFoundException('Upcoming circle activity not found');
      if (!event.participants.length && event.capacity && event._count.participants >= event.capacity) {
        throw new BadRequestException('This activity is full');
      }
      await tx.circleEventParticipant.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: { eventId, userId },
        update: {},
      });
      return { going: true, eventId };
    }, { isolationLevel: 'Serializable' });
  }

  async leaveEvent(userId: string, slug: string, eventId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    const event = await this.prisma.circleEvent.findFirst({
      where: { id: eventId, circleId: circle.id },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Circle activity not found');
    await this.prisma.circleEventParticipant.deleteMany({ where: { eventId, userId } });
    return { going: false, eventId };
  }

  async getEventGame(userId: string, slug: string, eventId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    const membership = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Join this circle to play its games');
    const event = await this.prisma.circleEvent.findFirst({
      where: { id: eventId, circleId: circle.id, kind: 'GAME', gameMode: 'NATIVE_TRIVIA' },
      include: {
        gameRounds: { orderBy: { position: 'asc' } },
        participants: {
          where: { userId },
          include: { gameSubmission: { select: { score: true, submittedAt: true } } },
        },
      },
    });
    if (!event) throw new NotFoundException('In-circle quiz not found');
    const player = event.participants[0];
    if (!player) throw new ForbiddenException('Join the activity before playing');
    const now = new Date();
    const closesAt = new Date(event.startsAt.getTime() + (event.durationMinutes ?? 60) * 60 * 1000);
    const gameRounds = event.gameRounds.map((round) => ({
      id: round.id,
      position: round.position,
      prompt: round.prompt,
      choices: Array.isArray(round.choices)
        ? round.choices.filter((choice): choice is string => typeof choice === 'string')
        : [],
    }));
    const leaderboard = await this.prisma.circleEventGameSubmission.findMany({
      where: { eventId },
      orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
      take: 10,
      include: { participant: { include: { user: { select: { id: true, username: true, name: true, profileVisibility: true } } } } },
    });
    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      closesAt,
      canPlay: now >= event.startsAt && now <= closesAt,
      rounds: gameRounds,
      score: player.gameSubmission?.score ?? null,
      leaderboard: leaderboard.map(({ score, participant }) => ({
        score,
        username: participant.user.profileVisibility === 'PUBLIC' || participant.user.id === userId
          ? participant.user.username
          : null,
        name: participant.user.profileVisibility === 'PUBLIC' || participant.user.id === userId
          ? participant.user.name
          : 'Circle member',
      })),
    };
  }

  async submitEventGame(userId: string, slug: string, eventId: string, answers: number[]) {
    const circle = await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    const membership = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Join this circle to play its games');

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.circleEvent.findFirst({
        where: { id: eventId, circleId: circle.id, kind: 'GAME', gameMode: 'NATIVE_TRIVIA' },
        include: { gameRounds: { orderBy: { position: 'asc' } } },
      });
      if (!event) throw new NotFoundException('In-circle quiz not found');
      const participant = await tx.circleEventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId } },
        include: { gameSubmission: { select: { id: true } } },
      });
      if (!participant) throw new ForbiddenException('Join the activity before playing');
      if (participant.gameSubmission) throw new BadRequestException('You have already submitted this quiz');
      const now = new Date();
      const closesAt = new Date(event.startsAt.getTime() + (event.durationMinutes ?? 60) * 60 * 1000);
      if (now < event.startsAt) throw new BadRequestException('This quiz opens at its scheduled start time');
      if (now > closesAt) throw new BadRequestException('This quiz has closed');
      if (answers.length !== event.gameRounds.length) {
        throw new BadRequestException('Answer every quiz round before submitting');
      }
      if (event.gameRounds.some((round, index) => {
        const choices = Array.isArray(round.choices) ? round.choices : [];
        return answers[index] < 0 || answers[index] >= choices.length;
      })) {
        throw new BadRequestException('Choose a valid option for every round');
      }
      const score = event.gameRounds.reduce((total, round, index) => total + Number(answers[index] === round.answerIndex), 0);
      const submission = await tx.circleEventGameSubmission.create({
        data: { eventId, userId, score },
        select: { score: true, submittedAt: true },
      });
      return { score: submission.score, totalRounds: event.gameRounds.length, submittedAt: submission.submittedAt };
    }, { isolationLevel: 'Serializable' });
  }

  async pinPost(userId: string, slug: string, postId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    const membership = await this.prisma.circleMember.findUnique({ where: { circleId_userId: { circleId: circle.id, userId } }, select: { id: true } });
    if (!membership) throw new ForbiddenException('Join this circle to pin your post');
    const post = await this.prisma.post.findFirst({ where: { id: postId, circleId: circle.id, authorId: userId }, select: { id: true } });
    if (!post) throw new ForbiddenException('You can only pin your own post from this circle');
    return this.prisma.circlePinnedPost.upsert({
      where: { circleId_postId: { circleId: circle.id, postId } },
      create: { circleId: circle.id, postId, pinnedById: userId },
      update: {},
    });
  }

  async unpinPost(userId: string, slug: string, postId: string) {
    const circle = await this.prisma.circle.findUnique({ where: { slug }, select: { id: true } });
    if (!circle) throw new NotFoundException('Circle not found');
    const pin = await this.prisma.circlePinnedPost.findUnique({
      where: { circleId_postId: { circleId: circle.id, postId } },
      include: { post: { select: { authorId: true } } },
    });
    if (!pin) throw new NotFoundException('Pinned post not found');
    if (pin.pinnedById !== userId && pin.post.authorId !== userId) {
      throw new ForbiddenException('Only the member who pinned this post or its author can unpin it');
    }
    await this.prisma.circlePinnedPost.delete({ where: { circleId_postId: { circleId: circle.id, postId } } });
    return { unpinned: true };
  }

  async setPromptParticipation(userId: string, slug: string, promptId: string, joined: boolean) {
    const prompt = await this.prisma.circlePrompt.findFirst({
      where: { id: promptId, circle: { slug }, endsAt: { gt: new Date() } },
      select: { id: true, circleId: true },
    });
    if (!prompt) throw new NotFoundException('This weekly prompt is no longer active');
    const membership = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: prompt.circleId, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Join this circle to take part in its weekly prompt');
    if (joined) {
      await this.prisma.circlePromptParticipant.upsert({
        where: { promptId_userId: { promptId, userId } },
        create: { promptId, userId },
        update: {},
      });
    } else {
      await this.prisma.circlePromptParticipant.deleteMany({ where: { promptId, userId } });
    }
    return { participating: joined };
  }

  async join(userId: string, slug: string) {
    const circle = await this.prisma.circle.findUnique({ where: { slug } });
    if (!circle) throw new NotFoundException('Circle not found');
    await this.prisma.circleMember.upsert({
      where: { circleId_userId: { circleId: circle.id, userId } },
      create: { circleId: circle.id, userId },
      update: {},
    });
    return { joined: true, slug: circle.slug };
  }

  async leave(userId: string, slug: string) {
    const circle = await this.prisma.circle.findUnique({ where: { slug } });
    if (!circle) throw new NotFoundException('Circle not found');
    await this.prisma.circleMember.deleteMany({ where: { circleId: circle.id, userId } });
    return { joined: false, slug: circle.slug };
  }
}
