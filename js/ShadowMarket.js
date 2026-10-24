const objects = {
  musicbox: { name: 'Locked Music Box', meaning: 'A song with no beginning', icon: '♫', note: 'The ledger ink gathers at the word “home”. The keyhole is warm, though the box has never been wound.' },
  memory: { name: 'Bottle of Memory', meaning: 'Something almost remembered', icon: '◉', note: 'A pale thread floats inside the glass. The label changes when you look away; tonight it bears your handwriting.' },
  lens: { name: 'Cracked Lens', meaning: 'A reflection with its own past', icon: '◌', note: 'Through the fracture, the market looks newly built. In the reflection, someone is already waiting at the counter.' },
  flower: { name: 'Withered Flower', meaning: 'A life that refuses to finish', icon: '✿', note: 'The petals are dry, but the stem is warm. A soft hum comes from the soil caught between its roots.' }
};

const visitors = [
  { type: 'THE LOST', request: '“Do you have something to quiet my shadow?”', read: 'A glance that keeps falling to the floor.', affinity: ['flower', 'musicbox'], hint: 'Their shadow gathers near the lantern. The flower turns faintly toward them.' },
  { type: 'THE ECHO', request: '“I came to return what I borrowed. I think.”', read: 'The sentence arrives twice, a little less certain the second time.', affinity: ['lens', 'memory'], hint: 'They repeat the last word. A reflection in the glass seems to answer.' },
  { type: 'THE COLLECTOR', request: '“I need the thing that remembers me correctly.”', read: 'Their gaze rests on each object as if greeting an old friend.', affinity: ['lens', 'musicbox'], hint: 'They never blink at the cracked lens. The lantern dims around its edge.' }
];

let visitorIndex = 0;
let night = 4;
let stability = 72;
let distortion = 18;
let resolved = false;
let selectedItem = null;

const $ = (selector) => document.querySelector(selector);
const options = $('#item-options');

function renderOptions() {
  options.innerHTML = Object.entries(objects).map(([id, item]) => `
    <button class="item-choice" data-choice="${id}" type="button" aria-label="Offer ${item.name}">
      <span class="choice-icon">${item.icon}</span><span class="choice-name">${item.name}</span><span class="choice-meaning">${item.meaning}</span>
    </button>`).join('');
  options.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => resolveExchange(button.dataset.choice)));
}

function updateMeters() {
  $('#stability-value').textContent = stability;
  $('#distortion-value').textContent = distortion;
  $('#stability-bar').style.width = `${stability}%`;
  $('#distortion-bar').style.width = `${distortion}%`;
  const mood = distortion > 48 ? 'THE FOG IS INSIDE THE STALL' : distortion > 30 ? 'THE FOG IS LOW' : 'THE FOG IS LOW';
  $('#night-time').textContent = `LATE — ${mood}`;
  $('#market-ui').classList.toggle('unsteady', distortion > 48);
}

function resolveExchange(itemId) {
  if (resolved) return;
  resolved = true;
  selectedItem = itemId;
  const visitor = visitors[visitorIndex];
  const resonant = visitor.affinity.includes(itemId);
  stability = Math.max(0, Math.min(100, stability + (resonant ? 4 : -5)));
  distortion = Math.max(0, Math.min(100, distortion + (resonant ? 2 : 9)));
  options.querySelectorAll('.item-choice').forEach(button => {
    button.classList.toggle('selected', button.dataset.choice === itemId);
    button.disabled = true;
  });
  $('#refuse-button').disabled = true;
  const result = resonant
    ? `${objects[itemId].name} settles into their hands. Their shoulders loosen; the lantern steadies for a breath.`
    : `${objects[itemId].name} disappears beneath their coat. They thank you. The lantern flame leans away.`;
  showOutcome(result);
  updateMeters();
  setNextLabel();
}

function refuseExchange() {
  if (resolved) return;
  resolved = true;
  stability = Math.max(0, stability - 1);
  distortion = Math.max(0, distortion + 3);
  $('#refuse-button').disabled = true;
  options.querySelectorAll('.item-choice').forEach(button => button.disabled = true);
  const visitor = visitors[visitorIndex];
  showOutcome(`You keep the object. ${visitor.type === 'THE LOST' ? 'They leave without looking back.' : 'They nod, as if you have answered a different question.'} The market makes a small note of it.`);
  updateMeters();
  setNextLabel();
}

function showOutcome(message) {
  $('#outcome-text').textContent = message;
  $('#outcome').classList.add('shown');
  $('#next-button').hidden = false;
}

function setNextLabel() {
  $('#next-button').innerHTML = visitorIndex < visitors.length - 1
    ? 'Next visitor <span>→</span>'
    : 'Close the night <span>→</span>';
}

function loadVisitor() {
  const visitor = visitors[visitorIndex];
  resolved = false;
  selectedItem = null;
  $('#visitor-type').textContent = visitor.type;
  $('#visitor-request').textContent = visitor.request;
  $('#visitor-read').textContent = visitor.read;
  $('#visitor-count').textContent = `0${visitorIndex + 1} / 03`;
  $('#outcome-text').textContent = visitor.hint;
  $('#outcome').classList.remove('shown');
  $('#next-button').hidden = true;
  $('#refuse-button').disabled = false;
  renderOptions();
}

function closeNight() {
  night += 1;
  visitorIndex = 0;
  stability = Math.min(100, stability + (distortion < 38 ? 3 : -2));
  distortion = Math.max(0, Math.min(100, distortion + (stability < 35 ? 7 : 4)));
  $('#night-number').textContent = `NIGHT ${String(night).padStart(2, '0')}`;
  $('#visitor-count').textContent = '01 / 03';
  loadVisitor();
  updateMeters();
  $('#outcome-text').textContent = 'Morning comes late. The market is waiting for you again.';
  $('#outcome').classList.add('shown');
  window.setTimeout(() => $('#outcome').classList.remove('shown'), 2400);
}

$('#refuse-button').addEventListener('click', refuseExchange);
$('#next-button').addEventListener('click', () => {
  if (visitorIndex < visitors.length - 1) {
    visitorIndex += 1;
    loadVisitor();
  } else {
    closeNight();
  }
});

const ledgerNotes = {
  musicbox: objects.musicbox.note,
  memory: objects.memory.note,
  lens: objects.lens.note,
  flower: objects.flower.note
};
const detail = $('#object-detail');
document.querySelectorAll('.object-card').forEach(card => card.addEventListener('click', () => {
  document.querySelectorAll('.object-card').forEach(item => item.classList.remove('active'));
  card.classList.add('active');
  $('#detail-text').textContent = ledgerNotes[card.dataset.item];
  detail.classList.add('open');
}));
$('#close-detail').addEventListener('click', () => {
  detail.classList.remove('open');
  document.querySelectorAll('.object-card').forEach(item => item.classList.remove('active'));
});

loadVisitor();
updateMeters();
