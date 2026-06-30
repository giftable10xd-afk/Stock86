(function () {
  "use strict";

  var ROUTES = {
    home: { title: "الرئيسية", view: "view-home" },
    about: { title: "عن المختار", view: "view-about" },
    services: { title: "الخدمات", view: "view-services" },
    contact: { title: "تواصل معنا", view: "view-contact" }
  };
  var SITE_TITLE = "مختار بلدة دده — عامر حسين الأيوبي";
  var DEFAULT_ROUTE = "home";

  var mainEl = document.getElementById("main");
  var navLinks = document.querySelectorAll(".main-nav a[data-route]");
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");

  function routeFromHash() {
    var hash = (window.location.hash || "").replace(/^#\/?/, "").trim();
    return ROUTES[hash] ? hash : DEFAULT_ROUTE;
  }

  function closeMobileNav() {
    if (mainNav.classList.contains("is-open")) {
      mainNav.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  }

  function render() {
    var route = routeFromHash();
    var config = ROUTES[route];

    document.querySelectorAll(".view").forEach(function (section) {
      section.classList.toggle("is-active", section.id === config.view);
    });

    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-route") === route);
      if (link.getAttribute("data-route") === route) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    document.title = config.title === "الرئيسية" ? SITE_TITLE : config.title + " | " + SITE_TITLE;
    mainEl.scrollIntoView({ behavior: "auto", block: "start" });
    window.scrollTo(0, 0);
    closeMobileNav();
  }

  window.addEventListener("hashchange", render);
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.location.hash) {
      window.location.hash = "#/" + DEFAULT_ROUTE;
    }
    render();
  });

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  /* إغلاق قائمة الموبايل عند الضغط خارجها */
  document.addEventListener("click", function (e) {
    if (!mainNav.classList.contains("is-open")) return;
    if (mainNav.contains(e.target) || navToggle.contains(e.target)) return;
    closeMobileNav();
  });

  /* ===== الوضع الليلي / الوضع النهاري ===== */
  var THEME_KEY = "theme";
  var themeToggle = document.querySelector(".theme-toggle");
  var rootEl = document.documentElement;

  function applyTheme(theme) {
    rootEl.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
    var themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", theme === "dark" ? "#0c0a08" : "#c81f30");
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = rootEl.getAttribute("data-theme") === "dark" ? "dark" : "light";
      var next = current === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      applyTheme(next);
    });
  }

  /* مزامنة لون شريط المتصفح مع الوضع الحالي عند التحميل */
  applyTheme(rootEl.getAttribute("data-theme") === "dark" ? "dark" : "light");
})();
