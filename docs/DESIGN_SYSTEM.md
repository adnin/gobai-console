# GOBAI Web UI — Design System (Tokens + Cheat Sheet)

This doc is the **single source of truth** for the web portal’s 

The UI is token-driven: components use semantic Tailwind classes like `bg-background`, `text-foreground`, `border-border`, `bg-primary`, etc. The actual colors live in **`src/index.css`**.

---

## Theme palette

### Raw palette (hex)

`#f7f7f8 #ffffff #e5e7eb #0f172a #374151 #10a37f #19c37d #2563eb #16a34a #f59e0b #ef4444 #202123`

### Semantic mapping

- **bg:** `#f7f7f8`
- **surface (cards/popovers):** `#ffffff`
- **border/muted UI:** `#e5e7eb`
- **text (strong):** `#0f172a`
- **text (softer default):** `#374151`
- **primary (ChatGPT green):** `#10a37f`
- **link/info:** `#2563eb`
- **success alt:** `#16a34a`
- **warning:** `#f59e0b`
- **danger:** `#ef4444`

> Implementation: `src/index.css` sets these as CSS variables and maps them into Tailwind v4 via `@theme inline`.

---

## Enterprise multi-role UI design cheat sheet

### 1) Typography

**Font choices**
- Use **1 UI sans-serif family** (system or Inter-like) + optional **brand display** font for marketing only.
- Prefer **system fallbacks** for speed + consistency.
- Avoid mixing more than **2 families**.

**Type scale (practical default)**
- Body: **16px** (never below 12px except legal microcopy)
- Small: **13–14px** (secondary/meta)
- H3: **18–20px**
- H2: **22–24px**
- H1: **28–32px** (rare in app UI; keep calm)
- Use **2–4 steps** max on most screens.

**Line height & readability**
- Body: **1.4–1.6**
- Headings: **1.2–1.3**
- Desktop content column: **~560–720px**.

**Hierarchy rules**
- One dominant headline per screen.
- Don’t bold everything.
- Prefer: **title → value → helper/meta**.

**Accessibility**
- Normal text contrast ≥ **4.5:1**
- Large text contrast ≥ **3:1**
- Don’t rely on color alone; pair with icons/labels.

---

### 2) Spacing & grid

**Base unit**
- Pick **one**: **8px** grid (enterprise) or **4px** grid (premium).
- Enforce: margins/paddings are multiples of the base.

**Spacing scale (example tokens)**
- `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

**Layout grid**
- Desktop: **12-column** w/ consistent gutters (e.g., 24px)
- Focused flows: **560–720px** max width, centered

**Container rules**
- Don’t put long text directly on page background.
- Card padding: **16–20**
- Section gaps: **16–24**
- Form field gaps: **12–16**
- Don’t mix density modes on the same screen.

**Alignment**
- Align to grid (edges + baselines).
- Avoid “almost aligned”.

---

### 3) Color & theme

**Token naming (semantic > brand)**
- `bg`, `surface`, `border`, `text`, `mutedText`
- `primary`, `success`, `warning`, `danger`, `info`

**Brand usage rules**
- Neutral UI + **one** accent for primary actions.
- Reserve loud colors for: primary CTA + key status accents.

**Dark mode guidance**
- Keep meaning consistent (danger stays danger).
- Avoid per-screen hand-picked dark colors.

---

### 4) Navigation patterns

**Web SaaS**
- Left sidebar for multi-section products
- Top bar for global search, notifications, user

**Multi-role platform**
- Role switcher must be intentional and hard to mis-click.
- Roles share tokens/components; only density/layout changes.

---

### 5) Whitespace & composition

- Use whitespace to group, not decorate.
- Prefer separators + spacing over heavy borders everywhere.
- One primary action per screen; secondary looks secondary.

---

### 6) Iconography & imagery

- Use one icon set.
- Keep stroke width + outline/fill consistent.
- If an icon can be misunderstood, add label/tooltip.

---

### 7) Microinteractions & motion

- Press: **50–120ms**
- Small transitions: **150–250ms**
- Screen transitions: **200–350ms**
- Use consistent easing (ease-out entering, ease-in leaving).
- Respect reduced-motion.

---

### 8) Responsive & cross-platform

Breakpoints:
- Mobile < 600
- Tablet 600–1024
- Desktop > 1024

Touch targets:
- Minimum **44px**.

---

### 9) Consistency & branding

- No one-off colors/sizes/radii/shadows.
- Button heights consistent.
- Define logo usage + spacing + allowed shades.

---

### 10) QA checklist

**Tiny details (high impact)**
- [ ] Spacing uses base unit.
- [ ] Typography scale consistent.
- [ ] Icons style consistent.
- [ ] Consistent corner radii.
- [ ] Button heights consistent.
- [ ] Baselines aligned in icon/text rows.
- [ ] Dividers consistent (1px hairlines).

**Interaction states**
- [ ] Buttons: default / hover / pressed / disabled.
- [ ] Inputs: focus ring, error state, helper.
- [ ] Links: hover / visited.

**Errors & empty states**
- [ ] Errors are visible and actionable.
- [ ] Inline field errors + top-level form errors.
- [ ] Empty states explain what to do next.

**Accessibility**
- [ ] Contrast OK.
- [ ] Keyboard nav works.
- [ ] Focus order logical.
- [ ] Reduced motion honored.

**Layout & performance**
- [ ] No clipping on small screens.
- [ ] Text wraps cleanly.
- [ ] Tables degrade gracefully.
- [ ] Skeletons for lists.
- [ ] No layout shift on load.

---

## Recommended references

- Shopify Polaris
- Salesforce Lightning Design System
- Atlassian Design System
- IBM Carbon
- Material Design
- Microsoft Fluent
