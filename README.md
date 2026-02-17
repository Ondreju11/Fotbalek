# Fotbalek turnaj - registrace

Jednoducha staticka stranka pro registraci na turnaj ve stolnim fotbalku:
- `Tym` = nazev tymu + 2 hraci
- `Jednotlivec` = 1 hrac (parovani v den zapasu)

Data se ukladaji do Supabase databaze. Aplikace je navrzena pro hostovani na GitHub Pages.

## 1. Supabase setup

1. Vytvor projekt na https://supabase.com
2. Otevri `SQL Editor` a spust obsah souboru `supabase.sql`
3. Otevri `Project Settings -> API` a zkopiruj:
   - `Project URL`
   - `anon public key`
4. V souboru `config.js` nastav:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 2. Spusteni lokalne

Stranka funguje jako staticky web. Muze stacit otevrit `index.html`, ale spolehlivejsi je lokalni server:

```powershell
python -m http.server 8000
```

Pak otevri `http://localhost:8000`.

## 3. Nasazeni na GitHub Pages

1. Nahraj soubory do GitHub repozitare.
2. V repozitari otevri `Settings -> Pages`.
3. `Source` nastav na `Deploy from a branch`.
4. Vyber branch (obvykle `main`) a root `/`.
5. Uloz.

Po publikaci bude formular ukladat data do tabulky `public.registrations`.

## 4. Kde uvidis registrace

Registrace najdes v Supabase dashboardu:
- `Table Editor -> public -> registrations`

Ve vychozim nastaveni z tohoto projektu mohou navstevnici pouze vkladat nove registrace, ale ne cist vsechna data.
