# Domstadboot API — Documentatie

Lokale Express-server voor het afhandelen van boekingsaanvragen van de Domstadboot landingspagina.

## Snel starten

```bash
cd output
npm install
npm start          # poort 3001
# of tijdens ontwikkeling:
npm run dev        # herstart automatisch bij wijzigingen (nodemon)
```

De server draait op `http://localhost:3001`.
Boekingen worden lokaal opgeslagen in `output/bookings.json`.

---

## Endpoints

### GET /api/packages

Geeft alle beschikbare pakketten terug inclusief prijs per persoon.

**Response 200**

```json
{
  "success": true,
  "data": [
    {
      "id": "bridal-vip",
      "name": "Bridal VIP",
      "pricePerPerson": 69,
      "description": "De koninklijke behandeling voor de aanstaande bruid...",
      "minPersons": 6,
      "maxPersons": 20
    },
    {
      "id": "bubbels-bites",
      "name": "Bubbels & Bites",
      "pricePerPerson": 45,
      "description": "Voor de fijnproevers die houden van een luxe borrel...",
      "minPersons": 4,
      "maxPersons": 20
    },
    {
      "id": "golden-hour",
      "name": "Golden Hour",
      "pricePerPerson": 55,
      "description": "De ultieme Instagram-shoot tijdens de zonsondergang...",
      "minPersons": 4,
      "maxPersons": 20
    }
  ]
}
```

---

### GET /api/availability?date=YYYY-MM-DD

Controleert of er beschikbaarheid is op een bepaalde datum.
Maximaal 3 boekingen per dag.

**Query parameters**

| Parameter | Type   | Verplicht | Beschrijving          |
|-----------|--------|-----------|-----------------------|
| date      | string | ja        | Datum in YYYY-MM-DD   |

**Voorbeeld request**

```
GET /api/availability?date=2026-07-15
```

**Response 200 — beschikbaar**

```json
{
  "success": true,
  "data": {
    "date": "2026-07-15",
    "available": true,
    "slotsAvailable": 2,
    "slotsTotal": 3,
    "slotsUsed": 1
  }
}
```

**Response 200 — volgeboekt**

```json
{
  "success": true,
  "data": {
    "date": "2026-07-15",
    "available": false,
    "slotsAvailable": 0,
    "slotsTotal": 3,
    "slotsUsed": 3
  }
}
```

**Response 400 — ongeldige datum**

```json
{
  "success": false,
  "error": "Ongeldige of ontbrekende date parameter. Gebruik formaat YYYY-MM-DD."
}
```

---

### POST /api/booking

Slaat een nieuwe boekingsaanvraag op.

**Request body (JSON)**

| Veld    | Type   | Verplicht | Beschrijving                                          |
|---------|--------|-----------|-------------------------------------------------------|
| name    | string | ja        | Volledige naam, minimaal 2 tekens                     |
| email   | string | ja        | Geldig e-mailadres                                    |
| date    | string | ja        | Datum in YYYY-MM-DD, niet in het verleden             |
| package | string | ja        | `bridal-vip`, `bubbels-bites` of `golden-hour`        |
| persons | number | ja        | Aantal personen, 1–50                                 |
| notes   | string | nee       | Optionele opmerkingen of speciale wensen              |

**Voorbeeld request**

```json
POST /api/booking
Content-Type: application/json

{
  "name": "Lisa van den Berg",
  "email": "lisa@example.com",
  "date": "2026-07-15",
  "package": "bridal-vip",
  "persons": 12,
  "notes": "Graag extra slingers voor de bruid"
}
```

**Response 201 — aanvraag ontvangen**

```json
{
  "success": true,
  "message": "Boeking aanvraag ontvangen! We nemen zo snel mogelijk contact met je op.",
  "data": {
    "id": "booking-1742640000000-x7k2m",
    "name": "Lisa van den Berg",
    "date": "2026-07-15",
    "packageName": "Bridal VIP",
    "persons": 12,
    "totalPrice": 828,
    "status": "pending"
  }
}
```

**Response 409 — datum volgeboekt**

```json
{
  "success": false,
  "error": "Geen beschikbaarheid meer op 2026-07-15. Kies een andere datum."
}
```

**Response 422 — validatiefout**

```json
{
  "success": false,
  "errors": [
    "email: geldig e-mailadres verplicht.",
    "package: verplicht, kies uit bridal-vip, bubbels-bites, golden-hour."
  ]
}
```

---

## Boekingen datastructuur (bookings.json)

Elke boeking die wordt opgeslagen heeft de volgende velden:

```json
{
  "id": "booking-1742640000000-x7k2m",
  "name": "Lisa van den Berg",
  "email": "lisa@example.com",
  "date": "2026-07-15",
  "package": "bridal-vip",
  "packageName": "Bridal VIP",
  "persons": 12,
  "pricePerPerson": 69,
  "totalPrice": 828,
  "notes": "Graag extra slingers voor de bruid",
  "createdAt": "2026-03-22T10:00:00.000Z",
  "status": "pending"
}
```

---

## Frontend integratie

Voorbeeld fetch-aanroep vanuit de landingspagina:

```javascript
// Beschikbaarheid checken
const res = await fetch('http://localhost:3001/api/availability?date=2026-07-15');
const { data } = await res.json();
if (!data.available) {
  alert('Deze datum is helaas volgeboekt. Kies een andere datum.');
}

// Boeking versturen
const response = await fetch('http://localhost:3001/api/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Lisa van den Berg',
    email: 'lisa@example.com',
    date: '2026-07-15',
    package: 'bridal-vip',
    persons: 12,
    notes: 'Graag extra slingers',
  }),
});
const result = await response.json();
console.log(result.data.totalPrice); // 828
```

---

## CORS-toegestane origins

De volgende origins zijn geconfigureerd voor lokale ontwikkeling:

- `http://localhost:3000` — React / Next.js dev server
- `http://localhost:5173` — Vite dev server
- `http://127.0.0.1:5500` — VS Code Live Server (direct openen van code.html)

Voor andere poorten: pas de `cors` configuratie bovenin `server.js` aan.
