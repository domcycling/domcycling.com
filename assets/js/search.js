/* wp2gh theme: site search, on the search page only. Needs minisearch.min.js. */
(function () {
  "use strict";

  var MAX_RESULTS = 50;
  var PAUSE_MS = 150; // wait for a gap in typing before searching

  var form = document.querySelector(".search-form");
  if (!form) return;
  var box = form.querySelector(".search-box");
  var status = document.querySelector(".search-status");
  var fallback = document.querySelector(".search-fallback");
  var list = document.querySelector(".search-results");
  var index = null;
  var posts = {};
  var timer = null;

  // Case and accents don't matter: koln finds Köln, and strasse finds Straße.
  function plain(term) {
    return term.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss");
  }

  function resultItem(post) {
    var item = document.createElement("li");
    item.className = "search-result";

    if (post.image) {
      var thumb = document.createElement("a");
      thumb.className = "search-thumb";
      thumb.href = post.url;
      thumb.tabIndex = -1;
      thumb.setAttribute("aria-hidden", "true");
      var img = document.createElement("img");
      img.loading = "lazy";
      img.alt = "";
      img.src = post.image;
      thumb.appendChild(img);
      item.appendChild(thumb);
    }

    var body = document.createElement("div");
    body.className = "search-result-body";
    var date = document.createElement("p");
    date.className = "post-meta";
    date.textContent = post.date;
    var title = document.createElement("h2");
    title.className = "search-result-title";
    var link = document.createElement("a");
    link.href = post.url;
    link.textContent = post.title;
    title.appendChild(link);
    var excerpt = document.createElement("p");
    excerpt.className = "card-excerpt";
    excerpt.textContent = post.excerpt;
    body.appendChild(date);
    body.appendChild(title);
    body.appendChild(excerpt);
    item.appendChild(body);
    return item;
  }

  function statusText(count) {
    if (count === 0) return "No posts found.";
    if (count === 1) return "1 post found.";
    if (count > MAX_RESULTS) return "Showing the first " + MAX_RESULTS + " of " + count + " posts found.";
    return count + " posts found.";
  }

  function search() {
    var query = box.value.trim();
    list.textContent = "";
    if (!query) { status.textContent = ""; return; }
    // Best match first; of equal matches, the newest (ids count down from the newest post).
    var results = index.search(query).sort(function (a, b) { return b.score - a.score || a.id - b.id; });
    status.textContent = statusText(results.length);
    results.slice(0, MAX_RESULTS).forEach(function (result) {
      list.appendChild(resultItem(posts[result.id]));
    });
  }

  // Keep the search in the address, so it can be linked to and the back button returns to it.
  function updateAddress() {
    var address = new URL(window.location.href);
    var query = box.value.trim();
    if (query) address.searchParams.set("q", query);
    else address.searchParams.delete("q");
    window.history.replaceState(null, "", address);
  }

  function showFailure() {
    status.textContent = "";
    fallback.hidden = false;
  }

  box.value = new URLSearchParams(window.location.search).get("q") || "";
  if (!box.value) box.focus();

  box.addEventListener("input", function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      updateAddress();
      if (index) search();
    }, PAUSE_MS);
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    box.blur(); // puts the phone keyboard away, so the results are visible
  });

  if (typeof window.MiniSearch !== "function") { showFailure(); return; }

  fetch(form.getAttribute("data-index"))
    .then(function (response) {
      if (!response.ok) throw new Error("Search index: HTTP " + response.status);
      return response.json();
    })
    .then(function (records) {
      var miniSearch = new window.MiniSearch({
        fields: ["title", "excerpt", "categories", "tags"],
        processTerm: plain,
        searchOptions: {
          boost: { title: 3, categories: 2, tags: 2 },
          combineWith: "AND",
          fuzzy: 0.2,
          prefix: true
        }
      });
      miniSearch.addAll(records);
      records.forEach(function (post) { posts[post.id] = post; });
      index = miniSearch;
      search();
    })
    .catch(showFailure);
})();
