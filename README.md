# Security Playground — schoolportaal, versie 1

Dit is het bestaande Next.js-project, omgebouwd van een interactief prototype naar een klein schoolportaal met aparte routes. De interface blijft Nederlandstalig. Het is een lokale oefenomgeving voor de vergelijking vóór en na beveiligingsmaatregelen.

## Starten

Open deze map in VS Code en voer uit:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:3000. Als de server al draait, gebruik die bestaande server. Productiecontrole: `npm run build`, daarna `npm start` (stop eerst de ontwikkelserver). Beide scripts luisteren alleen op loopback.

## Accounts

| Gebruikersnaam | Wachtwoord | Rol | Dashboard |
| --- | --- | --- | --- |
| student1 | student1 | Student | /student |
| teacher1 | teacher1 | Docent | /teacher |
| admin1 | admin1 | Beheerder | /admin |

Een nieuw account kan direct inloggen met het ingestelde wachtwoord. Een nieuw studentenaccount heeft nog geen gekoppeld studentrecord; het portaal toont dit netjes. Student Two en Student Three zijn voorbeeldrecords zonder eigen loginaccount (`user_id: null`).

## Routes

- `/`: naar login, of het dashboard bij een bestaande sessie.
- `/login`: gebruikersnaam en wachtwoord, zonder dashboardnavigatie.
- `/student`: eigen gegevens en link naar eigen record.
- `/student/[id]`: bijvoorbeeld `/student/1` en `/student/2`.
- `/teacher`: overzicht met drie studenten.
- `/teacher/students`: studentenlijst.
- `/teacher/students/[id]`: studentgegevens.
- `/admin`: gebruikersbeheer.
- `/admin/users`: gebruikerslijst en formulieren om rollen te wijzigen.
- `/admin/users/new`: gebruiker toevoegen.

De oude prototypepagina's en navigatie zijn verwijderd. Elke beschermde pagina controleert login en de basisrol. Uitloggen verwijdert de serversessie en cookie en verwijst naar `/login`.

## Bestanden en verantwoordelijkheden

- `app/**/page.tsx`: afzonderlijke serverpagina's.
- `app/actions.ts`: login, logout, toevoegen en rolwijzigingen.
- `lib/auth.ts`: sessie uitlezen en basiscontrole van login/rol.
- `lib/roles.ts`: dashboardroutes en Nederlandse rolnamen.
- `lib/models.ts`: roles, users, students en sessions.
- `lib/seed.ts`: geïsoleerde voorbeelddata en demowachtwoorden.
- `lib/repository.ts`: alle dataopslag en gegevensopvragingen.
- `components/shell.tsx`: navigatie, gebruikersnaam en rol.
- `components/forms.tsx`: login- en toevoegformulier met foutmeldingen.
- `components/records.tsx`: tabellen en studentgegevens.
- `app/globals.css`, `app/layout.tsx`: eenvoudige opmaak, bestaande lokale Inter-fonts en Nederlandse metadata.

Vervangen/verwijderd: de catch-all `app/[[...screen]]/page.tsx`, `components/portal.tsx`, `components/portal-state.tsx` en de oude `lib/data.ts`. Framework, dependencies en projectmap zijn behouden.

## Data en sessies

Er was geen databaseverbinding. De lokale adapter maakt bij het eerste gebruik `data/portal.json` met vier verzamelingen: `roles`, `users`, `students`, `sessions`. Aanpassingen blijven bewaard na een herstart. Deze runtimebestanden staan in `.gitignore`; oude browser-localStorage wordt niet meer gebruikt.

De cookie bevat een willekeurig sessie-ID. Het serverbestand koppelt dit aan de gebruiker, aanmaaktijd en vervaltijd (acht uur). Elke aanvraag leest de actuele rol, zodat een rolwijziging ook voor een bestaande sessie geldt. Het wachtwoord gaat niet mee naar de UI.

De JSON-adapter is bedoeld voor één lokaal Node-proces, niet voor meerdere servers of serverless hosting. Vervang later de functies in `lib/repository.ts` door databasebewerkingen. Er worden nu geen SQL-query's gebruikt; SQL-injectie is dus nog niet te demonstreren.

Voor een nieuwe oefenronde: stop de server, hernoem `data/portal.json` naar een reservekopie en start opnieuw. De originele accounts worden opnieuw aangemaakt. Met `PORTAL_TEST_MODE=1` gebruikt een apart testproces `data/acceptance.json` in plaats van de normale data.

## Bewust overgelaten voor versie 2

1. **Broken Access Control:** student1 kan handmatig `/student/2` openen. De normale navigatie verwijst alleen naar `/student/1`. De ontbrekende eigendomscontrole is gemarkeerd in `StudentDetail` in `components/records.tsx`.
2. **Voorspelbare record-ID's:** studentroutes gebruiken eenvoudige getallen.
3. **Wachtwoorden in platte tekst:** uitsluitend lokale fictieve gebruikers. Hashing moet later in registratie en login worden toegevoegd.
4. **Eenvoudige cookie/sessionbeveiliging:** geen expliciete HttpOnly/Secure/SameSite-verharding, idle timeout, periodieke rotatie of sessie-audit. Er is wel basisverval en logout-intrekking.
5. **Beperkte invoervalidatie:** browsercontroles en alleen eenvoudige serverchecks voor verplichte velden, geldige rol en dubbele gebruikersnaam.
6. **Geen rate limiting of MFA.** Loginfouten zijn centraal aanpasbaar in `app/actions.ts`.

De broncode bevat `SECURITY VERSION 2`-commentaar. Deze uitleg verschijnt niet in de portalinterface. React-escaping, Next.js-formuliergedrag en basisrolcontroles zijn behouden; er zijn geen extra SQL- of scriptinjecties ingebouwd.

## Acceptatiecontrole

Zie `ACCEPTANCE.md` voor de uitgevoerde controles en stappen om ze te herhalen.
