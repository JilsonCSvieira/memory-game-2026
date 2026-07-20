'use strict';

const PLAYER_POOL = [
  { id: 'vozinha', initials: 'VO', name: 'Vozinha', position: 'Goalkeeper', number: '1' },
  { id: 'logan-costa', initials: 'LC', name: 'Logan Costa', position: 'Defender', number: '5' },
  { id: 'pico-lopes', initials: 'PL', name: 'Roberto “Pico” Lopes', position: 'Defender', number: '4' },
  { id: 'joao-paulo', initials: 'JP', name: 'João Paulo Fernandes', position: 'Defender', number: '3' },
  { id: 'kevin-pina', initials: 'KP', name: 'Kevin Pina', position: 'Midfielder', number: '16' },
  { id: 'jamiro', initials: 'JM', name: 'Jamiro Monteiro', position: 'Midfielder', number: '10' },
  { id: 'deroy', initials: 'DD', name: 'Deroy Duarte', position: 'Midfielder', number: '8' },
  { id: 'ryan', initials: 'RM', name: 'Ryan Mendes', position: 'Forward', number: '20' },
  { id: 'dailon', initials: 'DL', name: 'Dailon Livramento', position: 'Forward', number: '21' },
  { id: 'jovane', initials: 'JC', name: 'Jovane Cabral', position: 'Forward', number: '7' },
  { id: 'helio', initials: 'HV', name: 'Hélio Varela', position: 'Forward', number: '11' },
  { id: 'gilson', initials: 'GB', name: 'Gilson Benchimol', position: 'Forward', number: '9' }
];

const state = {
  deck: [],
  open: [],
  matched: new Set(),
  moves: 0,
  elapsed: 0,
  timerId: null,
  started: false,
  locked: false,
  pairs: 10
};

const $ = (selector) => document.querySelector(selector);
const board = $('#board');
const status = $('#status');

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function ratingFor(moves, pairCount) {
  const ratio = moves / pairCount;
  if (ratio <= 1.4) return { stars: 5, label: 'World class' };
  if (ratio <= 1.8) return { stars: 4, label: 'Excellent' };
  if (ratio <= 2.3) return { stars: 3, label: 'Strong game' };
  if (ratio <= 3) return { stars: 2, label: 'Good effort' };
  return { stars: 1, label: 'Keep training' };
}

