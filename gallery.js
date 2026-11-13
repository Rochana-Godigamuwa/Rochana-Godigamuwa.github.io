/* 3D photo ring (Achievements section).
   Put photos in the "images" folder named photo-1.jpg, photo-2.jpg, photo-3.jpg ...
   (jpg, jpeg, png or webp). Numbers must be consecutive. No code changes needed. */
(() => {
  const stage = document.getElementById('ringStage');
  const ring = document.getElementById('ring');
  if (!stage || !ring) return;

  const EXTS = ['jpg', 'jpeg', 'png', 'webp'];
  const MAX = 30;

  const probe = (src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im.src);
    im.onerror = () => res(null);
    im.src = src;
  });

  async function discover() {
    const found = [];
    for (let i = 1; i <= MAX; i++) {
      let url = null;
      for (const ext of EXTS) {
        url = await probe('images/photo-' + i + '.' + ext);
        if (url) break;
      }
      if (!url) break;
      found.push(url);
    }
    return found;
  }

  discover().then((urls) => {
    if (!urls.length) return; // nothing found: the block stays hidden
    urls.forEach((u, i) => {
      const f = document.createElement('figure');
      f.className = 'slot';
      f.innerHTML = '<div class="shot"><div class="frame"><img draggable="false"></div><i class="hud"></i></div>';
      const img = f.querySelector('img');
      img.src = u;
      img.alt = 'Photo ' + (i + 1);
      ring.appendChild(f);
    });
    init(urls);
  });

  function init(urls) {
    const cards = [...ring.querySelectorAll('figure')];
    const n = cards.length;
    const pad = (v) => String(v).padStart(2, '0');
    document.getElementById('ringCount').textContent = pad(n);

    cards.forEach((c, i) => {
      c.tabIndex = 0;
      c.setAttribute('role', 'button');
      c.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + n);
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
      lbImg.src = urls[current];
      lbImg.alt = 'Photo ' + (current + 1);
      lbCap.textContent = pad(current + 1) + ' / ' + pad(n);
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
      if (e.target === lb || e.target.closest('.lb-close')) close();
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
    let lastX = 0, lastT = 0, moved = 0;
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
      lastX = e.clientX; lastT = e.timeStamp;
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
