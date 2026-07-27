// once-upon-a-page.js
// 1) Fades/slides sections + staggered groups into view once, on scroll.
// 2) Drives the top scroll-progress bar (the "page by page" signature).
// 3) Counts the achievement ring label up from 0/7 to 7/7 when it appears.

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- scroll-reveal ---------- */
  const revealEls = document.querySelectorAll('.oup-reveal, .oup-stagger');

  if (!('IntersectionObserver' in window) || revealEls.length === 0) {
    revealEls.forEach(el => el.classList.add('in-view'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- top scroll-progress bar ---------- */
  const progressBar = document.getElementById('oupProgress');
  if (progressBar) {
    const updateProgress = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      progressBar.style.width = pct + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  /* ---------- achievement ring count-up ---------- */
  const ringNum = document.getElementById('oupRingNum');
  const ringSection = ringNum ? ringNum.closest('.oup-reveal') : null;

  if (ringNum && ringSection && 'IntersectionObserver' in window) {
    const countUp = () => {
      const total = 7;
      let current = 0;
      const step = () => {
        current++;
        ringNum.textContent = current + ' / ' + total;
        if (current < total) requestAnimationFrame(() => setTimeout(step, 120));
      };
      step();
    };

    const ringIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          countUp();
          ringIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    ringIo.observe(ringSection);
  }
});