function renderStars(stars) {
  $('#stars').textContent = `${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
  $('#stars').setAttribute('aria-label', `${stars} out of 5 stars`);
}

function updateStats() {
  $('#moves').textContent = state.moves;
  $('#pairs').textContent = `${state.matched.size}/${state.pairs}`;
  $('#timer').textContent = formatTime(state.elapsed);
  renderStars(ratingFor(state.moves, state.pairs).stars);
}

function bestKey() {
  return `blue-sharks-best-${state.pairs}`;
}

function renderBest() {
  const best = JSON.parse(localStorage.getItem(bestKey()) || 'null');
  $('#best').textContent = best ? `${best.moves} / ${formatTime(best.time)}` : '—';
}

function startTimer() {
  if (state.started) return;
  state.started = true;
  state.timerId = window.setInterval(() => {
    state.elapsed += 1;
    $('#timer').textContent = formatTime(state.elapsed);
  }, 1000);
}

function stopTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function cardTemplate(card, index) {
  return `
    <button class="card" type="button" role="gridcell" data-index="${index}"
      aria-label="Hidden memory card ${index + 1}" aria-pressed="false">

      <span class="card-inner">

        <span class="card-face card-back" aria-hidden="true">
          <img
            src="assets/images/logos/fcf-logo.png"
            alt="FCF Logo"
            class="card-logo">

          <h3 class="card-back-title">TUBARÕES AZUIS</h3>

          <p class="card-back-subtitle">MEMORY GAME</p>

          <span class="card-back-year">FIFA 2026</span>
        </span>

        <span class="card-face card-front">
          <span class="shirt-number">${card.number}</span>

          <span class="country-flag">
            <img
              src="assets/images/logos/cabo-verde-flag.png"
              alt="Cape Verde Flag">
          </span>

          <span class="avatar">
            <img
              src="assets/images/players/${card.id}.${card.id === 'pico-lopes' ? 'jpg' : 'webp'}"
              alt="${card.name}">
          </span>
        </span>

      </span>
    </button>`;
}

function buildBoard() {
  const selected = shuffle(PLAYER_POOL).slice(0, state.pairs);
  state.deck = shuffle([...selected, ...selected].map((card, uid) => ({ ...card, uid })));
  board.className = `pairs-${state.pairs}`;
  board.innerHTML = state.deck.map(cardTemplate).join('');

  board.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', handleCardClick);
  });
}

function revealCard(element, card) {
  element.classList.add('flipped');
  element.setAttribute('aria-pressed', 'true');
  element.setAttribute('aria-label', `${card.name}, ${card.position}`);
}

function hideCard(element, index) {
  element.classList.remove('flipped');
  element.setAttribute('aria-pressed', 'false');
  element.setAttribute('aria-label', `Hidden memory card ${index + 1}`);
}

function handleCardClick(event) {
  const element = event.currentTarget;
  const index = Number(element.dataset.index);
  const card = state.deck[index];

  if (state.locked || state.open.includes(index) || state.matched.has(card.id)) return;

  startTimer();
  revealCard(element, card);
  state.open.push(index);

  if (state.open.length === 2) checkPair();
}

function checkPair() {
  state.locked = true;
  state.moves += 1;
  updateStats();

  const [firstIndex, secondIndex] = state.open;
  const first = state.deck[firstIndex];
  const second = state.deck[secondIndex];
  const elements = board.querySelectorAll('.card');

  if (first.id === second.id) {
    elements[firstIndex].classList.add('matched');
    elements[secondIndex].classList.add('matched');
    elements[firstIndex].disabled = true;
    elements[secondIndex].disabled = true;
    state.matched.add(first.id);
    state.open = [];
    state.locked = false;
    status.textContent = `Match found: ${first.name}.`;
    updateStats();

    if (state.matched.size === state.pairs) window.setTimeout(finishGame, 450);
    return;
  }

  status.textContent = 'No match. Try again.';
  window.setTimeout(() => {
    hideCard(elements[firstIndex], firstIndex);
    hideCard(elements[secondIndex], secondIndex);
    state.open = [];
    state.locked = false;
  }, 750);
}

function saveBest() {
  const current = { moves: state.moves, time: state.elapsed };
  const previous = JSON.parse(localStorage.getItem(bestKey()) || 'null');
  const isBetter = !previous || current.moves < previous.moves ||
    (current.moves === previous.moves && current.time < previous.time);
  if (isBetter) localStorage.setItem(bestKey(), JSON.stringify(current));
}

function finishGame() {
  stopTimer();
  const rating = ratingFor(state.moves, state.pairs);
  saveBest();
  renderBest();
  $('#m-moves').textContent = state.moves;
  $('#m-time').textContent = formatTime(state.elapsed);
  $('#m-stars').textContent = '⭐'.repeat(rating.stars);
  $('#m-rating').textContent = rating.label;
  $('#overlay').classList.add('show');
  $('#play-again').focus();
  startConfetti();
}

function restartGame() {
  stopTimer();
  stopConfetti();
  state.open = [];
  state.matched = new Set();
  state.moves = 0;
  state.elapsed = 0;
  state.started = false;
  state.locked = false;
  state.pairs = Number($('#difficulty').value);
  $('#overlay').classList.remove('show');
  updateStats();
  renderBest();
  buildBoard();
  status.textContent = 'New game started.';
}

let confettiFrame = null;
let confettiPieces = [];

function startConfetti() {
  const canvas = $('#confetti-canvas');
  const context = canvas.getContext('2d');
  const wrap = $('#wrap');
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  const colors = ['#003893', '#cf0921', '#f7d116', '#ffffff'];

  confettiPieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: 5 + Math.random() * 7,
    speed: 2 + Math.random() * 3,
    drift: Math.random() * 1.2 - 0.6,
    angle: Math.random() * Math.PI,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    confettiPieces.forEach((piece) => {
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 1.5);
      context.restore();
      piece.y += piece.speed;
      piece.x += piece.drift;
      piece.angle += 0.04;
      if (piece.y > canvas.height + 20) piece.y = -20;
    });
    confettiFrame = requestAnimationFrame(draw);
  }

  draw();
}

function stopConfetti() {
  if (confettiFrame) cancelAnimationFrame(confettiFrame);
  confettiFrame = null;
  const canvas = $('#confetti-canvas');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

$('#restart').addEventListener('click', restartGame);
$('#play-again').addEventListener('click', restartGame);
$('#difficulty').addEventListener('change', restartGame);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('#overlay').classList.contains('show')) restartGame();
});

$('#closeVictoryModal').addEventListener('click', () => {
  $('#overlay').classList.remove('show');
});

restartGame();