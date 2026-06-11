// EUROART one-page site — language toggle, dynamic sections, interactions.
// Depends on js/content.js (window.EUROART_I18N).
(function () {
  "use strict";

  var I18N = window.EUROART_I18N;

  function getLang() {
    try { return localStorage.getItem("euroart-lang") || "sk"; } catch (e) { return "sk"; }
  }
  function storeLang(lang) {
    try { localStorage.setItem("euroart-lang", lang); } catch (e) {}
  }
  function lookup(obj, path) {
    return path.split(".").reduce(function (o, k) { return o && o[k]; }, obj);
  }

  /* ── dynamic sections ─────────────────────────────── */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function imageNode(src, alt) {
    var img = document.createElement("img");
    img.src = src;
    img.alt = alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    return img;
  }

  var SERVICE_IMAGES = [
    "assets/ideas-web.jpg",
    "assets/brain-web.jpg",
    "assets/bulb-handover-2-web.jpg",
    "assets/phone-wide-web.jpg",
    "assets/cubes-wide-web.jpg"
  ];

  var OFFER_IMAGES = [
    "assets/phone-wide-web.jpg",
    "assets/bulb-handover-web.jpg",
    "assets/globe-wide-web.jpg"
  ];

  function renderServices(c) {
    var list = document.querySelector("[data-services]");
    list.innerHTML = "";
    c.services.items.forEach(function (item, i) {
      var svc = el("div", "svc rv" + (i === 0 ? " open" : ""));

      var btn = el("button", "svc-btn");
      btn.type = "button";
      btn.setAttribute("aria-expanded", i === 0 ? "true" : "false");
      btn.appendChild(el("span", "svc-num", String(i + 1).padStart(2, "0")));
      btn.appendChild(el("span", "svc-name", item.name));
      btn.insertAdjacentHTML("beforeend",
        '<svg class="svc-x" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
        '<path d="M9 2v14M2 9h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>');

      var body = el("div", "svc-body");
      var bodyIn = el("div", "svc-body-in");
      var thumb = el("figure", "svc-thumb");
      thumb.appendChild(imageNode(SERVICE_IMAGES[i], item.name));
      bodyIn.appendChild(thumb);
      item.p.forEach(function (p) { bodyIn.appendChild(el("p", null, p)); });
      body.appendChild(bodyIn);

      btn.addEventListener("click", function () {
        var wasOpen = svc.classList.contains("open");
        list.querySelectorAll(".svc").forEach(function (other) {
          other.classList.remove("open");
          other.querySelector(".svc-btn").setAttribute("aria-expanded", "false");
          other.querySelector(".svc-body").style.maxHeight = "0px";
        });
        if (!wasOpen) {
          svc.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
          body.style.maxHeight = bodyIn.scrollHeight + "px";
        }
      });

      body.style.maxHeight = i === 0 ? "920px" : "0px";
      svc.appendChild(btn);
      svc.appendChild(body);
      list.appendChild(svc);
    });
  }

  var CHECK_ICO =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<rect x="1" y="1" width="14" height="14" rx="4" fill="var(--blue-soft)"></rect>' +
    '<path d="M4.5 8.2 7 10.6 11.6 5.4" stroke="var(--blue)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>';

  function renderOfferItems(c, tabIndex) {
    var box = document.querySelector("[data-tab-items]");
    box.innerHTML = "";
    c.offer.tabs[tabIndex].items.forEach(function (item) {
      var row = el("div", "offer-item");
      row.innerHTML = CHECK_ICO;
      row.appendChild(el("span", null, item));
      box.appendChild(row);
    });
    box.classList.add("in");
    renderOfferVisual(c, tabIndex);
  }

  var currentTab = 0;
  function renderOfferVisual(c, tabIndex) {
    var img = document.querySelector("[data-offer-visual-img]");
    var imgDuo = document.querySelector("[data-offer-visual-duo]");
    var label = document.querySelector("[data-offer-visual-label]");
    if (!img || !imgDuo || !label) return;

    var src = OFFER_IMAGES[tabIndex];
    var alt = c.offer.tabs[tabIndex].name;
    img.src = src;
    img.alt = alt;
    imgDuo.src = src;
    imgDuo.alt = "";
    label.textContent = alt;
  }

  function renderTabs(c) {
    var tabs = document.querySelector("[data-tabs]");
    tabs.innerHTML = "";
    c.offer.tabs.forEach(function (t, i) {
      var btn = el("button", "tab" + (i === currentTab ? " on" : ""), t.name);
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", i === currentTab ? "true" : "false");
      btn.addEventListener("click", function () {
        currentTab = i;
        renderTabs(c);
        renderOfferItems(c, i);
      });
      tabs.appendChild(btn);
    });
    renderOfferItems(c, currentTab);
  }

  function renderAwards(c) {
    var grid = document.querySelector("[data-awards]");
    grid.innerHTML = "";
    c.offer.awards.forEach(function (a) {
      var card = el("div", "award rv");
      card.appendChild(el("span", "award-medal", "★"));
      card.appendChild(el("b", null, a.work));
      card.appendChild(el("p", null, a.prize));
      grid.appendChild(card);
    });
  }

  /* ── i18n application ─────────────────────────────── */

  function applyLang(lang) {
    var c = I18N[lang];
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      var value = lookup(c, node.getAttribute("data-i18n"));
      if (value != null) node.textContent = value;
    });
    document.querySelectorAll("[data-tip]").forEach(function (node) {
      node.textContent = lang === "sk" ? "naše farby ✦" : "our colours ✦";
    });
    document.querySelectorAll(".lang button").forEach(function (btn) {
      btn.classList.toggle("on", btn.getAttribute("data-lang") === lang);
    });
    document.querySelector("[data-acct-btn]").textContent = c.contact.line1.replace(",", "");
    document.querySelector("[data-mailto]").href = "mailto:" + c.contact.email;

    renderServices(c);
    renderTabs(c);
    renderAwards(c);
    requestAnimationFrame(checkReveal);
  }

  /* ── scroll reveal (rAF + getBoundingClientRect) ──── */

  var ticking = false;
  function checkReveal() {
    ticking = false;
    var vh = window.innerHeight;
    document.querySelectorAll(".rv").forEach(function (node) {
      if (!node.classList.contains("in") && node.getBoundingClientRect().top < vh - 30) {
        node.classList.add("in");
      }
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(checkReveal); }
  }

  /* ── init ─────────────────────────────────────────── */

  document.querySelector("[data-year]").textContent = String(new Date().getFullYear());

  document.querySelectorAll(".lang button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var lang = btn.getAttribute("data-lang");
      storeLang(lang);
      applyLang(lang);
    });
  });

  var form = document.querySelector("[data-form]");
  var formFields = document.querySelector("[data-form-fields]");
  var formSent = document.querySelector("[data-form-sent]");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    formFields.hidden = true;
    formSent.hidden = false;
  });
  document.querySelector("[data-form-again]").addEventListener("click", function () {
    form.reset();
    formSent.hidden = true;
    formFields.hidden = false;
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  applyLang(getLang());
  checkReveal();
  setTimeout(checkReveal, 350);
})();
