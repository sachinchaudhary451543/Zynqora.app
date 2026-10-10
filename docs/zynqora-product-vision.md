# Zynqora Product Vision

Zynqora should feel like a polished, fast, welcoming social platform—not a prototype or a collection of disconnected screens.

## Product experience

- Bring social networking, entertainment, gaming, blogging, vlogging, live streaming, voice/video calling, chat, events, and online meetings into one coherent product.
- Make community creation open to users: people should be able to create a circle, set its identity and topic, and become its owner.
- Keep community discovery and circle membership based on real, user-created data. Never invent counts, content, or activity to make the product look busy.
- Design every page for mobile first, then scale up to tablet and desktop. Test real small-screen layouts rather than only checking that content technically fits.
- Use purposeful visual hierarchy, recognizable controls, strong empty states, and clear navigation. Avoid crowded dashboards, redundant action buttons, decorative emojis as product identity, and features that look interactive but do nothing.
- Use smooth, restrained 3D depth and motion where it improves context and feedback; respect reduced-motion preferences and keep interactions responsive on lower-powered phones.
- Make the product enjoyable through creative expression, useful communities, shared events, and user-controlled discovery—not coercive engagement or punitive streaks.
- Help people connect through opt-in, interest-based group activities—not attractiveness scores, unsolicited one-to-one pairing, or dating-style engagement.
- Let users control notification channels and participation; explain what is public and private.

## Current UI priorities

1. Circles Hub: clear discovery and joined-circle views, useful search/category filters, user-created circles, readable circle details, and mobile-friendly cards.
2. Turn each circle into a place to do something together: members can host game sessions, tournaments, events, and activities; circle-specific suggestions make it easier for members to get started.
3. Keep future social, creator, streaming, call, chat, event, and meeting features connected to consistent navigation and responsive design patterns.

## Circle activity recommendations

Activity suggestions are generated from reviewed, category-specific templates rather than invented content or opaque AI. The ranker gives weight to topic fit, exact matches against the signed-in member's saved interests, and a small freshness bonus; it avoids repeating templates used in the circle during the prior 30 days and returns varied activity types. Each suggestion explains why it fits. The next step after the current RSVP-based activity release is optional small-team formation with member consent, shared-interest matching, and a limit on repeated pairings.

The first release schedules hosted activities and game sessions, keeps RSVP rosters and capacity, supports creator-authored in-circle multiple-choice quizzes with one scored attempt, and accepts HTTPS links to external games. Tournament registration and format selection work; live bracket progression/scoring does not yet. Game-engine integrations, live brackets, moderation tools, and private/invite-only circles need separate design and safety work.

## Research notes and design guardrails

This is an evidence-informed product hypothesis, not a claim that a new social feature will improve wellbeing:

- Make a shared activity the way people meet. Research surveys multiple group-recommender approaches but does not establish a universally best algorithm. The first ranker is intentionally modest and explainable; future group formation should ask members to opt into the activity and use only explicit availability/accessibility/group-size preferences.
- Use autonomy, competence, and relatedness as game-design lenses; allow members to pass, pick a different activity, and control reminders. Measure reported comfort and useful participation rather than maximizing time-on-app.
- Keep safety structural: audience clarity, join/leave/block/report controls, host permissions, privacy-minimized profiles and transparent use of interests. Do not infer relationship status or score attractiveness/popularity.
- Treat lobbies, tournament styles, and recurring sessions as experiments; implementation examples from other platforms are patterns, not proof of success.

Sources:

- [Group recommender systems survey](https://doi.org/10.1007/s10844-018-0542-3) (group-preference aggregation approaches; no single best strategy established).
- [Ryan, Rigby & Przybylski: The Motivational Pull of Video Games](https://doi.org/10.1007/s11031-006-9051-8) (autonomy, competence, relatedness as motivation concepts).
- [Granic et al.: The Benefits of Playing Video Games](https://doi.org/10.1037/a0034857) (review; possible benefits, not a promise for this product).
- [Steamworks matchmaking](https://partner.steamgames.com/doc/features/multiplayer/matchmaking), [Discord Scheduled Events](https://support.discord.com/hc/en-us/articles/4409494125719-Scheduled-Events), and [Discord Activities](https://docs.discord.com/developers/activities/overview) (product implementation patterns, not independent efficacy evidence).
- [Apple App Review Guidelines: user-generated content](https://developer.apple.com/app-store/review/guidelines/#user-generated-content), [NIST Privacy Framework](https://www.nist.gov/privacy-framework), and [FTC: Bringing Dark Patterns to Light](https://www.ftc.gov/reports/bringing-dark-patterns-light) (safety, privacy-risk, and manipulative-design guidance).
- [Allcott et al.: The Welfare Effects of Social Media](https://doi.org/10.1257/aer.20190658) (deactivation experiment with trade-offs; cautions against equating use volume with benefit); [WHO: Gaming disorder](https://www.who.int/news-room/questions-and-answers/item/addictive-behaviours-gaming-disorder) (harm and impaired control matter, not frequency alone).

Pilot the join path (existing circle, opt-in lobby, host-led event) and track completion, self-reported comfort/fit/fairness, unwanted-contact reports, and voluntary return. These are early product signals, not proof of long-term wellbeing.
