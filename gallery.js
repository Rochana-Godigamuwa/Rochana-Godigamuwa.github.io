/* Photo gallery (Achievements section).
   Put photos in the "images" folder named photo-1.jpg, photo-2.jpg, photo-3.jpg ...
   (jpg, jpeg, png or webp). Numbers must be consecutive. No code changes needed. */
(() => {
  const gallery = document.getElementById('gallery');
  if (!gallery) return;

  const EXTS = ['jpg', 'jpeg', 'png', 'webp'];
  const MAX = 30;

  const probe = (src) => new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

  async function discover() {
    const found = [];
    for (let i = 1; i <= MAX; i++) {
      let im = null;
      for (const ext of EXTS) {
        im = await probe('images/photo-' + i + '.' + ext);
        if (im) break;
      }
      if (!im) break;
      found.push(im);
    }
    return found;
  }

  discover().then((imgs) => {
    if (!imgs.length) return; // no photos: nothing is shown
    const items = imgs.map((im, i) => {
      const f = document.createElement('figure');
      f.className = 'g-item';
      f.style.setProperty('--r', (im.naturalWidth / im.naturalHeight).toFixed(3));
      f.style.transitionDelay = (i % 4) * 90 + 'ms';
      f.tabIndex = 0;
      f.setAttribute('role', 'button');
      f.setAttribute('aria-label', 'Open photo ' + (i + 1) + ' of ' + imgs.length);
      const img = document.createElement('img');
      img.src = im.src;
      img.alt = 'Photo ' + (i + 1);
      img.draggable = false;
      f.appendChild(img);
      gallery.appendChild(f);
      return f;
    });
    const urls = imgs.map((im) => im.src);
    const n = urls.length;

    /* fade in as they scroll into view */
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    items.forEach((f) => io.observe(f));

    /* lightbox: just the photo, no text */
    const lb = document.createElement('div');
    lb.className = 'lb' + (n === 1 ? ' single' : '');
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close">\u2715</button>' +
      '<button class="lb-nav prev" type="button" aria-label="Previous photo">\u2039</button>' +
      '<figure class="lb-fig"><img alt=""></figure>' +
      '<button class="lb-nav next" type="button" aria-label="Next photo">\u203A</button>';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img');
    let current = 0, opener = null;

    const show = (i) => {
      current = (i + n) % n;
      lbImg.src = urls[current];
      lbImg.alt = 'Photo ' + (current + 1);
    };
    const open = (i, from) => {
      opener = from;
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
    items.forEach((f, i) => {
      f.addEventListener('click', () => open(i, f));
      f.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, f); }
      });
    });
  });
})();
