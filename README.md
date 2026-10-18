# THE INTERVIEW — UNI FAS Workshop (first-person horror portfolio)

Drop-in files for the root of your dev site:
- workshop.html
- CssStuff/workshop.css
- js/workshop.js          (built bundle, three.js included — no other install needed)
- img/workshop-blueprint.webp

Add a link on your homepage, e.g.:  <a href="workshop.html">Play the Workshop</a>

Edit text/links/pieces: game-src/src/content.js  (LINKS.email and LINKS.linkedin are empty — fill them)
Rebuild after editing:   cd game-src && npm install && npm run build   (writes out/js/workshop.js — copy it to js/)
Debug: workshop.html?debug=1 (F3 toggles the Horror Director overlay)
