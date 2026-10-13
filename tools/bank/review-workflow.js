export const meta = {
  name: 'book-crop-review-2',
  description: 'Visually check every cut question of the TYT Matematik book; fix bad crops; flag handwriting',
  phases: [{ title: 'Gözle kontrol', detail: 'one agent per ~16 pages: sheets, overlays, re-cuts' }, { title: 'Son bakış', detail: 'second look at every re-cut' }],
}

// Working folder of the book being cut (pages in r200/, crops/, sheets/, overlays/, work/).
const W = args.workDir

const ISSUE_SCHEMA = {
  type: 'object',
  properties: {
    checked: { type: 'array', items: { type: 'integer' }, description: 'test ids you looked at' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          testId: { type: 'integer' },
          page: { type: 'integer' },
          n: { type: 'integer', description: 'question number' },
          kind: { type: 'string', enum: ['cut', 'extra', 'merged', 'wrongNumber', 'missing', 'marked', 'grouping', 'other'] },
          description: { type: 'string' },
          fixedBbox: { type: ['array', 'null'], items: { type: 'number' }, description: '[x0, y0, x1, y1] in PDF points, verified by viewing the re-cut' },
          fixFile: { type: ['string', 'null'] },
          fixVerified: { type: 'boolean' },
        },
        required: ['testId', 'page', 'n', 'kind', 'description', 'fixedBbox', 'fixVerified'],
      },
    },
    tests: {
      type: 'array',
      description: 'one entry per test: the label as printed in the page header and the difficulty gauge reading',
      items: {
        type: 'object',
        properties: {
          testId: { type: 'integer' },
          headerOk: { type: 'boolean', description: 'series + number + section in the page header match what you were given' },
          printedLabel: { type: 'string', description: 'e.g. "TEST 3", "ÖSYM TADINDA 2", "ORİJİNAL SORULAR 1"' },
          difficulty: { type: ['string', 'null'], enum: ['Kolay', 'Kolay-Orta', 'Orta', 'Orta-Zor', 'Zor', null], description: 'only when you were told it is missing (null in the list); read the needle on the page header' },
        },
        required: ['testId', 'headerOk', 'printedLabel'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['checked', 'issues', 'tests', 'summary'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          testId: { type: 'integer' }, n: { type: 'integer' },
          ok: { type: 'boolean' },
          fixedBbox: { type: ['array', 'null'], items: { type: 'number' } },
          note: { type: 'string' },
        },
        required: ['testId', 'n', 'ok', 'fixedBbox', 'note'],
      },
    },
  },
  required: ['results'],
}

