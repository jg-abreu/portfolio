import type { AdminLabels } from "../i18n/admin";

type Copy = {
  title: string;
  tagline: string;
  problem: string;
  decisions: string;
  result: string;
  body: string;
};
type DraftStatus = "DRAFT" | "ARCHIVED";
type Publication = { projectId: number; revision: string; draftVersion: number };
type InboxMessage = {
  id: number;
  version: number;
  name: string;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  deliveryStatus: string;
};
type InboxDetail = InboxMessage & { email: string; message: string };
type Draft = {
  id: number;
  version: number;
  slug: string;
  repositoryUrl: string;
  liveUrl: string;
  stack: string;
  displayOrder: number;
  status: DraftStatus;
  en: Copy;
  pt: Copy;
  updatedAt: string;
};

const root = document.querySelector<HTMLElement>("[data-admin]");
if (root) initialize(root);

function initialize(root: HTMLElement) {
  const labels: AdminLabels = JSON.parse(root.dataset.labels ?? "{}");
  const locale = root.dataset.locale === "pt" ? "pt" : "en";
  const q = <T extends Element>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing admin element: ${selector}`);
    return element;
  };
  const workspace = q<HTMLElement>("[data-workspace]");
  const login = q<HTMLElement>("[data-login]");
  const connection = q<HTMLElement>("[data-connection]");
  const notice = q<HTMLElement>("[data-notice]");
  const reauth = q<HTMLAnchorElement>("[data-reauth]");
  const editor = q<HTMLDialogElement>("[data-editor]");
  const discard = q<HTMLDialogElement>("[data-discard]");
  const form = q<HTMLFormElement>("[data-project-form]");
  const formMessage = q<HTMLElement>("[data-form-message]");
  const saveButton = q<HTMLButtonElement>("[data-save]");
  const list = q<HTMLElement>("[data-project-list]");
  const empty = q<HTMLElement>("[data-empty]");
  const search = q<HTMLInputElement>("[data-search]");
  let drafts: Draft[] = [];
  let publications: Publication[] = [];
  let deployed: { projectId: number; revision: string }[] = [];
  let filter: DraftStatus = "DRAFT";
  let current: Draft | null = null;
  let baseline = "";
  let busy = false;
  let loaded = false;
  let sessionVersion = 0;
  let inboxGeneration = 0;
  let inboxPage = 0;
  let inboxArchived = false;
  let inboxBusy = false;
  let inboxCurrent: InboxDetail | null = null;
  form.noValidate = true;

  function clearInbox() {
    inboxGeneration++;
    inboxBusy = false;
    inboxPage = 0;
    inboxCurrent = null;
    q<HTMLElement>("[data-inbox-list]").replaceChildren();
    q<HTMLElement>("[data-inbox-detail]").hidden = true;
    for (const field of ["sender", "email", "body", "status"])
      q<HTMLElement>(`[data-inbox-${field}]`).textContent = "";
  }

  function clearSession() {
    sessionVersion++;
    drafts = [];
    publications = [];
    deployed = [];
    current = null;
    baseline = "";
    loaded = false;
    clearInbox();
    form.reset();
    formMessage.textContent = "";
    search.value = "";
    q<HTMLElement>("[data-username]").textContent = "";
    list.replaceChildren();
    if (discard.open) discard.close();
    if (editor.open) editor.close();
    workspace.hidden = true;
    connection.hidden = true;
    login.hidden = false;
    message("");
  }

  class ApiError extends Error {
    constructor(readonly status: number) {
      super(String(status));
    }
  }

  async function request(
    path: string,
    options: RequestInit = {},
  ): Promise<unknown> {
    const version = sessionVersion;
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (version !== sessionVersion) throw new ApiError(401);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) clearSession();
      throw new ApiError(response.status);
    }
    const data = response.status === 204 ? null : await response.json();
    if (version !== sessionVersion) throw new ApiError(401);
    return data;
  }

  async function mutate(path: string, method: string, body?: unknown) {
    const csrf = await request("/api/auth/csrf");
    if (
      !isObject(csrf) ||
      typeof csrf.headerName !== "string" ||
      typeof csrf.token !== "string" ||
      csrf.headerName !== "X-CSRF-TOKEN"
    )
      throw new Error("Invalid CSRF response");
    return request(path, {
      method,
      headers: {
        [csrf.headerName]: csrf.token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  function message(text: string) {
    notice.textContent = text;
    notice.hidden = !text;
  }

  function errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) return labels.expired;
      if (error.status === 409) return labels.conflict;
      if (error.status === 400) return labels.invalid;
    }
    return labels.error;
  }

  function sessionError(error: unknown) {
    return (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    );
  }

  async function load() {
    q<HTMLButtonElement>("[data-retry]").hidden = true;
    q<HTMLElement>("[data-connection-message]").textContent = labels.checking;
    connection.hidden = false;
    try {
      const session = await request("/api/admin/session");
      if (!isObject(session) || typeof session.username !== "string")
        throw new Error("Invalid session response");
      const data = await request("/api/admin/projects");
      if (!Array.isArray(data) || !data.every(isDraft))
        throw new Error("Invalid projects response");
      drafts = data;
      await loadPublications();
      loaded = true;
      q<HTMLElement>("[data-username]").textContent = session.username;
      workspace.hidden = false;
      login.hidden = true;
      connection.hidden = true;
      render();
    } catch (error) {
      if (sessionError(error)) {
        workspace.hidden = true;
        login.hidden = false;
        connection.hidden = true;
      } else {
        q<HTMLElement>("[data-connection-message]").textContent =
          labels.connecting;
        q<HTMLButtonElement>("[data-retry]").hidden = false;
      }
    }
  }

  async function loadPublications() {
    const selected = await request('/api/admin/project-publications');
    if (!Array.isArray(selected) || !selected.every(item => isObject(item)
      && Number.isSafeInteger(item.projectId) && typeof item.revision === 'string'
      && Number.isSafeInteger(item.draftVersion))) throw new Error('Invalid publications response');
    publications = selected as Publication[];
    deployed = [];
    try {
      const manifest = await request('/project-publications.json');
      if (isObject(manifest) && manifest.schemaVersion === 1 && Array.isArray(manifest.projects)
        && manifest.projects.every(item => isObject(item) && Number.isSafeInteger(item.projectId) && typeof item.revision === 'string'))
        deployed = manifest.projects as typeof deployed;
    } catch (error) {
      if (sessionError(error)) throw error;
    }
  }

  function render() {
    for (const status of ["DRAFT", "ARCHIVED"] as const)
      q<HTMLElement>(`[data-count="${status}"]`).textContent = String(
        drafts.filter((draft) => draft.status === status).length,
      );
    const term = search.value.trim().toLocaleLowerCase();
    const visible = drafts
      .filter(
        (draft) =>
          draft.status === filter &&
          `${draft.en.title} ${draft.pt.title} ${draft.slug} ${draft.stack}`
            .toLocaleLowerCase()
            .includes(term),
      )
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
    list.replaceChildren();
    for (const draft of visible) {
      const fragment = q<HTMLTemplateElement>(
        "[data-project-template]",
      ).content.cloneNode(true) as DocumentFragment;
      const text = (selector: string, value: string) => {
        const target = fragment.querySelector(selector);
        if (target) target.textContent = value;
      };
      text("[data-project-title]", draft[locale].title);
      text("[data-project-description]", draft[locale].tagline);
      text(
        "[data-project-status]",
        publicationLabel(draft),
      );
      text("[data-project-stack]", draft.stack);
      const date = fragment.querySelector<HTMLTimeElement>(
        "[data-project-date]",
      );
      if (date) {
        date.dateTime = draft.updatedAt;
        date.textContent = labels.updated.replace(
          "{date}",
          new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
            dateStyle: "medium",
            timeZone: "America/Sao_Paulo",
          }).format(new Date(draft.updatedAt)),
        );
      }
      fragment
        .querySelector<HTMLButtonElement>("[data-edit]")
        ?.addEventListener("click", () => openEditor(draft));
      const archive =
        fragment.querySelector<HTMLButtonElement>("[data-archive]");
      if (archive) {
        archive.textContent =
          draft.status === "DRAFT" ? labels.archive : labels.restore;
        archive.addEventListener(
          "click",
          () => void changeStatus(draft, archive),
        );
      }
      const publish = fragment.querySelector<HTMLButtonElement>('[data-publish]');
      if (publish) {
        publish.hidden = draft.status !== 'DRAFT';
        publish.textContent = labels.publish;
        publish.addEventListener('click', () => void changePublication(draft, publish, false));
      }
      const withdraw = fragment.querySelector<HTMLButtonElement>('[data-withdraw]');
      if (withdraw) {
        withdraw.hidden = !publications.some(item => item.projectId === draft.id);
        withdraw.textContent = labels.withdraw;
        withdraw.addEventListener('click', () => void changePublication(draft, withdraw, true));
      }
      list.append(fragment);
    }
    empty.hidden = !loaded || visible.length > 0;
    const first = drafts.length === 0;
    q<HTMLElement>("[data-empty-title]").textContent = first
      ? labels.empty
      : labels.noMatches;
    q<HTMLElement>("[data-empty-body]").hidden = !first;
  }

  function publicationLabel(draft: Draft) {
    const selected = publications.find(item => item.projectId === draft.id);
    const live = deployed.find(item => item.projectId === draft.id);
    const prefix = draft.status === 'ARCHIVED' ? `${labels.archived} · ` : '';
    if (!selected && live) return prefix + labels.withdrawPending;
    if (selected) {
      if (live?.revision !== selected.revision) return prefix + labels.publicationPending;
      return prefix + (selected.draftVersion === draft.version ? labels.published : labels.unpublishedEdits);
    }
    return draft.status === 'DRAFT' ? labels.drafts : labels.archived;
  }

  async function changePublication(draft: Draft, button: HTMLButtonElement, withdraw: boolean) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    try {
      await mutate(`/api/admin/projects/${draft.id}/publication`, withdraw ? 'DELETE' : 'PUT', { version: draft.version });
      await loadPublications();
      render();
      message(withdraw ? labels.withdrawQueued : labels.publicationQueued);
    } catch (error) {
      message(error instanceof ApiError && error.status === 400 ? labels.publishIncomplete : errorMessage(error));
      reauth.hidden = !sessionError(error);
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  function snapshot() {
    return JSON.stringify([...new FormData(form).entries()]);
  }
  function input(name: string) {
    const field = form.elements.namedItem(name);
    if (!(
      field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
    ))
      throw new Error("Missing field");
    return field;
  }
  function chooseLocale(language: string) {
    for (const tab of root.querySelectorAll<HTMLButtonElement>(
      "[data-copy-tab]",
    )) {
      const selected = tab.dataset.copyTab === language;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const panel of root.querySelectorAll<HTMLElement>("[data-copy-panel]"))
      panel.hidden = panel.dataset.copyPanel !== language;
  }
  async function openEditor(draft: Draft | null) {
    if (busy) return;
    if (draft) {
      busy = true;
      try {
        const data = await request(`/api/admin/projects/${draft.id}`);
        if (!isDraft(data)) throw new Error("Invalid draft response");
        draft = data;
        store(data);
      } catch (error) {
        message(sessionError(error) ? labels.expired : labels.connecting);
        reauth.hidden = !sessionError(error);
        return;
      } finally {
        busy = false;
      }
    }
    current = draft;
    form.reset();
    formMessage.textContent = "";
    q<HTMLAnchorElement>("[data-form-reauth]").hidden = true;
    q<HTMLElement>("[data-editor-heading]").textContent = draft
      ? labels.editorEdit
      : labels.editorNew;
    if (draft) {
      for (const field of [
        "slug",
        "repositoryUrl",
        "liveUrl",
        "stack",
        "displayOrder",
      ] as const)
        input(field).value = String(draft[field]);
      for (const language of ["en", "pt"] as const)
        for (const field of Object.keys(draft[language]) as (keyof Copy)[])
          input(`${language}.${field}`).value = draft[language][field];
    }
    chooseLocale(locale);
    baseline = snapshot();
    editor.showModal();
    input("slug").focus();
  }
  function closeEditor() {
    if (busy) return;
    if (snapshot() !== baseline) discard.showModal();
    else editor.close();
  }
  function store(draft: Draft) {
    const position = drafts.findIndex((item) => item.id === draft.id);
    if (position === -1) drafts.push(draft);
    else drafts[position] = draft;
    render();
  }

  async function changeStatus(draft: Draft, button: HTMLButtonElement) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    reauth.hidden = true;
    try {
      const status = draft.status === "DRAFT" ? "ARCHIVED" : "DRAFT";
      const data = await mutate(
        `/api/admin/projects/${draft.id}/status`,
        "PATCH",
        { status, version: draft.version },
      );
      if (!isDraft(data)) throw new Error("Invalid draft response");
      store(data);
      message(status === "ARCHIVED" ? labels.archivedNotice : labels.restored);
    } catch (error) {
      message(errorMessage(error));
      reauth.hidden = !sessionError(error);
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const invalid = [
      ...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea",
      ),
    ].find((field) => !field.checkValidity());
    if (invalid) {
      const language = invalid.name.split(".")[0];
      if (language === "en" || language === "pt") chooseLocale(language);
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    const copy = (language: string): Copy => ({
      title: input(`${language}.title`).value.trim(),
      tagline: input(`${language}.tagline`).value,
      problem: input(`${language}.problem`).value,
      decisions: input(`${language}.decisions`).value,
      result: input(`${language}.result`).value,
      body: input(`${language}.body`).value,
    });
    const payload = {
      version: current?.version ?? 0,
      slug: input("slug").value,
      repositoryUrl: input("repositoryUrl").value,
      liveUrl: input("liveUrl").value,
      stack: input("stack").value,
      displayOrder: Number(input("displayOrder").value),
      en: copy("en"),
      pt: copy("pt"),
    };
    busy = true;
    saveButton.disabled = true;
    saveButton.textContent = labels.saving;
    formMessage.textContent = "";
    q<HTMLAnchorElement>("[data-form-reauth]").hidden = true;
    try {
      const data = await mutate(
        current ? `/api/admin/projects/${current.id}` : "/api/admin/projects",
        current ? "PUT" : "POST",
        payload,
      );
      if (!isDraft(data)) throw new Error("Invalid draft response");
      if (!current) {
        filter = "DRAFT";
        for (const button of root.querySelectorAll("[data-filter]")) {
          button.setAttribute(
            "aria-pressed",
            String((button as HTMLElement).dataset.filter === filter),
          );
        }
      }
      store(data);
      editor.close();
      message(labels.saved);
    } catch (error) {
      formMessage.textContent = errorMessage(error);
      q<HTMLAnchorElement>("[data-form-reauth]").hidden = !sessionError(error);
    } finally {
      busy = false;
      saveButton.disabled = false;
      saveButton.textContent = labels.save;
    }
  });

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-new]"))
    button.addEventListener("click", () => openEditor(null));
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-close]"))
    button.addEventListener("click", closeEditor);
  editor.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeEditor();
  });
  q<HTMLButtonElement>("[data-keep]").addEventListener("click", () =>
    discard.close(),
  );
  q<HTMLButtonElement>("[data-discard-confirm]").addEventListener(
    "click",
    () => {
      discard.close();
      editor.close();
    },
  );
  for (const tab of root.querySelectorAll<HTMLButtonElement>(
    "[data-copy-tab]",
  )) {
    tab.addEventListener("click", () =>
      chooseLocale(tab.dataset.copyTab ?? locale),
    );
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? "en"
          : event.key === "End"
            ? "pt"
            : tab.dataset.copyTab === "en"
              ? "pt"
              : "en";
      chooseLocale(next);
      q<HTMLButtonElement>(`[data-copy-tab="${next}"]`).focus();
    });
  }
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-filter]",
  ))
    button.addEventListener("click", () => {
      filter = button.dataset.filter === "ARCHIVED" ? "ARCHIVED" : "DRAFT";
      for (const other of root.querySelectorAll("[data-filter]"))
        other.setAttribute("aria-pressed", String(other === button));
      render();
    });
  search.addEventListener("input", render);
  q<HTMLButtonElement>("[data-retry]").addEventListener(
    "click",
    () => void load(),
  );
  q<HTMLButtonElement>("[data-logout]").addEventListener(
    "click",
    async (event) => {
      if (busy) return;
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      try {
        await mutate("/api/auth/logout", "POST");
        clearSession();
      } catch (error) {
        message(errorMessage(error));
      } finally {
        button.disabled = false;
      }
    },
  );
  q<HTMLButtonElement>("[data-theme]").addEventListener("click", () => {
    const light =
      document.documentElement.dataset.theme === "light" ||
      (!document.documentElement.dataset.theme &&
        matchMedia("(prefers-color-scheme: light)").matches);
    const theme = light ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  });

  function inboxStatus(text: string) {
    q<HTMLElement>("[data-inbox-status]").textContent = text;
  }

  function showInboxError(error: unknown) {
    if (!sessionError(error)) inboxStatus(error instanceof ApiError && error.status === 409
      ? labels.inboxConflict : labels.inboxError);
  }

  function showMessage(detail: InboxDetail) {
    inboxCurrent = detail;
    q<HTMLElement>("[data-inbox-sender]").textContent = detail.name;
    q<HTMLElement>("[data-inbox-email]").textContent = detail.email;
    q<HTMLElement>("[data-inbox-body]").textContent = detail.message;
    q<HTMLButtonElement>("[data-inbox-read]").textContent = detail.readAt ? labels.inboxMarkUnread : labels.inboxMarkRead;
    q<HTMLButtonElement>("[data-inbox-archive]").textContent = detail.archivedAt ? labels.inboxRestore : labels.inboxArchive;
    q<HTMLElement>("[data-inbox-detail]").hidden = false;
    q<HTMLElement>("[data-inbox-sender]").focus();
  }

  async function openMessage(id: number) {
    if (inboxBusy) return;
    inboxBusy = true;
    const generation = ++inboxGeneration;
    inboxCurrent = null;
    q<HTMLElement>("[data-inbox-detail]").hidden = true;
    inboxStatus(labels.checking);
    try {
      const detail = await request(`/api/admin/messages/${id}`);
      if (generation !== inboxGeneration) return;
      if (!isInboxDetail(detail)) throw new Error("Invalid inbox detail");
      showMessage(detail);
      inboxStatus("");
    } catch (error) {
      if (generation === inboxGeneration) showInboxError(error);
    } finally {
      if (generation === inboxGeneration) inboxBusy = false;
    }
  }

  async function loadInbox() {
    const generation = ++inboxGeneration;
    inboxBusy = true;
    inboxCurrent = null;
    q<HTMLElement>("[data-inbox-detail]").hidden = true;
    q<HTMLElement>("[data-inbox-list]").replaceChildren();
    q<HTMLButtonElement>("[data-inbox-previous]").disabled = true;
    q<HTMLButtonElement>("[data-inbox-next]").disabled = true;
    inboxStatus(labels.checking);
    try {
      const data = await request(`/api/admin/messages?archived=${inboxArchived}&page=${inboxPage}&size=20`);
      if (generation !== inboxGeneration) return;
      if (!isObject(data) || !Array.isArray(data.messages) || !data.messages.every(isInboxMessage)
        || typeof data.hasNext !== "boolean" || !Number.isSafeInteger(data.totalElements))
        throw new Error("Invalid inbox page");
      const list = q<HTMLElement>("[data-inbox-list]");
      for (const item of data.messages) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "inbox-item";
        const date = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", {
          dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo",
        }).format(new Date(item.createdAt));
        button.textContent = `${item.name} · ${date} · ${item.readAt ? labels.inboxRead : labels.inboxUnread}`;
        button.addEventListener("click", () => void openMessage(item.id));
        list.append(button);
      }
      q<HTMLButtonElement>("[data-inbox-previous]").disabled = inboxPage === 0;
      q<HTMLButtonElement>("[data-inbox-next]").disabled = !data.hasNext;
      inboxStatus(data.messages.length ? "" : labels.inboxEmpty);
    } catch (error) {
      if (generation === inboxGeneration) showInboxError(error);
    } finally {
      if (generation === inboxGeneration) inboxBusy = false;
    }
  }

  async function changeMessage(action: "read" | "archive") {
    if (inboxBusy || !inboxCurrent) return;
    inboxBusy = true;
    const generation = ++inboxGeneration;
    const selected = inboxCurrent;
    const value = action === "read" ? !selected.readAt : !selected.archivedAt;
    try {
      const detail = await mutate(`/api/admin/messages/${selected.id}/${action}`, "PATCH", {
        value, version: selected.version,
      });
      if (generation !== inboxGeneration) return;
      if (!isInboxDetail(detail)) throw new Error("Invalid inbox update");
      await loadInbox();
      if (action === "read" && generation + 1 === inboxGeneration && !workspace.hidden) showMessage(detail);
    } catch (error) {
      if (generation === inboxGeneration) showInboxError(error);
    } finally {
      if (generation === inboxGeneration) inboxBusy = false;
    }
  }

  q<HTMLButtonElement>("[data-open-inbox]").addEventListener("click", () => {
    q<HTMLElement>("[data-projects-screen]").hidden = true;
    q<HTMLElement>("[data-inbox-screen]").hidden = false;
    q<HTMLElement>("[data-open-projects]").removeAttribute("aria-current");
    q<HTMLElement>("[data-open-inbox]").setAttribute("aria-pressed", "true");
    q<HTMLElement>("#inbox-heading").focus();
    inboxPage = 0;
    void loadInbox();
  });
  q<HTMLAnchorElement>("[data-open-projects]").addEventListener("click", (event) => {
    event.preventDefault();
    clearInbox();
    q<HTMLElement>("[data-projects-screen]").hidden = false;
    q<HTMLElement>("[data-inbox-screen]").hidden = true;
    q<HTMLElement>("[data-open-projects]").setAttribute("aria-current", "page");
    q<HTMLElement>("[data-open-inbox]").setAttribute("aria-pressed", "false");
  });
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-inbox-filter]"))
    button.addEventListener("click", () => {
      inboxArchived = button.dataset.inboxFilter === "true";
      inboxPage = 0;
      for (const other of root.querySelectorAll("[data-inbox-filter]"))
        other.setAttribute("aria-pressed", String(other === button));
      void loadInbox();
    });
  q<HTMLButtonElement>("[data-inbox-refresh]").addEventListener("click", () => void loadInbox());
  q<HTMLButtonElement>("[data-inbox-previous]").addEventListener("click", () => {
    if (!inboxBusy && inboxPage > 0) { inboxPage--; void loadInbox(); }
  });
  q<HTMLButtonElement>("[data-inbox-next]").addEventListener("click", () => {
    if (!inboxBusy) { inboxPage++; void loadInbox(); }
  });
  q<HTMLButtonElement>("[data-inbox-read]").addEventListener("click", () => void changeMessage("read"));
  q<HTMLButtonElement>("[data-inbox-archive]").addEventListener("click", () => void changeMessage("archive"));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
  window.addEventListener("beforeunload", (event) => {
    if (editor.open && snapshot() !== baseline) event.preventDefault();
  });
  window.setInterval(async () => {
    if (!loaded || workspace.hidden || busy || document.visibilityState !== 'visible') return;
    try {
      await loadPublications();
      render();
    } catch {}
  }, 30000);
  void load();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isInboxMessage(value: unknown): value is InboxMessage {
  return isObject(value) && Number.isSafeInteger(value.id) && Number(value.id) > 0
    && Number.isSafeInteger(value.version) && Number(value.version) >= 0
    && typeof value.name === "string" && typeof value.createdAt === "string"
    && Number.isFinite(Date.parse(value.createdAt))
    && [value.readAt, value.archivedAt].every(date => date === null
      || typeof date === "string" && Number.isFinite(Date.parse(date)))
    && ["pending", "sending", "sent", "failed"].includes(String(value.deliveryStatus));
}
function isInboxDetail(value: unknown): value is InboxDetail {
  return isInboxMessage(value) && "email" in value && typeof value.email === "string"
    && "message" in value && typeof value.message === "string";
}
function isCopy(value: unknown): value is Copy {
  return (
    isObject(value) &&
    ["title", "tagline", "problem", "decisions", "result", "body"].every(
      (field) => typeof value[field] === "string",
    )
  );
}
function isDraft(value: unknown): value is Draft {
  return (
    isObject(value) &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) >= 0 &&
    ["slug", "repositoryUrl", "liveUrl", "stack", "updatedAt"].every(
      (field) => typeof value[field] === "string",
    ) &&
    Number.isSafeInteger(value.displayOrder) &&
    Number(value.displayOrder) >= 0 &&
    (value.status === "DRAFT" || value.status === "ARCHIVED") &&
    isCopy(value.en) &&
    isCopy(value.pt) &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt))
  );
}
