(function () {
  "use strict";
  var M = window.DYNALIMB_MEDIA || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 1. Apply the media manifest ---------- */
  function placeholderFor(key) { return "media/placeholders/" + key + ".svg"; }

  function applyImage(img, key) {
    var entry = (M.images || {})[key];
    if (entry) {
      if (entry.src && img.getAttribute("src") !== entry.src) img.setAttribute("src", entry.src);
      if (typeof entry.alt === "string") img.setAttribute("alt", entry.alt);
      if (entry.position) img.style.objectPosition = entry.position;
    }
    // If a real file is missing/misnamed, fall back to the placeholder instead of a broken icon.
    img.addEventListener("error", function onErr() {
      img.removeEventListener("error", onErr);
      img.setAttribute("src", placeholderFor(key));
    });
  }
  $$("img[data-media]").forEach(function (img) { applyImage(img, img.getAttribute("data-media")); });

  /* Hero video */
  var video = $("#heroVideo");
  if (video && M.hero) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    // Portrait phones get the portrait cut (if provided); everything else gets the landscape cut.
    var portraitMQ = window.matchMedia && window.matchMedia("(orientation: portrait) and (max-width: 900px)");
    var currentVariant = null;
    function heroVariant() {
      var m = M.hero.mobile;
      return (portraitMQ && portraitMQ.matches && m && (m.mp4 || m.webm)) ? m : M.hero;
    }
    function loadHero() {
      var h = heroVariant();
      if (h === currentVariant) return;
      currentVariant = h;
      if (h.poster) video.setAttribute("poster", h.poster);
      var sources = [];
      if (h.webm) sources.push(["video/webm", h.webm]);
      if (h.mp4) sources.push(["video/mp4", h.mp4]);
      if (!sources.length) return;
      video.innerHTML = "";
      sources.forEach(function (s) {
        var el = document.createElement("source");
        el.type = s[0]; el.src = s[1];
        video.appendChild(el);
      });
      video.load();
      if (reduce && reduce.matches) { video.removeAttribute("autoplay"); video.pause(); }
      else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    }
    loadHero();
    if (portraitMQ) {
      if (portraitMQ.addEventListener) portraitMQ.addEventListener("change", loadHero);
      else if (portraitMQ.addListener) portraitMQ.addListener(loadHero);
    }
  }

  /* Pause / play controls */
  function setToggle(btn, paused, what) {
    btn.setAttribute("aria-pressed", paused ? "true" : "false");
    btn.setAttribute("aria-label", (paused ? "Play " : "Pause ") + what);
  }
  var heroBtn = $(".hero-toggle");
  if (heroBtn && video) {
    setToggle(heroBtn, video.paused && !video.autoplay, "background video");
    heroBtn.addEventListener("click", function () {
      if (video.paused) { var pp = video.play(); if (pp && pp.catch) pp.catch(function () {}); }
      else video.pause();
    });
    var heroEl = video.closest(".hero");
    video.addEventListener("play", function () { setToggle(heroBtn, false, "background video"); heroEl.classList.remove("paused"); });
    video.addEventListener("pause", function () { setToggle(heroBtn, true, "background video"); heroEl.classList.add("paused"); });
  }
  var marqueeBtn = $(".marquee-toggle"), marquee = $(".marquee");
  if (marqueeBtn && marquee) {
    marqueeBtn.addEventListener("click", function () {
      setToggle(marqueeBtn, marquee.classList.toggle("paused"), "logo animation");
    });
  }

  /* ---------- 2. Patient story cards (rendered from the manifest) ---------- */
  var track = $("#storyTrack");
  if (track && M.stories) {
    M.stories.forEach(function (s) {
      var card = document.createElement("article");
      if (s.type === "photo") {
        card.className = "s-card photo";
        var img = document.createElement("img");
        img.setAttribute("data-media", s.image);
        img.src = placeholderFor(s.image);
        img.alt = ""; img.loading = "lazy"; img.draggable = false;
        card.appendChild(img);
        applyImage(img, s.image);
      } else {
        card.className = "s-card quote tone-" + (s.tone || "navy");
        var bq = document.createElement("blockquote");
        bq.textContent = "“" + s.quote.replace(/^[“"]|[”"]$/g, "") + "”";
        var foot = document.createElement("div");
        var who = document.createElement("p"); who.className = "who"; who.textContent = s.name;
        var where = document.createElement("p"); where.className = "where"; where.textContent = s.role;
        foot.appendChild(who); foot.appendChild(where);
        card.appendChild(bq); card.appendChild(foot);
      }
      track.appendChild(card);
    });
  }

  /* ---------- 3. Drag-to-scroll for the two carousels ---------- */
  function dragScroll(el) {
    if (!el) return;
    var down = false, startX = 0, startLeft = 0, moved = false;
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; el.classList.add("dragging"); }
      el.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false; el.classList.remove("dragging");
    });
    el.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    el.addEventListener("keydown", function (e) {
      var step = (el.firstElementChild ? el.firstElementChild.getBoundingClientRect().width : 400) + 20;
      if (e.key === "ArrowRight") { el.scrollBy({ left: step, behavior: "smooth" }); e.preventDefault(); }
      if (e.key === "ArrowLeft") { el.scrollBy({ left: -step, behavior: "smooth" }); e.preventDefault(); }
    });
  }
  var gallery = $("#storyGallery");
  dragScroll(gallery);
  dragScroll(track);

  // Centre the first gallery slide's neighbours are peeking: start on slide 2 like the design
  function centreGallery() {
    if (!gallery) return;
    var slide = gallery.children[1];
    if (slide) gallery.scrollLeft = slide.offsetLeft - (gallery.clientWidth - slide.clientWidth) / 2;
  }
  window.addEventListener("load", centreGallery);

  // Gentle auto-advance for the gallery (paused on hover/focus, off for reduced motion)
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (gallery && !reduceMotion) {
    var paused = false;
    ["mouseenter", "focusin", "touchstart"].forEach(function (ev) { gallery.addEventListener(ev, function () { paused = true; }, { passive: true }); });
    ["mouseleave", "focusout"].forEach(function (ev) { gallery.addEventListener(ev, function () { paused = false; }); });
    setInterval(function () {
      if (paused || document.hidden) return;
      var slides = Array.prototype.slice.call(gallery.children);
      var mid = gallery.scrollLeft + gallery.clientWidth / 2, idx = 0, best = 1e9;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid);
        if (d < best) { best = d; idx = i; }
      });
      var next = slides[(idx + 1) % slides.length];
      gallery.scrollTo({ left: next.offsetLeft - (gallery.clientWidth - next.clientWidth) / 2, behavior: "smooth" });
    }, 4500);
  }

  /* ---------- 4. Header behaviour ---------- */
  var header = $(".site-header");
  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 8);
    if (window.scrollY < 300) {
      $$(".nav a").forEach(function (a) { a.classList.remove("is-active"); });
      var home = $('.nav a[href="#top"]'); if (home) home.classList.add("is-active");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  var toggle = $(".nav-toggle"), nav = $("#nav");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  $$("#nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open menu");
      $$(".has-sub").forEach(function (li) { li.classList.remove("open"); $(".sub-toggle", li).setAttribute("aria-expanded", "false"); });
    });
  });
  $$(".sub-toggle").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var li = b.parentNode, open = li.classList.toggle("open");
      b.setAttribute("aria-expanded", open);
    });
  });
  document.addEventListener("click", function () {
    $$(".has-sub").forEach(function (li) { li.classList.remove("open"); $(".sub-toggle", li).setAttribute("aria-expanded", "false"); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    $$(".has-sub").forEach(function (li) { li.classList.remove("open"); $(".sub-toggle", li).setAttribute("aria-expanded", "false"); });
    if (nav.classList.contains("open")) {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      toggle.focus();
    }
  });

  // Active nav link while scrolling
  var links = $$('.nav a[href^="#"]').filter(function (a) { return a.getAttribute("href").length > 1; });
  var targets = links.map(function (a) { return $(a.getAttribute("href")); });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var i = targets.indexOf(en.target);
          if (i > -1 && !links[i].closest(".submenu")) {
            $$(".nav a").forEach(function (a) { a.classList.remove("is-active"); });
            links[i].classList.add("is-active");
          }
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    targets.forEach(function (t) { if (t) io.observe(t); });
  }

  // Marquee: duplicate the logo strip once so the loop is seamless
  var mt = $(".marquee-track");
  if (mt) { Array.prototype.slice.call(mt.children).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute("aria-hidden", "true"); mt.appendChild(c); }); }

  /* ---------- Macy Foot spotlight video: loads when near, plays only in view ---------- */
  var macyV = $("#macyVideo"), macyBtn = $(".macy-toggle");
  if (macyV && M.macy) {
    var mReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mPaused = mReduce, mLoaded = false, mInView = false;
    if (M.macy.poster) macyV.poster = M.macy.poster;
    function macyLoad() {
      if (mLoaded) return; mLoaded = true;
      [["video/mp4", M.macy.mp4], ["video/webm", M.macy.webm]].forEach(function (s) {
        if (!s[1]) return;
        var el = document.createElement("source"); el.type = s[0]; el.src = s[1]; macyV.appendChild(el);
      });
      macyV.load();
    }
    function macySync() {
      if (mInView && !mPaused) { macyLoad(); var pp = macyV.play(); if (pp && pp.catch) pp.catch(function () {}); }
      else macyV.pause();
      setToggle(macyBtn, mPaused, "video");
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { mInView = en[0].isIntersecting; macySync(); }, { rootMargin: "200px 0px" }).observe(macyV);
    } else { mInView = true; macySync(); }
    macyBtn.addEventListener("click", function () { mPaused = !mPaused; macySync(); });
  }

  /* ---------- Cinematic touches ---------- */
  var motionOK = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.documentElement.classList.add("js");

  // Rise-in on scroll
  if ("IntersectionObserver" in window && motionOK) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); rio.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    $$(".card, .stat, .ccard, .logo-cards li").forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      rio.observe(el);
    });
  }

  // 3D tilt on service cards (mouse only)
  if (motionOK && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add("tilting");
        card.style.transitionDelay = "0ms";
        card.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("tilting");
        card.style.setProperty("--ry", "0deg"); card.style.setProperty("--rx", "0deg");
      });
    });
  }

  // Count-up for "1,000+" and "70+" style numbers
  if ("IntersectionObserver" in window && motionOK) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, end = +el.dataset.count, suffix = el.dataset.suffix, t0 = performance.now();
        (function tick(now) {
          var t = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(end * e).toLocaleString("en-US") + suffix;
          if (t < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    $$(".stat strong").forEach(function (el) {
      var m = /^([\d,]+)(\+)$/.exec(el.textContent.trim());
      if (!m) return;
      el.dataset.count = m[1].replace(/,/g, ""); el.dataset.suffix = m[2];
      el.setAttribute("aria-label", el.textContent.trim());
      el.textContent = "0" + m[2];
      cio.observe(el);
    });
  }

  /* ---------- 5. Slot inspector: add ?media=1 to the URL ---------- */
  if (/[?&]media=1/.test(location.search)) {
    document.documentElement.classList.add("media-debug");
    document.body.classList.add("media-debug");
    window.addEventListener("load", function () {
      $$("[data-media]").forEach(function (el) {
        var key = el.getAttribute("data-media"), e = (M.images || {})[key] || {};
        var r = el.getBoundingClientRect();
        var tag = document.createElement("span");
        tag.className = "media-tag";
        tag.textContent = key + (e.size ? " · " + e.size : "");
        tag.style.left = (r.left + window.scrollX + 4) + "px";
        tag.style.top = (r.top + window.scrollY + 4) + "px";
        document.body.appendChild(tag);
      });
      var hv = $("#heroVideo");
      if (hv) {
        var r = hv.getBoundingClientRect(), t = document.createElement("span");
        t.className = "media-tag"; t.textContent = "hero video · 1920×1080 mp4";
        t.style.left = "12px"; t.style.top = (r.top + window.scrollY + 12) + "px";
        document.body.appendChild(t);
      }
    });
  }
})();
