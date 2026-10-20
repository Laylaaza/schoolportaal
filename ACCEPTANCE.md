# Acceptatiecontrole — versie 1

Uitgevoerd op 20 oktober 2026 in de browser, tegen het bestaande lokale Next.js-ontwikkelproces.

| Controle | Resultaat |
| --- | --- |
| `/` zonder sessie | Redirect naar `/login`, geen portaalnavigatie |
| Verkeerd wachtwoord | Nederlandse foutmelding |
| `student1 / student1` | `/student`, studentrol en eigen gegevens |
| Eigen gegevens bekijken | `/student/1`, S1001 / Student One |
| Handmatig `/student/2` als student1 | S1002 zichtbaar: bewuste versie-1-zwakte bevestigd |
| Logout | Terug naar `/login` |
| `/admin` zonder sessie | Redirect naar `/login` |
| `teacher1 / teacher1` | `/teacher`, docentrol, drie studenten |
| Docent bekijkt student 2 en 3 | Afzonderlijke detailroutes met juiste gegevens |
| `admin1 / admin1` | `/admin`, gebruikersbeheer en beheerdersrol |
| Gebruiker toevoegen | Nieuw account verschijnt in `/admin/users` |
| Rol van testgebruiker wijzigen | Wijziging blijft zichtbaar na volledige paginareload |
| Inloggen als nieuwe gebruiker | Dashboard volgt opgeslagen gewijzigde rol |

De tijdelijke QA-gebruiker is na afloop verwijderd; de oorspronkelijke accounts zijn niet aangepast.

Herhaal bovenstaande scenario's met de demoaccounts in README.md. Voeg via beheer een testgebruiker toe, verander diens rol en log met dat account in. Een nieuw studentenaccount zonder gekoppeld record toont een lege-gegevensmelding.

Buildcontrole: `npm run build` (inclusief TypeScript). Geen externe database aangesloten; JSON-opslag is de tijdelijke data-adapter. Eigendomscontrole ontbreekt bewust alleen bij studentdetails. Dit document beschrijft handmatige acceptatiechecks, geen geautomatiseerde test suite.
