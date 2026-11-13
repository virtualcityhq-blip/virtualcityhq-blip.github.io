#!/usr/bin/env python3
"""Rebuild the Etsy reviews block on every page that carries the REVIEWS markers.
Source of truth: assets/reviews.json (real Etsy shop reviews, quoted verbatim).
Usage: python3 tools/build_reviews.py   (run from repo root)"""
import json, html, glob, re, datetime
d = json.load(open("assets/reviews.json"))
revs = sorted(d["reviews"], key=lambda r: r["date"], reverse=True)[:6]
def stars(n): return "★" * int(n) + "☆" * (5 - int(n))
def month(s): return datetime.date.fromisoformat(s).strftime("%B %Y")
if revs:
    cards = "".join(
        f'<figure class="review-card"><p class="review-stars" aria-label="{int(r["rating"])} out of 5 stars">{stars(r["rating"])}</p>'
        f'<blockquote><p>{html.escape(r["text"])}</p></blockquote>'
        f'<figcaption>Etsy buyer · {month(r["date"])}<span>{html.escape(r["item"])}</span></figcaption></figure>'
        for r in revs)
    noun = "review" if d["count"] == 1 else "reviews"
    block = (f'<section class="section-block reviews-block" aria-labelledby="reviews-heading"><div class="shell">'
             f'<div class="section-heading"><div><p class="eyebrow">From the Etsy shop</p><h2 id="reviews-heading">What buyers say.</h2></div>'
             f'<p>{d["rating"]:.1f} out of 5 from {d["count"]} {noun} on Etsy. Quoted as written.</p></div>'
             f'<div class="review-grid">{cards}</div>'
             f'<p class="reviews-link"><a class="text-link" href="https://sendlines.etsy.com#reviews" rel="nofollow">Read every review on Etsy</a></p></div></section>')
else:
    block = ""
pat = re.compile(r"(<!--REVIEWS:START-->).*?(<!--REVIEWS:END-->)", re.S)
n = 0
for f in glob.glob("**/*.html", recursive=True):
    t = open(f).read()
    if "<!--REVIEWS:START-->" in t:
        t2 = pat.sub(lambda m: m.group(1) + block + m.group(2), t)
        if t2 != t: open(f, "w").write(t2); n += 1
print(f"updated {n} page(s), {len(revs)} review(s)")
