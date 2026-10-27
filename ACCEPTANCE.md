# Acceptatie — versie-1-demonstraties (27 oktober 2026)

## Uitgevoerd

- Productieserver gestart: `/login` gaf HTTP 200. Zonder cookie gaven `/admin/users`, `/student/2` en `/teacher/students?q=test` een 307-redirect naar `/login`. Testserver daarna gestopt.

- 17 tests geslaagd (`npm run test:db`) met gesimuleerde databaseantwoorden.
- Productiebouw en TypeScript geslaagd. De eerste sandboxbuild kon gegenereerde bestanden niet schrijven; de build buiten de sandbox slaagde.
- De build meldde daarnaast een bestaande Next.js-dependencywaarschuwing; geen dependency-upgrade uitgevoerd.
- Bestaande loginredirects voor Student, Teacher en Administrator getest met databaseantwoorden; geen hardcoded accountfallback.
- Student-ID-lookup blijft zonder ownershipfilter; login blijft vereist.
- `/admin/users` roept de logincontrole zonder rolvereiste aan; studenten krijgen de gebruikerslijst zonder mutatieknoppen.
- Eén zoekfunctie gebruikt onveilige concatenatie; de overige query's blijven gebonden.
- Add-user-serveractie accepteert `lab!demo`, terwijl de browserpattern die naam afwijst. Adminrol en geldige role_id blijven vereist.
- Logout wist alleen de cookie; sessieopvraging accepteert de behouden niet-verlopen token.
- Login geeft verschillende fouten voor onbekende naam en fout wachtwoord; databasefouten blijven generiek.
- Live read-only databasecontrole: ETIMEDOUT. Geen geslaagde echte SQL-injectie, live login of database-write geclaimd.
- MySQL-grants, GNS3 en pfSense niet gewijzigd. De huidige bereikbaarheid/grants zijn vanaf hier niet bevestigd.

## Nog in het virtuele lab

Voer eerst `npm run db:check` op SRV WEB01 uit. Volg daarna de negen afzonderlijke scenario's in `VIDEO_TESTS.md` en controleer alle normale logins, studentgegevens, docententabel en adminmutaties. Gebruik bestaande labaccounts en records. De lokale tests voeren geen echte SQL uit en vervangen deze live checks niet.

