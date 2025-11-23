const SUPPORTED_EVENTS = ['appInit', 'page:afterin'];

function appEventMonitorScript(eventNames) {
  const defaultEvents = ['appInit', 'page:afterin'];
  const events = Array.isArray(eventNames) && eventNames.length
    ? Array.from(new Set(eventNames))
    : defaultEvents;

  const globalRef = globalThis;
  globalRef.__hesperianAutomation = true;

  if (globalRef.__hesperianAppEventMonitor) {
    globalRef.__hesperianAppEventMonitor.init(events);
    return;
  }

  const state = {
    initializedEvents: new Set(),
    counts: Object.create(null),
    waiters: Object.create(null),
  };

  function ensureEventStorage(name) {
    if (!(name in state.counts)) {
      state.counts[name] = 0;
    }
    if (!Array.isArray(state.waiters[name])) {
      state.waiters[name] = [];
    }
  }

  function resolveWaiters(eventName, count) {
    const queue = state.waiters[eventName];
    if (!queue || !queue.length) {
      return;
    }

    state.waiters[eventName] = queue.filter((waiter) => {
      if (count >= waiter.targetCount) {
        waiter.resolve(count);
        return false;
      }
      return true;
    });
  }

  function registerEvent(name) {
    if (state.initializedEvents.has(name)) {
      return;
    }

    ensureEventStorage(name);
    document.addEventListener(name, () => {
      state.counts[name] += 1;
      resolveWaiters(name, state.counts[name]);
    });
    state.initializedEvents.add(name);
  }

  const AppEventMonitor = {
    init(eventList) {
      const list = Array.isArray(eventList) && eventList.length ? eventList : events;
      list.forEach(registerEvent);
    },

    waitForEvent(eventName, targetCount) {
      if (!state.initializedEvents.has(eventName)) {
        registerEvent(eventName);
      }

      const desired = typeof targetCount === 'number'
        ? targetCount
        : state.counts[eventName] + 1;

      if (state.counts[eventName] >= desired) {
        return Promise.resolve(state.counts[eventName]);
      }

      return new Promise((resolve) => {
        state.waiters[eventName].push({ targetCount: desired, resolve });
      });
    },

    getEventCount(eventName) {
      if (!(eventName in state.counts)) {
        return 0;
      }
      return state.counts[eventName];
    },

    getSupportedEvents() {
      return Array.from(state.initializedEvents);
    },
  };

  AppEventMonitor.init(events);
  globalRef.__hesperianAppEventMonitor = AppEventMonitor;
}

async function getEventCount(page, eventName) {
  return page.evaluate((name) => {
    const monitor = globalThis.__hesperianAppEventMonitor;
    if (!monitor || typeof monitor.getEventCount !== 'function') {
      return 0;
    }
    return monitor.getEventCount(name);
  }, eventName);
}

async function waitForEvent(page, eventName, {
  contextLabel = '',
  timeout = 30000,
  baselineCount = null,
  targetCount = null,
} = {}) {
  const description = contextLabel ? ` (${contextLabel})` : '';
  const initialBaseline = baselineCount ?? (await getEventCount(page, eventName));
  const desiredCount = typeof targetCount === 'number' ? targetCount : initialBaseline + 1;

  if (initialBaseline >= desiredCount) {
    return initialBaseline;
  }

  const waitPromise = page.evaluate(({ name, count }) => {
    const monitor = globalThis.__hesperianAppEventMonitor;
    if (!monitor || typeof monitor.waitForEvent !== 'function') {
      throw new Error('AppEventMonitor is not available in the browser context');
    }
    return monitor.waitForEvent(name, count);
  }, { name: eventName, count: desiredCount }).then((count) => ({ count }));

  const timeoutPromise = page.waitForTimeout(timeout).then(() => ({ timeout: true }));

  const result = await Promise.race([waitPromise, timeoutPromise]);

  if (result && result.timeout) {
    throw new Error(`Timed out waiting for ${eventName}${description}: exceeded ${timeout}ms`);
  }

  return result && typeof result.count === 'number' ? result.count : desiredCount;
}

module.exports = {
  script: appEventMonitorScript,
  getEventCount,
  waitForEvent,
  SUPPORTED_EVENTS,
};