const RULES = `You are checking question crops cut from a Turkish question bank PDF ("ÜçDörtBeş TYT Matematik Soru Bankası", 416 pages, two-column pages). Every question was cut automatically: the box starts from the PDF's text layer and then grows over any artwork drawn in the page's background image (panel frames like "ÖSYM köşesi", figures) until a white band; your job is to LOOK at the results and fix what is wrong. Work only inside ${W}; never edit work/boxes.json (it is shared).

Files (all PNG; Read them to see them):
- ${W}/sheets/test-TTT.png — contact sheet of one test: every crop labelled "Soru n", header line shows the test, difficulty and pages.
- ${W}/overlays/o-PPP.png — the whole page with every box drawn and numbered, plus a light grid labelled every 50 PDF points (x along the top edge, y down the left edge). Page size is 652 x 851 pt.
- ${W}/crops/tTTT-qNN.png — a single crop at full resolution (200 dpi), if you need a closer look.

A crop is RIGHT when:
1. it shows exactly one question, starting with its own number (n.), and that number matches its label;
2. the whole question is inside: stem, every figure / table / diagram / panel ("ÖSYM köşesi", "ÇIKMIŞ SORU" frames are part of the question), and ALL answer choices A) to E) (some questions have choices laid out as a table or as figures);
3. nothing is cut at any edge (look at the last line of choices, the right edge of long lines, tall figures);
4. it contains nothing from another question, the page header, the page footer answer key ("8.A 9.C"), the page number or the coloured side tabs. (A faint grey "ÜçDört Beş" watermark is fine.)

Handwriting: if a crop shows pen or pencil marks that are not print (a circled choice, ticks, scribbles, working out), report kind "marked" with what you see; do not try to fix it.

To fix a wrong crop: open the page overlay, read the right box in PDF points from the grid (generous by a few points is fine: the cutter trims white margins itself; but the box must not reach into a neighbouring question's print), then make a test cut:
  cd ${W}/work && python3 -I render.py one boxes.json ../r200 ${W}/fixes/tTTT-qNN.png PAGE x0 y0 x1 y1
(TTT = 3-digit test id, NN = 2-digit question number). This test cut uses exactly your box (only white margins are trimmed, nothing grows), so include frames and figures fully. Read the new file and repeat until it is right (at most 4 tries). Report the final box as fixedBbox with fixVerified=true and fixFile set. If a question is missing from a sheet entirely (you see it on the page but no crop exists), report kind "missing" with a verified box the same way. If questions of one test ended up in another test or a test label is wrong, report kind "grouping".

Be efficient: look at each sheet first; open overlays only for tests where something is wrong or where you must read the header/difficulty. Report only problems in "issues" (a clean test produces no issue), but list every test in "tests".`

const batches = args.batches

phase('Gözle kontrol')
const results = await pipeline(
  batches,
  (batch, _item, i) => agent(
    `${RULES}

Your tests (id, pages, section, series as detected, difficulty as detected — null means not read):
${batch.map((t) => `- test ${t[0]}: pages ${t[1].join(', ')} · ${t[2]} · ${t[3]} · difficulty ${t[4] ?? 'null'}`).join('\n')}

For each test also confirm in "tests" the label printed in its page header (open one overlay per test if the sheet header looks doubtful; tests whose difficulty is null and whose series is not "Orijinal Sorular" need the needle read from the semicircle gauge "Kolay / Kolay-Orta / Orta / Orta-Zor / Zor" at the top of one of their pages: report the band the needle points into, the harder one when it sits on a boundary).`,
    { label: `kontrol:${batch[0][0]}-${batch[batch.length - 1][0]}`, phase: 'Gözle kontrol', schema: ISSUE_SCHEMA },
  ),
  (review, batch) => {
    if (!review) return null
    const fixed = review.issues.filter((x) => x.fixedBbox && x.fixFile)
    if (!fixed.length) return { review, verdict: null }
    return agent(
      `You give a second, independent look at re-cut question crops from a Turkish TYT math question bank. For each file below, Read it and decide whether it is exactly one complete question: its own number at the start, the whole stem, every figure/table/panel, all answer choices A) to E), nothing cut at any edge, and nothing from another question, the page header, the footer answer key, the page number or side tabs (a faint grey watermark is fine). If one is wrong, open ${W}/overlays/o-PPP.png (grid labelled every 50 PDF points; page 652 x 851 pt), make a better cut with
  cd ${W}/work && python3 -I render.py one boxes.json ../r200 ${W}/fixes/tTTT-qNN.png PAGE x0 y0 x1 y1
read it, and return the box as fixedBbox (else fixedBbox null).

Crops to check:
${fixed.map((x) => `- test ${x.testId} question ${x.n} (page ${x.page}, box ${JSON.stringify(x.fixedBbox)}): ${x.fixFile} — first reviewer said: ${x.description}`).join('\n')}`,
      { label: `son-bakis:${batch[0][0]}-${batch[batch.length - 1][0]}`, phase: 'Son bakış', schema: VERDICT_SCHEMA },
    ).then((verdict) => ({ review, verdict }))
  },
)

const ok = results.filter(Boolean)
log(`${ok.length}/${batches.length} batches reviewed`)
return { batches: ok }