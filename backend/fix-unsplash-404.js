const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updatedPosts = await prisma.post.updateMany({
    where: { mediaUrl: { contains: 'photo-1579783902614-e3fb5141b0cb' } },
    data: { mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop' }
  });
  console.log('Updated posts in DB:', updatedPosts.count);

  const updatedStories = await prisma.story.updateMany({
    where: { videoUrl: { contains: 'photo-1579783902614-e3fb5141b0cb' } },
    data: { videoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&fit=crop' }
  });
  console.log('Updated stories in DB:', updatedStories.count);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
