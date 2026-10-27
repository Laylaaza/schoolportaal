# Security Playground — MySQL, versie 1

Het bestaande Next.js-schoolportaal gebruikt nu de MySQL-database `schoolportal`. Routes, Nederlandse interface en versie-1-beveiligingsgedrag blijven behouden. Er is geen JSON- of demodatafallback.

## Installatie op SRV-WEB01

Voer in de bestaande projectmap uit:

```sh
npm ci
```

Maak of bewerk zelf `.env.local` op SRV-WEB01. Dit bestand is genegeerd door Git. Zet hierin:

```dotenv
DB_HOST=192.168.10.30
DB_PORT=3306
DB_USER=schoolapp
DB_PASSWORD=<vul het werkelijke databasewachtwoord in>
DB_NAME=schoolportal
```

`.env.example` bevat alleen een leeg wachtwoordveld. Zet geen echt wachtwoord in broncode of een commit. Een al bestaand `.env.local` is niet gewijzigd.

```sh
npm run db:check
npm run test:db
npm run build
npm start
```

Herstart een bestaande service via de reeds gebruikte servicebeheerder in plaats van een tweede server te starten. `npm start` blijft luisteren op `127.0.0.1:3000`, zoals voorheen. Behoud de bestaande reverse-proxyconfiguratie op SRV-WEB01. De ontwikkelopdracht blijft `npm run dev`.

`db:check` controleert verbinding, tabelkolommen, rollen en automatisch oplopende IDs zonder gegevens te wijzigen. Er worden geen tabellen, gebruikers of rechten aangemaakt. `users.id` en `sessions.id` moeten door MySQL worden gegenereerd (AUTO_INCREMENT); `session_id` moet een UUID van 36 tekens kunnen opslaan. Sessietijden worden als UTC geschreven en vergeleken. Gebruik dezelfde UTC-conventie bij het inspecteren van deze gegevens.

## Login en data

`app/actions.ts` leest gebruikersnaam en wachtwoord. `findLoginUser` in `lib/repository.ts` haalt de gebruiker met een JOIN op `roles` op. Het ingevoerde wachtwoord wordt als platte tekst vergeleken met de waarde uit MySQL. Er zijn geen vaste inlogwachtwoorden meer in de applicatie.

De bestaande accounts `student1`, `teacher1` en `admin1` gebruiken dus de wachtwoorden die op dit moment in MySQL staan. De rol uit MySQL bepaalt de redirect:

| Databaserol | Bestaande UI-rol | Route |
| --- | --- | --- |
| student | Student | /student |
| teacher | Docent | /teacher |
| admin | Beheerder | /admin |

Gebruikersbeheer leest en schrijft MySQL. Studentgegevens komen uit `students`, waarbij de eigen gegevens via `students.user_id = users.id` worden gevonden. De docententabel gebruikt dezelfde database. Sessies worden in `sessions` opgeslagen; de bestaande UUID-cookie en vervaltijd van acht uur blijven werken. Logout wist in versie 1 alleen de cookie; het token blijft tot de oorspronkelijke vervaltijd bruikbaar. Oude JSON-sessies worden niet gemigreerd: log opnieuw in.

Alle bestaande routes blijven bestaan: `/login`, `/student`, `/student/[id]`, `/teacher`, `/teacher/students`, `/teacher/students/[id]`, `/admin`, `/admin/users`, `/admin/users/new`.

## Bestanden

- `lib/db.ts`: centrale mysql2/promise-pool, omgevingsvariabelen en veilige foutregistratie.
- `lib/repository.ts`: directe SQL-query's voor rollen, gebruikers, studenten en sessies.
- `lib/auth.ts`: bestaande sessie- en basisrolcontrole; geen tweede loginsysteem.
- `app/actions.ts`: bestaande formulieren met asynchrone databaseaanroepen.
- `components/records.tsx`, `components/shell.tsx`, `app/student/page.tsx`, `app/admin/users/new/page.tsx`: wachten nu op databasegegevens; uiterlijk blijft gelijk.
- `app/error.tsx`: eenvoudige foutpagina zonder SQL-details.
- `scripts/check-db.cjs`: read-only controle voor SRV-WEB01.
- `tests/database.test.cjs`: lokale tests met gesimuleerde databaseantwoorden.

`lib/seed.ts` en het ongebruikte JSON-databasetype zijn verwijderd. Bestaande bestanden onder `data/` zijn niet verwijderd, maar worden nergens meer ingelezen of bijgewerkt. Ze zijn uitsluitend oude lokale gegevens, geen actieve databron. `mysql2` was al aanwezig; geen ORM of extra runtimebibliotheek toegevoegd.

## Bewust behouden voor versie 2

- Platte-tekst-wachtwoorden en eenvoudige wachtwoordvergelijking.
- Voorspelbare studentroutes zonder eigendomscontrole: een ingelogde student kan bijvoorbeeld `/student/2` openen als dat record bestaat.
- Bestaande eenvoudige cookies/sessies zonder extra hardening, rotatie of idle timeout.
- Alleen basisvalidatie; geen rate limiting of MFA.
- Bestaande MySQL-accountrechten blijven ongewijzigd.

Alle SQL gebruikt gebonden waarden (`?`), behalve de ene geïsoleerde functie `searchStudentsUnsafeV1`. Deze bouwt de docentzoekopdracht bewust onveilig op voor de lokale versie-1-demonstratie. Beveiligingscommentaar staat alleen in de broncode. De log registreert uitsluitend een operationele naam en foutcode, nooit SQL-parameters of credentials.

## Verificatie

Zie `ACCEPTANCE.md` en de volledige opnametabel in `VIDEO_TESTS.md`. De build en 17 lokale tests slagen. Live databaseverificatie vanaf de ontwikkelcomputer gaf ETIMEDOUT; de echte accounts en databasebewerkingen moeten daarom op SRV-WEB01 nog worden gecontroleerd.

## Extra geïsoleerde versie-1-testpunten (27 oktober 2026)

- `/admin/users` controleert alleen login en laat iedere ingelogde rol de gebruikerslijst lezen. Toevoegen en rolwijzigingen blijven admin-only.
- Studentzoeken op `/teacher/students` gebruikt één onveilige query.
- De gebruikersnaamregel (3–30 letters/cijfers/underscores) bestaat alleen als browserpattern; de server laat bijvoorbeeld `lab!demo` door.
- Logout wist alleen de browsercookie, niet de serversessie.
- Login maakt onderscheid tussen een onbekende gebruiker en een verkeerd wachtwoord.
- Bestaande MySQL-permissies en GNS3/pfSense-configuratie zijn niet aangepast.

Alle toekomstige verbeteringen zijn gemarkeerd met `SECURITY VERSION 2:`. Next.js meldde tijdens de build ook een dependency-beveiligingsadvies; dependencyversies zijn in deze opdracht niet gewijzigd.
