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
    tools: "Full-stack · Cloudflare",
    note: "Full-stack build, audit and launch for a state association.",
    outcome: "The Louisiana Chess Association got a modern site it can run itself. [One line on what changed for members.]",
    role: "Technical lead",
    timeline: "[month year] – [month year]",
    links: [
      { label: "Live site", href: "#" },
      { label: "Code", href: "#" }
    ],
    pipeline: ["Content & data model", "Pages & features", "Pre-launch audit", "Deploy on Cloudflare"],
    sections: {
      problem: "[What the old site couldn't do, and what members and organizers needed.]",
      data: "[What content and data the site manages: events, ratings, news, members.]",
      approach: "[Stack, structure, and the one technical decision you're proudest of.]",
      validation: "[What the audit covered and how many issues you fixed before launch.]",
      result: "[Launch date, traffic or usage, what organizers can now do without you.]",
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
    tools: "Web design",
    note: "Public site for a telehealth company.",
    outcome: "[One line on what the site does for visitors, e.g. a calm, trustworthy site with one clear next step.]",
    role: "Web developer & IT",
    timeline: "[month year] – now",
    links: [{ label: "Live site", href: "#" }],
    pipeline: ["Wireframe", "Visual design", "Responsive build", "Launch & upkeep"],
    sections: {
      problem: "[What a first-time visitor needs to feel and do on the site.]",
      data: "[What content you worked with and who approved it.]",
      approach: "[Layout, type, color and accessibility choices, and why.]",
      validation: "[Lighthouse scores, feedback, or usage after launch.]",
      result: "[Screenshots and what changed.]",
      reflection: "[What you would redesign next.]"
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
