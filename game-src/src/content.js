// ============================================================
//  EDIT ME — all portfolio text/links used by the game live here
// ============================================================
export const LINKS = {
  portfolio: 'Portfolio.html',
  cv: 'resumecv.html',
  devlogs: 'Devlogs.html',
  home: 'index.html',
  unreliable: 'PagesInsideHorrorSystemsDesign_Section/P_SS_SD_UnreliableReality.html',
  horrorQuests: 'PagesInsideNarrativeDesign_Section/P_SS_ND_HorrorQuests.html',
  threeD: 'https://3-d-portfolio-blush-rho.vercel.app',
  sketchfab: 'https://sketchfab.com/unifasDev',
  indiedb: 'https://www.indiedb.com/members/unifasdraws',
  btq: 'https://www.indiedb.com/games/beneath-the-questline',
  email: '',      // e.g. 'you@mail.com'  (shown in the Contact Room if filled)
  linkedin: '',   // e.g. 'https://www.linkedin.com/in/...'
};

// Pieces the monster drags to your face when he catches you (shown in this order, shuffled lightly, never repeated until all were shown)
export const PIECES = [
  { id:'ur', title:'Unreliable Reality', tag:'HORROR SYSTEMS', hue:0,
    role:'Systems Designer · Technical Designer · Prototyper', tools:'Unreal Engine',
    blurb:'A reusable horror system: objects ask permission to do something unsettling, and a central Horror Director decides if the moment is right. Built from scratch, more versatile and more random than the paid tool that inspired it. This very game runs on a small version of it.',
    status:'In development', links:[['Open the project page', LINKS.unreliable]] },
  { id:'btq', title:'Beneath the Questline', tag:'GAME · DEVLOGS', hue:300,
    role:'Game Designer · Narrative Designer · 3D Artist', tools:'Unreal Engine · Blender',
    blurb:'A horror game where you accept quests that are never what they seem. 91 pages of GDD. Paused for coursework, never abandoned. The Horror Director is coming back to it.',
    status:'Paused — returning soon', links:[['Devlogs', LINKS.devlogs], ['IndieDB page', LINKS.btq]] },
  { id:'hq', title:'Horror Quests', tag:'NARRATIVE DESIGN', hue:20,
    role:'Narrative & Quest Designer', tools:'Writing · GDD',
    blurb:'Three quests written in full detail for Beneath the Questline: each one promises something and delivers something worse.',
    status:'Written', links:[['Read the quests', LINKS.horrorQuests]] },
  { id:'ols', title:'One Last Score', tag:'GAME', hue:45,
    role:'See project page', tools:'See project page',
    blurb:'One of the games on my grid. The full breakdown (role, tools, problems, solutions) is on the portfolio page.',
    status:'', links:[['Open the portfolio', LINKS.portfolio]] },
  { id:'oup', title:'Once Upon a Page', tag:'GAME', hue:200,
    role:'See project page', tools:'See project page',
    blurb:'Another game from my grid. Open the portfolio page for the full write-up.',
    status:'', links:[['Open the portfolio', LINKS.portfolio]] },
  { id:'rm', title:'The Royal Machine', tag:'3D · RIG · ANIMATION', hue:40,
    role:'3D Artist · Rigger · Animator', tools:'Blender',
    blurb:'Modelled, textured, rigged and animated. If I need it for a game, I can make it, map it, rig it and animate it.',
    status:'Finished', links:[['3D portfolio', LINKS.threeD], ['Sketchfab turntables', LINKS.sketchfab]] },
  { id:'wl', title:"Wizard's Laboratory", tag:'3D · ENVIRONMENT', hue:270,
    role:'3D Artist', tools:'Blender',
    blurb:'A wizard lab environment I built for my own game. Props, materials and layout.',
    status:'Finished', links:[['Sketchfab', LINKS.sketchfab], ['3D portfolio', LINKS.threeD]] },
  { id:'pb', title:'Powerbound CLA', tag:'3D · PRODUCT', hue:150,
    role:'3D Artist', tools:'Blender',
    blurb:'A product advertisement render for a supplements brand.',
    status:'Finished', links:[['Sketchfab', LINKS.sketchfab], ['3D portfolio', LINKS.threeD]] },
  { id:'dc', title:'Developer Computer', tag:'3D · PROP', hue:180,
    role:'3D Artist', tools:'Blender',
    blurb:'School project prop: a developer computer, modelled and textured to be game-ready.',
    status:'Finished', links:[['Sketchfab', LINKS.sketchfab]] },
  { id:'cv', title:'The CV', tag:'RESUME', hue:90,
    role:'Francisco Alberto Martins dos Santos', tools:'Unreal Engine · Blender · Unity',
    blurb:'Games & Multimedia student. Looking for a 640-hour game studio internship, 15 Feb to 29 May 2027.',
    status:'Open to work', links:[['Open the CV', LINKS.cv]] },
];

