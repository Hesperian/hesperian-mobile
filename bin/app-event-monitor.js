function appEventMonitorScript() {
  const globalRef = globalThis;
  globalRef.__hesperianAutomation = true;

  if (globalRef.__hesperianAppEventMonitor) {
    globalRef.__hesperianAppEventMonitor.init();
    return;
  }

  const EVENTS = [
    { name: 'appInit', methodSuffix: 'AppInit' },
    { name: 'page:afterin', methodSuffix: 'PageAfterIn' },
  ];

  const state = {
    initialized: false,
    counts: Object.create(null),
    waiters: Object.create(null),
  };

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

  const AppEventMonitor = {
    init() {
      if (state.initialized) {
        return;
      }

      state.initialized = true;

      EVENTS.forEach(({ name }) => {
        state.counts[name] = 0;
        state.waiters[name] = [];
      });

      EVENTS.forEach(({ name }) => {
        document.addEventListener(name, () => {
          state.counts[name] += 1;
          resolveWaiters(name, state.counts[name]);
        });
      });
    },
  };

  EVENTS.forEach(({ name, methodSuffix }) => {
    const waitKey = `waitFor${methodSuffix}`;
    const getCountKey = `get${methodSuffix}Count`;

    AppEventMonitor[waitKey] = (targetCount) => {
      const desired = typeof targetCount === 'number'
        ? targetCount
        : state.counts[name] + 1;

      if (state.counts[name] >= desired) {
        return Promise.resolve(state.counts[name]);
      }

      return new Promise((resolve) => {
        state.waiters[name].push({ targetCount: desired, resolve });
      });
    };

    AppEventMonitor[getCountKey] = () => {
      return state.counts[name];
    };
  });

  AppEventMonitor.init();
  globalRef.__hesperianAppEventMonitor = AppEventMonitor;
}

module.exports = appEventMonitorScript;
