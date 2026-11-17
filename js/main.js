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
    var h = M.hero;
    if (h.poster) video.setAttribute("poster", h.poster);
    var sources = [];
    if (h.webm) sources.push(["video/webm", h.webm]);
    if (h.mp4) sources.push(["video/mp4", h.mp4]);
    if (sources.length) {
      video.innerHTML = "";
      sources.forEach(function (s) {
        var el = document.createElement("source");
        el.type = s[0]; el.src = s[1];
        video.appendChild(el);
      });
      video.load();
    }
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce && reduce.matches) { video.removeAttribute("autoplay"); video.pause(); }
    else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
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
    video.addEventListener("play", function () { setToggle(heroBtn, false, "background video"); });
    video.addEventListener("pause", function () { setToggle(heroBtn, true, "background video"); });
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
