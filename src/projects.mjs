// Project content for KobiLipari.com.
// Edit this file to add or change projects, then run `node build.mjs`.
// Anything in [square brackets] is a placeholder to replace with real details.
//
// lane: "build" puts it in the Built column, "design" in the Designed column.

export const projects = [
  {
    slug: "scoresheet-scanner",
    lane: "build",
    title: "Chess Scoresheet Scanner",
    kind: "Tool · Louisiana Chess Association",
    tools: "Python · JS",
    note: "Handwriting read, then checked against legal moves.",
    outcome: "Players photograph a handwritten USCF scoresheet and get a playable game plus a Lichess analysis link.",
    role: "Solo: design, build, data",
    timeline: "[month year]",
    links: [
      { label: "Live demo", href: "#" },
      { label: "Code", href: "#" }
    ],
    pipeline: ["Photo upload", "Find move boxes", "Read handwriting", "Legal-move check", "PGN + Lichess link"],
    sections: {
      problem: "Tournament games live on handwritten carbon scoresheets. Typing them into software is slow, so most games never get analyzed. [Who asked for this and why it mattered to LCA players.]",
      data: "[How many sample scoresheets you used, and what made them messy: handwriting styles, crossed-out moves, notation variants.]",
      approach: "Read each move box, then check every candidate against the legal moves in that position, so the rules of chess correct the handwriting reader. [Key decisions and trade-offs.]",
      validation: "[Accuracy on a held-out set of sheets, and how you measured it.]",
      result: "[What players can do now, and where it lives on the LCA site.]",
      reflection: "[What you would improve next.]"
    }
  },
  {
    slug: "lca-website",
    lane: "build",
    title: "LCA Website Platform",
    kind: "Full-stack · Louisiana Chess Association",
    tools: "React · Cloudflare",
    note: "Built from scratch to replace Google Sites and a third-party registration site.",
    outcome: "The Louisiana Chess Association's full platform, built from scratch: tournaments, registration and payments, clubs, membership and news in one place.",
    role: "Designer & developer",
    timeline: "May 2026 – present",
    links: [
      { label: "louisianachess.org", href: "https://www.louisianachess.org" },
      { label: "Code", href: "https://github.com/Kobi-Lipari/lca-website" }
    ],
    gallery: {
      desktop: [
        { src: "lca-home", w: 2400, h: 1500, label: "Homepage", caption: "Homepage: photo slideshow hero over live columns of tournaments, Facebook posts and clubs.", alt: "Louisiana Chess Association homepage with the headline Play. Compete. Connect. over a tournament photo, and columns for tournaments, Facebook and clubs" },
        { src: "lca-clubs", w: 2400, h: 1100, label: "Club directory", caption: "Club directory: region filters, search, and each club's own logo and color.", alt: "Clubs page titled Find your chess community with region filters, a search box, and club cards with logos" }
      ],
      mobile: { src: "lca-mobile", w: 780, h: 1688, alt: "Louisiana Chess Association homepage on a phone" }
    },
    pipeline: ["React + TypeScript UI", "Pages Functions API", "D1 database", "Supabase · Stripe · Resend", "Cloudflare deploy"],
    sections: {
      problem: "The association's web presence was a Google Sites page, with tournament registration handled on a separate third-party site. [What that made hard for members, club leaders and tournament directors.]",
      data: "Designed for about 600 member profiles, 50 people online at once, and tournaments every couple of months with up to 100 players. The database holds members, clubs, tournaments, registrations, payments and games, built up across more than 20 migrations.",
      approach: "React 19, TypeScript, Vite, Tailwind and shadcn/ui on the front end; Cloudflare Pages Functions and a D1 (SQLite) database behind it; Supabase for sign-in, Stripe for memberships and entry fees, and Resend for email. Features include tournament registration and management with a FIDE Dutch pairing engine, a club directory with a map, a news feed from the association's Facebook page, admin tools for group email and site announcements, and club logo uploads stored in R2.",
      validation: "Before launch I audited the codebase and fixed what turned up, including a Stripe webhook without signature verification and an endpoint that exposed contact-form messages. The backend now has 50 integration and 62 unit tests that run in CI on every pull request touching it.",
      result: "Live at louisianachess.org since July 2026. [Members, registrations or tournaments run through it so far.]",
      reflection: "[What you would build next.]"
    }
  },
  {
    slug: "retention-analysis",
    lane: "build",
    title: "Retention & Graduation Analysis",
    kind: "Analysis · synthetic data",
    tools: "SQL · Access",
    note: "Cohort pipelines across a decade of term extracts.",
    outcome: "A repeatable pipeline that answers who comes back for year two, who finishes, and when. Rebuilt here on synthetic data.",
    role: "Analyst",
    timeline: "[month year]",
    links: [{ label: "Dashboard", href: "#" }],
    pipeline: ["Fall term extracts", "Union into one table", "First-time freshman cohorts", "Match to later terms", "Retention & grad rates"],
    sections: {
      problem: "Leadership needed consistent 2- and 3-year retention and 4- and 6-year graduation rates, broken out by student groups, every year.",
      data: "About ten years of fall term extracts, one file per term. All figures on this site use synthetic data with the same structure; no real student records are shown.",
      approach: "Union the fall extracts into one table, define first-time freshman cohorts, then match each student to later fall terms and to completions. [One interesting detail of the SQL.]",
      validation: "[How you checked your rates against official reported numbers.]",
      result: "[Where the output goes: Tableau dashboards, reports, which decisions it informs.]",
      reflection: "[What you would automate next.]"
    }
  },
  {
    slug: "healingly-website",
    lane: "design",
    title: "Healingly Website",
    kind: "Web design · telehealth",
    tools: "WordPress · Kadence",
    note: "Designed and built from scratch for a direct-pay telehealth practice.",
    outcome: "A public site that explains an unfamiliar care model, shows pricing up front, and moves visitors into booking and the patient portal.",
    role: "Web developer & IT manager",
    timeline: "[month year] – present",
    links: [{ label: "healingly.net", href: "https://healingly.net" }],
    gallery: {
      desktop: [
        { src: "healingly-home", w: 2400, h: 1500, label: "Homepage", caption: "Homepage: the hand-drawn flower and roots carry the \"root-cause care\" message.", alt: "Healingly homepage with the headline Heal from the root up, booking buttons, and an illustrated flower with roots" },
        { src: "healingly-symptoms", w: 2400, h: 1500, label: "Symptom selector", caption: "Symptom selector: visitors tap what they're feeling and see the matching service.", alt: "Dark green section titled Sound familiar? with symptom buttons and a card describing hormone balance care" },
        { src: "healingly-pricing", w: 2400, h: 1500, label: "Pricing", caption: "Pricing: every cost shown up front, split into a first visit and two ways to continue.", alt: "Pricing section with three cards: initial consultation, membership care, and pay per visit" }
      ],
      mobile: { src: "healingly-mobile", w: 750, h: 1624, alt: "Healingly homepage on a phone" }
    },
    pipeline: ["Brand & layout", "WordPress + Kadence", "Custom HTML blocks", "Booking & patient portal"],
    sections: {
      problem: "A direct-pay practice has to explain itself fast: what it treats, how visits work, and what they cost, without insurance doing the explaining. [What the practice needed when you started.]",
      data: "Services, a four-step how-it-works flow, pricing, an FAQ, and a symptom selector that points visitors to the right service. [Who supplied the copy and who approved it.]",
      approach: "Built on WordPress with the Kadence theme and custom HTML blocks, in a green and gold brand palette. The site hands off to OptiMantra, the practice's patient platform, with separate paths for new-patient registration and existing-patient login. I also cleaned up the logo and wrote a patient portal guide.",
      validation: "On the onboarding side, showing each patient only the consent forms for the service they booked, instead of every form, reduced intake drop-off. [Numbers, if you can share them.]",
      result: "Live at healingly.net. [Screenshots and what changed for the practice.]",
      reflection: "A full redesign is planned for a more consistent, natural feel, with real photography in place of stock images."
    }
  },
  {
    slug: "tableau-dashboards",
    lane: "design",
    title: "Tableau Public Dashboards",
    kind: "Dashboards · synthetic data",
    tools: "Tableau",
    note: "Institutional dashboards rebuilt on synthetic data.",
    outcome: "Retention, graduation and enrollment dashboards that someone can read in under a minute.",
    role: "Analyst & designer",
    timeline: "[month year]",
    links: [{ label: "Tableau Public", href: "#" }],
    pipeline: ["Question", "Chart choice", "Layout", "Filters", "Publish"],
    sections: {
      problem: "[Who reads these dashboards and the one question each answers.]",
      data: "Synthetic data with the same shape as the real institutional files. No real student records.",
      approach: "[Chart choices, color, what you left out on purpose.]",
      validation: "[How you tested that people could read them.]",
      result: "[Embedded dashboards go here.]",
      reflection: "[What you would change.]"
    }
  },
  {
    slug: "maritime-proposal",
    lane: "design",
    title: "Maritime Program Proposal",
    kind: "Data story · market analysis",
    tools: "Excel · Story",
    note: "An enrollment story built to persuade leadership.",
    outcome: "A market case for a new maritime studies program, built on a peer program's public enrollment data. [Result, if you can share it.]",
    role: "Analyst",
    timeline: "[month year]",
    links: [],
    pipeline: ["Peer program data", "Segment the market", "Find the gaps", "Tell the story"],
    sections: {
      problem: "Leadership wanted to know whether a maritime studies program would find students, and which ones.",
      data: "Public enrollment data from a peer maritime program. [Other sources, e.g. labor-market data.]",
      approach: "Segment the peer program's enrollment to find student groups nobody nearby serves. [Key chart.]",
      validation: "[How you checked the assumptions.]",
      result: "[What leadership decided or what happens next.]",
      reflection: "[What you would add.]"
    }
  }
];
