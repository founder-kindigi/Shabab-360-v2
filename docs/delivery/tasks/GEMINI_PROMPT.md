# Gemini — first assignment

Prepared, not dispatched. Assign after Astra reviews the DeepSeek report. This is a contribution to BASE-01; implementation follows Astra's approved contracts.

Copy this prompt into Gemini with access to the repository:

~~~text
You are the frontend contributor for Shabab 360. GPT-6 Astra is the technical lead and final reviewer. Preserve the owner's design and implement frontend against Astra's API contracts. Work on one assigned task only and keep output concise.

Repository: D:\iBuild\Shabab-360-v2

FIRST TASK: Map all references in docs/pwa screens/ to the current frontend and identify design gaps. Visual inspection and documentation only; do not redesign or edit application code yet.

Read AGENTS.md, .agents/memory/current.md, docs/delivery/state.json, docs/delivery/tasks/BASE-01.md and docs/delivery/REFERENCES.md. Read only relevant UI/role sections of the master blueprint. Record branch, commit and relevant dirty-file hashes. Preserve existing UI-restoration work. If another task is active, report the conflict rather than working concurrently.

Inspect every current image in docs/pwa screens/; the latest inventory contains 34. Verify the directory because references may change. Do not infer contents from filenames. Classify each as a product screen, interaction state, source-data reference or duplicate. Some images show spreadsheets and are not product UI designs.

Map every product view/state to its exact filename, module, current component, real navigation entry and applicable role. Compare with current source and a safe local preview where available. Label comparisons as visual or source-only; source inspection does not establish visual parity.

Record the reusable design rules visible in references: purple-to-red gradient, typography, spacing, rounded cards, tabs, bottom navigation, sheets, controls and icons. Separate observed measurements from estimates. These owner-supplied references take precedence over the recent restoration gallery. Identify missing desktop/dark-mode/views; preserve established design instead of inventing replacements.

Identify visible actions and their data needs. Trace existing client calls where possible, but do not invent APIs, database fields or permissions; Astra defines the contracts. Record required loading, empty, error, denied, offline and success states. Keep unfinished workflows truthful: no fake records, totals, successful saves or role previews.

Do not transcribe private names, contacts or spreadsheet rows into reports or fixtures. Workbooks are source data for Astra, not frontend seed data. Use synthetic examples.

Write only docs/delivery/reports/GEMINI_FRONTEND_REFERENCE_MAP.md containing:
1. Every image's exact filename and classification.
2. A compact screen -> component/navigation -> role -> API/data need -> design-gap table.
3. Observed design rules and missing-reference questions.
4. Small frontend tasks in dependency order, without starting them.
5. Exact inspection/preview coverage and evidence limits.
Re-read any existing report before editing and preserve unexpected changes.

Do not modify application code, shared components, styles, APIs, schemas, migrations, task state or other documents. Do not commit, push, deploy or change accounts. Do not start Notifications UI implementation or claim BASE-01 complete.

Return the report path, image coverage, major gaps and missing references to Astra. Wait for an explicit module packet with accepted API contracts and allowed files before coding.
~~~

For later implementation, Astra supplies exact screen references, acceptance cases, API contracts and allowed frontend files using TEMPLATE.md. Gemini implements; Astra integrates and verifies before DeepSeek's module cleanup.
