/* Lumenara Surgical — interactions */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = $(".nav__burger");
  const menu = $("#mobile-menu");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
    if (open) nav.classList.add("is-scrolled"); else onScroll();
  };
  burger.addEventListener("click", () => setMenu(menu.hidden));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setMenu(false); });

  /* ---------- reveal + counters ---------- */
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    if (reduceMotion) { el.textContent = target.toFixed(dec); return; }
    const dur = 1600;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const siblings = $$(".reveal", el.parentElement);
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 90}ms`;
      el.classList.add("is-in");
      $$("[data-count]", el).forEach(animateCount);
      revObs.unobserve(el);
    });
  }, { threshold: 0.15 });
  $$(".reveal").forEach((el) => revObs.observe(el));

  /* ---------- card spotlight ---------- */
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  /* ---------- hero: parallax, video, HUD ---------- */
  // home page only
  const hero = $(".hero");
  if (hero) {
    const media = $("[data-parallax]");
    const video = $(".hero__video");
    const reticle = $("[data-reticle]");
    let mx = 0, my = 0;

    if (video) {
      if (reduceMotion) { video.removeAttribute("autoplay"); video.pause(); }
      const vObs = new IntersectionObserver(([en]) => {
        if (reduceMotion) return;
        if (en.isIntersecting) video.play().catch(() => {}); else video.pause();
      });
      vObs.observe(hero);
    }

    if (!reduceMotion) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - 0.5;
        my = (e.clientY - r.top) / r.height - 0.5;
      });
      hero.addEventListener("pointerleave", () => { mx = 0; my = 0; });
    }

    // Map a point in the rendered video frame (normalised 0..1) to hero pixels, honouring object-fit: cover.
    const VIDEO_W = 1280, VIDEO_H = 720, OBJ_X = 0.6, OBJ_Y = 0.5;
    const NEEDLE_TIP = { x: 0.58, y: 0.49 }; // needle-driver tip in the Blender render
    const framePoint = (nx, ny) => {
      const r = media.getBoundingClientRect();
      const hr = hero.getBoundingClientRect();
      const s = Math.max(r.width / VIDEO_W, r.height / VIDEO_H);
      const w = VIDEO_W * s, h = VIDEO_H * s;
      const ox = (r.width - w) * OBJ_X, oy = (r.height - h) * OBJ_Y;
      return { x: r.left - hr.left + ox + nx * w, y: r.top - hr.top + oy + ny * h };
    };

    const hud = {
      force: $('[data-hud="force"]'), wrist: $('[data-hud="wrist"]'), prec: $('[data-hud="prec"]'),
      clock: $("[data-clock]"),
    };
    const start = Date.now();
    let lastHud = 0;
    const heroLoop = (now) => {
      const sy = Math.min(window.scrollY, window.innerHeight);
      if (!reduceMotion) {
        media.style.transform = `translate3d(${mx * -18}px, ${my * -12 + sy * 0.25}px, 0) scale(${1 + sy / window.innerHeight * 0.06})`;
      }
      // reticle follows the needle driver; its micro-motion matches the 4 s render loop
      if (reticle && video) {
        const t = ((video.currentTime || 0) / 4) * Math.PI * 2;
        const p = framePoint(NEEDLE_TIP.x + 0.012 * Math.sin(t), NEEDLE_TIP.y + 0.01 * Math.cos(t));
        reticle.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      }
      if (now - lastHud > 180) {
        lastHud = now;
        const t = now / 1000;
        if (hud.force) hud.force.textContent = (0.42 + 0.06 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 5.3)).toFixed(2);
        if (hud.wrist) hud.wrist.textContent = Math.round(38 + 14 * Math.sin(t * 1.57));
        if (hud.prec) hud.prec.textContent = (0.07 + 0.015 * Math.abs(Math.sin(t * 2.1))).toFixed(2);
        if (hud.clock) {
          const s = Math.floor((Date.now() - start) / 1000) + 2843;
          hud.clock.textContent = [s / 3600, (s / 60) % 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, "0")).join(":");
        }
      }
      requestAnimationFrame(heroLoop);
    };
    requestAnimationFrame(heroLoop);
  }

  /* ---------- tremor / motion-scaling lab ---------- */
  const canvas = $("#tremor-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const scaleIn = $("#scale"), filterIn = $("#filter"), tremorIn = $("#tremor-sim");
    const scaleOut = $("#scale-out"), filterOut = $("#filter-out");
    const jitIn = $("#jit-in"), jitOut = $("#jit-out");
    const FILTER_LABELS = ["Off", "Low", "High", "Max"];
    const FILTER_ALPHA = [1, 0.35, 0.12, 0.05];
    let W = 0, H = 0, dpr = 1;
    let pointer = null, lastMove = 0;
    const hand = [], tip = [];
    let smoothHand = null, tipPos = null, jin = 0, jout = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const syncLabels = () => {
      scaleOut.textContent = `${scaleIn.value} : 1`;
      filterOut.textContent = FILTER_LABELS[filterIn.value];
    };
    [scaleIn, filterIn].forEach((el) => el.addEventListener("input", syncLabels));
    syncLabels();

    const setPointer = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      lastMove = performance.now();
    };
    canvas.addEventListener("pointermove", setPointer);
    canvas.addEventListener("pointerdown", setPointer);
    canvas.addEventListener("pointerleave", () => { pointer = null; });

    const drawTrail = (pts, color, width, glow) => {
      if (pts.length < 2) return;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 1; i < pts.length; i++) {
        const a = i / pts.length;
        ctx.strokeStyle = color.replace("A", (a * 0.95).toFixed(3));
        ctx.lineWidth = width;
        ctx.shadowColor = glow ? color.replace("A", "0.9") : "transparent";
        ctx.shadowBlur = glow ? 10 : 0;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    const frame = (now) => {
      const t = now / 1000;
      const cx = W / 2, cy = H / 2;
      let base;
      if (pointer && now - lastMove < 2500) {
        base = pointer;
      } else {
        // autopilot: a surgeon's figure-of-eight suturing motion
        const s = Math.min(W, H) * 0.34;
        base = { x: cx + s * 1.2 * Math.sin(t * 0.9), y: cy + s * 0.55 * Math.sin(t * 1.8) };
      }
      const amp = tremorIn.checked ? 5.5 : 0;
      const h = {
        x: base.x + amp * (Math.sin(t * 2 * Math.PI * 9.3) + 0.6 * Math.sin(t * 2 * Math.PI * 11.7 + 1.3)),
        y: base.y + amp * (Math.cos(t * 2 * Math.PI * 8.6) + 0.6 * Math.sin(t * 2 * Math.PI * 12.1 + 0.4)),
      };
      if (!smoothHand) smoothHand = { ...h };
      smoothHand.x += (h.x - smoothHand.x) * 0.15;
      smoothHand.y += (h.y - smoothHand.y) * 0.15;

      const scale = +scaleIn.value;
      const alpha = FILTER_ALPHA[+filterIn.value];
      const target = { x: cx + (h.x - cx) / scale, y: cy + (h.y - cy) / scale };
      if (!tipPos) tipPos = { ...target };
      tipPos.x += (target.x - tipPos.x) * alpha;
      tipPos.y += (target.y - tipPos.y) * alpha;

      hand.push({ ...h }); tip.push({ ...tipPos });
      if (hand.length > 90) hand.shift();
      if (tip.length > 90) tip.shift();

      // jitter estimate in "mm" (1 px ≈ 0.1 mm at the console, tip divided by scale)
      const dIn = Math.hypot(h.x - smoothHand.x, h.y - smoothHand.y) * 0.1;
      const tipIdeal = { x: cx + (smoothHand.x - cx) / scale, y: cy + (smoothHand.y - cy) / scale };
      const dOut = Math.hypot(tipPos.x - tipIdeal.x, tipPos.y - tipIdeal.y) * 0.1 / scale;
      jin += (dIn - jin) * 0.05; jout += (dOut - jout) * 0.05;

      ctx.clearRect(0, 0, W, H);
      // workspace ring showing scaled-down reach
      ctx.strokeStyle = "rgba(63,182,255,.25)";
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(W, H) * 0.42 / scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      drawTrail(hand, "rgba(255,179,122,A)", 1.6, false);
      drawTrail(tip, "rgba(63,182,255,A)", 2.6, true);

      // markers
      ctx.fillStyle = "#ffb37a";
      ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7fe3ff";
      ctx.shadowColor = "#3fb6ff"; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(tipPos.x, tipPos.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      jitIn.textContent = `${jin.toFixed(2)} mm`;
      jitOut.textContent = `${jout.toFixed(3)} mm`;
      if (visible) requestAnimationFrame(frame); else running = false;
    };

    let visible = false, running = false;
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(frame); }
    }).observe(canvas);
  }

  /* ---------- tabs ---------- */
  const tabs = $$('[role="tab"]');
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(n); n.focus();
    });
  });

  /* ---------- demo form (front-end only) ---------- */
  const form = $("#demo-form");
  if (form) {
    const note = $(".form__note", form);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;
      $$("[required]", form).forEach((f) => {
        const valid = f.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value) : f.value.trim() !== "";
        f.setAttribute("aria-invalid", String(!valid));
        if (!valid) ok = false;
      });
      if (!ok) {
        note.textContent = "Please complete the highlighted fields.";
        note.classList.add("is-error");
        $('[aria-invalid="true"]', form).focus();
        return;
      }
      note.classList.remove("is-error");
      note.textContent = `Thank you, ${form.first.value.trim()}. A Lumenara clinical specialist will contact you within one business day.`;
      form.reset();
    });
  }

  const y = $("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
