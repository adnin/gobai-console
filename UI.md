 Enterprise Multi-Role UI Design Cheat Sheet


## Table of contents
1. Typography
2. Spacing & grid
3. Color & theme
4. Navigation patterns
5. Whitespace & composition
6. Iconography & imagery
7. Microinteractions & motion
8. Responsive & cross-platform
9. Consistency & branding
10. QA checklist (tiny → major)
11. Recommended design-system references

---

## 1) Typography

### Font choices
- Use **1 UI sans-serif family** (system or Inter-like) + optional **brand display** font for marketing only.
- Prefer **system fallbacks** for speed + consistency across platforms.
- Avoid mixing more than **2 families**.

### Type scale (practical default)
- **Body:** 16px (never below 12px except legal microcopy)
- **Small:** 13–14px (secondary/meta)
- **H3:** 18–20px
- **H2:** 22–24px
- **H1:** 28–32px (rare in app UI; keep calm)
- Use **2–4 steps** max for most screens.

### Line height & readability
- Body: **1.4–1.6**
- Headings: **1.2–1.3**
- Keep **line length** comfortable (desktop content column ~560–720px).

### Hierarchy rules
- One dominant headline per screen.
- Use weight + size sparingly: **don’t bold everything**.
- Prefer **semantic emphasis**: title → value → helper/meta.

### Accessibility
- Maintain **WCAG contrast**:  
  - Normal text ≥ **4.5:1**  
  - Large text ≥ **3:1**
- Don’t rely on color alone; pair with icons/labels.

---

## 2) Spacing & Grid

### Base unit
- Pick **one**:
  - **8px grid** (classic enterprise dashboards)
  - **4px grid** (more precise, premium)
- Enforce: margins/paddings must be multiples of the base unit.

