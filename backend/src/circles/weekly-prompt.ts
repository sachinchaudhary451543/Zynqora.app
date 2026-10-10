const promptsByCircle: Record<string, Array<{ title: string; body: string; category: string }>> = {
  tech: [
    { title: 'Tiny tool, real impact', body: 'Share a small tool, shortcut, or workflow that made your week easier.', category: 'technology' },
    { title: 'Explain it simply', body: 'Pick one idea you learned recently and explain it in a way a curious beginner can enjoy.', category: 'learning' },
    { title: 'Build in public', body: 'Show a work in progress and one question you are still figuring out.', category: 'making' },
    { title: 'A thoughtful fix', body: 'Describe a small problem you would like to make less frustrating for people.', category: 'ideas' },
  ],
  creative: [
    { title: 'A different angle', body: 'Show the community something familiar from a fresh point of view.', category: 'creative' },
    { title: 'Made with care', body: 'Share a work in progress and one detail you are proud of.', category: 'making' },
    { title: 'One-color story', body: 'Create or share something using one color as your starting point.', category: 'art' },
    { title: 'Keep the rough edges', body: 'Share an imperfect first draft and what you might try next.', category: 'process' },
  ],
  gaming: [
    { title: 'A favorite moment', body: 'Share a memorable moment from a game without spoilers for others.', category: 'gaming' },
    { title: 'Player two', body: 'Recommend a welcoming co-op game or a tip for finding a good team.', category: 'community' },
    { title: 'A clever strategy', body: 'Share a strategy or lesson that changed how you play.', category: 'gaming' },
    { title: 'The perfect session', body: 'What makes a relaxed, fun gaming session for you?', category: 'conversation' },
  ],
  family: [
    { title: 'Small beginnings', body: 'Share one small thing you started, learned, or noticed this week.', category: 'reflection' },
    { title: 'A memory to keep', body: 'Share a small everyday moment you would like to remember.', category: 'connection' },
    { title: 'Pass it on', body: 'Share one useful tip, recipe, resource, or kind thought with the circle.', category: 'community' },
    { title: 'A little gratitude', body: 'Tell someone in your circle one small thing you appreciate about them.', category: 'connection' },
  ],
  zen: [
    { title: 'A gentle reset', body: 'Share one small, realistic way you made space to rest this week.', category: 'wellbeing' },
    { title: 'Notice the good', body: 'What is one ordinary thing that helped your day feel a little lighter?', category: 'reflection' },
    { title: 'A tiny ritual', body: 'Share a simple routine that helps you feel grounded, with no pressure to keep a streak.', category: 'wellbeing' },
    { title: 'Kind advice', body: 'What would you tell a friend who is having a busy week?', category: 'community' },
  ],
};

export function buildWeeklyPrompt(circleId: string, circleSlug: string, now = new Date()) {
  const weekStartsAt = new Date(now);
  weekStartsAt.setUTCHours(0, 0, 0, 0);
  weekStartsAt.setUTCDate(weekStartsAt.getUTCDate() - ((weekStartsAt.getUTCDay() + 6) % 7));
  const endsAt = new Date(weekStartsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);
  const options = promptsByCircle[circleSlug] ?? promptsByCircle.family;
  const weekNumber = Math.floor(weekStartsAt.getTime() / (7 * 24 * 60 * 60 * 1000));
  const prompt = options[((weekNumber % options.length) + options.length) % options.length];

  return {
    circleId,
    slug: `${circleSlug}-${weekStartsAt.toISOString().slice(0, 10)}`,
    ...prompt,
    weekStartsAt,
    endsAt,
  };
}
