import { AssistantError, safeSourceUrl, sendQuestion, type AssistantLocale } from '../lib/assistant';

const root = document.querySelector<HTMLElement>('[data-assistant]');
if (root) {
	const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
	const trigger = root.querySelector<HTMLButtonElement>('[data-assistant-open]')!;
	const close = root.querySelector<HTMLButtonElement>('[data-assistant-close]')!;
	const form = root.querySelector<HTMLFormElement>('form')!;
	const input = root.querySelector<HTMLTextAreaElement>('textarea')!;
	const send = root.querySelector<HTMLButtonElement>('[type=submit]')!;
	const notice = root.querySelector<HTMLElement>('[data-assistant-notice]')!;
	const output = root.querySelector<HTMLElement>('[data-assistant-output]')!;
	const answer = root.querySelector<HTMLElement>('[data-assistant-answer]')!;
	const sources = root.querySelector<HTMLUListElement>('[data-assistant-sources]')!;
	const version = root.querySelector<HTMLElement>('[data-assistant-version]')!;
	const locale = root.dataset.locale as AssistantLocale;
	const messages = JSON.parse(root.dataset.messages!) as Record<string, string>;
	const suggestions = root.querySelectorAll<HTMLButtonElement>('[data-question]');
	let busy = false;
	let cooldownUntil = 0;
	trigger.hidden = false;
	trigger.addEventListener('click', () => { dialog.showModal(); input.focus(); });
	close.addEventListener('click', () => dialog.close());
	dialog.addEventListener('close', () => trigger.focus());
	input.addEventListener('input', () => input.setCustomValidity(
		[...input.value.trim()].length > 2000 ? messages.INVALID_REQUEST! : ''));
	suggestions.forEach(button => {
		button.addEventListener('click', () => { input.value = button.dataset.question!; input.setCustomValidity(''); input.focus(); });
	});
	form.addEventListener('submit', async event => {
		event.preventDefault();
		if (busy || Date.now() < cooldownUntil) return;
		if (!input.value.trim() || [...input.value.trim()].length > 2000) {
			notice.textContent = messages.INVALID_REQUEST!;
			input.focus();
			return;
		}
		busy = true;
		input.readOnly = true;
		suggestions.forEach(button => { button.disabled = true; });
		send.disabled = true;
		form.setAttribute('aria-busy', 'true');
		notice.textContent = messages.loading!;
		output.hidden = true;
		answer.textContent = '';
		sources.replaceChildren();
		const controller = new AbortController();
		const timer = window.setTimeout(() => controller.abort(), 40000);
		try {
			const result = await sendQuestion(input.value, locale, controller.signal);
			answer.textContent = result.answer;
			for (const source of result.sources) {
				const item = document.createElement('li');
				const href = source.url ? safeSourceUrl(source.url, location.origin) : null;
				if (href) {
					const link = document.createElement('a');
					link.href = href;
					link.textContent = source.title;
					item.append(link);
				} else item.textContent = source.title;
				sources.append(item);
			}
			version.textContent = messages.version + ' ' + result.knowledgeVersion;
			output.hidden = false;
			notice.textContent = messages[result.status]!;
			if (dialog.open) { output.focus(); output.scrollIntoView({ block: 'nearest' }); }
		} catch (error) {
			const failure = error instanceof AssistantError ? error : new AssistantError('INTERNAL_ERROR');
			notice.textContent = messages[failure.code]!;
			if (failure.retryAfter > 0) {
				cooldownUntil = Date.now() + failure.retryAfter * 1000;
				notice.textContent += ' ' + messages.retryAfter!.replace('{seconds}', String(failure.retryAfter));
			}
			if (dialog.open) { notice.focus(); notice.scrollIntoView({ block: 'nearest' }); }
		} finally {
			clearTimeout(timer);
			busy = false;
			input.readOnly = false;
			suggestions.forEach(button => { button.disabled = false; });
			form.setAttribute('aria-busy', 'false');
			send.disabled = Date.now() < cooldownUntil;
			if (send.disabled) window.setTimeout(() => { if (!busy) send.disabled = false; }, Math.min(cooldownUntil - Date.now(), 2147483647));
		}
	});
}
