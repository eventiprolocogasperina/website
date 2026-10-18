"""Genera dev/sql/02-seed.sql con dati FINTI e riproducibili (seed fisso)."""
import json, random, uuid
from datetime import datetime, timedelta, timezone

random.seed(20261018)
NOMI = ["Giulia","Marco","Francesca","Luca","Chiara","Antonio","Sara","Giuseppe","Elena","Davide","Martina","Paolo","Anna","Stefano","Valentina","Roberto"]
COGNOMI = ["Rossi","Bianchi","Esposito","Romano","Colombo","Ricci","Greco","Bruno","Gallo","Conti","Costa","Fontana","Mancini","Rizzo"]
out = ["-- Dati FINTI per lo sviluppo locale. Generato da dev/gen/make_seed.py", "BEGIN;"]
def q(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (dict, list)): return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"
def ins(table, row):
    cols = ", ".join(f'"{c}"' for c in row)
    out.append(f"INSERT INTO {table} ({cols}) VALUES ({', '.join(q(v) for v in row.values())});")
def person():
    n, c = random.choice(NOMI), random.choice(COGNOMI)
    return n, c, f"{n.lower()}.{c.lower()}{random.randint(1,99)}@example.com", f"+39 3{random.randint(10,99)} {random.randint(1000000,9999999)}"
def ts(dt): return dt.astimezone(timezone.utc).isoformat()

# --- Eventi (tabella events) ---
events = [
  dict(id="zuccaland-2026", slug="zuccaland-2026", title="Zuccaland 2026", date="2026-10-25", dateLabel="Ottobre 2026", time="10:30",
       location="Gasperina (CZ)", category="comunità", description="Il parco delle zucche per famiglie.", fullDescription="Evento di prova per lo sviluppo locale.",
       image="/img/IMG1.jpg", maxParticipants=900, registeredCount=0, price=5, featured=True, bookable=False, isFree=False),
  dict(id="assaggia-passeggia-2026", slug="assaggia-e-passeggia-2026", title="Assaggia e Passeggia 2026", date="2026-08-10", dateLabel=None, time="19:00",
       location="Centro storico di Gasperina", category="gastronomia", description="Percorso enogastronomico a tappe.", fullDescription="Evento di prova (concluso).",
       image="/img/IMG_2.jpg", maxParticipants=600, registeredCount=0, price=17, featured=True, bookable=False, isFree=False),
  dict(id="baguette-2026", slug="la-baguette-da-record-2026", title="La Baguette da Record 2026", date="2026-06-14", dateLabel=None, time="18:00",
       location="Piazza di Gasperina", category="comunità", description="Tentativo di record della baguette più lunga.", fullDescription="Evento di prova (concluso).",
       image="/img/IMG_3.jpg", maxParticipants=0, registeredCount=0, price=0, featured=False, bookable=False, isFree=True),
  dict(id="concerto-natale-2026", slug="concerto-di-natale-2026", title="Concerto di Natale 2026", date="2026-12-20", dateLabel=None, time="21:00",
       location="Chiesa Matrice", category="musica", description="Concerto gratuito con prenotazione.", fullDescription="Evento di prova prenotabile.",
       image="/img/Event_1.jpeg", maxParticipants=120, registeredCount=0, price=0, featured=True, bookable=True, isFree=True),
]
for e in events: ins("events", e)

# --- Prenotazioni gratuite (concerto) ---
tot = 0
for i in range(14):
    n, c, em, ph = person(); p = random.randint(1, 4); tot += p
    ins("bookings", dict(id=f"bk_{i+1:03d}", event_id="concerto-natale-2026", nome=n, cognome=c, email=em, telefono=ph, partecipanti=p, note=None, stato="confermato"))
out.append(f"UPDATE events SET \"registeredCount\" = {tot} WHERE id = 'concerto-natale-2026';")

