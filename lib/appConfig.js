/*
 *  appConfig
 * 
 *  
 */



// Default values
let config = {

};

function saveConfig() {
  window.localStorage.setItem('appConfig', JSON.stringify(config));
  window.app.root[0].dispatchEvent(new CustomEvent('appConfigChanged', {bubbles: true, detail: window.app}));
}

const appConfig = {
  init: function(version) {
    try {
      const initialConfig = window.localStorage.getItem('appConfig');
      const initialConfigObject = JSON.parse(initialConfig);
    
      if (typeof initialConfigObject === 'object' && version === initialConfigObject.version) {
        Object.assign(config, initialConfigObject);
      }
      config.version = version;
    } catch (e) {}  
  },
  get: function(key) {
    return config[key];
  },
  set: function(key, value) {
    if (config[key] !== value) {
      config[key] = value;
      saveConfig();
    }

    return config[key];
  },

  locale: function(loc) {
    if (loc && (loc !== config.locale)) {
      config.locale = loc;
      saveConfig();
    }

    return config.locale;
  },
  favorites: function(fav) {
    if (fav) {
      config.favorites = fav;
      saveConfig();
    }

    return config.favorites || [];
  },
  availableMethods: function(methods) {
    if (methods) {
      config.availableMethods = methods;
      saveConfig();
    }

    return config.availableMethods;
  }
};

export {
  appConfig
};