# Acceptatie — MySQL-integratie (26 oktober 2026)

## Uitgevoerd

- Productiebouw met TypeScript: geslaagd; bestaande routes behouden.
- Productieserver gestart; GET /login gaf HTTP 200 met het bestaande gebruikersnaamformulier. Testserver daarna gestopt.
- `node --test tests/database.test.cjs`: 12 tests geslaagd met gesimuleerde driverantwoorden.
- Tests controleren de drie databaserollen/redirects, databasewachtwoordgebruik, ongeldige credentials, ontbrekende records, eigen-studentrelatie, de behouden ownership-gap, sessiecreatie/verval/logout, gebonden parameters, dubbele gebruikersnamen en veilige foutmeldingen.
- Live read-only databasecontrole: ETIMEDOUT vanaf deze computer. Geen geslaagde live login of database-write geclaimd.
- Geen databasewachtwoord geschreven naar broncode; bestaand `.env.local` niet gewijzigd.

## Nog uit te voeren op SRV-WEB01

1. Stel DB_HOST, DB_PORT, DB_USER, DB_PASSWORD en DB_NAME in; voer `npm run db:check` uit.
2. Start/herstart de applicatie en open `/login` zonder sessie.
3. Log in met student1 en het wachtwoord uit MySQL; verwacht `/student` en gekoppelde studentgegevens.
4. Log uit, log in met teacher1; verwacht `/teacher` en echte studentenrecords.
5. Log uit, log in met admin1; verwacht `/admin` en gebruikers/rollen uit MySQL.
6. Controleer onbekende gebruikersnaam en verkeerd wachtwoord: bestaande eenvoudige foutmelding.
7. Voeg een oefengebruiker toe, wijzig diens rol en verifieer de database en een nieuwe login.
8. Verifieer sessie na reload; logout verwijdert de sessierij en cookie.
9. Controleer dat een student nog steeds handmatig een ander bestaand `/student/[id]` kan openen (bewuste versie-1-baseline).
10. Onderbreek de databaseverbinding in de oefenomgeving en controleer dat de browser alleen een eenvoudige foutmelding toont.

De browserchecks van de oude JSON-versie zijn geen bewijs voor deze MySQL-integratie. Live acceptance blijft open totdat bovenstaande controles op de server zijn uitgevoerd.


