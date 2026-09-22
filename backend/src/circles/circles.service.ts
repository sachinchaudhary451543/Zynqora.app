import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CirclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const [circles, userCount] = await Promise.all([
      this.prisma.circle.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { members: true, posts: true } }, members: { where: { userId }, select: { id: true } } },
      }),
      this.prisma.user.count(),
    ]);
    return [{
      id: 'global',
      slug: 'all',
      name: 'Global Sync',
      description: 'A live stream of the wider Zynqora community.',
      icon: '🌍',
      memberCount: userCount,
      postCount: null as number | null,
      isMember: true,
    }, ...circles.map((circle) => ({
      id: circle.id,
      slug: circle.slug,
      name: circle.name,
      description: circle.description,
      icon: circle.icon,
      memberCount: circle._count.members,
      postCount: circle._count.posts,
      isMember: circle.members.length > 0,
    }))];
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
