/* 3D photo ring for the Achievements section */
(() => {
  const stage = document.getElementById('ringStage');
  const ring = document.getElementById('ring');
  if (!stage || !ring) return;

  const settle = (img) => new Promise((res) => {
    if (img.complete) return res();
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  });

  Promise.all([...ring.querySelectorAll('img')].map(settle)).then(init);

  function init() {
    // drop any photo that failed to load, then work with what is left
    ring.querySelectorAll('figure').forEach((f) => {
      if (!f.querySelector('img').naturalWidth) f.remove();
    });
    const cards = [...ring.querySelectorAll('figure')];
    const n = cards.length;
    if (!n) return; // CSS hides the whole block when there are no photos

    const pad = (v) => String(v).padStart(2, '0');
    document.getElementById('ringCount').textContent = pad(n);

    const items = cards.map((c, i) => {
      const cap = c.querySelector('figcaption');
      const text = cap.textContent.trim();
      cap.textContent = '';
      const b = document.createElement('b');
      b.textContent = pad(i + 1);
      const s = document.createElement('span');
      s.textContent = text;
      cap.append(b, s);
      c.tabIndex = 0;
      c.setAttribute('role', 'button');
      c.setAttribute('aria-label', 'Open photo: ' + text);
      return { src: c.querySelector('img').src, text, idx: pad(i + 1) };
    });

    /* ---------- Lightbox ---------- */
    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close">\u2715</button>' +
      '<button class="lb-nav prev" type="button" aria-label="Previous photo">\u2039</button>' +
      '<figure class="lb-fig"><img alt=""><figcaption></figcaption></figure>' +
      '<button class="lb-nav next" type="button" aria-label="Next photo">\u203A</button>';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img');
    const lbCap = lb.querySelector('figcaption');
    let current = 0, opener = null;

    const show = (i) => {
      current = (i + n) % n;
      lbImg.src = items[current].src;
      lbImg.alt = items[current].text;
      lbCap.textContent = '';
      const b = document.createElement('b');
      b.textContent = items[current].idx;
      const s = document.createElement('span');
      s.textContent = ' ' + items[current].text;
      lbCap.append(b, s);
    };
    const open = (i, from) => {
      opener = from || null;
      show(i);
      lb.hidden = false;
      document.documentElement.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    };
    const close = () => {
      lb.hidden = true;
      document.documentElement.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    };
    lb.addEventListener('click', (e) => {
      if (e.target === lb) close();
      else if (e.target.closest('.lb-close')) close();
      else if (e.target.closest('.prev')) show(current - 1);
      else if (e.target.closest('.next')) show(current + 1);
    });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
    });
    cards.forEach((c, i) => {
      c.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, c); }
      });
    });

    /* ---------- Reduced motion: plain grid, no spinning ---------- */
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stage.classList.add('is-grid');
      cards.forEach((c, i) => c.addEventListener('click', () => open(i, c)));
      return;
    }

    /* ---------- 3D ring ---------- */
    const step = (2 * Math.PI) / Math.max(n, 6); // keeps spacing nice with few photos
    let angle = 0, vel = 0;
    let hovering = false, dragging = false, visible = true;
    let startX = 0, lastX = 0, lastT = 0, moved = 0;
    const AUTO = 0.28; // radians per second

    function render() {
      const R = Math.min(stage.clientWidth * 0.36, 400);
      cards.forEach((c, i) => {
        const t = angle + i * step;
        const s = Math.sin(t), z = Math.cos(t);
        const depth = (z + 1) / 2; // 0 = back, 1 = front
        c.style.transform = 'translate3d(' + (s * R).toFixed(1) + 'px,0,' + (z * 160).toFixed(1) + 'px) rotateY(' + (s * 22).toFixed(1) + 'deg)';
        c.style.opacity = (0.25 + 0.75 * depth).toFixed(3);
        c.style.zIndex = Math.round(depth * 100);
      });
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      if (!dragging && lb.hidden) {
        if (!hovering) angle += AUTO * dt;
        angle += vel * dt;
        vel *= Math.pow(0.03, dt); // momentum fades out
      }
      render();
      if (visible) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    new IntersectionObserver((entries) => {
      const was = visible;
      visible = entries[0].isIntersecting;
      if (visible && !was) { last = performance.now(); requestAnimationFrame(frame); }
    }).observe(stage);

    stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
    stage.addEventListener('pointerleave', () => { hovering = false; });
    stage.addEventListener('focusin', () => { hovering = true; });
    stage.addEventListener('focusout', () => { hovering = false; });

    stage.addEventListener('pointerdown', (e) => {
      dragging = true; moved = 0; vel = 0;
      startX = lastX = e.clientX; lastT = e.timeStamp;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dtt = Math.max((e.timeStamp - lastT) / 1000, 0.008);
      lastX = e.clientX; lastT = e.timeStamp;
      moved += Math.abs(dx);
      angle += dx * 0.006;
      vel = (dx * 0.006) / dtt * 0.6;
    });
    const release = (e) => {
      if (!dragging) return;
      dragging = false;
      if (e.type === 'pointerup' && moved < 6) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const fig = el && el.closest('figure');
        if (fig && cards.includes(fig)) open(cards.indexOf(fig), fig);
      }
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
  }
})();
