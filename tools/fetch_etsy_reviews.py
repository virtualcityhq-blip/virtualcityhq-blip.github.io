#!/usr/bin/env python3
"""Refresh assets/reviews.json from the Etsy Open API v3.

Needs env ETSY_API_KEY (the app's keystring) and ETSY_SHARED_SECRET (the app's
shared secret). Etsy expects the x-api-key header as "keystring:shared_secret".
Optional: ETSY_SHOP_NAME (default "Sendlines").

Writes assets/reviews.json only when the rating, count or reviews changed.
Every review is kept regardless of star rating; text is stored verbatim.
Usage: python3 tools/fetch_etsy_reviews.py   (run from repo root)"""
import json, os, re, sys, urllib.request, urllib.error, datetime
from zoneinfo import ZoneInfo

API = "https://openapi.etsy.com/v3/application"
PATH = "assets/reviews.json"
TZ = ZoneInfo("America/Denver")

key = os.environ.get("ETSY_API_KEY", "").strip()
secret = os.environ.get("ETSY_SHARED_SECRET", "").strip()
if not key:
    sys.exit("ETSY_API_KEY is not set")
HEADER = key if (":" in key or not secret) else f"{key}:{secret}"
SHOP = os.environ.get("ETSY_SHOP_NAME", "Sendlines")


def get(path):
    req = urllib.request.Request(API + path, headers={"x-api-key": HEADER, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        sys.exit(f"Etsy API {e.code} on {path}: {e.read()[:300]!r}")


def short_item(title):
    """'The Market Climbing Art Print, Poudre Canyon Colorado Wall Art | Gift' ->
    'The Market Climbing Art Print, Poudre Canyon'"""
    t = re.split(r"\s[|\-–—]\s", title)[0]
    parts = [p.strip() for p in t.split(",") if p.strip()]
    if len(parts) >= 2:
        place = re.sub(r"\s+(Colorado|CO)\b.*$", "", parts[1]).strip() or parts[1]
        return f"{parts[0]}, {place}"
    return parts[0] if parts else title.strip()


old = json.load(open(PATH))
old_items = {(r["date"], r["text"]): r["item"] for r in old.get("reviews", [])}

shops = get(f"/shops?shop_name={SHOP}")
shop = next((s for s in (shops or {}).get("results", []) if s["shop_name"].lower() == SHOP.lower()), None)
if not shop:
    sys.exit(f"shop {SHOP!r} not found")
sid = shop["shop_id"]

raw, offset = [], 0
while True:
    page = get(f"/shops/{sid}/reviews?limit=100&offset={offset}") or {}
    res = page.get("results", [])
    raw += res
    offset += len(res)
    if not res or offset >= page.get("count", 0):
        break

titles = {}
reviews = []
for r in raw:
    date = datetime.datetime.fromtimestamp(r["create_timestamp"], TZ).date().isoformat()
    text = r.get("review") or ""
    item = old_items.get((date, text))
    if item is None:
        lid = r.get("listing_id")
        if lid and lid not in titles:
            lst = get(f"/listings/{lid}")
            titles[lid] = (lst or {}).get("title", "")
        item = short_item(titles.get(lid, "")) if lid else ""
    reviews.append({"rating": int(r["rating"]), "date": date, "item": item, "text": text})
reviews.sort(key=lambda x: x["date"], reverse=True)

count = shop.get("review_count") or len(reviews)
avg = shop.get("review_average")
if avg is None:
    avg = sum(x["rating"] for x in reviews) / len(reviews) if reviews else 0
rating = round(float(avg), 1)


def sig(d):
    return (round(float(d.get("rating", 0)), 1), d.get("count"),
            sorted((x["rating"], x["date"], x["text"]) for x in d.get("reviews", [])))


new = {"source": old.get("source", "https://sendlines.etsy.com"),
       "updated": datetime.datetime.now(TZ).date().isoformat(),
       "rating": rating, "count": count, "reviews": reviews}
if sig(new) == sig(old):
    print("no new reviews")
    sys.exit(0)

with open(PATH, "w") as f:
    f.write("{\n")
    f.write(f'  "source": {json.dumps(new["source"])},\n  "updated": "{new["updated"]}",\n')
    f.write(f'  "rating": {rating},\n  "count": {count},\n  "reviews": [\n')
    f.write(",\n".join("    " + json.dumps(x, ensure_ascii=False) for x in reviews))
    f.write("\n  ]\n}\n")
print(f"updated reviews.json: {rating} from {count}, {len(reviews)} review(s)")