### Spacing scale (example tokens)
- `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

### Layout grid
- Desktop: **12-column** with consistent gutters (e.g., 24px).
- Content max width for “focused” flows: **560–720px** centered.
- Data-heavy dashboards can go wider, but keep readable columns.

### Container rules
- Don’t place long text directly on the page background.
- Use **cards/sections** with consistent padding:
  - Card padding: **16–20**
  - Section gaps: **16–24**
  - Form field vertical gaps: **12–16**
- Keep “density modes” consistent (comfortable vs compact). Don’t mix on one screen.

### Alignment
- Align everything to the grid:
  - Left edges
  - Baselines (typography)
  - Icon/text vertical centering
- Avoid “almost aligned” layouts; they instantly look cheap.

---

## 3) Color & Theme

### Palette structure (semantic)
Define tokens by purpose, not by brand names:
- `bg`, `surface`, `border`, `text`, `mutedText`
- `primary`, `primaryHover`, `primaryPressed`
- `success`, `warning`, `danger`, `info`

### Brand usage rules
- **Neutral UI** (grays/whites) + **one brand accent** for primary action.
- Reserve loud brand colors for:
  - Primary CTA
  - Key highlights
  - Limited status accents

### Contrast & accessibility
- Ensure contrast for:
  - Text on surfaces
  - Icons used as meaning
  - Disabled states (still readable)
- Validate in both **light + dark mode** if supported.

### Dark mode guidance
- Use tokens so dark mode is automatic:
  - Don’t “hand-pick” random dark colors per screen.
- Keep the same semantic meaning (danger stays danger).

---

## 4) Navigation Patterns

### Desktop / Web SaaS
- **Left sidebar** for multi-section products (merchant, partner, ops).
- **Top bar** for global search, notifications, user menu.
- Active state must be obvious; include section headers for grouping.

### Mobile / Consumer
- **Bottom tabs** for 3–5 main sections (Home, Orders, Wallet, Profile).
- Use a **drawer** for secondary actions/settings.
- Keep primary action reachable by thumb.

### Multi-role platform pattern
- Role switcher (if needed) must be:
  - Visible
  - Intentional
  - Hard to trigger by accident
- Each role UI shares:
  - Same tokens
  - Same components
  - Same microinteraction rules
…but can differ in layout density and core modules.

---

## 5) Whitespace & Composition

### Composition rules
- Use whitespace to group, not decorate.
- Prefer **separators + spacing** over heavy borders everywhere.
- Keep 1 primary action per screen; secondary actions must look secondary.

### Density guidelines
- Customer app: **comfortable**, fewer controls per view.
- Merchant/ops: **denser**, but still readable (tables with clear column spacing).

### Visual “premium” markers
- Predictable rhythm (no random gaps).
- Consistent corner radii.
- Subtle elevation (shadows) or hairline borders, not both aggressively.

---

## 6) Iconography & Imagery

### Icons
- Use one icon set.
- Keep consistent:
  - Stroke width
  - Corner radius
  - Filled vs outline
- If an icon could be misunderstood, add a label or tooltip.

### Imagery
- Avoid low-res, mismatched photos.
- Prefer:
  - Real product imagery (customer)
  - Clean illustrations (empty states)
  - Map previews + delivery visuals (delivery domain)
- Always provide alt/labels where needed.

---

## 7) Microinteractions & Motion

### Motion principles
- Motion should:
  - Confirm action
  - Guide attention
  - Reduce uncertainty
- Avoid “fun” motion in ops dashboards unless it’s subtle.

### Timing (practical)
- Press feedback: **50–120ms**
- Small UI transitions: **150–250ms**
- Screen transitions: **200–350ms**
- Use consistent easing (ease-out for entering, ease-in for leaving).

### Loading states
- Use:
  - Skeletons for lists/cards
  - Spinners for short waits
  - Progress indicators for multi-step
- Never leave the user wondering; show status.

### Accessibility
- Honor reduced-motion preferences.
- Keep animations optional and non-essential for understanding.

---

## 8) Responsive & Cross-Platform

### Responsive behavior
- Breakpoints:
  - Mobile < 600
  - Tablet 600–1024
  - Desktop > 1024
- Stack columns on small screens.
- Maintain touch targets:
  - Minimum **44px** height/tap area.

### Cross-platform consistency
- Same semantics, same naming, same tokens across:
  - Customer app
  - Merchant dashboard
  - Partner/ops portal
- Platform-specific UI patterns are fine (native pickers), but keep the “voice” consistent.

---

## 9) Consistency & Branding

### Consistency rules (this is where “cheap” shows)
- No one-off colors.
- No one-off font sizes.
- No random border radii.
- No mixed shadow styles.
- No inconsistent button heights.

### Branding
- Define:
  - Logo usage + spacing rules
  - Color tokens + allowed shades
  - Component library rules
- Co-branding:
  - Clear separation
  - Proper spacing between marks
  - No visual dominance unless intended

---

## 10) QA Checklist (tiny → major)

### Tiny details (high impact)
- [ ] All spacing uses the chosen base unit (4px or 8px).
- [ ] Typography scale is consistent; no random sizes.
- [ ] All icons match the same style (stroke/fill).
- [ ] Consistent corner radius across cards/inputs/buttons.
- [ ] Button heights consistent (e.g., 48–52).
- [ ] No misaligned baselines in text+icon rows.
- [ ] No inconsistent divider thickness (use 1px hairlines).

### Interaction states
- [ ] Buttons: default / hover / pressed / disabled.
- [ ] Inputs: focus ring, error state, helper text.
- [ ] Links: hover + visited rules (web).
- [ ] Toggles/switches: clear ON/OFF state.

### Errors & empty states
- [ ] Error messages are human, actionable, and visible.
- [ ] Inline field errors + top-level form errors.
- [ ] Empty states explain “what to do next”.

### Accessibility
- [ ] Contrast meets WCAG.
- [ ] Keyboard navigation works on web.
- [ ] Focus order is logical.
- [ ] Touch targets ≥ 44px on mobile.
- [ ] Reduced-motion supported.

### Layout & responsiveness
- [ ] No clipping/overlap on small screens.
- [ ] Text wraps cleanly; no truncated critical info.
- [ ] Tables degrade gracefully (horizontal scroll or stacked rows).

### Performance & polish
- [ ] Images optimized; lazy-load where appropriate.
- [ ] Skeletons used for list loading.
- [ ] No layout shift when data loads (stable skeleton heights).
- [ ] Loading states don’t block unnecessarily.

---

## 11) Recommended design-system references
Use as inspiration/standards for “enterprise-grade”:
- Shopify Polaris (merchant admin patterns)
- Salesforce Lightning Design System (enterprise CRM)
- Atlassian Design System (8px grid discipline)
- IBM Carbon (enterprise components + tokens)
- Material Design (motion + cross-platform patterns)
- Microsoft Fluent (enterprise + consumer consistency)

---

## Quick (one-glance)
- **Consistency:** 10/10 tokens and components
- **Readability:** calm hierarchy, strong contrast
- **Density control:** customer comfy, ops compact
- **Feedback:** microinteractions + clear system status
- **No rough edges:** states, errors, loading, alignment