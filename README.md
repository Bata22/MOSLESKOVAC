# OK Vranje — Odbojkaška aplikacija

## Struktura projekta
```
okvranje-full/
├── app/
│   ├── page.tsx                  ← Početna stranica
│   ├── layout.tsx                ← Root layout
│   ├── globals.css               ← Stilovi
│   ├── timovi/
│   │   └── page.tsx              ← Tabela liga (javna)
│   ├── utakmice/
│   │   └── page.tsx              ← Raspored utakmica (javna)
│   └── admin/
│       ├── login/page.tsx        ← Admin prijava
│       └── dashboard/page.tsx    ← Admin panel
├── components/
│   ├── Navbar.tsx                ← Navigacija sa dropdownima
│   ├── StandingsTable.tsx        ← Tabela liga
│   ├── MatchCard.tsx             ← Kartica utakmice
│   └── CategoryFilter.tsx        ← Filter kategorija
├── lib/
│   ├── types.ts                  ← TypeScript tipovi
│   └── supabase/
│       ├── client.ts             ← Konekcija (browser)
│       └── server.ts             ← Konekcija (server)
├── .env.local                    ← Tvoji ključevi (NE na GitHub!)
├── supabase-schema.sql           ← SQL za bazu
└── package.json
```

## POKRETANJE (korak po korak) :

### 1. Instaliraj Node.js
Preuzmi sa: https://nodejs.org (LTS verzija)

### 2. Otvori terminal u folderu projekta
```
cd putanja/do/okvranje-full
```

### 3. Instaliraj pakete
```
npm install
```

### 4. Podesi .env.local
Otvori fajl `.env.local` i upiši svoje vrednosti:
```
NEXT_PUBLIC_SUPABASE_URL=https://yfgm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### 5. Pokreni
```
npm run dev
```
Otvori: http://localhost:3000

---

## SUPABASE PODEŠAVANJE

1. supabase.com → novi projekat
2. SQL Editor → nalepi supabase-schema.sql → Run
3. Authentication → Users → Add user (admin email + lozinka)
4. Settings → Data API → skopuj URL i Publishable key

---

## GITHUB + VERCEL DEPLOY

```bash
git init
git add .
git commit -m "OK Vranje app"
# Napravi repo na github.com, pa:
git remote add origin https://github.com/TVOJE_IME/okvranje.git
git push -u origin main
```

Na vercel.com:
1. New Project → import GitHub repo
2. Environment Variables → dodaj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY
3. Deploy!

---

## ADMIN PRISTUP
Idi na: /admin/login
Email i lozinka su oni koje si kreirao u Supabase → Authentication → Users
