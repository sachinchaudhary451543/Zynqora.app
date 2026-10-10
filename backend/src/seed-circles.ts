import { PrismaClient } from '@prisma/client';
import { buildWeeklyPrompt } from './circles/weekly-prompt';

const prisma = new PrismaClient();

const circles = [
  { slug: 'tech', name: 'Tech Innovators', category: 'learning', description: 'Build, share, and learn with curious technologists.' },
  { slug: 'family', name: 'Family Sanctuary', category: 'community', description: 'A quieter space for the people closest to you.' },
  { slug: 'creative', name: 'Creative Studio', category: 'creators', description: 'Ideas, visual experiments, and making things together.' },
  { slug: 'gaming', name: 'Gaming Hub', category: 'gaming', description: 'Find teammates, share wins, and stay in the loop.' },
  { slug: 'zen', name: 'Zen & Wellness', category: 'community', description: 'Small rituals and gentle accountability for your day.' },
];

async function main() {
  for (const circle of circles) {
    const savedCircle = await prisma.circle.upsert({
      where: { slug: circle.slug },
      create: { ...circle, icon: null },
      update: {
        name: circle.name,
        category: circle.category,
        description: circle.description,
      },
    });
    const prompt = buildWeeklyPrompt(savedCircle.id, circle.slug);
    await prisma.circlePrompt.upsert({ where: { slug: prompt.slug }, create: prompt, update: prompt });
  }
  console.log(`Ensured ${circles.length} community circles and this week's prompts without modifying memberships or user content.`);
}

main()
  .catch((error: unknown) => {
    console.error('Circle bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
