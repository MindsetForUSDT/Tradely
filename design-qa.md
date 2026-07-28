# TradeumDiary landing v7 — design QA

## Comparison target

- Source visual truth: `design-references/landing-cinematic-approved.png`
- Source pixels: 1818 × 865
- Source density: 1× raster reference
- Desktop implementation evidence:
  `/workspace/scratch/tradeum-landing-v7-desktop-final.jpg`
- Mobile implementation evidence:
  `/workspace/scratch/tradeum-landing-v7-mobile-390x844.jpg`
- Width-normalized comparison:
  `/workspace/scratch/tradeum-landing-v7-comparison-final.png`

The cloud browser has a fixed 1363 × 936 viewport at device pixel ratio 1, so the exact native
1818 × 865 reference viewport could not be reproduced. The desktop comparison was normalized to
the same 1363 px width without changing either image's aspect ratio. The responsive state was
rendered in the same cloud browser at a 390 × 844 content frame using the production breakpoint
declarations; the temporary QA selector was removed before the final build.

## State and coverage

- Public, signed-out landing page
- Hero at scroll position 0
- Period: 30 days
- Active decision: exit according to plan
- Desktop: 1363 × 936, DPR 1
- Desktop screenshot pixels: 1353 × 929 after excluding browser scrollbar chrome
- Mobile content frame: 390 × 844
- Browser: managed cloud Chrome

## Full-view comparison evidence

The approved asymmetrical composition is preserved:

- the editorial offer occupies the left rail instead of a centered empty canvas;
- the open equity curve occupies the right side without a heavy dashboard frame;
- capital, period, decision callouts, decision feed and trade outcome keep the approved hierarchy;
- the contour-field asset provides depth under the copy without covering controls;
- the source section begins immediately after the hero and continues the graphite material system.

The browser-rendered page has no application console errors. The only captured message came from
the host Chrome extension and is unrelated to TradeumDiary.

## Focused comparison evidence

1. **Typography:** the desktop heading is 52.48 px at the 1363 px viewport and uses two approved
   lines; it no longer expands into the oversized centered title from v6. Mobile uses a deliberate
   44 px three-line reflow.
2. **Buttons:** the primary CTA uses the ivory surface and separate circular arrow; the secondary
   control stays on one line on desktop and becomes full-width on mobile.
3. **Chart:** the warm-metal line, subdued grid, right-side Y axis, two decision markers and
   transparent area fill match the reference's open analytical scene.
4. **Product detail:** the decision feed and P&L / profit factor / discipline summary align on one
   lower rail rather than sitting inside nested cards.
5. **Background and assets:** the existing `tradeum-contour-field.png` raster is used for the
   market-field texture; icons come from the project's Phosphor family and source logos remain real
   brand assets.
6. **Responsive behavior:** at 390 px, the navigation collapses, both actions measure 354 px, the
   analytics scene begins at y=674, and interactive content remains inside the visible content
   frame.

## Interaction checks

- Period control: 30 days → 90 days and back to 30 days
- Decision selection: entry and exit states update the context summary
- Mobile navigation: opens, exposes the Product link and closes
- Primary CTA: points to registration
- Product, Analytics and Pricing anchors resolve to existing landing sections
- Horizontal desktop overflow: none

## Comparison history

### Iteration 1 — blocked

- **P1:** the original v6 hero was centered and visually empty, with the product hidden below the
  fold.
- **P2:** at the first v7 desktop render, “Торговые решения.” wrapped onto an extra line at
  1363 px.
- **P2:** “Смотреть демо 90 сек” wrapped inside the secondary button.

### Fixes

- Replaced the centered hero and framed product window with the approved two-column composition.
- Reduced the responsive display scale from 56.56 px to 52.48 px at the tested desktop viewport.
- Gave the secondary action a no-wrap label and flexible width at medium desktop breakpoints.
- Added the functional period switch and decision-state selection.
- Added a dedicated mobile composition with full-width actions and an immediate analytics preview.

### Iteration 2 — passed

- The heading uses the intended two desktop lines.
- Both desktop CTA labels remain on one line.
- The chart and lower analytical rail fit without horizontal overflow.
- The 390 px first screen is filled, readable and functional.
- No actionable P0, P1 or P2 differences remain at the verified states.

## Above-the-fold copy diff

The visible navigation labels, hero heading, supporting sentence, CTA labels, read-only security
line, capital value, period, decision labels and trade summary match the approved source. No
unapproved eyebrow, badge, metric strip or filler card was added.

## Remaining intentional deviations

- Recharts uses the real responsive chart implementation rather than rasterizing the reference.
- The source reference's exact 1818 × 865 viewport is unavailable in the fixed cloud browser; the
  tested 1363 × 936 layout preserves the same hierarchy and proportional column split.
- Mobile is a responsive extension of the approved desktop direction because no separate mobile
  source mockup was provided.

## Final result

final result: passed
