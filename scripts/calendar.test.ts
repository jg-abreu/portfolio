import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rioDate } from '../src/lib/calendar.ts';

test('keeps October 23 in Rio after midnight UTC', () => {
	assert.equal(rioDate(new Date('2026-10-24T02:59:59Z')), '2026-10-23');
});

test('changes day at midnight in Rio', () => {
	assert.equal(rioDate(new Date('2026-10-24T03:00:00Z')), '2026-10-24');
});

test('keeps the previous year until midnight in Rio', () => {
	assert.equal(rioDate(new Date('2027-01-01T02:00:00Z')), '2026-12-31');
});