# --- Sconti ---
ins("discounts", dict(id="dsc_famiglia", code="FAMIGLIA10", type="PERCENTAGE", value=10, max_uses=50, max_tickets=0, current_uses=3, expiry_date="2026-12-31T23:59:00Z", active=True, applies_to="ALL"))
ins("discounts", dict(id="dsc_omaggio", code="OMAGGIO100", type="PERCENTAGE", value=100, max_uses=5, max_tickets=0, current_uses=0, expiry_date=None, active=True, applies_to="ALL"))
ins("discounts", dict(id="dsc_scaduto", code="ESTATE5", type="FIXED", value=5, max_uses=0, max_tickets=0, current_uses=12, expiry_date="2026-08-31T23:59:00Z", active=True, applies_to="ALL"))

# --- Ordini online ---
def order(event_id, when, lines, notes, status="PAID", blacklisted=False):
    n, c, em, ph = person()
    oid = uuid.UUID(int=random.getrandbits(128)).hex[:30]
    total = sum(p * qn for _, p, qn in lines)
    ins("orders", {"id": oid, "buyerName": f"{n} {c}", "buyerEmail": em, "buyerPhone": ph, "totalAmount": total, "status": status,
        "nexiMac": "TEST-MAC" if status == "PAID" and total > 0 else None, "discountId": None, "notes": notes,
        "createdAt": ts(when), "paidAt": ts(when + timedelta(minutes=2)) if status == "PAID" else None,
        "isBlacklisted": blacklisted, "blacklistReason": "Ordine di prova in blacklist" if blacklisted else None})
    for typ, price, qn in lines:
        for _ in range(qn):
            checked = status == "PAID" and random.random() < 0.3
            ins("tickets", {"id": uuid.UUID(int=random.getrandbits(128)).hex, "orderId": oid, "eventId": event_id, "type": typ, "price": price,
                "qrCodeData": uuid.UUID(int=random.getrandbits(128)).hex, "isCheckedIn": checked,
                "checkInTime": ts(when + timedelta(days=3)) if checked else None})

base = datetime(2026, 9, 20, 10, 0, tzinfo=timezone.utc)
giorni = [("Sabato 24 Ottobre 2026", 24), ("Domenica 25 Ottobre 2026", 25)]
attivita = ["Zucca in vaso", "ZuccArt", "Facepainting"]
for i in range(70):
    day_label, _ = random.choice(giorni)
    adulti, bimbi = random.randint(1, 3), random.randint(0, 3)
    lines = [("Ingresso Ordinario", 5, adulti + bimbi)]
    if bimbi and random.random() < 0.6: lines.append(("You Pick Lab", 3, random.randint(1, bimbi)))
    notes = f"Data: {day_label} | Bambini: {bimbi}/{adulti + bimbi}"
    if bimbi: notes += f" | Attività [Bambini]: {', '.join(random.sample(attivita, random.randint(1, 2)))}"
    status = "PAID" if i < 62 else "PENDING"
    order("zuccaland-2026", base + timedelta(hours=7 * i), lines, notes, status, blacklisted=(i == 5))
for i in range(40):
    order("assaggia-passeggia", datetime(2026, 7, 1, 9, tzinfo=timezone.utc) + timedelta(hours=9 * i),
          [("Biglietto Assaggia e Passeggia", 17, random.randint(1, 4))], None)

