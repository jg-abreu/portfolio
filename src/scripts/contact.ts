import { ContactError, submitContact } from '../lib/contact';

for (const form of document.querySelectorAll<HTMLFormElement>('[data-contact-form]')) {
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const status = form.querySelector<HTMLElement>('[role="status"]');
  if (!button || !status) continue;
  const enabled = form.dataset.enabled === 'true';
  const labels: Record<string, string> = JSON.parse(form.dataset.labels ?? '{}');
  let busy = false;
  let fingerprint = '';
  let key = '';
  if (enabled) button.disabled = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!enabled || busy || !form.reportValidity()) return;
    const data = new FormData(form);
    const body = { name: String(data.get('name') ?? '').trim(), email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(), website: String(data.get('website') ?? '') };
    const current = JSON.stringify(body);
    if (fingerprint !== current) { fingerprint = current; key = crypto.randomUUID(); }
    busy = true;
    button.disabled = true;
    status.textContent = labels.sending;
    form.setAttribute('aria-busy', 'true');
    const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')];
    fields.forEach(field => { field.readOnly = true; });
    try {
      await submitContact(body, key);
      form.reset();
      fingerprint = '';
      key = '';
      status.textContent = labels.accepted;
    } catch (error) {
      status.textContent = error instanceof ContactError && error.status === 429 ? labels.rateLimited
        : error instanceof ContactError && [400, 409, 413, 415].includes(error.status) ? labels.invalid : labels.error;
    } finally {
      busy = false;
      button.disabled = false;
      fields.forEach(field => { field.readOnly = false; });
      form.removeAttribute('aria-busy');
    }
  });
}
