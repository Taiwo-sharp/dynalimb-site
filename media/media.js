/* ==========================================================================
   DYNALIMB MEDIA MANIFEST  —  the only file you edit to swap images / video
   --------------------------------------------------------------------------
   1. Put your real file in the /media folder (e.g. media/hero.mp4, media/story-1.jpg)
   2. Change the matching "src" below to that path.
   3. Reload. Nothing else in the site needs touching.

   Tip: open the site with  ?media=1  on the end of the URL (index.html?media=1)
   to see a label on every slot showing its name and recommended size.
   ========================================================================== */
window.DYNALIMB_MEDIA = {

  /* HERO VIDEO ------------------------------------------------------------
     mp4  = main file (H.264, ideally 1920x1080, under ~8 MB, no audio)
     webm = optional smaller alternative, leave "" if you don't have one
     poster = still image shown while the video loads / if motion is reduced
     mobile = optional portrait version for phones (portrait screens up to 900px wide);
              leave its fields "" to use the main video everywhere            */
  hero: {
    mp4:    "media/hero.mp4",
    webm:   "media/hero.webm",
    poster: "media/hero-poster.webp",
    mobile: {
      mp4:    "media/hero-mobile.mp4",
      webm:   "media/hero-mobile.webm",
      poster: "media/hero-mobile-poster.webp"
    }
  },

  /* IMAGES ----------------------------------------------------------------
     key: { src: path, alt: description for screen readers, size: recommended } */
  images: {
    "story-1":              { src: "media/placeholders/story-1.svg",              alt: "Clinician assisting a patient",                  size: "900×800" },
    "story-2":              { src: "media/placeholders/story-2.svg",              alt: "Patient with a prosthetic leg in a therapy room", size: "1200×800" },
    "story-3":              { src: "media/placeholders/story-3.svg",              alt: "Child being fitted for a mobility device",        size: "900×800" },
    "story-4":              { src: "media/placeholders/story-4.svg",              alt: "Dynalimb team at work",                          size: "900×800" },

    "service-prosthetics":  { src: "media/placeholders/service-prosthetics.svg",  alt: "People wearing prosthetic legs",                  size: "960×560" },
    "service-3d":           { src: "media/placeholders/service-3d.svg",           alt: "3D printer fabricating a device",                 size: "960×560" },
    "service-clinical":     { src: "media/placeholders/service-clinical.svg",     alt: "Rehabilitation session with a physiotherapist",   size: "960×560" },
    "service-digital":      { src: "media/placeholders/service-digital.svg",      alt: "Digital health and telehealth",                   size: "960×560" },

    "therapay-bg":          { src: "media/placeholders/therapay-bg.svg",          alt: "",                                                size: "1920×900" },
    "impact-center":        { src: "media/placeholders/impact-center.svg",        alt: "A clinician using the DynaX tablet app",          size: "700×900" },

    "patient-1":            { src: "media/placeholders/patient-1.svg",            alt: "Patient training in a gym",                       size: "980×1000" },
    "patient-2":            { src: "media/placeholders/patient-2.svg",            alt: "Patient walking with a prosthetic",               size: "980×1000" },

    "contact-patients":     { src: "media/placeholders/contact-patients.svg",     alt: "",                                                size: "960×480" },
    "contact-orgs":         { src: "media/placeholders/contact-orgs.svg",         alt: "",                                                size: "960×480" },
    "footer-photo":         { src: "media/placeholders/footer-photo.svg",         alt: "Two healthcare professionals",                    size: "820×860" },

    /* Partner logos (4 large cards) — transparent PNG/SVG works best */
    "partner-hello-tomorrow": { src: "media/placeholders/partner-hello-tomorrow.svg", alt: "Hello Tomorrow",          size: "400×200" },
    "partner-super-parents":  { src: "media/placeholders/partner-super-parents.svg",  alt: "Super Parents Foundation", size: "400×200" },
    "partner-faop":           { src: "media/placeholders/partner-faop.svg",           alt: "Florida Association of Orthotists & Prosthetists", size: "400×200" },
    "partner-utsw":           { src: "media/placeholders/partner-utsw.svg",           alt: "UT Southwestern Medical Center", size: "400×200" },

    /* "Selected collaborations" strip (small logos) */
    "collab-irede":         { src: "media/placeholders/collab-irede.svg",         alt: "iREDE Foundation",                                size: "300×100" },
    "collab-fmc-asaba":     { src: "media/placeholders/collab-fmc-asaba.svg",     alt: "Federal Medical Centre Asaba",                    size: "300×100" },
    "collab-luth":          { src: "media/placeholders/collab-luth.svg",          alt: "Lagos University Teaching Hospital",              size: "300×100" },
    "collab-nbhil":         { src: "media/placeholders/collab-nbhil.svg",         alt: "NBHIL",                                           size: "300×100" },
    "collab-kiri":          { src: "media/placeholders/collab-kiri.svg",          alt: "KIRI Engine",                                     size: "300×100" }
  },

  /* PATIENT STORY CARDS — edit text here. type "quote" = text card, "photo" = image card.
     NOTE: only Daniel's quote came from the design; the repeats are placeholders —
     replace with real, consented patient stories before launch. */
  stories: [
    { type: "quote", tone: "navy",  quote: "I climbed my own stairs again six weeks after surgery. We practiced on those exact stairs.", name: "Daniel Okafor", role: "Patient, Lagos" },
    { type: "photo", image: "patient-1" },
    { type: "quote", tone: "slate", quote: "I climbed my own stairs again six weeks after surgery. We practiced on those exact stairs.", name: "Daniel Okafor", role: "Patient, Lagos" },
    { type: "photo", image: "patient-2" },
    { type: "quote", tone: "ink",   quote: "I climbed my own stairs again six weeks after surgery. We practiced on those exact stairs.", name: "Daniel Okafor", role: "Patient, Lagos" }
  ]
};
