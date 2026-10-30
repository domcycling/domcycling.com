/* wp2gh theme: main menu, photo lightbox and click-to-play YouTube videos. No dependencies. */
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

  // ---- Lightbox: click any post photo to view it full size. ----
  var images = Array.prototype.filter.call(
    document.querySelectorAll(".post-content img"),
    function (img) { return !img.closest("a"); }
  );
  if (!images.length) return;

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
    '<button class="lightbox-close" type="button" aria-label="Close">&times;</button>' +
    '<button class="lightbox-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
    '<img alt="">' +
    '<p class="lightbox-caption"></p>' +
    '<button class="lightbox-next" type="button" aria-label="Next photo">&#8250;</button>';
  document.body.appendChild(box);

  var boxImg = box.querySelector("img");
  var boxCaption = box.querySelector(".lightbox-caption");
  var boxCount = box.querySelector(".lightbox-count");
  var prevBtn = box.querySelector(".lightbox-prev");
  var nextBtn = box.querySelector(".lightbox-next");
  var group = [];
  var index = 0;
  var opener = null;

  function show(i) {
    index = (i + group.length) % group.length;
    var img = group[index];
    boxImg.src = img.currentSrc || img.src;
    boxImg.alt = img.alt;
    boxCaption.textContent = captionFor(img);
    boxCount.textContent = group.length > 1 ? (index + 1) + " / " + group.length : "";
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
  }

  function open(img) {
    opener = img;
    group = groupFor(img);
    show(group.indexOf(img));
    box.hidden = false;
    document.body.style.overflow = "hidden";
    box.querySelector(".lightbox-close").focus();
  }

  function close() {
    box.hidden = true;
    boxImg.removeAttribute("src");
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

  box.querySelector(".lightbox-close").addEventListener("click", close);
  prevBtn.addEventListener("click", function () { show(index - 1); });
  nextBtn.addEventListener("click", function () { show(index + 1); });
  box.addEventListener("click", function (e) { if (e.target === box) close(); });

  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });

  // Swipe left/right on touch screens.
  var touchX = null;
  box.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
