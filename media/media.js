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

  /* MACY FOOT spotlight: Donde Foot 3D model (drag to rotate) + Macy Foot film (loops, no sound; mp4 first, it is smaller) */
  macy: {
    model:  "media/models/donde-foot.bin",
    mp4:    "media/macy-foot.mp4",
    webm:   "media/macy-foot.webm",
    poster: "media/macy-foot-poster.webp"
  },

  /* FROM SCAN TO STEP (3D section) -----------------------------------------
     model = compact socket mesh converted from a DynaX STL (simplified, ~260 KB)
     clips = small looping videos shown beside step 1 and step 2              */
  process: {
    model: "media/models/socket.bin",
    foot:  "media/models/donde-foot.bin",  // Donde Foot, joins the socket in step 4 (walk)
    clips: [
      { webm: "media/dynax-scan.webm",   mp4: "media/dynax-scan.mp4",   poster: "media/dynax-scan-poster.webp" },
      { webm: "media/dynax-socket.webm", mp4: "media/dynax-socket.mp4", poster: "media/dynax-socket-poster.webp" }
    ]
  },

  /* IMAGES ----------------------------------------------------------------
     key: { src: path, alt: description for screen readers, size: recommended,
            position: optional focus point when the photo is cropped to fit,
                      "50% 0%" = keep the top, "50% 100%" = keep the bottom } */
  images: {
    "story-1":              { src: "media/story-1.webp", position: "50% 80%", alt: "Patient with a prosthetic leg standing in a doorway beside a Dynalimb clinician", size: "900×800" },
    "story-2":              { src: "media/story-2.webp", position: "50% 85%", alt: "Prosthetic foot in a white clog beside the patient's other foot", size: "1200×800" },
    "story-3":              { src: "media/story-3.webp", position: "50% 62%", alt: "Ankle-foot orthosis with a floral lining", size: "900×800" },
    "story-4":              { src: "media/story-4.webp", position: "50% 50%", alt: "Prosthetic socket held up in front of the Dynalimb Technologies sign", size: "900×800" },

    "service-prosthetics":  { src: "media/service-prosthetics.webp",  alt: "People wearing prosthetic legs",                  size: "960×560" },
    "service-3d":           { src: "media/service-3d.webp",           alt: "3D printer fabricating a device",                 size: "960×560" },
    "service-clinical":     { src: "media/service-clinical.webp",     alt: "Rehabilitation session with a physiotherapist",   size: "960×560" },
    "service-digital":      { src: "media/service-digital.webp",      alt: "Digital health and telehealth",                   size: "960×560" },

    "therapay-bg":          { src: "media/therapay-bg.webp",          alt: "",                                                size: "1920×900" },
    "impact-center":        { src: "media/impact-center.webp",        alt: "A clinician using the DynaX tablet app",          size: "700×900" },

    "patient-1":            { src: "media/patient-1.webp",            alt: "Patient training in a gym",                       size: "980×1000" },
    "patient-2":            { src: "media/placeholders/patient-2.svg", alt: "Patient walking with a prosthetic",              size: "980×1000" },

    /* The design uses the same photo for both contact cards */
    "contact-patients":     { src: "media/contact.webp",              alt: "",                                                size: "960×480" },
    "contact-orgs":         { src: "media/contact.webp",              alt: "",                                                size: "960×480" },
    "footer-photo":         { src: "media/footer-photo.webp",         alt: "Two healthcare professionals",                    size: "820×860" },

    /* Partner logos (4 large cards) — transparent PNG/SVG works best */
    "partner-hello-tomorrow": { src: "media/logos/partner-hello-tomorrow.webp", alt: "Hello Tomorrow",          size: "400×200" },
    "partner-super-parents":  { src: "media/logos/partner-super-parents.webp",  alt: "Super Parents Foundation", size: "400×200" },
    "partner-faop":           { src: "media/logos/partner-faop.webp",           alt: "Florida Association of Orthotists & Prosthetists", size: "400×200" },
    "partner-utsw":           { src: "media/logos/partner-utsw.webp",           alt: "UT Southwestern Medical Center", size: "400×200" },

    /* "Selected collaborations" strip (small logos) */
    "collab-irede":         { src: "media/logos/collab-irede.webp",     alt: "iREDE Foundation",                                size: "300×100" },
    "collab-fmc-asaba":     { src: "media/logos/collab-fmc-asaba.webp", alt: "Federal Medical Centre Asaba",                    size: "300×100" },
    "collab-luth":          { src: "media/logos/collab-luth.webp",      alt: "Lagos University Teaching Hospital",              size: "300×100" },
    "collab-nbhil":         { src: "media/logos/collab-nbhil.webp",     alt: "NBHIL",                                           size: "300×100" },
    "collab-kiri":          { src: "media/logos/collab-kiri.webp",      alt: "KIRI Engine",                                     size: "300×100" }
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
