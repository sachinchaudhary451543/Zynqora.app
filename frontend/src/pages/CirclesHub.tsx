import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, getAvatarUrl } from '../api/client';
import type { CircleActivityIdea, CircleEventGame } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COMMUNITY_CIRCLES_CHANGED, CommunityCircle } from '../data/communityCircles';

const circleCategories = [
  { id: 'all', label: 'All topics' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'creators', label: 'Creators' },
  { id: 'blogging', label: 'Blogging' },
  { id: 'vlogging', label: 'Vlogging' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'events', label: 'Events' },
  { id: 'learning', label: 'Learning' },
  { id: 'students', label: 'Students' },
  { id: 'inventors', label: 'Inventors' },
  { id: 'couples', label: 'Couples' },
  { id: 'friends', label: 'Friends' },
  { id: 'sports', label: 'Sports' },
  { id: 'community', label: 'Community' },
];

type CircleDetailTab = 'overview' | 'events' | 'members' | 'highlights';
type CircleGameMode = 'EXTERNAL' | 'NATIVE_TRIVIA';

const emptyGameRounds = () => [
  { prompt: '', choices: ['', '', ''], answerIndex: 0 },
  { prompt: '', choices: ['', '', ''], answerIndex: 0 },
];

export default function CirclesHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [circles, setCircles] = useState<CommunityCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getCircle>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [circlePosts, setCirclePosts] = useState<Awaited<ReturnType<typeof api.getFeed>>['posts']>([]);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventKind, setEventKind] = useState<CircleActivityIdea['kind']>('EVENT');
  const [eventMode, setEventMode] = useState<CircleActivityIdea['mode']>('IN_PERSON');
  const [gameMode, setGameMode] = useState<CircleGameMode>('EXTERNAL');
  const [gameRounds, setGameRounds] = useState(emptyGameRounds);
  const [eventGameUrl, setEventGameUrl] = useState('');
  const [eventCapacity, setEventCapacity] = useState('');
  const [eventDuration, setEventDuration] = useState('60');
  const [tournamentFormat, setTournamentFormat] = useState<'SINGLE_ELIMINATION' | 'ROUND_ROBIN'>('SINGLE_ELIMINATION');
  const [eventTemplateId, setEventTemplateId] = useState<string | undefined>();
  const [activeGame, setActiveGame] = useState<CircleEventGame | null>(null);
  const [gameAnswers, setGameAnswers] = useState<number[]>([]);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameSubmitting, setGameSubmitting] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [view, setView] = useState<'discover' | 'joined' | 'recommended'>('discover');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [circleCategory, setCircleCategory] = useState('community');
  const [detailTab, setDetailTab] = useState<CircleDetailTab>('overview');

  const loadCircles = useCallback(async () => {
    setError('');
    try {
      setCircles(await api.getCircles());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load community circles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCircles();
  }, [loadCircles]);

  const loadCircleDetail = useCallback(async (slug: string) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const data = await api.getCircle(slug);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not load this circle.');
    } finally {
      setDetailLoading(false);
    }
  }, [user?.username]);

  const toggleMembership = async (circle: CommunityCircle) => {
    setBusySlug(circle.slug);
    setError('');
    setActionMessage('');
    try {
      if (circle.isMember) await api.leaveCircle(circle.slug);
      else await api.joinCircle(circle.slug);
      await loadCircles();
      await loadCircleDetail(circle.slug);
      setActionMessage(circle.isMember ? `Left ${circle.name}.` : `Joined ${circle.name}.`);
      window.dispatchEvent(new Event(COMMUNITY_CIRCLES_CHANGED));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update circle membership.');
    } finally {
      setBusySlug(null);
    }
  };

  const visibleCircles = circles.filter((circle) => circle.slug !== 'all');
  const selectedCircle = visibleCircles.find((circle) => circle.slug === searchParams.get('circle'));

  useEffect(() => {
    if (selectedCircle) void loadCircleDetail(selectedCircle.slug);
    else {
      setDetail(null);
      setCirclePosts([]);
    }
  }, [loadCircleDetail, selectedCircle?.slug]);

  useEffect(() => {
    if (!selectedCircle || detailTab !== 'highlights' || !detail?.isMember) return;
    let cancelled = false;
    api.getFeed(undefined, selectedCircle.slug)
      .then((feed) => {
        if (!cancelled) setCirclePosts(feed.posts.filter((post) => post.author.username === user?.username));
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : 'Could not load your circle posts.');
      });
    return () => { cancelled = true; };
  }, [detail?.isMember, detailTab, selectedCircle?.slug, user?.username]);

  const showCircleDetails = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (!slug || slug === 'all') next.delete('circle');
    else next.set('circle', slug);
    setSearchParams(next);
  };

  const refreshCircleDetail = async () => {
    if (selectedCircle) await loadCircleDetail(selectedCircle.slug);
  };

  const submitEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCircle || !eventStartsAt) return;
    setEventSaving(true);
    setDetailError('');
    try {
      await api.createCircleEvent(selectedCircle.slug, {
        kind: eventKind,
        mode: eventMode,
        gameMode: eventKind === 'GAME' ? gameMode : undefined,
        title: eventTitle,
        description: eventDescription || undefined,
        startsAt: new Date(eventStartsAt).toISOString(),
        location: eventLocation || undefined,
        gameUrl: eventKind === 'TOURNAMENT' || eventKind === 'GAME' && gameMode === 'EXTERNAL'
          ? eventGameUrl.trim() || undefined
          : undefined,
        capacity: eventCapacity ? Number(eventCapacity) : undefined,
        durationMinutes: eventDuration ? Number(eventDuration) : undefined,
        tournamentFormat: eventKind === 'TOURNAMENT' ? tournamentFormat : undefined,
        templateId: eventTemplateId,
        rounds: eventKind === 'GAME' && gameMode === 'NATIVE_TRIVIA'
          ? gameRounds.map((round) => ({ ...round, prompt: round.prompt.trim(), choices: round.choices.map((choice) => choice.trim()) }))
          : undefined,
      });
      setEventTitle('');
      setEventDescription('');
      setEventStartsAt('');
      setEventLocation('');
      setEventKind('EVENT');
      setEventMode('IN_PERSON');
      setGameMode('EXTERNAL');
      setGameRounds(emptyGameRounds());
      setEventGameUrl('');
      setEventCapacity('');
      setEventDuration('60');
      setEventTemplateId(undefined);
      setEventFormOpen(false);
      setActionMessage('Your circle event is live. Members who opted in will see an activity notification.');
      await refreshCircleDetail();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not create the circle event.');
    } finally {
      setEventSaving(false);
    }
  };

  const startFromIdea = (idea: CircleActivityIdea) => {
    setEventKind(idea.kind);
    setEventMode(idea.mode);
    setEventTitle(idea.title);
    setEventDescription(idea.description);
    setEventDuration(String(idea.durationMinutes));
    setEventTemplateId(idea.templateId);
    setGameMode('EXTERNAL');
    setGameRounds(emptyGameRounds());
    setTournamentFormat('SINGLE_ELIMINATION');
    setEventFormOpen(true);
    setDetailTab('events');
  };

  const openCircleGame = async (eventId: string) => {
    if (!selectedCircle) return;
    setGameLoading(true);
    setDetailError('');
    try {
      const game = await api.getCircleEventGame(selectedCircle.slug, eventId);
      setActiveGame(game);
      setGameAnswers(game.rounds.map(() => -1));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not open this circle game.');
    } finally {
      setGameLoading(false);
    }
  };

  const submitCircleGame = async () => {
    if (!selectedCircle || !activeGame) return;
    setGameSubmitting(true);
    setDetailError('');
    try {
      await api.submitCircleEventGame(selectedCircle.slug, activeGame.id, gameAnswers);
      setActiveGame(await api.getCircleEventGame(selectedCircle.slug, activeGame.id));
      setActionMessage('Quiz submitted. Your score is on the circle leaderboard.');
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not submit this quiz.');
    } finally {
      setGameSubmitting(false);
    }
  };

  const toggleEventRsvp = async (eventId: string, isGoing: boolean) => {
    if (!selectedCircle) return;
    setDetailError('');
    try {
      if (isGoing) await api.leaveCircleEvent(selectedCircle.slug, eventId);
      else await api.joinCircleEvent(selectedCircle.slug, eventId);
      await refreshCircleDetail();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not update your activity RSVP.');
    }
  };

  const togglePrompt = async () => {
    if (!selectedCircle || !detail?.prompt) return;
    setDetailError('');
    try {
      await api.setPromptParticipation(selectedCircle.slug, detail.prompt.id, !detail.prompt.isParticipating);
      await refreshCircleDetail();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not update prompt participation.');
    }
  };

  const togglePinnedPost = async (postId: string, isPinned: boolean) => {
    if (!selectedCircle) return;
    setDetailError('');
    try {
      if (isPinned) await api.unpinCirclePost(selectedCircle.slug, postId);
      else await api.pinCirclePost(selectedCircle.slug, postId);
      await refreshCircleDetail();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not update the pinned post.');
    }
  };

  const createCircle = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateSaving(true);
    setError('');
    try {
      const created = await api.createCircle({
        name: circleName,
        category: circleCategory,
        description: circleDescription,
      });
      setCircleName('');
      setCircleDescription('');
      setCircleCategory('community');
      setCreateOpen(false);
      await loadCircles();
      window.dispatchEvent(new Event(COMMUNITY_CIRCLES_CHANGED));
      showCircleDetails(created.slug);
      setActionMessage(`${created.name} is ready. You’re its owner.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your circle.');
    } finally {
      setCreateSaving(false);
    }
  };

  const filteredCircles = visibleCircles.filter((circle) => {
    const matchesView = view === 'joined' ? circle.isMember : view === 'recommended' ? circle.recommended : true;
    const matchesCategory = categoryFilter === 'all' || circle.category === categoryFilter;
    const matchesSearch = `${circle.name} ${circle.description ?? ''} ${circle.category ?? ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesView && matchesCategory && matchesSearch;
  });

  return (
    <div className="zq-circles-page">
      {!selectedCircle && (
        <header className="zq-circles-hero">
          <div>
            <span className="zq-circles-eyebrow">COMMUNITIES FOR EVERY SIDE OF YOU</span>
            <h1>Find your people.</h1>
            <p>Join conversations, share what you love, and build a community of your own.</p>
          </div>
          <button type="button" className="zq-create-circle-button" onClick={() => setCreateOpen(true)}>
            <span aria-hidden="true">+</span> Create a circle
          </button>
        </header>
      )}

      {error && <p role="alert" className="zq-circle-error">{error}</p>}
      {actionMessage && <p role="status" className="zq-circle-status">{actionMessage}</p>}
      {loading && <p role="status" className="zq-circle-status">Loading circles…</p>}
      {!selectedCircle && !loading && !error && visibleCircles.length === 0 && <p className="zq-circle-status">No circles yet. Create the first one for your community.</p>}
      {!selectedCircle && (
        <section className="zq-circle-discovery" aria-label="Discover circles">
          <div className="zq-circle-discovery-toolbar">
            <div className="zq-circle-view-tabs" role="tablist" aria-label="Circle lists">
              {([
                ['discover', 'Discover'],
                ['joined', 'Your circles'],
                ['recommended', 'For you'],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="zq-circle-search">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
              <input aria-label="Search circles" placeholder="Search communities" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>
          <div className="zq-circle-category-filters" aria-label="Filter by topic">
            {circleCategories.map((category) => (
              <button key={category.id} type="button" aria-pressed={categoryFilter === category.id} className={categoryFilter === category.id ? 'active' : ''} onClick={() => setCategoryFilter(category.id)}>
                {category.label}
              </button>
            ))}
          </div>
          <div className="zq-circle-grid-heading">
            <div>
              <h2>{view === 'joined' ? 'Your circles' : view === 'recommended' ? 'Picked for you' : 'Explore communities'}</h2>
              <span>{filteredCircles.length} {filteredCircles.length === 1 ? 'community' : 'communities'}</span>
            </div>
          </div>
          {!loading && !filteredCircles.length && (
            <div className="zq-circle-empty-state">
              <span className="zq-circle-empty-mark" aria-hidden="true">C</span>
              <h3>{view === 'joined' ? 'Your circle list is open' : view === 'recommended' ? 'More recommendations soon' : 'No matches found'}</h3>
              <p>{view === 'joined' ? 'Join a community that interests you, or create one for your people.' : 'Try another topic or search, or start the community you want to find.'}</p>
              {view !== 'joined' && <button type="button" className="zq-btn-glass" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>Clear filters</button>}
            </div>
          )}
          <div className="zq-circle-discovery-grid">
            {filteredCircles.map((circle) => (
              <article key={circle.id} className="zq-circle-discovery-card">
                <div className={`zq-circle-card-cover zq-circle-cover-${circle.category || 'community'}`}>
                  <span className="zq-circle-card-monogram" aria-hidden="true">{circle.name.slice(0, 1).toUpperCase()}</span>
                  {circle.recommended && <span className="zq-circle-card-match">FOR YOU</span>}
                  {circle.isMember && <span className="zq-circle-card-member">MEMBER</span>}
                </div>
                <div className="zq-circle-card-body">
                  <span className="zq-circle-card-category">{circleCategories.find((item) => item.id === circle.category)?.label || 'Community'}</span>
                  <h3>{circle.name}</h3>
                  <p>{circle.description || 'A place to connect around shared interests.'}</p>
                  <div className="zq-circle-card-footer">
                    <span>{circle.memberCount.toLocaleString()} {circle.memberCount === 1 ? 'member' : 'members'}</span>
                    <div className="zq-circle-card-actions">
                      <button type="button" className="zq-btn-glass" onClick={() => showCircleDetails(circle.slug)}>Explore</button>
                      {!circle.isMember && (
                        <button type="button" className="zq-create-circle-button" disabled={busySlug === circle.slug} onClick={() => void toggleMembership(circle)}>
                          {busySlug === circle.slug ? 'Joining…' : 'Join'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {selectedCircle && (
        <section className="zq-circle-detail" aria-labelledby="zq-circle-detail-title">
          <div className="zq-circle-detail-heading">
            <span className={`zq-circle-detail-icon zq-circle-cover-${selectedCircle.category || 'community'}`} aria-hidden="true">{selectedCircle.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <span className="zq-circle-detail-eyebrow">CIRCLE OVERVIEW</span>
              <h2 id="zq-circle-detail-title">{selectedCircle.name}</h2>
            </div>
            <button type="button" className="zq-btn-glass zq-circle-detail-close" onClick={() => showCircleDetails('')} aria-label="Close circle details">
              Close
            </button>
          </div>
          <p className="zq-circle-detail-description">{selectedCircle.description || 'A shared community space.'}</p>
          {selectedCircle.recommended && <p className="zq-circle-recommended-note">Picked for your interests. You can change them any time in Settings.</p>}
          <div className="zq-circle-detail-stats">
            <div><strong>{selectedCircle.memberCount.toLocaleString()}</strong><span>{selectedCircle.memberCount === 1 ? 'member' : 'members'}</span></div>
            <div><strong>{selectedCircle.postCount?.toLocaleString() ?? 0}</strong><span>{selectedCircle.postCount === 1 ? 'post' : 'posts'}</span></div>
            <div><strong>{selectedCircle.isMember ? 'Joined' : 'Open'}</strong><span>{selectedCircle.isMember ? 'you are a member' : 'community circle'}</span></div>
          </div>
          {detailLoading && <p role="status" className="zq-circle-status">Loading circle space…</p>}
          {detailError && <p role="alert" className="zq-circle-error">{detailError}</p>}
          {!detailLoading && detail && (
            <div className="zq-circle-extras">
              <nav className="zq-circle-detail-tabs" aria-label="Circle sections">
                {([
                  ['overview', 'Overview'],
                  ['events', 'Events'],
                  ['members', 'Members'],
                  ['highlights', 'Highlights'],
                ] as const).map(([id, label]) => (
                  <button key={id} type="button" aria-current={detailTab === id ? 'page' : undefined} className={detailTab === id ? 'active' : ''} onClick={() => setDetailTab(id)}>
                    {label}
                  </button>
                ))}
              </nav>
              {detailTab === 'overview' && detail.prompt && (
                <section className="zq-circle-feature">
                  <div className="zq-circle-feature-heading"><h3>Weekly prompt</h3><span>{detail.prompt.participantCount} taking part</span></div>
                  <strong>{detail.prompt.title}</strong>
                  <p>{detail.prompt.body}</p>
                  <small>Closes {new Date(detail.prompt.endsAt).toLocaleDateString()}</small>
                  <button type="button" className={detail.prompt.isParticipating ? 'zq-btn-glass' : 'zq-btn-aura'} disabled={!detail.isMember} onClick={() => void togglePrompt()}>
                    {!detail.isMember ? 'Join the circle to take part' : detail.prompt.isParticipating ? 'Leave prompt' : 'I’m in'}
                  </button>
                </section>
              )}

              {detailTab === 'overview' && (
                <section className="zq-circle-feature zq-circle-activity-ideas">
                  <div className="zq-circle-feature-heading">
                    <h3>Try something together</h3>
                    <span>Fresh ideas for this circle</span>
                  </div>
                  <p className="zq-circle-ideas-note">Suggested from this circle’s topic, your interests, and recent activities. Nobody is ranked or matched romantically.</p>
                  <div className="zq-circle-idea-list">
                    {detail.activityIdeas.map((idea) => (
                      <article className="zq-circle-idea-card" key={idea.templateId}>
                        <div>
                          <span className="zq-circle-idea-kind">{idea.kind === 'GAME' ? 'GAME SESSION' : idea.kind === 'TOURNAMENT' ? 'TOURNAMENT' : idea.kind}</span>
                          <h4>{idea.title}</h4>
                          <p>{idea.description}</p>
                          <small>{idea.reason} · {idea.durationMinutes} min · {idea.mode.toLowerCase().replace('_', ' ')}</small>
                        </div>
                        <button type="button" className="zq-btn-glass" disabled={!detail.isMember} title={!detail.isMember ? 'Join the circle to host an activity' : undefined} onClick={() => startFromIdea(idea)}>
                          Use idea
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {detailTab === 'overview' && (
                <section className="zq-circle-feature zq-circle-overview-card">
                  <span className="zq-circle-card-category">A SPACE TO CONNECT</span>
                  <h3>Built around {selectedCircle.category || 'community'}</h3>
                  <p>{selectedCircle.description || 'Connect with people who share your interests.'} Browse upcoming activities, meet members, and share your perspective.</p>
                  <button type="button" className="zq-btn-glass" onClick={() => navigate(`/feed?circle=${encodeURIComponent(selectedCircle.slug)}`)}>Open circle feed</button>
                </section>
              )}
              {detailTab === 'events' && (
              <section className="zq-circle-feature">
                <div className="zq-circle-feature-heading">
                  <h3>Upcoming & recent activities</h3>
                  {detail.isMember && <button type="button" className="zq-btn-glass" onClick={() => setEventFormOpen((open) => !open)}>{eventFormOpen ? 'Cancel' : 'Create event'}</button>}
                </div>
                {eventFormOpen && (
                  <form className="zq-circle-event-form" onSubmit={(event) => void submitEvent(event)}>
                  <label>What are you hosting?
                    <select aria-label="Activity type" value={eventKind} onChange={(event) => setEventKind(event.target.value as CircleActivityIdea['kind'])}>
                      <option value="EVENT">Event</option>
                      <option value="GAME">Game session</option>
                      <option value="TOURNAMENT">Tournament</option>
                      <option value="ACTIVITY">Group activity</option>
                    </select>
                  </label>
                  {eventKind === 'GAME' && (
                    <label>Game experience
                      <select aria-label="Game experience" value={gameMode} onChange={(event) => setGameMode(event.target.value as CircleGameMode)}>
                        <option value="NATIVE_TRIVIA">Create an in-circle quiz</option>
                        <option value="EXTERNAL">Play a game elsewhere</option>
                      </select>
                    </label>
                  )}
                  <input aria-label="Event title" required minLength={3} maxLength={100} placeholder={eventKind === 'GAME' ? 'Game or session name' : eventKind === 'TOURNAMENT' ? 'Tournament name' : 'Activity title'} value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
                  <textarea aria-label="Event description" required={eventKind === 'GAME' || eventKind === 'TOURNAMENT'} minLength={eventKind === 'GAME' || eventKind === 'TOURNAMENT' ? 12 : 0} maxLength={500} placeholder={eventKind === 'GAME' || eventKind === 'TOURNAMENT' ? 'Rules, how to join, and what members need to know' : 'What should members know?'} value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} />
                  {eventKind === 'GAME' && gameMode === 'NATIVE_TRIVIA' && (
                    <div className="zq-circle-game-round-editor">
                      <div className="zq-circle-feature-heading">
                        <strong>Write the rounds</strong>
                        <button type="button" className="zq-btn-glass" disabled={gameRounds.length >= 10} onClick={() => setGameRounds((rounds) => [...rounds, { prompt: '', choices: ['', '', ''], answerIndex: 0 }])}>Add round</button>
                      </div>
                      {gameRounds.map((round, roundIndex) => (
                        <fieldset className="zq-circle-game-round-fields" key={roundIndex}>
                          <legend>Round {roundIndex + 1}</legend>
                          <textarea aria-label={`Round ${roundIndex + 1} question`} required minLength={5} maxLength={160} placeholder="Write a question" value={round.prompt} onChange={(event) => setGameRounds((rounds) => rounds.map((item, index) => index === roundIndex ? { ...item, prompt: event.target.value } : item))} />
                          {round.choices.map((choice, choiceIndex) => (
                            <input key={choiceIndex} aria-label={`Round ${roundIndex + 1} option ${choiceIndex + 1}`} required minLength={1} maxLength={80} placeholder={`Option ${choiceIndex + 1}`} value={choice} onChange={(event) => setGameRounds((rounds) => rounds.map((item, index) => index === roundIndex ? { ...item, choices: item.choices.map((option, optionIndex) => optionIndex === choiceIndex ? event.target.value : option) } : item))} />
                          ))}
                          <label>Correct option
                            <select aria-label={`Round ${roundIndex + 1} correct option`} value={round.answerIndex} onChange={(event) => setGameRounds((rounds) => rounds.map((item, index) => index === roundIndex ? { ...item, answerIndex: Number(event.target.value) } : item))}>
                              {round.choices.map((_, choiceIndex) => <option key={choiceIndex} value={choiceIndex}>Option {choiceIndex + 1}</option>)}
                            </select>
                          </label>
                          {gameRounds.length > 2 && <button type="button" className="zq-btn-glass" onClick={() => setGameRounds((rounds) => rounds.filter((_, index) => index !== roundIndex))}>Remove round</button>}
                        </fieldset>
                      ))}
                      <small>Members who RSVP can play once during the scheduled session. Correct answers stay hidden until their score is submitted.</small>
                    </div>
                  )}
                  <label>How will it happen?
                    <select aria-label="Activity mode" value={eventMode} onChange={(event) => setEventMode(event.target.value as CircleActivityIdea['mode'])}>
                      <option value="ONLINE">Online</option>
                      <option value="IN_PERSON">In person</option>
                      <option value="HYBRID">Online or in person</option>
                    </select>
                  </label>
                  {eventKind === 'TOURNAMENT' && (
                    <label>Tournament format
                      <select aria-label="Tournament format" value={tournamentFormat} onChange={(event) => setTournamentFormat(event.target.value as 'SINGLE_ELIMINATION' | 'ROUND_ROBIN')}>
                        <option value="SINGLE_ELIMINATION">Single elimination</option>
                        <option value="ROUND_ROBIN">Round robin</option>
                      </select>
                    </label>
                  )}
                  <input aria-label="Event date and time" type="datetime-local" required value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} />
                  <input aria-label="Event location" maxLength={120} placeholder="Location or meeting link (optional)" value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} />
                  {(eventKind === 'TOURNAMENT' || eventKind === 'GAME' && gameMode === 'EXTERNAL') && <input aria-label="Game link" type="url" pattern="https://.*" placeholder="Game link (optional, https://)" value={eventGameUrl} onChange={(event) => setEventGameUrl(event.target.value)} />}
                  <div className="zq-circle-event-options">
                    <label>Player limit (optional)
                      <input aria-label="Player limit" type="number" min={2} max={200} value={eventCapacity} onChange={(event) => setEventCapacity(event.target.value)} placeholder="No limit" />
                    </label>
                    <label>Minutes
                      <input aria-label="Duration in minutes" type="number" min={15} max={480} value={eventDuration} onChange={(event) => setEventDuration(event.target.value)} />
                    </label>
                  </div>
                  <small>The host is automatically on the list. Members can join or leave before it starts.</small>
                  <button type="submit" className="zq-btn-aura" disabled={eventSaving}>{eventSaving ? 'Publishing…' : eventKind === 'GAME' ? 'Publish game session' : eventKind === 'TOURNAMENT' ? 'Publish tournament' : 'Publish activity'}</button>
                </form>
                )}
                {detail.events.length ? detail.events.map((event) => (
                <article className="zq-circle-event" key={event.id}>
                  <span className="zq-circle-event-kind">{event.kind === 'GAME' ? 'GAME SESSION' : event.kind}</span>
                  <strong>{event.title}</strong>
                  <span>{event.status === 'LIVE' ? 'Live now · ' : event.status === 'ENDED' ? 'Ended · ' : 'Starts · '}{new Date(event.startsAt).toLocaleString()}</span>
                  <small>{event.mode.toLowerCase().replace('_', ' ')}{event.durationMinutes ? ` · ${event.durationMinutes} min` : ''}{event.tournamentFormat ? ` · ${event.tournamentFormat === 'ROUND_ROBIN' ? 'Round robin' : 'Single elimination'}` : ''}{event.kind === 'GAME' && event.gameMode === 'NATIVE_TRIVIA' ? ` · In-circle quiz, ${event.gameRoundCount} rounds` : ''}</small>
                  {event.location && <small>{event.location}</small>}
                  {event.description && <p>{event.description}</p>}
                  <small>Hosted by @{event.creator.username} · {event.participantCount}{event.capacity ? `/${event.capacity}` : ''} going</small>
                  <div className="zq-circle-event-attendees">
                    {event.attendees.map((attendee) => <img key={attendee.id} src={getAvatarUrl(attendee)} alt={attendee.name} title={attendee.name} />)}
                  </div>
                  {event.gameUrl && <a className="zq-circle-activity-link" href={event.gameUrl} target="_blank" rel="noreferrer">Open game link</a>}
                  <button
                    type="button"
                    className={event.isGoing ? 'zq-btn-glass' : 'zq-btn-aura'}
                    disabled={!detail.isMember || (!event.isGoing && Boolean(event.capacity && event.participantCount >= event.capacity))}
                    title={!detail.isMember ? 'Join the circle to RSVP' : undefined}
                    onClick={() => void toggleEventRsvp(event.id, event.isGoing)}
                  >
                    {!detail.isMember ? 'Join circle to RSVP' : event.isGoing ? 'Leave activity' : event.capacity && event.participantCount >= event.capacity ? 'Full' : 'Join activity'}
                  </button>
                  {event.kind === 'GAME' && event.gameMode === 'NATIVE_TRIVIA' && event.isGoing && (
                    <button type="button" className="zq-btn-glass" disabled={gameLoading} onClick={() => void openCircleGame(event.id)}>
                      {gameLoading && activeGame?.id !== event.id ? 'Opening…' : activeGame?.id === event.id ? 'Refresh quiz' : 'Play quiz'}
                    </button>
                  )}
                  {activeGame?.id === event.id && (
                    <section className="zq-circle-native-game" aria-label={`${activeGame.title} quiz`}>
                      <div className="zq-circle-feature-heading">
                        <h4>{activeGame.title}</h4>
                        <button type="button" className="zq-btn-glass" onClick={() => setActiveGame(null)}>Close</button>
                      </div>
                      {activeGame.score === null ? (
                        <>
                          {!activeGame.canPlay && <p className="zq-circle-empty">This quiz opens {new Date(activeGame.startsAt).toLocaleString()} and closes {new Date(activeGame.closesAt).toLocaleTimeString()}.</p>}
                          {activeGame.rounds.map((round, roundIndex) => (
                            <fieldset className="zq-circle-play-round" key={round.id}>
                              <legend>Round {round.position + 1}</legend>
                              <strong>{round.prompt}</strong>
                              {round.choices.map((choice, choiceIndex) => (
                                <label key={choiceIndex}>
                                  <input
                                    type="radio"
                                    name={`quiz-${activeGame.id}-${round.id}`}
                                    checked={gameAnswers[roundIndex] === choiceIndex}
                                    disabled={!activeGame.canPlay}
                                    onChange={() => setGameAnswers((answers) => answers.map((answer, index) => index === roundIndex ? choiceIndex : answer))}
                                  />
                                  <span>{choice}</span>
                                </label>
                              ))}
                            </fieldset>
                          ))}
                          <button type="button" className="zq-btn-aura" disabled={!activeGame.canPlay || gameSubmitting || gameAnswers.some((answer) => answer < 0)} onClick={() => void submitCircleGame()}>
                            {gameSubmitting ? 'Submitting…' : 'Submit answers'}
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="zq-circle-game-score">Your score: {activeGame.score}/{activeGame.rounds.length}</p>
                          <h5>Circle leaderboard</h5>
                          {activeGame.leaderboard.map((entry, index) => <p className="zq-circle-game-leader" key={`${entry.username ?? entry.name}-${index}`}>{index + 1}. {entry.name} · {entry.score} points</p>)}
                        </>
                      )}
                    </section>
                  )}
                </article>
                )) : <p className="zq-circle-empty">No upcoming events yet. Members can organize a low-key meetup or online session.</p>}
              </section>
              )}

              {detailTab === 'members' && <section className="zq-circle-feature">
                <div className="zq-circle-feature-heading"><h3>Members</h3><span>{detail.memberCount.toLocaleString()} total</span></div>
                <div className="zq-circle-members">
                  {detail.members.map((member) => (
                    <button type="button" className="zq-circle-member" key={member.id} onClick={() => navigate(`/profile/${encodeURIComponent(member.username)}`)}>
                      <img src={getAvatarUrl(member)} alt="" />
                      <span><strong>{member.name}</strong><small>@{member.username}{member.category ? ` · ${member.category}` : ''}</small></span>
                    </button>
                  ))}
                  {!detail.members.length && <p className="zq-circle-empty">Public member profiles will appear here as people join.</p>}
                </div>
              </section>
              }

              {detailTab === 'highlights' && <section className="zq-circle-feature">
                <div className="zq-circle-feature-heading"><h3>Pinned posts</h3><span>Helpful posts from this circle</span></div>
                {detail.pinnedPosts.length ? detail.pinnedPosts.map((item) => (
                  <article className="zq-circle-event" key={item.postId}>
                    <strong>@{item.post.author.username}</strong>
                    {item.post.content && <p>{item.post.content}</p>}
                    {(item.pinnedBy.username === user?.username || item.post.author.username === user?.username) && <button type="button" className="zq-btn-glass" onClick={() => void togglePinnedPost(item.postId, true)}>Unpin</button>}
                  </article>
                )) : <p className="zq-circle-empty">No posts are pinned yet. Pin one of your own circle posts below to make it easier for members to find.</p>}
                {detail.isMember && circlePosts.map((post) => {
                  const pin = detail.pinnedPosts.find((item) => item.postId === post.id);
                  return (
                    <article className="zq-circle-own-post" key={post.id}>
                      <span>{post.content || 'Your media post'}</span>
                      <button
                        type="button"
                        className="zq-btn-glass"
                        disabled={Boolean(pin && pin.pinnedBy.username !== user?.username)}
                        onClick={() => void togglePinnedPost(post.id, Boolean(pin))}
                      >
                        {pin ? pin.pinnedBy.username === user?.username ? 'Unpin' : 'Pinned by another member' : 'Pin'}
                      </button>
                    </article>
                  );
                })}
              </section>
              }
            </div>
          )}
          <div className="zq-circle-detail-actions">
            <button
              type="button"
              className="zq-btn-glass"
              onClick={() => navigate(`/feed?circle=${encodeURIComponent(selectedCircle.slug)}`)}
            >
              View posts
            </button>
            <button
              type="button"
              className={selectedCircle.isMember ? 'zq-btn-glass' : 'zq-btn-aura'}
              disabled={busySlug === selectedCircle.slug}
              onClick={() => void toggleMembership(selectedCircle)}
            >
              {busySlug === selectedCircle.slug ? 'Saving…' : selectedCircle.isMember ? 'Leave circle' : 'Join circle'}
            </button>
          </div>
        </section>
      )}
      {createOpen && (
        <div className="zq-circle-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
          <section className="zq-circle-create-modal" role="dialog" aria-modal="true" aria-labelledby="zq-create-circle-title">
            <button type="button" className="zq-circle-modal-close" aria-label="Close create circle dialog" onClick={() => setCreateOpen(false)}>×</button>
            <span className="zq-circles-eyebrow">START SOMETHING TOGETHER</span>
            <h2 id="zq-create-circle-title">Create a circle</h2>
            <p>You’ll be the owner. Set the purpose and invite people in when you’re ready.</p>
            <form onSubmit={(event) => void createCircle(event)}>
              <label>Circle name
                <input required minLength={3} maxLength={48} value={circleName} onChange={(event) => setCircleName(event.target.value)} placeholder="e.g. Indie Game Developers" />
              </label>
              <label>Topic
                <select value={circleCategory} onChange={(event) => setCircleCategory(event.target.value)}>
                  {circleCategories.filter((category) => category.id !== 'all').map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </label>
              <label>What is this circle about?
                <textarea required minLength={12} maxLength={320} value={circleDescription} onChange={(event) => setCircleDescription(event.target.value)} placeholder="Tell people what they can share, discuss, or do together." />
              </label>
              <div className="zq-circle-modal-actions">
                <button type="button" className="zq-btn-glass" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="submit" className="zq-create-circle-button" disabled={createSaving}>{createSaving ? 'Creating…' : 'Create circle'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}