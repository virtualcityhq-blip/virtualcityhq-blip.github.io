(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function init(root) {
    var dataNode = document.getElementById("slmap-data");
    if (!dataNode) return;
    var D = JSON.parse(dataNode.textContent);
    var W = D.width, H = D.height;
    var stage = root.querySelector(".slmap-stage");
    var world = root.querySelector(".slmap-world");
    var svg = root.querySelector(".slmap-svg");
    var panel = root.querySelector(".slmap-panel");
    var jump = root.querySelector(".slmap-jump select");
    var chips = root.querySelector(".slmap-chips");
    var s = 1, tx = 0, ty = 0, MAX = 7, selected = null, range = "";
    var byId = {};
    var HIT = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ? 24 : 15;

    /* range labels */
    var rg = el("g", {}, svg);
    D.ranges.forEach(function (r) {
      var g = el("g", { "class": "slmap-range", tabindex: "0", role: "button", transform: "translate(" + r.x + " " + r.y + ")" }, rg);
      var t = el("text", { x: 0, y: 0, "text-anchor": r.anchor || "middle" }, g); t.textContent = r.name;
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRange(r.name); } });
    });

    /* markers */
    var mg = el("g", {}, svg);
    var ORDER = { photo: 0, crag: 1, peak: 2 }; /* draw peaks last so they win overlapping taps */
    D.points.slice().sort(function (a, b) { return ORDER[a.kind] - ORDER[b.kind]; }).forEach(function (p) {
      var g = el("g", { "class": "slmap-pt", tabindex: "0", role: "button", "data-kind": p.kind, "data-id": p.id, "data-range": p.range || "", "data-top": p.top ? "1" : "0", "aria-label": p.name + (p.elev ? ", " + p.elev + " feet" : ""), transform: "translate(" + p.x + " " + p.y + ")" }, mg);
      var inner = el("g", { "class": "slmap-s" }, g);
      el("circle", { "class": "hit", r: HIT }, inner);
      el("circle", { "class": "ring", r: 13 }, inner);
      if (p.kind === "peak") el("path", { "class": "tri", d: "M0 -8 L7.4 5.6 L-7.4 5.6 Z" }, inner);
      else el("circle", { "class": "dot", r: 6 }, inner);
      var t = el("text", { "class": "lbl", x: 11, y: 4 }, inner); t.textContent = p.name;
      byId[p.id] = { p: p, g: g };
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(p.id, false); } });
    });

    /* view transform */
    function clamp() {
      var w = stage.clientWidth, h = world.offsetHeight * s, vh = stage.clientHeight;
      var mx = Math.min(0, w - w * s), my = Math.min(0, vh - h);
      tx = Math.max(mx, Math.min(0, tx)); ty = Math.max(my, Math.min(0, ty));
      if (h <= vh) ty = (vh - h) / 2;
    }
    function apply() {
      clamp();
      world.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
      var k = 1 / (s * (stage.clientWidth / W));
      root.style.setProperty("--k", k.toFixed(4));
      root.setAttribute("data-lbl", s >= 3.2 ? "all" : s >= 1.7 ? "top" : "none");
      stage.classList.toggle("is-zoomed", s > 1.02);
    }
    function sizeStage() {
      stage.style.height = Math.round(stage.clientWidth * H / W) + "px";
      apply();
    }
    function zoomAt(cx, cy, ns) {
      ns = Math.max(1, Math.min(MAX, ns));
      var wx = (cx - tx) / s, wy = (cy - ty) / s;
      s = ns; tx = cx - wx * s; ty = cy - wy * s; apply();
    }
    function focusBox(x0, y0, x1, y1) {
      var f = stage.clientWidth / W;
      var bw = (x1 - x0) * f, bh = (y1 - y0) * f;
      var ns = Math.max(1, Math.min(MAX, 0.8 * Math.min(stage.clientWidth / Math.max(bw, 60), stage.clientHeight / Math.max(bh, 60))));
      s = ns;
      tx = stage.clientWidth / 2 - ((x0 + x1) / 2) * f * s;
      ty = stage.clientHeight / 2 - ((y0 + y1) / 2) * f * s;
      animate(); apply();
    }
    function animate() {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      world.style.transition = "transform .45s cubic-bezier(.22,1,.36,1)";
      setTimeout(function () { world.style.transition = ""; }, 480);
    }

    /* pointer: drag + pinch */
    var ptrs = {}, last = null, moved = false;
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".slmap-zoom")) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, cap: false }; moved = false;
      last = null;
    });
    stage.addEventListener("pointermove", function (e) {
      if (!ptrs[e.pointerId]) return;
      var ids = Object.keys(ptrs), prev = ptrs[e.pointerId];
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      /* a tap must stay a tap: only capture the pointer once it has really moved */
      if (!prev.cap && Math.hypot(e.clientX - prev.sx, e.clientY - prev.sy) < 6) return;
      if (!prev.cap) { prev.cap = true; try { stage.setPointerCapture(e.pointerId); } catch (_) {} }
      if (ids.length === 2) {
        var o = ptrs[ids[0] == e.pointerId ? ids[1] : ids[0]];
        var d0 = Math.hypot(prev.x - o.x, prev.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y);
        var r = stage.getBoundingClientRect();
        if (d0 > 0) zoomAt((e.clientX + o.x) / 2 - r.left, (e.clientY + o.y) / 2 - r.top, s * d1 / d0);
        moved = true;
      } else if (s > 1.02 && (Math.abs(dx) + Math.abs(dy) > 0)) {
        tx += dx; ty += dy; apply(); moved = true; stage.classList.add("is-drag");
      }
      prev.x = e.clientX; prev.y = e.clientY;
    });
    function up(e) { delete ptrs[e.pointerId]; stage.classList.remove("is-drag"); }
    stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
    /* taps resolve to the nearest visible mark, so crowded ranges stay selectable */
    stage.addEventListener("click", function (e) {
      if (moved) return;
      if (e.target.closest && e.target.closest(".slmap-zoom")) return;
      var cand = [];
      Object.keys(byId).forEach(function (id) {
        var r = byId[id]; if (r.g.classList.contains("is-dim") || r.g.getBoundingClientRect().width === 0) return;
        var c = r.g.querySelector(".hit").getBoundingClientRect();
        var d = Math.hypot(e.clientX - (c.left + c.width / 2), e.clientY - (c.top + c.height / 2)) - (r.p.kind === "peak" ? 4 : 0);
        if (d < HIT + 8) cand.push({ id: id, d: d });
      });
      cand.sort(function (a, b) { return a.d - b.d; });
      if (!cand.length) {
        /* range names only react when no mark is under the tap */
        var hit = null;
        svg.querySelectorAll(".slmap-range").forEach(function (g) {
          var b = g.getBoundingClientRect();
          if (e.clientX >= b.left - 6 && e.clientX <= b.right + 6 && e.clientY >= b.top - 6 && e.clientY <= b.bottom + 6) hit = g;
        });
        if (hit) { setRange(hit.querySelector("text").textContent); return; }
        clearSel(); return;
      }
      /* several marks under the finger: zoom in on the cluster first so each can be picked on its own */
      if (cand.length > 1 && cand[1].d - cand[0].d < 10 && s < MAX - 0.5) {
        var rc = stage.getBoundingClientRect(); animate(); zoomAt(e.clientX - rc.left, e.clientY - rc.top, s * 2.4); return;
      }
      select(cand[0].id, false);
    });
    stage.addEventListener("wheel", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, s * (e.deltaY < 0 ? 1.25 : 0.8));
    }, { passive: false });
    stage.addEventListener("dblclick", function (e) {
      var r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, s * 1.8);
    });
    stage.addEventListener("keydown", function (e) {
      if (e.target !== stage) return;
      var st = 60, handled = true;
      if (e.key === "ArrowLeft") tx += st; else if (e.key === "ArrowRight") tx -= st;
      else if (e.key === "ArrowUp") ty += st; else if (e.key === "ArrowDown") ty -= st;
      else if (e.key === "+" || e.key === "=") zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, s * 1.4);
      else if (e.key === "-") zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, s / 1.4);
      else if (e.key === "0") { s = 1; tx = 0; ty = 0; animate(); }
      else handled = false;
      if (handled) { e.preventDefault(); apply(); }
    });
    root.querySelectorAll("[data-zoom]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-zoom"), cx = stage.clientWidth / 2, cy = stage.clientHeight / 2;
        animate();
        if (a === "in") zoomAt(cx, cy, s * 1.6); else if (a === "out") zoomAt(cx, cy, s / 1.6); else { s = 1; tx = 0; ty = 0; apply(); }
      });
    });

    /* selection */
    function clearSel() {
      if (selected) byId[selected].g.classList.remove("is-sel");
      selected = null; if (jump) jump.value = "";
      panel.innerHTML = '<p class="eyebrow">Select a place</p><p class="empty">Choose a marker, a range name, or a peak from the list. Each one opens its print.</p>';
    }
    function select(id, zoom) {
      var rec = byId[id]; if (!rec) return;
      if (selected) byId[selected].g.classList.remove("is-sel");
      selected = id; rec.g.classList.add("is-sel");
      var p = rec.p, h = "";
      if (p.kind === "peak") {
        h += '<p class="eyebrow">14er · ' + esc(p.range) + '</p><h3>' + esc(p.name) + '</h3><p class="meta">' + esc(p.elev) + ' ft · ' + esc(p.lat) + '</p>';
        if (p.img) h += '<picture><source type="image/webp" srcset="' + p.img + '"><img src="' + p.img_jpg + '" alt="' + esc(p.name) + ' topographic print" width="600" height="800" loading="lazy" decoding="async"></picture>';
        h += '<div class="actions"><a class="button" href="' + p.href + '">View the print</a><a class="text-link" href="' + p.range_href + '">' + esc(p.range) + '</a></div>';
      } else if (p.kind === "crag") {
        h += '<p class="eyebrow">Climbing area</p><h3>' + esc(p.name) + '</h3><p class="meta">' + esc(p.sub) + '</p><p class="empty">' + esc(p.note) + '</p><div class="actions"><a class="button" href="' + p.href + '">Enter the volume</a></div>';
      } else {
        h += '<p class="eyebrow">Photography</p><h3>' + esc(p.name) + '</h3><p class="meta">' + esc(p.sub) + '</p><ul>' + p.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + '</ul>';
        if (p.img) h += '<picture><source type="image/webp" srcset="' + p.img + '"><img src="' + p.img_jpg + '" alt="' + esc(p.items[0]) + '" loading="lazy" decoding="async"></picture>';
        h += '<div class="actions"><a class="button" href="' + p.href + '">See the photographs</a></div>';
      }
      panel.innerHTML = h;
      if (jump && p.kind === "peak") jump.value = id;
      if (zoom) { focusBox(p.x - 70, p.y - 70, p.x + 70, p.y + 70); }
      history.replaceState(null, "", "#" + id);
    }

    /* range filter */
    function setRange(name) {
      range = (range === name) ? "" : name;
      if (jump) jump.value = "";
      chips.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-range") === range)); });
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
      Object.keys(byId).forEach(function (id) {
        var r = byId[id], on = !range || (r.p.kind === "peak" && r.p.range === range);
        r.g.classList.toggle("is-dim", !on);
        if (range && on) { any = true; x0 = Math.min(x0, r.p.x); y0 = Math.min(y0, r.p.y); x1 = Math.max(x1, r.p.x); y1 = Math.max(y1, r.p.y); }
      });
      if (range && any) {
        focusBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40);
        var rr = D.ranges.filter(function (r) { return r.name === range; })[0];
        panel.innerHTML = '<p class="eyebrow">Range</p><h3>' + esc(range) + '</h3><p class="meta">' + rr.count + (rr.count === 1 ? " fourteener" : " fourteeners") + '</p><p class="empty">Highest: ' + esc(rr.high) + '.</p><div class="actions"><a class="button" href="' + rr.href + '">Open the range</a></div>';
        if (selected) { byId[selected].g.classList.remove("is-sel"); selected = null; }
      } else { s = 1; tx = 0; ty = 0; animate(); apply(); clearSel(); }
    }
    chips.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () { var r = b.getAttribute("data-range"); if (!r) { if (range) setRange(range); } else setRange(r); });
    });

    /* layers */
    root.querySelectorAll("[data-layer]").forEach(function (c) {
      c.addEventListener("change", function () {
        var a = "data-hide-" + c.getAttribute("data-layer");
        if (c.checked) root.removeAttribute(a); else root.setAttribute(a, "");
      });
    });
    if (jump) jump.addEventListener("change", function () { if (jump.value) select(jump.value, true); });

    window.addEventListener("resize", sizeStage);
    sizeStage(); clearSel();
    var h = location.hash.slice(1);
    if (h && byId[h]) { select(h, true); }
  }

  var r = document.querySelector("[data-slmap]");
  if (r) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(r); }); else init(r); }
})();
