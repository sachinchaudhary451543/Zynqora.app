import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'sarah@example.com',
        username: 'sarahsmith2026',
        name: 'Sarah Smith',
        passwordHash: await bcrypt.hash('SecurePass123', 10),
        bio: 'Love sharing family moments 📸',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      },
    }),
    prisma.user.create({
      data: {
        email: 'john@example.com',
        username: 'johndoe',
        name: 'John Doe',
        passwordHash: await bcrypt.hash('SecurePass123', 10),
        bio: 'Family man | Travel enthusiast 🌍',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      },
    }),
    prisma.user.create({
      data: {
        email: 'emma@example.com',
        username: 'emmajones',
        name: 'Emma Jones',
        passwordHash: await bcrypt.hash('SecurePass123', 10),
        bio: 'Chef | Foodie 🍕',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike@example.com',
        username: 'mikewilson',
        name: 'Mike Wilson',
        passwordHash: await bcrypt.hash('SecurePass123', 10),
        bio: 'Photographer | Nature lover 📷',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      },
    }),
    prisma.user.create({
      data: {
        email: 'lisa@example.com',
        username: 'lisabrown',
        name: 'Lisa Brown',
        passwordHash: await bcrypt.hash('SecurePass123', 10),
        bio: 'Artist | Designer 🎨',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create follows (Sarah follows everyone, John follows Emma and Mike, etc.)
  await prisma.follow.create({ data: { followerId: users[0].id, followingId: users[1].id } });
  await prisma.follow.create({ data: { followerId: users[0].id, followingId: users[2].id } });
  await prisma.follow.create({ data: { followerId: users[0].id, followingId: users[3].id } });
  await prisma.follow.create({ data: { followerId: users[0].id, followingId: users[4].id } });

  await prisma.follow.create({ data: { followerId: users[1].id, followingId: users[0].id } });
  await prisma.follow.create({ data: { followerId: users[1].id, followingId: users[2].id } });

  await prisma.follow.create({ data: { followerId: users[2].id, followingId: users[0].id } });
  await prisma.follow.create({ data: { followerId: users[2].id, followingId: users[3].id } });

  await prisma.follow.create({ data: { followerId: users[3].id, followingId: users[1].id } });
  await prisma.follow.create({ data: { followerId: users[4].id, followingId: users[0].id } });

  console.log('✅ Created follow relationships');

  // Create posts
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        authorId: users[1].id,
        content: '🎉 Just launched our new family app! So excited to share moments with everyone.',
        mediaUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
        mediaType: 'image',
        visibility: 'FOLLOWERS',
      },
    }),
    prisma.post.create({
      data: {
        authorId: users[2].id,
        content: 'Made homemade pizza for dinner tonight! 🍕 Recipe from nonna 👵',
        mediaUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&h=400&fit=crop',
        mediaType: 'image',
        visibility: 'FOLLOWERS',
      },
    }),
    prisma.post.create({
      data: {
        authorId: users[3].id,
        content: 'Beautiful sunset at the beach today. Nature is amazing! 🌅',
        mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
        mediaType: 'image',
        visibility: 'FOLLOWERS',
      },
    }),
    prisma.post.create({
      data: {
        authorId: users[4].id,
        content: 'Just finished this abstract piece! What do you think? 🎨',
        mediaUrl: 'https://images.unsplash.com/photo-1579783902614-e3fb5141b0cb?w=600&h=400&fit=crop',
        mediaType: 'image',
        visibility: 'FOLLOWERS',
      },
    }),
    prisma.post.create({
      data: {
        authorId: users[0].id,
        content: 'Family game night! Nothing beats quality time together 🎮❤️',
        visibility: 'FOLLOWERS',
      },
    }),
    prisma.post.create({
      data: {
        authorId: users[1].id,
        content: 'Weekend trip to the mountains with the family. Fresh air and good vibes! ⛰️',
        mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
        mediaType: 'image',
        visibility: 'FOLLOWERS',
      },
    }),
  ]);

  console.log(`✅ Created ${posts.length} posts`);

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
