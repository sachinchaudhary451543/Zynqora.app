export type CircleActivityKind = 'EVENT' | 'GAME' | 'TOURNAMENT' | 'ACTIVITY';
export type CircleActivityMode = 'ONLINE' | 'IN_PERSON' | 'HYBRID';

export interface CircleActivityIdea {
  templateId: string;
  kind: CircleActivityKind;
  title: string;
  description: string;
  durationMinutes: number;
  mode: CircleActivityMode;
  reason: string;
}

interface ActivityTemplate extends CircleActivityIdea {
  categories: string[];
  interests: string[];
}

const templates: ActivityTemplate[] = [
  { templateId: 'gaming-coop-quest', categories: ['gaming'], interests: ['gaming', 'games'], kind: 'GAME', title: 'Co-op quest night', description: 'Pick a cooperative game, choose roles together, and help new players get into the action. Add game rules or a join link before publishing.', durationMinutes: 90, mode: 'ONLINE', reason: 'Built for cooperative play.' },
  { templateId: 'gaming-community-cup', categories: ['gaming', 'sports'], interests: ['gaming', 'games', 'esports', 'sports'], kind: 'TOURNAMENT', title: 'Community cup', description: 'Run a friendly, beginner-welcome tournament. Share the game, rules, match format, and how winners will be decided.', durationMinutes: 120, mode: 'ONLINE', reason: 'A friendly competition for the circle.' },
  { templateId: 'gaming-game-lab', categories: ['gaming', 'inventors', 'creators'], interests: ['gaming', 'game design', 'creative'], kind: 'ACTIVITY', title: 'Build-a-game lab', description: 'Teams sketch a tiny game in 30 minutes, test another team’s idea, and share what they would improve.', durationMinutes: 60, mode: 'ONLINE', reason: 'Make something together, then try it.' },
  { templateId: 'students-study-sprint', categories: ['students', 'learning'], interests: ['study', 'learning', 'school', 'university'], kind: 'ACTIVITY', title: 'Study sprint', description: 'Choose one achievable goal, work quietly together for 25 minutes, then share a useful takeaway. Cameras stay optional.', durationMinutes: 45, mode: 'ONLINE', reason: 'A short, focused session with peers.' },
  { templateId: 'students-peer-teach', categories: ['students', 'learning'], interests: ['study', 'learning', 'school', 'university'], kind: 'EVENT', title: 'Teach one thing', description: 'Each volunteer explains one idea in five minutes, followed by friendly questions and shared notes.', durationMinutes: 60, mode: 'HYBRID', reason: 'Trade knowledge instead of just scrolling.' },
  { templateId: 'students-project-room', categories: ['students', 'creators', 'inventors'], interests: ['study', 'learning', 'projects', 'creative'], kind: 'ACTIVITY', title: 'Project coworking room', description: 'Bring a project you are already working on, set a small goal, and regroup to share progress or ask for feedback.', durationMinutes: 60, mode: 'ONLINE', reason: 'Work alongside people with similar goals.' },
  { templateId: 'inventors-idea-sprint', categories: ['inventors', 'creators'], interests: ['invention', 'engineering', 'design', 'creative'], kind: 'ACTIVITY', title: 'Everyday-problem sprint', description: 'Pick a real everyday problem, sketch three possible solutions, then give each other constructive feedback.', durationMinutes: 60, mode: 'HYBRID', reason: 'Turn curiosity into a small shared experiment.' },
  { templateId: 'inventors-open-build', categories: ['inventors', 'creators', 'gaming'], interests: ['invention', 'engineering', 'building', 'design'], kind: 'EVENT', title: 'Open build room', description: 'Bring a work-in-progress, choose one small improvement, and share what you learned at the end. Early drafts are welcome.', durationMinutes: 60, mode: 'ONLINE', reason: 'Make progress alongside other builders.' },
  { templateId: 'inventors-micro-challenge', categories: ['inventors', 'students', 'gaming'], interests: ['invention', 'engineering', 'design', 'problem solving'], kind: 'GAME', title: 'One-material challenge', description: 'Agree on a safe everyday material and a simple design prompt. Each person sketches a solution, then the group votes on the most surprising idea.', durationMinutes: 45, mode: 'ONLINE', reason: 'A playful design challenge anyone can join.' },
  { templateId: 'inventors-prototype-clinic', categories: ['inventors', 'gaming', 'creators'], interests: ['invention', 'engineering', 'design', 'building'], kind: 'EVENT', title: 'Prototype clinic', description: 'Show an early idea or prototype, explain where you are stuck, and ask the group for one practical next step.', durationMinutes: 60, mode: 'ONLINE', reason: 'A supportive place to learn by making.' },
  { templateId: 'couples-ritual-night', categories: ['couples', 'friends', 'community'], interests: ['relationships', 'wellness', 'family'], kind: 'ACTIVITY', title: 'Shared ritual night', description: 'Choose a light, optional shared activity such as cooking the same simple recipe, a couples quiz, or planning a weekend walk. Do not share sensitive personal details in a group.', durationMinutes: 60, mode: 'ONLINE', reason: 'A shared activity, not a dating match.' },
  { templateId: 'couples-team-challenge', categories: ['couples', 'friends', 'gaming'], interests: ['relationships', 'games', 'wellness'], kind: 'GAME', title: 'Partners-versus-the-puzzle', description: 'Pairs solve a cooperative riddle or puzzle together, then swap clues with another pair. Participation and sharing stay optional.', durationMinutes: 45, mode: 'ONLINE', reason: 'Connect through teamwork rather than profiles.' },
  { templateId: 'friends-trivia-room', categories: ['friends', 'entertainment', 'community'], interests: ['games', 'music', 'movies', 'trivia'], kind: 'GAME', title: 'Make-your-own trivia room', description: 'The host writes a few rounds about shared interests, music, films, or local knowledge. Let players skip questions they do not want to answer.', durationMinutes: 45, mode: 'ONLINE', reason: 'Easy to join and fun across different experience levels.' },
  { templateId: 'sports-friendly-bracket', categories: ['sports', 'gaming'], interests: ['sports', 'fitness', 'games'], kind: 'TOURNAMENT', title: 'Friendly round-robin', description: 'Set short matches, publish clear rules, and rotate opponents so everyone gets several chances to play.', durationMinutes: 90, mode: 'IN_PERSON', reason: 'More play for everyone, not just one final.' },
  { templateId: 'creators-kind-critique', categories: ['creators', 'blogging', 'vlogging', 'streaming'], interests: ['art', 'writing', 'video', 'music', 'design'], kind: 'ACTIVITY', title: 'Kind critique circle', description: 'Share one work-in-progress and ask for a specific kind of feedback. Use “what works / one idea” and pass whenever you like.', durationMinutes: 60, mode: 'ONLINE', reason: 'Create together with consent-led feedback.' },
  { templateId: 'creators-showcase', categories: ['creators', 'blogging', 'vlogging', 'streaming', 'entertainment'], interests: ['art', 'writing', 'video', 'music', 'design'], kind: 'EVENT', title: 'Small-work showcase', description: 'Bring one thing you made this week, tell its short story, and leave room for questions or collaboration offers.', durationMinutes: 60, mode: 'ONLINE', reason: 'Make room for every creator, not only polished work.' },
  { templateId: 'community-walkabout', categories: ['community', 'events', 'friends'], interests: ['community', 'local', 'wellness'], kind: 'EVENT', title: 'Local walk-and-talk', description: 'Choose an accessible public route, state the meeting point clearly, and let members bring a friend or join online for a virtual walk.', durationMinutes: 60, mode: 'HYBRID', reason: 'An easy, low-pressure way to meet as a group.' },
  { templateId: 'community-weekly-prompt', categories: ['community', 'entertainment', 'events'], interests: ['community', 'conversation'], kind: 'ACTIVITY', title: 'One-question conversation', description: 'Pick a light weekly question and invite members to share a story, a recommendation, or simply listen.', durationMinutes: 30, mode: 'ONLINE', reason: 'Start with conversation; nobody has to perform.' },
  { templateId: 'community-coop-challenge', categories: ['community', 'friends', 'learning', 'students', 'entertainment'], interests: [], kind: 'GAME', title: 'Co-op puzzle break', description: 'Choose a short, accessible puzzle or word game, solve it as a group, and let anyone join as a clue-giver or observer.', durationMinutes: 30, mode: 'ONLINE', reason: 'An easy shared game that does not need a leaderboard.' },
  { templateId: 'community-show-and-tell', categories: ['community', 'friends', 'learning', 'students', 'inventors'], interests: [], kind: 'EVENT', title: 'Show one small thing', description: 'Bring a useful discovery, idea, or thing you made. Sharing is optional; listening counts too.', durationMinutes: 45, mode: 'ONLINE', reason: 'A welcoming way to learn what members care about.' },
];

