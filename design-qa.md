# Design QA — Dashboard workspace v3

## Visual target

- Approved combined dashboard concept: option 2 as the primary layout, with the source clarity of option 1 and on-demand risk/trade details from option 3.
- Target viewport: desktop 1440 × 1024 plus mobile portrait 390 × 844.

## Fidelity ledger

| Comparison point    | Target evidence                                                | Implementation                                                                                      | Result             |
| ------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------ |
| Information density | Calm overview with advanced detail outside the primary surface | Overview contains five metrics, one equity chart, five recent trades and one import summary         | Source-level match |
| Navigation          | Compact product sidebar with clearly separated workflows       | Overview, Trades, Analytics, Risk and Sources are separate routes; AI and Goals are secondary       | Source-level match |
| Trade detail        | Detail appears only after selecting a row                      | Overview and Trades open a dismissible right-side inspector                                         | Source-level match |
| Source branding     | Each exchange and wallet has its real mark and brand color     | Logos come from `@web3icons/core`; the previous generic and duplicated exchange glyphs were removed | Source-level match |
| Automation model    | Connected sources sync without manual bookkeeping              | Automatic import is always on; manual entry is hidden unless enabled in Settings                    | Source-level match |
| Color system        | True black/graphite with semantic green, red and amber only    | New workspace classes use neutral surfaces and semantic data colors without neon decoration         | Source-level match |
| Mobile reading path | Metrics stack before chart, trades and source state            | Responsive CSS reduces to two-column metrics, then a single-column content flow                     | Source-level match |

## Functional checks

- TypeScript and Vite production build: passed.
- Targeted ESLint for every changed TypeScript/React file: passed with zero warnings.
- Diff whitespace validation: passed.
- Playwright scenario prepared for authenticated desktop/mobile overview, range switching, trade drawer and manual-entry setting.

## Verification blocker

The Browser plugin is not available in this session. The Playwright fallback could not launch because the environment has no Chromium executable, and no browser runtime was downloaded as an unrequested dependency.

## Final result

**blocked**

Implementation and source-level checks are complete, but screenshot-based fidelity QA cannot pass until the project is rendered in a browser at 1440 × 1024 and 390 × 844.
