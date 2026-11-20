import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchLinkPage } from './link-source.ts';
import { linkIcon, linkIcons } from '../src/lib/link-icons.ts';
import { defaultLinkPage, isLinkPageView, linkTitleError, linkUrlError, localizedHref, parseLinkPage } from '../src/lib/link-page.ts';

const link = (title: string, url: string, icon = 'link') => ({ links: [{ title, url, icon }] });

test('the defaults are valid and every default icon exists', () => {
  assert.deepEqual(parseLinkPage(defaultLinkPage), defaultLinkPage);
  for (const { icon } of defaultLinkPage.links) assert.equal(linkIcon(icon).id, icon);
});

test('accepts https and mailto addresses and trims them', () => {
  assert.deepEqual(parseLinkPage(link(' GitHub ', ' https://github.com/jg-abreu ')),
    link('GitHub', 'https://github.com/jg-abreu'));
  assert.equal(linkUrlError('mailto:someone@example.com'), false);
});

test('rejects unsafe or malformed addresses', () => {
  for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user@example.com', 'https://example.com:8443/',
    'https://localhost/', 'https://exa mple.com', '//example.com', 'mailto:not-an-email', 'mailto:a@b.com?bcc=c@d.com',
    `https://example.com/${'a'.repeat(300)}`, ''])
    assert.equal(linkUrlError(url), true, url);
  assert.equal(parseLinkPage(link('Bad', 'javascript:alert(1)')), null);
});

test('titles need 1 to 40 visible characters', () => {
  for (const title of [' ', 'T'.repeat(41), 'line\nbreak', 'zero​width']) assert.equal(linkTitleError(title), true);
  assert.equal(linkTitleError('Résumé ✨'), false);
});

test('pages hold one to twenty links with short icon names', () => {
  assert.equal(parseLinkPage({ links: [] }), null);
  assert.equal(parseLinkPage({ links: Array(21).fill(link('T', 'https://example.com').links[0]) }), null);
  assert.equal(parseLinkPage(link('T', 'https://example.com', '<svg>')), null);
  assert.equal(parseLinkPage(null), null);
});

test('admin views need valid draft, defaults and optional published page', () => {
  const view = { version: 2, draft: defaultLinkPage, published: null, defaults: defaultLinkPage, pending: false,
    publishedAt: null, updatedAt: '2026-11-19T12:00:00Z' };
  assert.equal(isLinkPageView(view), true);
  assert.equal(isLinkPageView({ ...view, version: -1 }), false);
  assert.equal(isLinkPageView({ ...view, published: { links: [] } }), false);
});

test('links to the site follow the page language; others stay as they are', () => {
  assert.equal(localizedHref('https://joaoabreu.dev/en/projects/', 'pt'), '/pt/projects/');
  assert.equal(localizedHref('https://joaoabreu.dev/pt/', 'en'), '/en/');
  assert.equal(localizedHref('https://joaoabreu.dev/cv/joao-abreu-cv-en.pdf', 'pt'), '/cv/joao-abreu-cv-en.pdf');
  assert.equal(localizedHref('https://github.com/en/', 'pt'), 'https://github.com/en/');
  assert.equal(localizedHref('mailto:someone@example.com', 'pt'), 'mailto:someone@example.com');
});

test('the icon catalogue has about a hundred unique icons and falls back to the link icon', () => {
  const ids = linkIcons.map(icon => icon.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 100);
  assert.ok(linkIcons.every(icon => /^[a-z0-9-]{1,32}$/.test(icon.id) && icon.body.length > 0 && !/<script|on\w+=/i.test(icon.body)));
  assert.equal(linkIcon('missing-icon').id, 'link');
});

test('fetches and validates the published page with a size limit', async () => {
  const source = new URL('https://joaoabreu.dev/api/link-page');
  const reply = (body: string, status = 200) => async () => new Response(body, { status });
  assert.deepEqual(await fetchLinkPage(source, reply(JSON.stringify(defaultLinkPage))), defaultLinkPage);
  await assert.rejects(fetchLinkPage(source, reply(JSON.stringify(link('Bad', 'http://x.com')))));
  await assert.rejects(fetchLinkPage(source, reply('', 503)));
  await assert.rejects(fetchLinkPage(source, reply(' '.repeat(256 * 1024 + 1))));
});