const fallbackTemplateIds = ['community-weekly-prompt', 'community-show-and-tell', 'community-coop-challenge'];

export function recommendCircleActivities(
  category: string,
  userInterests: string[],
  recentlyUsedTemplateIds: string[],
): CircleActivityIdea[] {
  const normalizedInterests = new Set(userInterests.map((interest) => interest.trim().toLowerCase()).filter(Boolean));
  const recentlyUsed = new Set(recentlyUsedTemplateIds);
  const matches = templates
    .filter((template) => template.categories.includes(category))
    .map((template) => {
      const interestMatches = template.interests.filter((interest) => normalizedInterests.has(interest)).length;
      const novelty = recentlyUsed.has(template.templateId) ? -8 : 4;
      return {
        template,
        score: (template.categories[0] === category ? 8 : template.categories.includes(category) ? 2 : 0)
          + Math.min(interestMatches, 3) * 2
          + novelty,
      };
    })
    .sort((left, right) => right.score - left.score || left.template.templateId.localeCompare(right.template.templateId));
  const freshMatches = matches.filter(({ template }) => !recentlyUsed.has(template.templateId));
  const available = (freshMatches.length ? freshMatches : matches).length
    ? (freshMatches.length ? freshMatches : matches)
    : fallbackTemplateIds.map((id) => ({
    template: templates.find((template) => template.templateId === id)!,
    score: recentlyUsed.has(id) ? -8 : 4,
  }));
  const pickedKinds = new Set<CircleActivityKind>();
  const ideas: CircleActivityIdea[] = [];
  for (const candidate of available) {
    if (pickedKinds.has(candidate.template.kind)) continue;
    pickedKinds.add(candidate.template.kind);
    ideas.push({
      templateId: candidate.template.templateId,
      kind: candidate.template.kind,
      title: candidate.template.title,
      description: candidate.template.description,
      durationMinutes: candidate.template.durationMinutes,
      mode: candidate.template.mode,
      reason: candidate.template.reason,
    });
    if (ideas.length === 3) break;
  }
  return ideas;
}
