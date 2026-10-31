// ── NAVBAR SCROLL ────────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
const siteHeader = document.querySelector('.site-header');
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
const scrollTopBtn = document.getElementById('scrollTop');
const isHome = document.body.classList.contains('home-page');

function updateNav() {
  if (!navbar) return;
  const scrolled = window.scrollY > 80;
  siteHeader.style.opacity = scrolled ? '0' : '1';
  siteHeader.style.pointerEvents = scrolled ? 'none' : '';
  siteHeader.style.transition = 'opacity .3s';
  if (scrollTopBtn) {
    window.scrollY > 200 ? scrollTopBtn.classList.add('show') : scrollTopBtn.classList.remove('show');
  }
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── MOBILE NAV ───────────────────────────────────────────────────────────
hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileNav?.classList.toggle('open');
  document.body.style.overflow = mobileNav?.classList.contains('open') ? 'hidden' : '';
});

document.querySelectorAll('.mobile-nav-link[data-toggle]').forEach(link => {
  link.addEventListener('click', () => {
    const sub = document.getElementById(link.dataset.toggle);
    sub?.classList.toggle('open');
    const icon = link.querySelector('.toggle-icon');
    if (icon) icon.textContent = sub?.classList.contains('open') ? '−' : '+';
  });
});

// Close mobile nav on link click
document.querySelectorAll('.mobile-sub a, .mobile-nav a').forEach(a => {
  a.addEventListener('click', () => {
    mobileNav?.classList.remove('open');
    hamburger?.classList.remove('active');
    document.body.style.overflow = '';
  });
});

// ── SCROLL REVEAL ────────────────────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
if (revealEls.length) {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  revealEls.forEach(el => revealObs.observe(el));
}

// ── COUNTER ANIMATION ────────────────────────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString('en-IN') + suffix;
  }, 16);
}
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { animateCounter(entry.target); counterObs.unobserve(entry.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.counter').forEach(el => counterObs.observe(el));

// ── PARTICLES ────────────────────────────────────────────────────────────
const pContainer = document.getElementById('particles');
if (pContainer) {
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 6 + 3;
    Object.assign(p.style, {
      position: 'absolute', borderRadius: '50%',
      width: size + 'px', height: size + 'px',
      background: `rgba(${Math.random() > 0.5 ? '27,160,216' : '45,197,162'},${(Math.random() * .25 + .08).toFixed(2)})`,
      left: Math.random() * 100 + '%',
      top: Math.random() * 100 + '%',
      animation: `float ${Math.random() * 4 + 4}s ease-in-out infinite`,
      animationDelay: Math.random() * 4 + 's',
    });
    pContainer.appendChild(p);
  }
}

// ── TABS ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.closest('.tabs-container');
    group?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    group?.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    group?.querySelector(`#${btn.dataset.tab}`)?.classList.add('active');
  });
});

// ── FLIP CARDS: touch/tap fallback ───────────────────────────────────────
// On touch devices hover doesn't fire — tap toggles .flipped class
const isTouchDevice = window.matchMedia('(hover: none)').matches;
if (isTouchDevice) {
  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // If user taps a link on back face, allow navigation
      if (e.target.closest('.fc-cta')) return;
      card.classList.toggle('flipped');
    });
  });
}

// ── FORM SUBMIT ──────────────────────────────────────────────────────────
const BACKEND_URL = ''; // same-origin: server.js serves both the site and the API together

document.querySelectorAll('form').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const notify = document.getElementById('notify');
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await fetch(`${BACKEND_URL}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Server error');
      if (notify) { notify.textContent = 'Enquiry submitted! We will respond within 24 hours.'; notify.classList.add('show'); setTimeout(() => notify.classList.remove('show'), 4000); }
      form.reset();
    } catch (err) {
      if (notify) { notify.textContent = 'Something went wrong. Please call us directly.'; notify.style.background='#e53e3e'; notify.classList.add('show'); setTimeout(() => { notify.classList.remove('show'); notify.style.background=''; }, 4000); }
    } finally {
      if (btn) { btn.textContent = orig; btn.disabled = false; }
    }
  });
});
