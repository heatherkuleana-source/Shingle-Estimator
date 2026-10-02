# Shingle Estimator

A roofing estimator for shingle jobs. It works from the estimator's side and produces a
proposal/contract for the customer, who can be a homeowner or a general contractor.

**Workflow per job**

1. **Customer**: homeowner or GC, contact info, job address, estimator.
2. **Measurements**: upload the satellite image or measurement report (image or PDF).
   PDF reports (EagleView, Hover, etc.) are read automatically to fill in area, pitch, ridges, hips,
   valleys, rakes, eaves and flashing. Always check the numbers against the report.
   Add flat/low-slope area, pipe jacks, vents and the waste factor (a suggested % is based on roof shape).
3. **Scope**: pick the shingle line and color, then check the scope items. Each item adds its
   contract wording and the materials it needs.
4. **Materials**: the order list with waste included, calculated from your price list's coverage
   (bundles per square, LF per bundle, and so on). You can override quantities, remove items, add any
   item from the price list, and export the order as CSV.
5. **Labor & Price**: hours/square (default 5.7) × squares × pitch/story multipliers at the blended
   hourly rate of the crew on the job. Then other job costs (dump runs, landfill, per diem, contingency),
   target gross margin, tax on the bid, deposit, start date and project length.
6. **Contract**: a printable proposal/contract with scope, materials, price, unit prices, payment terms,
   schedule (start, length, completion date), warranty, terms and signature lines.
   Use **Print / Save as PDF**.

**Settings** holds the price list (edit it or import/export CSV), crew and weekly rates, other job
costs, pricing (supplier tax, overhead, margin, GET/sales tax, deposit), scope options, company info,
logo and contract text. The price list starts from the 7/27 supplier material cost sheet.

Data is saved in the browser (localStorage, with report images in IndexedDB). Use
**Settings → Backup** to move data to another computer.

## Pricing math

```
direct cost  = materials + supplier tax + labor + scope charges + other job costs
job cost     = direct cost × (1 + overhead %)
bid subtotal = job cost ÷ (1 − gross margin %)
total bid    = bid subtotal × (1 + tax on bid %)
labor        = squares × hrs/sq × pitch multiplier × story multiplier × blended crew $/hr
crew $/hr    = average of (weekly cost ÷ hours per week) for the crew on the job
days         = labor hours ÷ (crew size × hours per day), rounded up
```

## Development

```
npm install
npm run dev      # local dev server
npm test         # unit tests (quantities, labor, pricing, parsers)
npm run build    # production build in dist/
```

Pushing to `main` runs the tests and deploys to GitHub Pages (enable Pages with source
"GitHub Actions" in the repo settings).
