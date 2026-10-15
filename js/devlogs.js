/* ------------------------------------------------------------------
   devlogs.js: Devlogs page extras.
     - if the IndieDB ranking badge can't load (offline, blocked, or the
       site is down), hide it instead of showing a broken image
   Needs js/dev-home.js (menu, reveal, spotlight, typed prompt) and
   js/indiedb-widget.js (the post cards).
------------------------------------------------------------------- */

(function () {
  "use strict";

  var badge = document.getElementById("rankBadge");
  if (!badge) return;

  function hide() { badge.hidden = true; }

  badge.addEventListener("error", hide);

  // the error may have fired before this script ran: check again once everything has loaded
  window.addEventListener("load", function () {
    if (badge.complete && badge.naturalWidth === 0) hide();
  });
})();
