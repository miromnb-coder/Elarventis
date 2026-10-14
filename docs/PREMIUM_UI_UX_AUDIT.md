# Premium UI/UX audit — 14.10.2026

## Reference and baseline

Read Rivora's `AtelierHomepage`, `AtelierExperience`, `MarketingNav`, `atelier.css`, login page, `AppShell`, `AppNav`, and workspace authorization code. The live `averomira.com/login` page was also inspected in a browser. Rivora separates marketing, authentication, and workspace compositions while using consistent typography, hierarchy, form states, navigation and role-aware server decisions. Its example interactions identify illustrative data. Elarventis previously had a large decorative blurred hero, a basic account form, a generic dashboard, minimal settings, and an auth middleware loop.

## Decisions

- Use Elarventis's warm paper, coral and peach identity with dark text, restrained borders, editorial serif emphasis, and no large decorative gradient in the new hero.
- Explain the concrete comparison between billed and agreed price immediately. The hero proof card and interactive software preview use synthetic numbers with explicit disclosure.
- Separate four workflows: public marketing, unauthenticated account entry, authenticated workspace, and tenant-scoped API calls.
- Show only functional account actions. Invitation creation and acceptance are withheld pending migration and delivery verification.
- Keep the foundation migration and audit-engine business rules untouched.

## Remaining gaps

- The live public Elarventis deployment and its new protected pages have not been visually verified at requested viewport widths.
- Member names/emails beyond one's own are unavailable from the existing tenant schema; the settings table shows an opaque user ID.
- The homepage contact form saves a local draft only. There is no sending address or privacy policy to link to.
- This implementation is a substantive redesign of homepage, auth and settings, but several invoice and report screens still use the existing workspace components.
