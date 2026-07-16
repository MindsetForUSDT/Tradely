# Design QA — Interactive landing demo

## Evidence reviewed

- User screenshot: hero and static wave at 1917 × 907
- User screenshot: empty risk widgets at 1917 × 907

## Findings addressed

- P1: static raster wave did not communicate a dynamic product — replaced with a real-time Canvas particle field with pointer response and reduced-motion support.
- P1: product preview advertised an unregistered state — replaced with an explicit interactive demo containing journal, analytics, risk, and AI scenarios.
- P1: risk section contained placeholders — replaced with representative demo limits and an active rule state.
- P2: hero copy said there were no demo values while the landing needs to explain the product — copy now clearly distinguishes the interactive demo from the user's real workspace.
- P2: the large preview had little interactive value — scene tabs now swap functional product views and FAQ controls remain interactive.

## Automated checks

- TypeScript: passed
- Production build: passed
- Targeted ESLint (`src/pages/Landing.tsx`): passed with zero warnings
- Diff whitespace validation: passed

## Data policy

Representative figures are used only inside the marketing landing demo and are explicitly labelled `Интерактивное демо` / `Демо-портфель`. Authenticated workspace pages still use real connected data or onboarding.

## Final result

**blocked**

Source-level fixes are complete. Final rendered screenshot comparison remains blocked because the Browser plugin and a local Chromium runtime are unavailable in this environment. Desktop and mobile capture should be completed after the branch is run locally.
