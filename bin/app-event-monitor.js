function appEventMonitorScript(eventNames) {
  const events = ['appInit', 'page:afterin'];

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

module.exports = appEventMonitorScript;
