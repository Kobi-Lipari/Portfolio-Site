// Project content for KobiLipari.com.
// Edit this file to add or change projects, then run `node build.mjs`.
// Anything in [square brackets] is a placeholder to replace with real details.
//
// lane: "build" puts it in the Built column, "design" in the Designed column.

export const projects = [
  {
    slug: "scoresheet-scanner",
    thumb: { src: "thumb-scanner", w: 960, h: 600, alt: "" },
    demo: "scanner",
    lane: "build",
    title: "Chess Scoresheet Scanner",
    kind: "Tool · Louisiana Chess Association",
    tools: "TypeScript · React · Cloudflare",
    note: "Handwriting read verbatim, then corrected by the rules of chess.",
    outcome: "Players photograph a handwritten scoresheet and get a playable game, with unsure moves flagged for a one-tap fix and a Lichess analysis link.",
    role: "Solo: design, build, testing",
    timeline: "August 2026 – present",
    links: [
      { label: "Live tool", href: "https://www.louisianachess.org/scanner" },
      { label: "Decoder code", href: "https://github.com/Kobi-Lipari/lca-website/tree/main/src/lib/scanner" }
    ],
    gallery: {
      host: "louisianachess.org/scanner",
      desktop: [
        { label: "Demo video", hint: "Photo → reading → checked moves → Lichess board", caption: "Demo: a scoresheet photo becomes a playable game." },
        { label: "Move review", hint: "Screenshot of the move list with amber moves and the fix-a-move picker open", caption: "Review: flagged moves show what was written; fixing one re-checks every move after it." },
        { label: "Result", hint: "Screenshot of the finished game with the Analyze and Keep buttons", caption: "Result: open in Lichess or chess.com, or save, share and email the PGN." }
      ],
      mobile: { label: "Phone capture", hint: "Camera screen framing a scoresheet, with Add next page" }
    },
    pipeline: ["Photo, shrunk in browser", "Verbatim transcription", "Legal-move search", "Review & fix", "PGN + Lichess link"],
    sections: {
      problem: "Tournament games live on handwritten scoresheets. Typing one into analysis software is slow and error-prone, so most club games are never looked at again. [Who asked for this, and why it mattered to LCA players.]",
      data: "Sixty games, three classics and fifty-seven generated to cover castling, promotion, en passant and ambiguous moves, turned into simulated transcriptions at three noise levels: clean, typical, and time-pressure scrawl. The errors model what a reader gets wrong: look-alike characters (b/6, N/H), missing capture and check marks, 0-0 vs O-O, blanks, crossed-out moves, and rows shifted by half a move. [Real-sheet set: how many of your own scoresheets, and what made them messy.]",
      approach: "Two stages with a hard line between them. A vision model copies the handwriting exactly, mistakes included, and is told twice never to fix a move; a beam search then decides what was actually played, scoring every legal move in each position against what was written, with look-alike characters costing less. It can treat a cell as noise, or insert a move a player forgot to write, but only if the next moves line up again. Keeping the stages apart is what makes the result measurable: raw reading accuracy and corrected accuracy are separate numbers. Fixing a move re-runs the search with that move locked in, so one correction usually repairs the moves after it. Profiling against the real chess engine cut decode time 8–16x (about 0.7s a game on a desktop) with output checked identical on 60 sheets, and it runs in a Web Worker so the page never freezes.",
      validation: "On the simulated sheets: every clean game decoded exactly; 87% of moves right under typical noise and 52% under time-pressure noise, with the first wrong move flagged for review 95% of the time under typical noise. The honest gap: simulated errors are guesses about handwriting, spread evenly, where real ones cluster late in the game. [Accuracy on a held-out set of real scoresheets: raw reading vs. after correction.]",
      result: "Live on louisianachess.org since September 2026 for anyone with an LCA account. Members photograph one sheet or several (front, back, continuation), fix any flagged move in a tap, then open the game in Lichess or chess.com, or save, share and email the PGN. Photos are read once and never stored, and a daily limit keeps the per-scan cost in check.",
      reflection: "Measure on real scoresheets and rebuild the look-alike character table from real misreads instead of guesses. Teach the search to recover when a player skips a whole move pair, which it currently flags but cannot realign. Cut the review list: too many correct moves are flagged, so real data should tighten that. Then try a smaller, cheaper vision model and keep it only if the numbers hold."
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
    role: "Web manager, then designer & developer",
    timeline: "June 2025 – present",
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
      problem: "I took over the association's website in June 2025. It was a Google Sites page, with tournament registration handled on a separate third-party site. [What that made hard for members, club leaders and tournament directors.]",
      data: "Designed for about 600 member profiles, 50 people online at once, and tournaments every couple of months with up to 100 players. The database holds members, clubs, tournaments, registrations, payments and games, built up across more than 20 migrations.",
      approach: "React 19, TypeScript, Vite, Tailwind and shadcn/ui on the front end; Cloudflare Pages Functions and a D1 (SQLite) database behind it; Supabase for sign-in, Stripe for memberships and entry fees, and Resend for email. Features include tournament registration and management with a FIDE Dutch pairing engine, a club directory with a map, a news feed from the association's Facebook page, admin tools for group email and site announcements, and club logo uploads stored in R2.",
      validation: "Before launch I audited the codebase and fixed what turned up, including a Stripe webhook without signature verification and an endpoint that exposed contact-form messages. The backend now has 50 integration and 62 unit tests that run in CI on every pull request touching it.",
      result: "Launched at louisianachess.org in July 2026, replacing the old Google Sites page. [Members, registrations or tournaments run through it so far.]",
      reflection: "[What you would build next.]"
    }
  },
  {
    slug: "retention-analysis",
    thumb: { src: "thumb-sql", w: 960, h: 600, alt: "" },
    demo: "sql",
    lane: "build",
    title: "Retention & Graduation Analysis",
    kind: "Analysis · synthetic data",
    tools: "SQL · Access",
    note: "Cohort pipelines across a decade of term extracts.",
    outcome: "A repeatable pipeline that answers who comes back for year two, who finishes, and when. Rebuilt here on synthetic data.",
    role: "Analyst",
    timeline: "[month year]",
    links: [{ label: "Dashboard", href: "#" }],
    gallery: {
      host: "public.tableau.com",
      desktop: [
        { label: "Retention dashboard", hint: "Tableau Public embed, synthetic data", caption: "Second-fall retention by entering cohort, rebuilt on synthetic data." },
        { label: "Cohort SQL", hint: "Screenshot of the query that builds first-time freshman cohorts", caption: "The SQL that turns ten fall extracts into one cohort table." },
        { label: "Data model", hint: "Diagram: term extracts → cohort table → retention and graduation rates", caption: "How the pieces connect, from raw extracts to published rates." }
      ]
    },
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
    timeline: "December 2025 – present",
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
    thumb: { src: "thumb-dashboards", w: 960, h: 600, alt: "" },
    demo: "dash",
    lane: "design",
    title: "Institutional Research Dashboards",
    kind: "Dashboard redesign · Nicholls State University",
    tools: "Tableau · Python · Access",
    note: "Public Tableau dashboards moved onto one written design system.",
    outcome: "Nicholls State's public Tableau dashboards rebuilt to one design system, so every workbook reads the same way: key numbers first, one red for the mark that matters, and the filters one click away instead of in the way.",
    role: "Data analyst, Office of Institutional Research",
    timeline: "March 2025 – present",
    links: [{ label: "Nicholls IR dashboards", href: "https://www.nicholls.edu/irep/dashboards/" }],
    // The story of this project is the work on the dashboards, not one problem and fix.
    process: [
      { label: "Recode", title: "Rebuilt the data behind them", visual: "Applications → admissions → enrollment, joined as one funnel",
        text: "The admissions numbers came from sources that didn't line up as a funnel. I rebuilt the query in Access with applications as the base and admissions and enrollment joined onto them, so each student counts once per term at the furthest stage they reached. Then I checked every fall from 2015 to 2026 against the old figures." },
      { label: "Document", title: "Wrote down how they're updated", visual: "A refresh checklist per dashboard",
        text: "Each refresh used to live in someone's memory. I documented the steps for each dashboard: which extracts to pull, which queries to run and in what order, and what to check before publishing, so an update is a checklist anyone in the office can follow." },
      { label: "Build", title: "Built new ones when people asked", visual: "New dashboards for offices and leadership",
        text: "When offices and leadership needed numbers the catalog didn't show, I built new dashboards around their questions, starting from the decision they had to make and working back to the data." },
      { label: "Present", title: "Took them where decisions get made", visual: "Reports and presentations for task forces",
        text: "I bring the dashboards to university task forces and senior leadership as written reports and presentations: what the numbers show, what they don't, and the options they point to." },
      { label: "Remodel", title: "Remodeled and rebranded the catalog", visual: "One brand, applied to every workbook by script",
        text: "One written brand and design system: Nicholls red and gray, fixed type sizes, a red header with navigation, a fall stepper, and the filters behind one button. Python scripts apply it by rewriting each workbook's XML and check its structure before it ships. Eight dashboards are on it so far." }
    ],
    pipeline: ["Audit the old workbooks", "Write the design spec", "Python rewrites the .twb XML", "Structure check", "Open in Tableau & publish"],
    sections: {
      problem: "The office publishes about 30 Tableau workbooks for the public and for university leadership. They were built over the years by different people: default colors, raw field names like ACADEMIC_PERIOD, filters wherever they fit, and no two pages laid out alike. Every dashboard had to be learned from scratch.",
      data: "Admissions counts applicants, admits and enrolled students by fall term and student population; first-time freshmen are counted by race, gender, first-generation status and department. For the admissions dashboard I rebuilt the source query in Access as a true funnel, with applications as the base and admissions and enrollment joined onto them, so no group can show more students enrolled than admitted. The versions on this page use only the published aggregate figures.",
      approach: "One written spec: Nicholls red (#A6192E) and gray, Tableau's own fonts, a 1400 × 900 frame with a red header and navigation buttons, a ◀ fall ▶ stepper with a one-line summary of the active filters, the filters behind a single button, a red footer linking back to the catalog, and fixed type sizes from the 32 pt title down to 11 pt table headers. Python scripts apply it by rewriting each workbook's XML instead of reformatting by hand, so the same rules land on every page. The chart rules are short: key numbers first, gray by default with red for the mark that matters, no pies, and groups that differ by an order of magnitude get their own scale instead of one flattened axis.",
      validation: "Tableau checks workbooks against a schema it doesn't publish, so a script compares every rewritten file's structure with the original workbooks before it ships, and each version is opened in Tableau before it's published. The rebuilt admissions query was checked against the old figures for every fall from 2015 to 2026: applications and admits within about 1%, and every population and department consistent from applied to admitted to enrolled.",
      result: "[Which dashboards are republished, and what changed for the people who use them.]",
      reflection: "Tableau rewrites some filters without their data source each time a workbook is saved, which breaks them on the next open, so the scripts check for it after every save. Next I'd like the structure check to run automatically on every change, and to move the remaining workbooks onto the spec."
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
    gallery: {
      host: "Maritime program proposal",
      desktop: [
        { label: "Key chart", hint: "The one chart that makes the case", caption: "The chart that carried the recommendation." },
        { label: "Market segments", hint: "Peer program enrollment broken into segments", caption: "Where students come from, and which groups nobody nearby serves." }
      ]
    },
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
