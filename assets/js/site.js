/* wp2gh theme: main menu, cookie choice, held-back embeds, photo lightbox and click-to-play YouTube videos. No dependencies. */
(function () {
  "use strict";

  // ---- Main menu: dropdowns open on hover or with their button; on small ----
  // ---- screens the whole menu is behind the Menu button.                 ----
  var nav = document.querySelector(".site-nav");
  if (nav) {
    var menuButton = document.querySelector(".nav-toggle");
    var dropdowns = Array.prototype.slice.call(nav.querySelectorAll(".has-children"));
    nav.classList.add("js-nav");

    var setOpen = function (item, open) {
      item.classList.toggle("open", open);
      item.querySelector(".submenu-toggle").setAttribute("aria-expanded", String(open));
    };
    var closeAll = function (except) {
      dropdowns.forEach(function (item) { if (item !== except) setOpen(item, false); });
    };

    dropdowns.forEach(function (item) {
      item.querySelector(".submenu-toggle").addEventListener("click", function () {
        closeAll(item);
        setOpen(item, !item.classList.contains("open"));
      });
    });

    if (menuButton) {
      menuButton.hidden = false;
      menuButton.addEventListener("click", function () {
        var open = !nav.classList.contains("open");
        nav.classList.toggle("open", open);
        menuButton.setAttribute("aria-expanded", String(open));
      });
    }

    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = nav.querySelector(".has-children.open");
      if (!open) return;
      closeAll();
      open.querySelector(".submenu-toggle").focus();
    });
  }

  // ---- YouTube: the converter writes a linked thumbnail; play it in place. ----
  var YT_ID = /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;

  document.querySelectorAll(".post-content a[href]").forEach(function (link) {
    var img = link.querySelector("img");
    var match = link.href.match(YT_ID);
    if (!img || !match || link.children.length !== 1 || img.src.indexOf("img.youtube.com") === -1) return;
    link.classList.add("video");
    link.addEventListener("click", function (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return; // let new-tab clicks through
      event.preventDefault();
      var frame = document.createElement("iframe");
      frame.className = "video-frame";
      frame.src = "https://www.youtube-nocookie.com/embed/" + match[1] + "?autoplay=1";
      frame.title = img.alt || "YouTube video";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      link.replaceWith(frame);
    });
  });

  // ---- Email address: stored encoded, and only written out here, to keep ----
  // ---- it away from simple address harvesters.                           ----
  document.querySelectorAll("[data-email]").forEach(function (el) {
    var address = atob(el.getAttribute("data-email"));
    var link = document.createElement("a");
    link.href = "mailto:" + address;
    link.textContent = address;
    el.replaceWith(link);
  });

  // ---- Embeds: the converter writes a link for anything from another site  ----
  // ---- that can set cookies; show it when selected, or for everyone who    ----
  // ---- has accepted cookies.                                                ----
  function showEmbed(link) {
    var image = link.getAttribute("data-embed-image");
    if (image) {
      var route = document.createElement("img");
      route.src = image;
      route.alt = link.getAttribute("data-embed-title") || "";
      route.loading = "lazy";
      link.className = "";
      link.textContent = "";
      link.appendChild(route);
      return;
    }
    var frame = document.createElement("iframe");
    // data-embed-src lets the link go to the page itself while the frame loads its embed.
    frame.src = link.getAttribute("data-embed-src") || link.href;
    frame.title = link.getAttribute("data-embed-title") || "Embedded content";
    frame.loading = "lazy";
    frame.allowFullscreen = true;
    link.replaceWith(frame);
  }

  var heldEmbeds = document.querySelectorAll("a.embed-hold");
  heldEmbeds.forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (!link.classList.contains("embed-hold")) return; // a route image, now a plain link
      if (event.metaKey || event.ctrlKey || event.shiftKey) return; // let new-tab clicks through
      event.preventDefault();
      showEmbed(link);
    });
  });

  // ---- Cookies: no embed loads until the reader accepts or selects it. ----
  var CHOICE_KEY = "cookie-choice";
  var CHOICE_DAYS = 365; // then ask again
  var banner = document.querySelector(".cookie-banner");

  function savedChoice() {
    try {
      var saved = JSON.parse(localStorage.getItem(CHOICE_KEY));
      var fresh = saved && Date.now() - saved.at < CHOICE_DAYS * 86400000;
      return fresh ? saved.value : null;
    } catch (e) {
      return null; // storage blocked: ask on every page
    }
  }

  function saveChoice(value) {
    try {
      localStorage.setItem(CHOICE_KEY, JSON.stringify({ value: value, at: Date.now() }));
    } catch (e) { /* the choice lasts for this page only */ }
  }

  // The site used Google Analytics until November 2026: remove the cookies it
  // left for readers who accepted then. It set them on the widest domain it could.
  function clearOldAnalyticsCookies() {
    var parts = location.hostname.split(".");
    document.cookie.split("; ").forEach(function (cookie) {
      var name = cookie.split("=")[0];
      if (!/^_ga(_|$)/.test(name)) return;
      document.cookie = name + "=; Max-Age=0; path=/";
      parts.forEach(function (part, i) {
        document.cookie = name + "=; Max-Age=0; path=/; domain=" + parts.slice(i).join(".");
      });
    });
  }

  function allowOptional() {
    heldEmbeds.forEach(function (link) {
      if (link.classList.contains("embed-hold")) showEmbed(link);
    });
  }

  clearOldAnalyticsCookies();
  var choice = savedChoice();
  if (choice === "accepted") allowOptional();

  if (banner) {
    var settings = document.querySelector(".cookie-settings");
    var settingsButton = settings.querySelector("button");
    var choiceButtons = banner.querySelectorAll("[data-cookie-choice]");
    // Only pages with something to show need to ask.
    banner.hidden = choice !== null || !heldEmbeds.length;
    settings.hidden = false;

    settingsButton.addEventListener("click", function () {
      banner.hidden = false;
      choiceButtons[0].focus();
    });

    choiceButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var previous = choice;
        var reopened = document.activeElement === button && previous !== null;
        choice = button.getAttribute("data-cookie-choice");
        saveChoice(choice);
        banner.hidden = true;
        if (reopened) settingsButton.focus();
        if (choice === "accepted") {
          allowOptional();
        } else if (previous === "accepted") {
          // Reloading removes the embeds from this page.
          location.reload();
        }
      });
    });
  }

  // ---- Lightbox: click any post photo to view it full size. Galleries can ----
  // ---- also be shown as a grid ("View all"). Each gallery shows only its  ----
  // ---- first photo (CSS hides the rest, so they don't download) with a    ----
  // ---- "View gallery" button over it.                                     ----
  var images = Array.prototype.filter.call(
    document.querySelectorAll(".post-content img"),
    function (img) { return !img.closest("a"); }
  );
  if (!images.length) return;

  var GRID_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';

  function captionFor(img) {
    if (img.title) return img.title;
    var next = img.nextElementSibling;
    if (next && next.tagName === "EM") return next.textContent;
    return img.alt || "";
  }

  // Photos in a gallery browse within that gallery; other photos browse together.
  function groupFor(img) {
    var gallery = img.closest(".gallery");
    return gallery
      ? Array.prototype.slice.call(gallery.querySelectorAll("img"))
      : images.filter(function (i) { return !i.closest(".gallery"); });
  }

  var box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Photo viewer");
  box.innerHTML =
    '<span class="lightbox-count"></span>' +
    '<button class="lightbox-all" type="button" hidden>' + GRID_ICON + '<span>View all</span></button>' +
    '<button class="lightbox-close" type="button" aria-label="Close">&times;</button>' +
    '<button class="lightbox-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
    '<img alt="">' +
    '<p class="lightbox-caption"></p>' +
    '<button class="lightbox-next" type="button" aria-label="Next photo">&#8250;</button>' +
    '<div class="lightbox-grid"></div>';
  document.body.appendChild(box);

  var boxImg = box.querySelector(":scope > img");
  var boxCaption = box.querySelector(".lightbox-caption");
  var boxCount = box.querySelector(".lightbox-count");
  var prevBtn = box.querySelector(".lightbox-prev");
  var nextBtn = box.querySelector(".lightbox-next");
  var allBtn = box.querySelector(".lightbox-all");
  var allLabel = allBtn.querySelector("span");
  var grid = box.querySelector(".lightbox-grid");
  var group = [];
  var index = 0;
  var opener = null;

  function inGrid() { return box.classList.contains("is-grid"); }

  function show(i) {
    index = (i + group.length) % group.length;
    var img = group[index];
    boxImg.src = img.currentSrc || img.src;
    boxImg.alt = img.alt;
    boxCaption.textContent = captionFor(img);
    boxCount.textContent = group.length > 1 ? (index + 1) + " / " + group.length : "";
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
  }

  // One photo at a time (the usual view).
  function showPhoto(i) {
    box.classList.remove("is-grid");
    allLabel.textContent = "View all";
    show(i);
  }

  // Every photo in the gallery as a grid; choosing one shows it.
  function showGrid() {
    if (!grid.childElementCount) {
      group.forEach(function (img, i) {
        var thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "lightbox-thumb";
        thumb.setAttribute("aria-label", "Photo " + (i + 1) + (img.alt ? ": " + img.alt : ""));
        var small = document.createElement("img");
        small.loading = "lazy";
        small.alt = "";
        small.src = img.currentSrc || img.src;
        thumb.appendChild(small);
        thumb.addEventListener("click", function () { showPhoto(i); });
        grid.appendChild(thumb);
      });
    }
    box.classList.add("is-grid");
    allLabel.textContent = "Back to photo";
    boxCount.textContent = group.length + " photos";
    boxImg.removeAttribute("src");
    Array.prototype.forEach.call(grid.children, function (thumb, i) {
      thumb.setAttribute("aria-current", i === index ? "true" : "false");
    });
    grid.children[index].scrollIntoView({ block: "nearest" });
    grid.children[index].focus({ preventScroll: true });
  }

  function open(img, from) {
    opener = from || img;
    group = groupFor(img);
    grid.innerHTML = "";
    allBtn.hidden = group.length < 2 || !img.closest(".gallery");
    showPhoto(group.indexOf(img));
    box.hidden = false;
    document.body.style.overflow = "hidden";
    box.querySelector(".lightbox-close").focus();
  }

  function close() {
    box.hidden = true;
    box.classList.remove("is-grid");
    boxImg.removeAttribute("src");
    grid.innerHTML = "";
    document.body.style.overflow = "";
    if (opener) opener.focus({ preventScroll: true });
  }

  images.forEach(function (img) {
    img.tabIndex = 0;
    img.addEventListener("click", function () { open(img); });
    img.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(img); }
    });
  });

  // Collapsed galleries: the button covers the first photo and opens the gallery.
  document.querySelectorAll(".post-content .gallery").forEach(function (gallery) {
    var photos = gallery.querySelectorAll("img");
    if (photos.length < 2) return;
    var first = photos[0];
    var button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-open";
    button.setAttribute("aria-label", "View gallery, " + photos.length + " photos");
    button.innerHTML = '<span class="gallery-open-label">' + GRID_ICON + "View gallery" +
      ' <span class="gallery-open-count">' + photos.length + " photos</span></span>";
    button.addEventListener("click", function () { open(first, button); });
    first.tabIndex = -1; // the button takes focus instead
    first.parentNode.appendChild(button);
  });

  box.querySelector(".lightbox-close").addEventListener("click", close);
  prevBtn.addEventListener("click", function () { show(index - 1); });
  nextBtn.addEventListener("click", function () { show(index + 1); });
  allBtn.addEventListener("click", function () {
    if (inGrid()) showPhoto(index); else showGrid();
  });
  box.addEventListener("click", function (e) { if (e.target === box) close(); });

  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") {
      if (inGrid()) showPhoto(index); else close();
    } else if (inGrid()) {
      return; // arrow keys scroll the grid
    } else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });

  // Swipe left/right on touch screens (not in the grid, which scrolls).
  var touchX = null;
  box.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (touchX === null || inGrid()) { touchX = null; return; }
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
