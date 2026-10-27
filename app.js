/* x1 site: the small script of both pages. everything works without it (every command and every error is then listed one
   after the other); with it a page shows one command at a time (or one list of error codes), with a search and the game switch.
   no libraries, nothing is sent anywhere. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  var main = $("#main");
  var page = document.body.getAttribute("data-page");

  function toTop() {
    if (main) { main.scrollTop = 0; }
    window.scrollTo(0, 0);
  }

  function setCurrent(el, on) {
    if (on) { el.setAttribute("aria-current", "true"); } else { el.removeAttribute("aria-current"); }
  }

  /* ------------------------------------------------------------------ language menu */
  function languages() {
    var menu = $(".lang");
    var links = $$(".lang a");
    function save(v) { try { localStorage.setItem("x1lang", v); } catch (e) { /* private mode: nothing is remembered */ } }
    function load() { try { return localStorage.getItem("x1lang"); } catch (e) { return null; } }

    links.forEach(function (a) { a.addEventListener("click", function () { save(a.getAttribute("hreflang")); }); });
    function sync() { links.forEach(function (a) { a.href = a.getAttribute("data-base") + location.hash; }); }
    window.addEventListener("hashchange", sync);
    sync();

    /* first visit from a Japanese browser: show the Japanese page, like the bot follows the Discord language */
    if (root.lang === "en" && !load() && /^ja/i.test(navigator.language || "")) {
      var ja = links.filter(function (a) { return a.getAttribute("hreflang") === "ja"; })[0];
      if (ja) { location.replace(ja.href); return; }
    }
    document.addEventListener("click", function (e) { if (menu && !menu.contains(e.target)) { menu.open = false; } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu) { menu.open = false; } });
  }

  /* "/" jumps to the search box (like most docs sites), unless somebody is already typing */
  function searchShortcut(input) {
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  /* ------------------------------------------------------------------ commands */
  function commands() {
    var overview = $("#overview");
    var cmds = $$(".cmd");
    var navs = $$("[data-nav]");
    var cards = $$(".card");
    var input = $("#q");
    var none = $("#none");
    var byId = {};
    cmds.forEach(function (c) { byId[c.getAttribute("data-cmd")] = c; });

    /* #/leaderboard   #/leaderboard/w12   and the old links of the first version of the site: #w12-leaderboard */
    function route() {
      var h = "";
      try { h = decodeURIComponent(location.hash.replace(/^#\/?/, "")); } catch (e) { h = ""; }
      if (!h) { return { cmd: "", variant: "" }; }
      var parts = h.split("/");
      if (byId[parts[0]]) { return { cmd: parts[0], variant: parts[1] || "" }; }
      var old = document.getElementById(h);
      if (old && old.getAttribute("data-cmd")) {
        return { cmd: old.getAttribute("data-cmd"), variant: old.getAttribute("data-variant") || "" };
      }
      return { cmd: "", variant: "" };
    }

    function pickVariant(cmd, wanted) {
      var variants = $$(".variant", cmd);
      var chosen = variants[0];
      variants.forEach(function (v) { if (v.getAttribute("data-variant") === wanted) { chosen = v; } });
      variants.forEach(function (v) { v.hidden = v !== chosen; });
      $$(".seg button", cmd).forEach(function (b) {
        b.setAttribute("aria-selected", String(b.getAttribute("data-v") === (chosen && chosen.getAttribute("data-variant"))));
      });
    }

    function show() {
      var r = route();
      var cmd = byId[r.cmd];
      overview.hidden = !!cmd;
      cmds.forEach(function (c) { c.hidden = c !== cmd; });
      navs.forEach(function (a) { setCurrent(a, a.getAttribute("data-nav") === r.cmd); });
      document.title = cmd ? "/" + r.cmd + " - X1 by FSR." : document.body.getAttribute("data-home-title");
      if (cmd) { pickVariant(cmd, r.variant); }
      toTop();
      var current = $("[data-nav][aria-current]");
      if (current && current.scrollIntoView) { current.scrollIntoView({ block: "nearest", inline: "center" }); }
    }

    /* the game switch under a command's title */
    cmds.forEach(function (cmd) {
      $$(".seg button", cmd).forEach(function (b) {
        b.addEventListener("click", function () {
          location.hash = "#/" + cmd.getAttribute("data-cmd") + "/" + b.getAttribute("data-v");
        });
      });
    });

    /* the search: filters the sidebar (and the cards of the overview) */
    function filter() {
      var words = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      function matches(el) {
        var hay = el.getAttribute("data-search") || "";
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      }
      var shown = 0;
      navs.forEach(function (a) { var ok = matches(a); a.hidden = !ok; if (ok) { shown++; } });
      cards.forEach(function (c) { c.hidden = !matches(c); });
      $$(".side h2").forEach(function (h) {
        var next = h.nextElementSibling, any = false;
        while (next && next.tagName !== "H2") { if (!next.hidden) { any = true; } next = next.nextElementSibling; }
        h.hidden = !any;
      });
      $$(".group").forEach(function (g) {
        g.hidden = !$$(".card", g).some(function (c) { return !c.hidden; });
      });
      none.hidden = shown !== 0;
    }
    input.addEventListener("input", filter);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {                       /* Enter opens the first command that matches */
        var first = navs.filter(function (a) { return !a.hidden; })[0];
        if (first) { location.hash = first.getAttribute("href"); input.blur(); }
      }
    });
    searchShortcut(input);

    window.addEventListener("hashchange", show);
    show();
  }

  /* --------------------------------------------------------------- error codes */
  function errors() {
    var auds = $$(".aud");
    var btns = $$("[data-aud]");
    var input = $("#eq");
    var count = $("#count");
    var CODE = /^\d\d-\d{4}$/;

    function audOf(name) {
      var found = auds[0];
      auds.forEach(function (a) { if (a.getAttribute("data-aud") === name) { found = a; } });
      return found;
    }

    function route() {
      var h = "";
      try { h = decodeURIComponent(location.hash.replace(/^#\/?/, "")); } catch (e) { h = ""; }
      if (CODE.test(h)) {
        var row = document.getElementById("e-" + h);
        if (row) { return { aud: row.closest(".aud").getAttribute("data-aud"), row: row }; }
      }
      return { aud: h || "public", row: null };
    }

    function apply() {
      var r = route();
      var aud = audOf(r.aud);
      auds.forEach(function (a) { a.hidden = a !== aud; });
      btns.forEach(function (b) { setCurrent(b, b.getAttribute("data-aud") === aud.getAttribute("data-aud")); });

      var q = input.value.toLowerCase().trim();
      var rows = $$("tbody tr", aud), visible = 0;
      rows.forEach(function (tr) {
        var ok = !q || (tr.getAttribute("data-search") || "").indexOf(q) !== -1;
        tr.hidden = !ok;
        if (ok) { visible++; }
      });
      $$(".cmd-errors", aud).forEach(function (box) {
        box.hidden = !$$("tbody tr", box).some(function (tr) { return !tr.hidden; });
      });
      $(".nomatch", aud).hidden = visible !== 0;
      count.textContent = document.body.getAttribute(visible === 1 ? "data-count-one" : "data-count-many").replace("%n", visible);

      rows.forEach(function (tr) { tr.classList.toggle("hit", tr === r.row); });
      if (r.row) {
        r.row.scrollIntoView({ block: "center" });
      } else {
        toTop();
      }
    }

    /* typing a whole code that lives in another list opens that list */
    input.addEventListener("input", function () {
      var q = input.value.trim();
      if (CODE.test(q) && document.getElementById("e-" + q)) {
        location.hash = "#" + q;
      } else {
        apply();
      }
    });
    searchShortcut(input);
    window.addEventListener("hashchange", apply);
    apply();
  }

  languages();
  if (page === "commands") { commands(); } else if (page === "errors") { errors(); }
}());
