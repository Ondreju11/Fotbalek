# Fotbálek turnaj - registrace

Jednoduchá statická stránka pro registraci na turnaj ve stolním fotbálku:
- `Tým` = název týmu + 2 hráči (lze zaškrtnout doplnění názvu týmu/hráče 2 později)
- `Jednotlivec` = 1 hráč (párování v den zápasu)
- vždy se ukládá kontaktní e-mail

Data se ukládají do Supabase databáze. Aplikace je navržená pro hostování na GitHub Pages.

## 1. Supabase setup

1. Vytvoř projekt na https://supabase.com
2. Otevři `SQL Editor` a spusť obsah souboru `supabase.sql`
3. Otevři `Project Settings -> API` a zkopíruj:
   - `Project URL`
   - `anon public key`
4. V souboru `config.js` nastav:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 2. Spuštění lokálně

Stránka funguje jako statický web. Může stačit otevřít `index.html`, ale spolehlivější je lokální server:

```powershell
python -m http.server 8000
```

Pak otevři `http://localhost:8000`.

## 3. Nasazení na GitHub Pages

1. Nahraj soubory do GitHub repozitáře.
2. V repozitáři otevři `Settings -> Pages`.
3. `Source` nastav na `Deploy from a branch`.
4. Vyber branch (obvykle `main`) a root `/`.
5. Ulož.

Po publikaci bude formulář ukládat data do tabulky `public.registrations`.
Pokud už tabulku máš z dřívějška, spusť aktuální `supabase.sql` znovu jako migraci.

## 4. Kde uvidis registrace

Registrace najdeš v Supabase dashboardu:
- `Table Editor -> public -> registrations`

Ve výchozím nastavení z tohoto projektu mohou návštěvníci pouze vkládat nové registrace, ale ne číst všechna data.
