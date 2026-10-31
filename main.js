/* Smecz — choreografia scrolla. Trzy plany: zdjęcie (wolno), interfejs (środek), liczby (najszybciej).
   Wszystko jest związane z naturalnym przewijaniem (scrub); niczego nie przejmujemy. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Nawigacja: przezroczysta na zdjęciu hero, jasna dalej
  const nav = $('[data-nav]');
  const heroTrack = $('.hero-track');
  const syncNav = () => {
    const limit = heroTrack.offsetTop + heroTrack.offsetHeight - nav.offsetHeight;
    const solid = window.scrollY > limit;
    nav.classList.toggle('is-solid', solid);
    nav.classList.toggle('is-dim', !solid && window.scrollY > 24); // ciemne szkło nad zdjęciem hero
  };
  window.addEventListener('scroll', syncNav, { passive: true });
  syncNav();

  // Przyciski sklepów: linków jeszcze nie ma — mówimy to wprost
  const msg = $('[data-store-msg]');
  $$('[data-store]').forEach((btn) => btn.addEventListener('click', () => {
    msg.textContent = `Smecz jest w drodze do ${btn.dataset.store}. Link pojawi się w dniu premiery.`;
  }));

  // Szkło: refleks światła podąża za kursorem / palcem
  const glasses = $$('.glass');
  let pointer = null;
  const paintGlass = () => {
    glasses.forEach((g) => {
      const r = g.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const x = gsap_clamp(((pointer.x - r.left) / r.width) * 100);
      const y = gsap_clamp(((pointer.y - r.top) / r.height) * 100);
      g.style.setProperty('--mx', `${x}%`);
      g.style.setProperty('--my', `${y}%`);
    });
    pointer.queued = false;
  };
  const gsap_clamp = (v) => Math.max(-30, Math.min(130, v));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('pointermove', (e) => {
      const queued = pointer && pointer.queued;
      pointer = { x: e.clientX, y: e.clientY, queued: true };
      if (!queued) requestAnimationFrame(paintGlass);
    }, { passive: true });
  }

  // Wynik meczu: gem po gemie (Ty 6:4, 6:3)
  const games = 'YOYOYYOOYY|YYOYOYOYY';
  const scoreStates = [[0, 0, 0, 0]];
  let set = 0;
  for (const ch of games) {
    if (ch === '|') { set = 1; continue; }
    const s = [...scoreStates[scoreStates.length - 1]];
    s[ch === 'Y' ? set : set + 2] += 1;
    scoreStates.push(s);
  }
  const setCells = $$('[data-set]');
  const rank = $('[data-rank]');
  const rankNum = $('[data-rank-num]');
  const paintScore = (i) => {
    scoreStates[i].forEach((v, k) => { setCells[k].textContent = v; });
  };
  const paintRank = (up) => {
    rank.classList.toggle('is-up', up);
    rankNum.textContent = up ? '4' : '5';
  };

  // Motion: hero powiązane ze scrollem + jednorazowe wejścia nagłówków i kart.
  // Klasa motion-ok (ustawiana w <head>) ukrywa elementy [data-reveal] do czasu wejścia.
  const root = document.documentElement;
  if (!window.Motion) {
    root.classList.remove('motion-ok');
  } else if (root.classList.contains('motion-ok')) {
    const { animate, scroll, inView, stagger } = window.Motion;
    const mobile = window.matchMedia('(max-width: 759px)').matches;
    const easeOut = [0.22, 1, 0.36, 1];

    // Hero: zdjęcie gracza zmniejsza się i zjeżdża w dół w trakcie pierwszych 400 px.
    // Przesuwa się o 140 px na 400 px scrolla, więc wolniej niż tekst, który płynie razem ze stroną.
    const hero = $('.hero');
    scroll(
      animate('[data-hero-photo]', {
        scale: [1, mobile ? 0.88 : 0.8],
        y: [0, mobile ? 80 : 140],
        borderRadius: ['0px', mobile ? '28px' : '40px'],
      }, { ease: 'linear' }),
      { target: hero, offset: ['start start', '400px start'] },
    );
    // Karta meczu to środkowy plan: wolniej niż tekst, szybciej niż zdjęcie
    scroll(
      // rotate trzeba podać jawnie: Motion składa transform sam i nadpisałby obrót z CSS
      animate('[data-hero-card]', { y: [0, mobile ? 40 : 90], rotate: [3, -2] }, { ease: 'linear' }),
      { target: hero, offset: ['start start', '400px start'] },
    );

    // Wejścia: każda grupa raz, elementy po kolei co 120 ms
    const distance = mobile ? 28 : 50;
    $$('[data-reveal-group]').forEach((group) => {
      const items = [...group.children].filter((el) => el.hasAttribute('data-reveal'));
      if (!items.length) return;
      inView(group, () => {
        animate(items,
          { opacity: [0, 1], y: [distance, 0] },
          { duration: 0.7, ease: easeOut, delay: stagger(0.12) });
      }, { amount: 0.25 });
    });
  }

  const steps = $$('[data-step]').sort((a, b) => a.dataset.step - b.dataset.step);
  const pains = $$('[data-pains] li');

  if (!window.gsap || !window.ScrollTrigger) {
    $('[data-hero-pro]').classList.add('is-split');
    paintScore(scoreStates.length - 1); paintRank(true);
    steps.forEach((s) => s.classList.add('is-on'));
    pains.forEach((p) => p.classList.add('is-on'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Hero „Pro?”: port React Bits <SplitText /> (effect „rise” + mask, accentColor, hoverEffect „lift”).
  // Litery wysuwają się spod krawędzi co 70 ms i po drodze przechodzą przez volt.
  const heroPro = $('[data-hero-pro]');
  if (!window.SplitText || !root.classList.contains('motion-ok')) {
    heroPro.classList.add('is-split');
  } else {
    gsap.registerPlugin(SplitText);
    document.fonts.ready.then(() => {
      const split = SplitText.create(heroPro, { type: 'chars', mask: 'chars', aria: 'none', charsClass: 'pro__char' });
      heroPro.classList.add('is-split');
      const letters = split.chars.filter((c) => !c.closest('.pro__q'));
      gsap.timeline({ delay: 0.15 })
        .fromTo(split.chars, { yPercent: 110 }, { yPercent: 0, duration: 1.25, ease: 'power3.out', stagger: 0.07 }, 0)
        .fromTo(letters, { color: '#FDFD51' }, { color: '#fff', duration: 0.9, ease: 'power1.inOut', stagger: 0.07, clearProps: 'color' }, 0.4)
        .add(() => liftOnHover(split.masks));
    });
  }

  // Kursor unosi litery w swoim pobliżu z miękkim spadkiem (gauss), po zjechaniu wracają na miejsce
  function liftOnHover(pieces) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const em = parseFloat(getComputedStyle(heroPro).fontSize);
    const lift = em * 0.12;
    const radius = em * 0.6;
    const movers = pieces.map((el) => gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' }));
    heroPro.addEventListener('pointermove', (e) => {
      pieces.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dx = (r.left + r.width / 2 - e.clientX) / radius;
        movers[i](-lift * Math.exp(-dx * dx * 0.5));
      });
    });
    heroPro.addEventListener('pointerleave', () => movers.forEach((to) => to(0)));
  }
  const mm = gsap.matchMedia();

  mm.add({
    any: '(min-width: 0px)', // callback odpala się tylko, gdy pasuje któryś warunek
    desktop: '(min-width: 760px)',
    reduce: '(prefers-reduced-motion: reduce)',
  }, (ctx) => {
    const { desktop, reduce } = ctx.conditions;

    if (reduce) {
      paintScore(scoreStates.length - 1); paintRank(true);
      steps.forEach((s) => s.classList.add('is-on'));
      pains.forEach((p) => p.classList.add('is-on'));
      $('[data-range]').style.width = '66%';
      $('[data-range-knob]').style.left = '66%';
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrub = (trigger, extra = {}) => ({
      scrollTrigger: { trigger, start: 'top top', end: 'bottom bottom', scrub: 0.6, ...extra },
      defaults: { ease: 'none' },
    });

    /* 2–3. Problem narasta, potem smecz wybija go z kadru */
    const oldLayers = $$('[data-old]');
    const tilt = [-4, 5, -6, 3];
    const pt = gsap.timeline(scrub('.problem-track', {
      onUpdate: (self) => {
        pains.forEach((li, i) => li.classList.toggle('is-on', self.progress > 0.06 + i * 0.12));
      },
    }));
    oldLayers.forEach((el, i) => {
      pt.fromTo(el,
        { y: 160, opacity: 0, rotation: 0 },
        { y: 0, opacity: 1, rotation: tilt[i], duration: 0.12, ease: 'power2.out' },
        0.04 + i * 0.12);
    });
    pt.fromTo('[data-smash]',
      { clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%)' },
      { clipPath: 'polygon(0% 0%, 230% 0%, 0% 230%)', duration: 0.22, ease: 'power2.in' }, 0.6);
    oldLayers.forEach((el, i) => {
      pt.to(el, {
        x: vw * (0.45 + i * 0.06), y: vh * (0.28 + i * 0.05), rotation: tilt[i] + 22 + i * 6,
        opacity: 0, duration: 0.16, ease: 'power2.in',
      }, 0.6 + i * 0.025);
    });
    pt.to('.problem__text', { x: -vw * 0.15, opacity: 0, duration: 0.14, ease: 'power2.in' }, 0.62)
      .fromTo('[data-smash-word]',
        { opacity: 0, scale: 0.55, x: -vw * 0.12, y: -vh * 0.12 },
        { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.14, ease: 'power3.out' }, 0.76)
      .fromTo('[data-smash-line]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.08 }, 0.84)
      .to({}, { duration: 0.08 }, 0.92);

    /* 4. Rezerwacja — chipy po kolei, wynik wychodzi z telefonu */
    const phoneScroll = $('[data-phone-scroll]');
    const screen = $('.phone__screen');
    const travel = () => Math.max(0, phoneScroll.scrollHeight - screen.clientHeight + 20);
    gsap.timeline(scrub('.book-track', {
      onUpdate: (self) => {
        steps.forEach((s, i) => s.classList.toggle('is-on', self.progress > 0.08 + i * 0.09));
      },
    }))
      .fromTo('[data-book-photo] img', { yPercent: -5 }, { yPercent: 5, duration: 1 }, 0)
      .fromTo('[data-range]', { width: '20%' }, { width: '66%', duration: 0.08 }, 0.17)
      .fromTo('[data-range-knob]', { left: '20%' }, { left: '66%', duration: 0.08 }, 0.17)
      .fromTo(phoneScroll, { y: 0 }, { y: () => -travel(), duration: 0.3, ease: 'power1.inOut' }, 0.22)
      .fromTo('[data-result]',
        desktop ? { opacity: 0, x: -140, scale: 0.85 } : { opacity: 0, y: 80, scale: 0.85 },
        { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.14, ease: 'back.out(1.6)' }, 0.58)
      .fromTo('[data-alert]',
        desktop ? { opacity: 0, x: -100 } : { opacity: 0, y: 60 },
        { opacity: 1, x: 0, y: 0, duration: 0.12, ease: 'power3.out' }, 0.74)
      .to({}, { duration: 0.1 }, 0.9);

    /* 5. Rywal — połówki karty spotykają się na linii siatki */
    gsap.timeline({
      scrollTrigger: { trigger: '.versus', start: 'top 95%', end: 'top 50%', scrub: 0.6 },
      defaults: { ease: 'power2.out' },
    })
      .fromTo('[data-vs-left]', { x: -vw * 0.35, opacity: 0 }, { x: 0, opacity: 1 }, 0)
      .fromTo('[data-vs-right]', { x: vw * 0.35, opacity: 0 }, { x: 0, opacity: 1 }, 0)
      .fromTo('[data-vs-net]', { scaleY: 0 }, { scaleY: 1 }, 0.3);
    gsap.fromTo('[data-rival-photo] img', { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.rival__stage', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    /* 6. Wynik — gemy się wpisują, ranking przeskakuje 5 → 4 */
    let lastScore = -1;
    gsap.timeline(scrub('.score-track', {
      onUpdate: (self) => {
        const p = gsap.utils.clamp(0, 1, (self.progress - 0.08) / 0.55);
        const idx = Math.round(p * (scoreStates.length - 1));
        if (idx !== lastScore) { paintScore(idx); lastScore = idx; }
        paintRank(self.progress > 0.7);
      },
    }))
      .fromTo('[data-score-photo]', { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
      .fromTo('.scoreboard', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.08, ease: 'power2.out' }, 0)
      .fromTo('[data-rank]', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1, ease: 'power2.out' }, 0.62);

    /* 7. Sezon — drabinka rysuje się do finału */
    const bracket = $('[data-bracket]');
    const len = bracket.getTotalLength();
    gsap.timeline({
      scrollTrigger: { trigger: '.season__photo', start: 'top 85%', end: 'bottom 55%', scrub: 0.6 },
      defaults: { ease: 'none' },
    })
      .fromTo(bracket, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1 }, 0)
      .fromTo('[data-bracket-dot]', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.15, ease: 'back.out(3)' }, 0.9);
    gsap.fromTo('[data-season-photo] img', { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.season__stage', start: 'top bottom', end: 'bottom top', scrub: true },
    });

    /* 8. Finał — karta się składa, „?” odpada, piłka spada w miejsce kropki */
    const pieces = $$('[data-pcard] [data-piece]');
    const from = [
      { y: -120 }, { x: -vw * 0.3 }, { y: 140 }, { x: vw * 0.3 }, { y: 160 },
    ];
    const ft = gsap.timeline(scrub('.final-track'));
    ft.fromTo('.final__word', { y: vh * 0.08, opacity: 0.15 }, { y: 0, opacity: 1, duration: 0.3 }, 0)
      .fromTo('[data-pcard]', { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, ease: 'power2.out' }, 0.02);
    pieces.forEach((el, i) => {
      ft.fromTo(el, { ...from[i % from.length], opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.14, ease: 'power3.out' }, 0.1 + i * 0.06);
    });
    ft.to('[data-final-q]', { rotation: -100, scale: 0.15, y: 40, opacity: 0, duration: 0.18, ease: 'power2.in' }, 0.46)
      .set('[data-final-ball]', { opacity: 1 }, 0.62)
      .fromTo('[data-final-ball]', { y: -vh * 0.75 }, { y: 0, duration: 0.2, ease: 'bounce.out' }, 0.62)
      .fromTo('[data-final-line]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.08 }, 0.84)
      .to({}, { duration: 0.08 }, 0.92);

    return () => { lastScore = -1; };
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
