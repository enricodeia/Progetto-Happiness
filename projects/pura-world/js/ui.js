/* ═══════════════════════════════════════════════════════════════════════════
   UI — Growth badge, CTA animation, confetti, digit reveal
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Growth Badge ──────────────────────────────────────────────────────────

function animateGrowthBadge(growth) {
  const badge = document.getElementById('intro-growth-badge');
  const badgeTl = gsap.timeline();

  document.getElementById('badge-value').textContent = '0';

  badgeTl.to(badge, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.2)' });
  badgeTl.to('#badge-glow', { opacity: 0.8, duration: 0.25, ease: 'power2.out' }, '-=0.15');
  badgeTl.to('#badge-border', { opacity: 1, duration: 0.25, ease: 'power2.out' }, '-=0.15');
  badgeTl.to('#badge-icon', { opacity: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }, '-=0.1');
  badgeTl.to('#badge-plus', { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' }, '-=0.1');
  badgeTl.to('#badge-value', { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, '-=0.1');

  badgeTl.to({ val: 0 }, {
    val: growth, duration: 0.85, ease: 'power2.inOut',
    onUpdate: function() {
      document.getElementById('badge-value').textContent = Math.round(this.targets()[0].val).toLocaleString();
    }
  }, 0.15);

  badgeTl.to('#badge-label', { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }, '-=0.4');
  badgeTl.to('#badge-shimmer', { left: '200%', duration: 0.7, ease: 'power1.inOut' }, '-=0.2');

  return badgeTl;
}

// ── Digit Reveal ──────────────────────────────────────────────────────────

function createDigitRevealTimeline(element, targetValue, options = {}) {
  const { duration = 1.0, staggerDelay = 0.06, baseSize = 32, minSize = 18 } = options;
  const tl = gsap.timeline();
  const targetStr = String(targetValue);
  const chars = targetStr.split('');

  element.style.fontSize = `${getScaledFontSize(targetValue, baseSize, minSize)}px`;
  element.innerHTML = chars.map((char) =>
    `<span class="digit-char" data-target="${char}" style="display:inline-block;opacity:0;transform:translateY(8px)">${!isNaN(parseInt(char)) ? '0' : char}</span>`
  ).join('');

  const spans = element.querySelectorAll('.digit-char');
  spans.forEach((span, index) => {
    const targetChar = span.dataset.target;
    const isNumber = !isNaN(parseInt(targetChar));

    tl.to(span, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }, index * staggerDelay);

    if (isNumber) {
      tl.to({ val: 0 }, {
        val: 1, duration: 0.25, ease: 'power2.inOut',
        onUpdate: function() { if (Math.random() > 0.3) span.textContent = Math.floor(Math.random() * 10); },
        onComplete: function() {
          span.textContent = targetChar;
          gsap.fromTo(span,
            { color: '#81c784', scale: 1.15, textShadow: '0 0 12px rgba(129, 199, 132, 0.8)' },
            { color: '#ffffff', scale: 1, textShadow: '0 0 0px rgba(0,0,0,0)', duration: 0.25, ease: 'back.out(1.5)' }
          );
        }
      }, index * staggerDelay + 0.1);
    }
  });

  return tl;
}

// ── Confetti ──────────────────────────────────────────────────────────────

function createConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#4ade80', '#22c55e', '#86efac', '#fbbf24', '#bbf7d0', '#ffffff', '#a3e635'];
  const shapes = ['circle', 'square', 'ribbon'];

  for (let i = 0; i < 80; i++) {
    const delay = i * 0.012;
    const confetti = document.createElement('div');
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    confetti.className = `confetti confetti--${shape}`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = `${50 + (Math.random() - 0.5) * 60}%`;
    confetti.style.top = '40%';
    container.appendChild(confetti);

    const angle = (Math.random() - 0.5) * Math.PI * 1.5;
    const velocity = 200 + Math.random() * 300;
    const xEnd = Math.sin(angle) * velocity;
    const yEnd = -Math.cos(angle) * velocity * 0.7 + Math.random() * 200;
    const dur = 1.5 + Math.random();

    gsap.timeline({ delay })
      .to(confetti, { opacity: 1, duration: 0.1 })
      .to(confetti, { x: xEnd, y: yEnd, rotation: (Math.random() - 0.5) * 720, duration: dur, ease: 'power2.out' }, 0)
      .to(confetti, { y: `+=${300 + Math.random() * 200}`, opacity: 0, duration: dur * 0.6, ease: 'power1.in' }, dur * 0.5)
      .call(() => confetti.remove());
  }
}

// ── Live Growth Preview ───────────────────────────────────────────────────

function updateGrowthPreview() {
  const prev = parseInt(document.getElementById('setup-previous').value) || 0;
  const curr = parseInt(document.getElementById('setup-current').value) || 0;
  const diff = curr - prev;
  const el = document.getElementById('setup-growth-preview');
  if (!el) return;

  if (diff > 0) {
    el.textContent = `+${diff.toLocaleString()} new followers`;
    el.style.color = '#4ade80';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  } else if (diff === 0 || isNaN(diff)) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';
    setTimeout(() => { if (el.style.opacity === '0') el.textContent = ''; }, 400);
  } else {
    el.textContent = `${diff.toLocaleString()} followers`;
    el.style.color = '#ef4444';
    el.style.opacity = '0.8';
    el.style.transform = 'translateY(0)';
  }
}

document.getElementById('setup-previous').addEventListener('input', updateGrowthPreview);
document.getElementById('setup-current').addEventListener('input', updateGrowthPreview);
updateGrowthPreview();
