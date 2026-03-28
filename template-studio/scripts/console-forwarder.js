(function () {
  const LEVELS = ['log', 'warn', 'error'];
  const MAX_LOGS = 500;
  const original = {};
  const store = [];
  const subscribers = new Set();

  const logApi = {
    getEntries() {
      return store.slice();
    },
    subscribe(fn) {
      if (typeof fn !== 'function') {
        return () => {};
      }
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    clear() {
      if (!store.length) return;
      store.length = 0;
      notify({ type: 'reset' });
    }
  };

  function notify(event) {
    subscribers.forEach((fn) => {
      try {
        fn(event);
      } catch (error) {
        // ignore subscriber errors
      }
    });
  }

  function formatTimestamp(isoString) {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      return isoString;
    }
  }

  function pushEntry(entry) {
    store.push(entry);
    if (store.length > MAX_LOGS) {
      store.shift();
    }
    notify({ type: 'append', entry });
  }

  function formatArg(arg) {
    if (arg instanceof Error) {
      return `${arg.name || 'Error'}: ${arg.message}`;
    }
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }
    if (arg === undefined) return 'undefined';
    if (arg === null) return 'null';
    try {
      return JSON.stringify(arg, null, 2);
    } catch (error) {
      return String(arg);
    }
  }

  function serializeArg(arg) {
    try {
      if (arg instanceof Error) {
        return {
          message: arg.message,
          stack: arg.stack,
          name: arg.name
        };
      }
      if (typeof arg === 'object' && arg !== null) {
        return JSON.parse(JSON.stringify(arg));
      }
      return arg;
    } catch (error) {
      return String(arg);
    }
  }

  LEVELS.forEach((level) => {
    if (typeof console[level] !== 'function') {
      return;
    }

    original[level] = console[level].bind(console);
    console[level] = (...args) => {
      try {
        original[level](...args);
      } catch (err) {
        // ignore console errors
      }

      try {
        const timestamp = new Date().toISOString();
      const entry = {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          level,
          args: args.map(serializeArg),
          message: args.map(formatArg).join(' '),
          timestamp,
          formattedTimestamp: formatTimestamp(timestamp)
        };
        pushEntry(entry);
      } catch (err) {
        // Swallow errors so we never break the console
      }
    };
  });

  if (typeof window !== 'undefined') {
    window.TemplateStudioLogs = logApi;
  }
})();
