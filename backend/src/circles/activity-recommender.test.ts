import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recommendCircleActivities } from './activity-recommender';

describe('recommendCircleActivities', () => {
  it('suggests varied gaming activities that include a tournament', () => {
    const ideas = recommendCircleActivities('gaming', ['gaming'], []);

    assert.equal(ideas.length, 3);
    assert.ok(ideas.some((idea) => idea.title === 'Co-op quest night'));
    assert.ok(ideas.some((idea) => idea.kind === 'TOURNAMENT'));
    assert.equal(new Set(ideas.map((idea) => idea.kind)).size, ideas.length);
    assert.ok(ideas.every((idea) => idea.description.length >= 20));
  });

  it('uses interest signals without recommending romantic matching', () => {
    const ideas = recommendCircleActivities('couples', ['relationships', 'wellness'], []);

    assert.ok(ideas.some((idea) => idea.templateId === 'couples-ritual-night'));
    assert.ok(ideas.every((idea) => !/dating|match people/i.test(idea.description)));
  });

  it('rotates away from recently used ideas and supports less common topics', () => {
    const fresh = recommendCircleActivities('inventors', ['engineering'], []);
    const repeated = recommendCircleActivities('inventors', ['engineering'], fresh.map((idea) => idea.templateId));

    assert.ok(repeated.some((idea) => !fresh.some((prior) => prior.templateId === idea.templateId)));
    assert.ok(repeated.every((idea) => ['inventors', 'creators', 'gaming'].some((topic) =>
      idea.templateId.startsWith(topic),
    )));
  });

  it('provides safe generic activities for an unknown topic', () => {
    const ideas = recommendCircleActivities('new-topic', [], []);

    assert.equal(ideas.length, 3);
    assert.equal(new Set(ideas.map((idea) => idea.kind)).size, ideas.length);
  });
});
