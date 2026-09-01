# Lab 2 UI Specification (Zen Green)

This document defines the reusable presentation system for Lab 2 and later labs. Later labs reuse these styles rather than inventing a new visual system.

## 1. Color Tokens

Token | Value | Intended Use
---|---|---
`--tok-primary` | `#006B3C` | App header, primary actions, strong emphasis.
`--tok-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover states.
`--tok-pale` | `#EAF6EF` | Selected rows, success emphasis, subtle section emphasis.
`--tok-bg` | `#F5F7F6` | Page background (quiet near-white).
`--tok-surface` | `#FFFFFF` | Cards/surfaces with subtle border + restrained shadow.
`--tok-text` | Dark charcoal-green (e.g. `#1C2B22`), not pure black | Body text for comfortable reading.
`--tok-field` | `#FFFFFF` with neutral border | Editable fields.
`--tok-readonly` | Soft gray-green / warm ivory (e.g. `#EEF2F0`) | Read-only fields, clearly distinct but readable.
`--tok-error` | Dark red text + border | Error messages/borders; message appears directly below the field.
`--tok-warning` | Amber callout/badge only | Warnings; never used as ordinary decoration.
`--tok-success` | Green confirmation with readable text | Success; never color-alone.

## 2. Typography and Spacing

- Use the app's default UI font stack; headings clearly sized for hierarchy.
- Labels sit above controls with consistent font weight (medium) and consistent vertical spacing (e.g. 4px between label and control).
- Consistent field spacing (e.g. 16px between rows), 24px between form sections.
- Consistent control height across all inputs.

## 3. Control States

- **Editable**: white background, neutral border.
- **Read-only**: soft gray-green/ivory shading, clearly distinct but readable.
- **Invalid**: dark red border + message text below the field.
- **Disabled**: visually distinct (reduced opacity + not interactive); cannot be activated.
- **Focused**: visible focus indicator (secondary green) for keyboard users.
- **Required**: red asterisk `*` next to the label; asterisk does not replace the validation message.

## 4. Required-Field Marker and Validation Placement

- Labels appear above controls.
- Required fields show a red asterisk.
- Validation messages appear near the associated field (directly below), not only as an error at the top.
- On submit, invalid fields show their individual messages.

## 5. Button Hierarchy

- **Primary**: filled `#006B3C`; used for main actions (Continue, Submit/Create).
- **Secondary**: outlined/text green; used for Change Requester, secondary actions.
- **Tertiary / link**: textual green.
- **Destructive**: used for soft-remove attachments.
- **Disabled**: visually distinct, not activatable.
- **Busy**: Submit shows a busy state (e.g. spinner + "Submitting…") and is disabled while the request is processed (FR/BR covering busy submit).
- Buttons include visible text; icons may support but must not replace unclear text. Every icon-only control needs an accessible label and tooltip.

## 6. Attachment Presentation

- Add/file controls placed logically within Ticket Detail.
- States presented distinctly:
  - **Active**: shown as a list with name + metadata; download available.
  - **Uploading**: progress/busy state.
  - **Invalid**: field-level error for unsupported type / oversized file.
  - **Removed**: metadata still visible, marked as removed (with reason), download/action blocked.
  - **Unavailable**: e.g. file missing on disk; shown as unavailable without crashing.

## 7. Screen States (applies to every screen)

- **Initial / idle**, **Loading**, **Empty** (no data at all), **No-results** (filters/search matched nothing), **Failure** (safe API error), and (for forms) **Success**.
- Empty vs no-results presented distinctly (see My Tickets).

## 8. Application Shell & Navigation

- TokTickIT application identity (header, primary green).
- **My Tickets** navigation and **Create Ticket** navigation.
- Selected Development Requester identity displayed (e.g. in header), with a **Change Requester** action.
- Clear active-page indication.
- Responsive mobile navigation (e.g. collapsible menu) that remains usable.
- Development Requester Selection screen is shown before any requester-specific data.

## 9. Create Ticket Layout

Example arrangement (may be improved while staying consistent with Zen Green):
1. System-generated read-only rows near the top (Ticket Number, status, dates) in read-only styling.
2. Classification fields grouped (Category, Related System, Requested Priority).
3. Summary and Description given sufficient width/space.
4. Attachments section below the main fields.
5. Primary (Submit/Create) and secondary actions at the bottom.
- On success, clearly display the generated official Ticket Number and the next action (e.g. "View in My Tickets").

## 10. My Tickets Layout

- Search box, filters (e.g. Category, Status, Requested Priority), sort control, and pagination.
- A Create Ticket action.
- Desktop: table with columns (e.g. Ticket Number, Summary, Category, Current Status, Last Updated).
- Mobile: card or responsive-table representation.
- Distinct empty vs no-results presentations.
- Loading, failure states.
- Badges for **Requested Priority**, **IT Priority**, **Current Status** with consistent colors per `ui-spec` badge rules.

## 11. Requester Ticket Detail (View Mode)

- Current Ticket information read-only; clearly distinguished from Attachment actions.
- Field grouping and responsive arrangement documented; navigation back to My Tickets.
- No Public Comments, Internal Notes, Actions Taken, or status workflow controls.

## 12. Responsive Rules

Viewport | Behavior
---|---
Desktop ≥ 992px | Multi-column as specified; content centered with sensible max width.
Tablet 768–991px | Two-column where practical; Summary and Description get enough width.
Mobile < 768px | Fields stack vertically; touch-friendly buttons; no horizontal page scroll.
All sizes | No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names.

## 13. Accessibility

- Accessible labels for all icon-only controls (+ tooltip).
- Visible keyboard focus indicators.
- Non-color indicators for success/warning/error (icon or text, not color alone).
- Keyboard-accessible form controls, labels associated with inputs.
- Semantically correct headings/structure.

## 14. Visual Inspection Checklist and Screenshots

- Colors/tokens match this document.
- Editable vs read-only distinct; validation near field.
- Button hierarchy consistent; busy/disabled correct.
- No clipping, overlap, or unintended horizontal scrolling.
- Desktop table and mobile card/responsive-table correct.
- Badges consistent for Requested Priority / IT Priority / Current Status.
- Filters, pagination, attachment controls, and empty states usable at all sizes.
- Screenshots (Playwright) for **Create Ticket**, **My Tickets**, **Ticket Detail** at desktop, tablet, and mobile viewports → `artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/`.
