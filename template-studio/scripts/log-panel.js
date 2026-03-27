(function () {
  const panelState = {
    initialized: false,
    unsubscribe: null,
    store: null,
    feedEl: null,
    copyButton: null,
    clearButton: null,
    autoScrollToggle: null,
    levelFilter: null,
    autoScroll: true,
    filter: 'all'
  };

  const LEVEL_LABELS = {
    log: 'Log',
    warn: 'Warn',
    error: 'Error'
  };

  function formatTimestamp(isoString) {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      return isoString;
    }
  }

  function stringifyArg(arg) {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) {
      return `${arg.name || 'Error'}: ${arg.message}`;
    }
    try {
      return JSON.stringify(arg, null, 2);
    } catch (error) {
      return String(arg);
    }
  }

  function buildEntryElement(entry) {
    const wrapper = document.createElement('div');
    wrapper.className = `log-entry log-entry--${entry.level}`;
    wrapper.dataset.level = entry.level;

    const header = document.createElement('div');
    header.className = 'log-entry-header';

    const levelBadge = document.createElement('span');
    levelBadge.className = 'log-level';
    levelBadge.textContent = LEVEL_LABELS[entry.level] || entry.level;

    const timestamp = document.createElement('time');
    timestamp.className = 'log-timestamp';
    timestamp.dateTime = entry.timestamp;
    timestamp.textContent = formatTimestamp(entry.timestamp);

    header.appendChild(levelBadge);
    header.appendChild(timestamp);

    const body = document.createElement('pre');
    body.className = 'log-message';
    if (Array.isArray(entry.args) && entry.args.length > 1) {
      body.textContent = entry.args.map(stringifyArg).join('\n\n');
    } else {
      body.textContent = entry.message;
    }

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  }

  function scrollToBottom() {
    if (!panelState.feedEl || !panelState.autoScroll) return;
    panelState.feedEl.scrollTop = panelState.feedEl.scrollHeight;
  }

  function matchesFilter(entry) {
    if (panelState.filter === 'all') return true;
    return entry.level === panelState.filter;
  }

  function renderEntries(entries) {
    if (!panelState.feedEl) return;
    const filtered = entries.filter(matchesFilter);
    if (!filtered.length) {
      panelState.feedEl.innerHTML = '<div class="logs-empty-state">Console output will appear here.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((entry) => fragment.appendChild(buildEntryElement(entry)));
    panelState.feedEl.innerHTML = '';
    panelState.feedEl.appendChild(fragment);
    scrollToBottom();
  }

  function handleAppend(entry) {
    if (!panelState.feedEl) return;
    if (!matchesFilter(entry)) return;
    const node = buildEntryElement(entry);
    panelState.feedEl.appendChild(node);
    scrollToBottom();
  }

  function handleStoreEvent(event) {
    if (event.type === 'reset') {
      renderEntries(panelState.store.getEntries());
      return;
    }
    if (event.type === 'append' && event.entry) {
      handleAppend(event.entry);
    }
  }

  function attachCopyHandler(button) {
    if (!button) return;

    async function copyToClipboard(text) {
      if (!text) {
        throw new Error('No content to copy');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          return;
        } catch (error) {
          console.warn('navigator.clipboard.writeText failed, falling back to execCommand copy', error);
        }
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const succeeded = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!succeeded) {
        throw new Error('execCommand copy failed');
      }
    }

    const handler = async () => {
      const entries = panelState.store?.getEntries?.() || [];
      const filtered = entries.filter(matchesFilter);
      if (!filtered.length) {
        button.textContent = 'Nothing to copy';
        setTimeout(() => { button.textContent = 'Copy Logs'; }, 1500);
        return;
      }
      const payload = filtered
        .map((entry) => {
          const argsText = Array.isArray(entry.args) && entry.args.length > 1
            ? `\n${entry.args.map(stringifyArg).join('\n')}`
            : '';
          return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}${argsText}`;
        })
        .join('\n\n');
      try {
        button.disabled = true;
        await copyToClipboard(payload);
        button.textContent = 'Copied!';
        setTimeout(() => { button.textContent = 'Copy Logs'; }, 1500);
      } catch (error) {
        console.warn('Failed to copy logs', error);
        button.textContent = 'Copy Failed';
        setTimeout(() => { button.textContent = 'Copy Logs'; }, 1500);
      } finally {
        button.disabled = false;
      }
    };
    button.addEventListener('click', handler);
  }

  function attachClearHandler(button) {
    if (!button || !panelState.store?.clear) return;
    button.addEventListener('click', () => {
      panelState.store.clear();
    });
  }

  function attachAutoScrollToggle(toggle) {
    if (!toggle) return;
    toggle.checked = panelState.autoScroll;
    toggle.addEventListener('change', () => {
      panelState.autoScroll = toggle.checked;
      if (panelState.autoScroll) {
        scrollToBottom();
      }
    });
  }

  function attachFilterHandler(selectEl) {
    if (!selectEl) return;
    selectEl.value = panelState.filter;
    selectEl.addEventListener('change', () => {
      panelState.filter = selectEl.value;
      renderEntries(panelState.store.getEntries());
    });
  }

  function initLogPanel({
    feedEl = document.getElementById('logsFeed'),
    copyButton = document.getElementById('copyLogsBtn'),
    clearButton = document.getElementById('clearLogsBtn'),
    autoScrollToggle = document.getElementById('logsAutoscrollToggle'),
    levelFilter = document.getElementById('logsLevelFilter')
  } = {}) {
    const store = window.TemplateStudioLogs;
    if (!store) {
      console.warn('TemplateStudioLogs store unavailable.');
      if (feedEl) {
        feedEl.innerHTML = '<div class="logs-empty-state">Logs unavailable in this environment.</div>';
      }
      return;
    }

    panelState.store = store;
    panelState.feedEl = feedEl;
    panelState.copyButton = copyButton;
    panelState.clearButton = clearButton;
    panelState.autoScrollToggle = autoScrollToggle;
    panelState.levelFilter = levelFilter;

    if (panelState.unsubscribe) {
      panelState.unsubscribe();
      panelState.unsubscribe = null;
    }

    panelState.unsubscribe = store.subscribe(handleStoreEvent);

    if (!panelState.initialized) {
      panelState.initialized = true;
      attachCopyHandler(copyButton);
      attachClearHandler(clearButton);
      attachAutoScrollToggle(autoScrollToggle);
      attachFilterHandler(levelFilter);
    }

    renderEntries(store.getEntries());
  }

  window.TemplateStudioLogPanel = {
    initLogPanel
  };
})();