# --- Cassa (ordini di prova) ---
menu = [("Panino salsiccia", "Cucina", 6), ("Patatine", "Cucina", 3), ("Acqua", "Bar", 1), ("Birra", "Bar", 4), ("Dolce", "Dolci", 3)]
for i in range(30):
    items = []
    for name, dep, price in random.sample(menu, random.randint(1, 3)):
        qn = random.randint(1, 3)
        items.append(dict(id=name.lower().replace(" ", "-"), name=name, category=dep, department=dep, price=price, quantity=qn, subtotal=price * qn))
    total = sum(it["subtotal"] for it in items)
    method = random.choice(["CONTANTI", "CONTANTI", "POS"])
    received = (total // 5 + 1) * 5 if method == "CONTANTI" else None
    ins("cashier_orders", {"id": uuid.UUID(int=random.getrandbits(128)).hex, "eventId": "sagra-tradizioni-2026", "eventName": "Festa delle Tradizioni e Sapori 2026",
        "orderNumber": i + 1, "cassaName": random.choice(["Cassa 1", "Cassa 2"]), "operatorName": "Volontario di prova",
        "totalAmount": total, "paymentMethod": method, "cashReceived": received, "cashChange": (received - total) if received else None,
        "items": items, "status": "COMPLETED" if i != 7 else "VOIDED", "createdAt": ts(datetime(2026, 10, 24, 17, tzinfo=timezone.utc) + timedelta(minutes=9 * i))})

# --- Contenuti ---
ins("news", dict(id="news_1", slug="zuccaland-2026-al-via", title="Zuccaland 2026 è al via", coverImage="/img/IMG1.jpg",
    content="Notizia di prova per lo sviluppo locale.", author="Pro Loco", featured=True))
ins("news", dict(id="news_2", slug="grazie-assaggia-e-passeggia", title="Grazie per Assaggia e Passeggia", coverImage="/img/IMG_2.jpg",
    content="Seconda notizia di prova.", author="Pro Loco", featured=False))
for i, (img, cat) in enumerate([("/img/IMG1.jpg", "eventi"), ("/img/IMG_2.jpg", "territorio"), ("/img/IMG_3.jpg", "cultura"), ("/img/Event_1.jpeg", "comunità")]):
    ins("gallery", dict(id=f"gal_{i+1}", src=img, alt=f"Foto di prova {i+1}", category=cat, width=1920, height=1080))
ins("sponsors", dict(id="sp_1", name="Sponsor di prova Oro", logo_url="/img/Logo_color.png", website_url="https://example.com", tier="gold", active=True, sort_order=1))
ins("sponsors", dict(id="sp_2", name="Sponsor di prova Argento", logo_url="/img/logo_la_spiga.png", website_url=None, tier="silver", active=True, sort_order=2))
for i in range(12):
    n, c, em, _ = person()
    ins("members", dict(id=f"m_{i+1:03d}", nome=n, cognome=c, email=em, tipo=random.choice(["ordinario", "ordinario", "sostenitore"]),
        dataIscrizione=f"2026-0{random.randint(1,9)}-1{random.randint(0,9)}", stato=random.choice(["attivo", "attivo", "in attesa"])))
for i in range(8):
    ins("reviews", dict(eventId="assaggia-passeggia", name=random.choice(NOMI), rating=random.randint(3, 5), comment="Recensione di prova."))
for i in range(5):
    ins("zuccaland_photos", dict(cloudinary_public_id=f"demo/foto_prova_{i+1}", frame_name=random.choice(["classica", "halloween"]), status="pending" if i < 3 else "approved"))
n, c, em, ph = person()
ins("refund_requests", dict(id="rf_prova_1", event_slug="zuccaland-2026", full_name=f"{n} {c}", email=em, phone=ph, booking_numbers="ABCD1234",
    account_holder=f"{n} {c}", iban="IT60X0542811101000000123456", reason="Richiesta di prova", status="pending"))
for k, v in [("ticket_sales_enabled", "true"), ("event_date", "2026-10-25"), ("contact_email", "prolocogasperina@gmail.com"),
             ("social_instagram", "https://www.instagram.com/prolocogasperina"), ("social_facebook", "https://www.facebook.com/prolocogasperina")]:
    ins("site_settings", dict(key=k, value=v))
# Contenuto della pagina Zuccaland: copia dei valori predefiniti del codice con le date
# del 24 e 25 ottobre aperte, così il checkout si può provare. Rigenerare se cambiano i default.
import os
content = json.load(open(os.path.join(os.path.dirname(__file__), "zuccaland-content.json")))
ins("pages_content", {"slug": "zuccaland", "content": content})
out.append("COMMIT;")
import sys
open(sys.argv[1], "w").write("\n".join(out) + "\n")
print(len(out), "righe")
