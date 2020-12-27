// low level calls - called before all other js
(function() {
  var userAgent = window.navigator.userAgent.toLowerCase();
  var ios = /iphone|ipod|ipad/.test(userAgent);
  if (ios) {
    document.documentElement.className += ' ios-user-agent'
  }
})();