export const ROOM_COPY = {
  office: { title:'UNI FAS DEV — Home', html:`
    <p class="mono dim">Monster: "Oh, good. You came. Sit. Please. I made all of this."</p>
    <p>I'm <b>Francisco</b>, a Games &amp; Multimedia student who designs <b>horror systems and tension</b>, and builds the 3D to go with it (Blender, Unreal, Unity).</p>
    <p>This workshop is the portfolio. Every room is a section of my website. Every time the Developer catches you, he drags a real piece of my work to your face.</p>
    <p class="dim">Next: the door to the <b>Portfolio Room</b> is now unlocked.</p>` },
  portfolio: { title:'PROJECTS', html:`
    <p>Games, jams and personal projects. Frames on the walls open the work up close.</p>
    <ul class="plist"><li><b>Beneath the Questline</b> — horror, quests never what they seem</li><li><b>One Last Score</b></li><li><b>Once Upon a Page</b></li><li><b>Game jams &amp; personal projects</b></li></ul>
    <p><a class="lnk" target="_blank" rel="noopener" href="${LINKS.portfolio}">Open the full portfolio ↗</a></p>` },
  dev: { title:'3D / ASSETS / RIGGING', html:`
    <p>Models, props, rigs and animation, all made in Blender. Check the pedestals.</p>
    <p><a class="lnk" target="_blank" rel="noopener" href="${LINKS.threeD}">3D portfolio ↗</a> <a class="lnk" target="_blank" rel="noopener" href="${LINKS.sketchfab}">Sketchfab ↗</a></p>` },
  design: { title:'HORROR_TENSION /', html:`
    <p class="mono dim">Folder contents:</p>
    <div id="hfiles"><button class="file" data-f="Threat_Design.pdf">Threat_Design.pdf</button> <button class="file" data-f="AI_State_Machine.pdf">AI_State_Machine.pdf</button> <button class="file" data-f="Sound_Design.pdf">Sound_Design.pdf</button> <button class="file" data-f="Encounter_Design.pdf">Encounter_Design.pdf</button> <button class="file hot" data-f="THE_INTERVIEWER">THE_INTERVIEWER</button></div>
    <p id="hout" class="mono dim">Click a file.</p>
    <p><a class="lnk" target="_blank" rel="noopener" href="${LINKS.unreliable}">Unreliable Reality ↗</a> <a class="lnk" target="_blank" rel="noopener" href="${LINKS.horrorQuests}">Horror Quests ↗</a></p>` },
  archive: { title:'CV.pdf', html:`
    <p><b>FRANCISCO ALBERTO MARTINS DOS SANTOS</b></p>
    <p><b>Game Design:</b> Gameplay, Horror / Tension, Systems, Level, Narrative, Quest, AI Behavior, UX/UI, QA.<br><b>Technical:</b> Unreal Engine, Blender, 3D Modeling, Materials, Rigging, Prototyping.</p>
    <p class="mono">"You could just have downloaded my CV."</p>
    <p><a class="btn-lnk" target="_blank" rel="noopener" href="${LINKS.cv}">DOWNLOAD CV</a> <a class="lnk" target="_blank" rel="noopener" href="${LINKS.devlogs}">Devlogs ↗</a></p>` },
};
