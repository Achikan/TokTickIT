# Machine-verified visual checklist — Lab 3

- Generated: 2026-10-04T13:27:39.637Z
- Command: `node scripts/verify-visual-checklist.mjs (VIEWPORTS=1280x900,1024x900,820x900,390x900, ROLES=admin,staff,requester)`
- Viewports: 1280x900, 1024x900, 820x900, 390x900
- Roles: admin, staff, requester
- Screens: login, user-management, ticket-queue, staff-ticket-detail, my-tickets, ticket-detail, create-ticket
- Result: **220 / 220 measurements passed, 0 failed**

| # | Checklist item | Measured | Passed | Failed |
| --- | --- | ---: | ---: | ---: |
| 1 | Design consistency (tokens, surfaces, labelled badges) | 28 | 28 | 0 |
| 2 | Role navigation shows only permitted destinations | 24 | 24 | 0 |
| 3 | Badges: status + both priorities, as text | 4 | 4 | 0 |
| 4 | Editable vs read-only fields distinct | 24 | 24 | 0 |
| 5 | Validation messages next to their field | 28 | 28 | 0 |
| 6 | Visible keyboard focus indicator | 28 | 28 | 0 |
| 7 | No clipped content | 28 | 28 | 0 |
| 8 | No overlapping content | 28 | 28 | 0 |
| 9 | No horizontal page overflow | 28 | 28 | 0 |

## Measured detail per item

### Design consistency (tokens, surfaces, labelled badges)

- 1280x900 login: tokens match, all badges labelled
- 1280x900 user-management: tokens match, all badges labelled
- 1280x900 ticket-queue: tokens match, all badges labelled
- 1280x900 staff-ticket-detail: tokens match, all badges labelled

### Role navigation shows only permitted destinations

- 1280x900 user-management: ADMIN sees 1 destinations, all permitted + Logout
- 1280x900 ticket-queue: IT_STAFF sees 1 destinations, all permitted + Logout
- 1280x900 staff-ticket-detail: IT_STAFF sees 1 destinations, all permitted + Logout
- 1280x900 my-tickets: REQUESTER sees 2 destinations, all permitted + Logout

### Badges: status + both priorities, as text

- 1280x900 ticket-queue: 10 ticket rows carry status + both priorities as text

### Editable vs read-only fields distinct

- 1280x900 staff-ticket-detail: editable rgb(255, 255, 255) vs read-only rgb(238, 242, 240)
- 1280x900 ticket-detail: editable rgb(255, 255, 255) vs read-only rgb(238, 242, 240)
- 1280x900 create-ticket: editable rgb(255, 255, 255) vs read-only rgb(238, 242, 240)
- 1280x900 user-management: no read-only field on this screen

### Validation messages next to their field

- 1280x900 login: each validation message sits inside its field's form group
- 1280x900 user-management: each validation message sits inside its field's form group
- 1280x900 ticket-queue: each validation message sits inside its field's form group
- 1280x900 staff-ticket-detail: each validation message sits inside its field's form group

### Visible keyboard focus indicator

- 1280x900 login: 34 tab stops, all show a focus ring
- 1280x900 user-management: 44 tab stops, all show a focus ring
- 1280x900 ticket-queue: 43 tab stops, all show a focus ring
- 1280x900 staff-ticket-detail: 42 tab stops, all show a focus ring

### No clipped content

- 1280x900 login: no clipped or ellipsis-truncated content
- 1280x900 user-management: no clipped or ellipsis-truncated content
- 1280x900 ticket-queue: no clipped or ellipsis-truncated content
- 1280x900 staff-ticket-detail: no clipped or ellipsis-truncated content

### No overlapping content

- 1280x900 login: 3 text elements, none overlapping
- 1280x900 user-management: 106 text elements, none overlapping
- 1280x900 ticket-queue: 128 text elements, none overlapping
- 1280x900 staff-ticket-detail: 55 text elements, none overlapping

### No horizontal page overflow

- 1280x900 login: document does not scroll sideways
- 1280x900 user-management: document does not scroll sideways
- 1280x900 ticket-queue: document does not scroll sideways
- 1280x900 staff-ticket-detail: document does not scroll sideways

