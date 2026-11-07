import assert from 'node:assert/strict';
import test from 'node:test';
import { fromGitHubCommits, practiceStats, validSnapshot } from '../src/lib/github-data.ts';

const commit = (date: unknown) => ({ commit: { author: { date } } });

test('commit days use the Rio calendar, not UTC', () => {
	assert.deepEqual(fromGitHubCommits([commit('2026-11-05T02:39:53Z')]), ['2026-11-04']);
});

test('several commits on one day count once and invalid dates are dropped', () => {
	const raw = [commit('2026-11-03T21:44:44Z'), commit('2026-11-03T21:05:41Z'), commit('not a date'), commit(null), {}];
	assert.deepEqual(fromGitHubCommits(raw), ['2026-11-03']);
});

test('a response that is not a list is no data', () => {
	assert.equal(fromGitHubCommits({ message: 'rate limited' }), null);
});

test('streaks only count consecutive days, including across months', () => {
	const stats = practiceStats(['2026-11-02', '2026-09-30', '2026-10-01', '2026-11-01', '2026-11-03', '2026-10-15'], '2026-11-03');
	assert.deepEqual(stats, { activeDays: 6, currentStreak: 3, longestStreak: 3, lastDay: '2026-11-03' });
});

test('the current streak survives until today is over', () => {
	const days = ['2026-11-01', '2026-11-02', '2026-11-03'];
	assert.equal(practiceStats(days, '2026-11-04')?.currentStreak, 3);
	assert.equal(practiceStats(days, '2026-11-05')?.currentStreak, 0);
});

test('the current streak can be shorter than the longest one', () => {
	const stats = practiceStats(['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-02', '2026-11-03'], '2026-11-03');
	assert.equal(stats?.currentStreak, 2);
	assert.equal(stats?.longestStreak, 3);
});

test('no days means no stats', () => {
	assert.equal(practiceStats([], '2026-11-03'), null);
});

test('a snapshot from before this source still loads, without practice days', () => {
	const old = { generatedAt: '2026-11-01', leetcode: { solved: 9, easy: 6, medium: 3, hard: 0, activeDays: 9, maxStreak: 3 } };
	const snapshot = validSnapshot(old);
	assert.equal(snapshot?.practiceDays, null);
	assert.deepEqual(snapshot?.leetcode, { solved: 9, easy: 6, medium: 3, hard: 0 });
});
