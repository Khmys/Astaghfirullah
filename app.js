  /* ============================================================
     MWANZO WA APP
     ============================================================ */
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();

  /* ============================================================
     MIPANGILIO: MANDHARI YA GIZA + BAA YA CHINI
     ============================================================ */
  const themeToggle = document.getElementById("themeToggle");
  const THEME_KEY = "tema";
  let temaIliyohifadhiwa = null;
  try { temaIliyohifadhiwa = localStorage.getItem(THEME_KEY); } catch (e) {}

  function tumiaTema(dark, forced) {
    const root = document.documentElement;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    if (forced) root.setAttribute("data-forced", "1");
    themeToggle.checked = dark;
    if (forced) {
      try {
        if (tg.isVersionAtLeast && tg.isVersionAtLeast("6.9")) {
          tg.setHeaderColor(dark ? "#1d2229" : "#ffffff");
          tg.setBackgroundColor(dark ? "#121417" : "#ffffff");
        }
      } catch (e) {}
    }
  }
  // Mwanzo: tumia chaguo lililohifadhiwa, vinginevyo fuata mandhari ya Telegram
  tumiaTema(temaIliyohifadhiwa ? temaIliyohifadhiwa === "dark" : tg.colorScheme === "dark", !!temaIliyohifadhiwa);
  themeToggle.addEventListener("change", () => {
    tumiaTema(themeToggle.checked, true);
    try { localStorage.setItem(THEME_KEY, themeToggle.checked ? "dark" : "light"); } catch (e) {}
  });
  tg.onEvent("themeChanged", () => { if (!temaIliyohifadhiwa && !document.documentElement.hasAttribute("data-forced")) tumiaTema(tg.colorScheme === "dark", false); });

  // Baa ya chini: Masomo | Mipangilio
  function onyeshaTab(name) {
    const settings = name === "settings";
    document.getElementById("settingsView").classList.toggle("hidden", !settings);
    document.getElementById("lessonList").classList.toggle("hidden", settings);
    document.querySelectorAll("#bottomNav .nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("#bottomNav .nav-btn").forEach(b => b.addEventListener("click", () => onyeshaTab(b.dataset.tab)));

  /* ============================================================
     ELEMENTS
     ============================================================ */
  const listContainer = document.getElementById("listContainer");
  const loadingMsg    = document.getElementById("loadingMsg");
  const emptyMsg      = document.getElementById("emptyMsg");
  const searchInput   = document.getElementById("searchInput");
  const clearSearch   = document.getElementById("clearSearch");
  const categoriesBox = document.getElementById("categories");
  const backCatBox    = document.getElementById("backCatBox");
  const count         = document.getElementById("count");
  const pageTitle     = document.getElementById("pageTitle");
  const lessonView    = document.getElementById("lessonView");
  const lessonList    = document.getElementById("lessonList");
  const lessonContent = document.getElementById("lessonContent");

  /* ============================================================
     DATA
     ============================================================ */
  let kategoria = [];         // Orodha ya kategoria (kutoka index.json)
  let kategoriaActive = null; // Kategoria iliyochaguliwa
  let masomo = [];            // Masomo ya kategoria iliyochaguliwa
  let filterActive = "Zote";  // Filter ya ndani ya kategoria

  const TEXT_COLORS = ["red", "blue", "green"];
  const BOX_COLORS = ["forest", "navy", "ruby", "mauve"];

  /* ============================================================
     KUPATA DATA — index.json
     ============================================================ */
  fetch("index.json")
    .then(r => { if (!r.ok) throw new Error("Imeshindwa kupakia index.json"); return r.json(); })
    .then(data => {
      kategoria = Array.isArray(data) ? data : [];
      loadingMsg.classList.add("hidden");
      onyeshaKategoria();
    })
    .catch(error => {
      loadingMsg.textContent = "Samahani, imeshindwa kupakia orodha. Jaribu tena baadaye.";
      console.error(error);
    });

  /* ============================================================
     ONYESHA KATEGORIA (hatua ya kwanza)
     ============================================================ */
  function onyeshaKategoria() {
    kategoriaActive = null;
    masomo = [];
    filterActive = "Zote";
    pageTitle.textContent = "📚 Masomo";
    categoriesBox.innerHTML = "";
    backCatBox.innerHTML = "";
    searchInput.value = "";
    clearSearch.style.display = "none";
    count.textContent = `${kategoria.length}`;
    emptyMsg.classList.add("hidden");

    listContainer.innerHTML = "";
    kategoria.forEach(k => {
      const item = document.createElement("div");
      item.className = "lesson-item";
      item.innerHTML = `
        <img src="${escapeAttr(k.image || "")}" alt="" loading="lazy" />
        <div class="info">
          <div class="title">${escapeHtml(k.title || "Bila jina")}</div>
          <div class="subtitle">${escapeHtml(k.subtitle || "")}</div>
        </div><span class="arrow">›</span>`;
      item.addEventListener("click", () => funguaKategoria(k));
      listContainer.appendChild(item);
    });
  }

  /* ============================================================
     FUNGUA KATEGORIA (hatua ya pili)
     ============================================================ */
  async function funguaKategoria(k) {
    kategoriaActive = k;
    pageTitle.textContent = `📚 ${k.title || "Masomo"}`;
    categoriesBox.innerHTML = "";
    searchInput.value = "";
    clearSearch.style.display = "none";
    listContainer.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    // Kitufe cha kurudi kwenye kategoria
    backCatBox.innerHTML = `<button class="back-cat">‹ Rudi kwenye kategoria</button>`;
    backCatBox.querySelector(".back-cat").addEventListener("click", onyeshaKategoria);

    try {
      const res = await fetch(k.file);
      if (!res.ok) throw new Error("Imeshindwa kupakia " + k.file);
      const data = await res.json();
      masomo = Array.isArray(data) ? data : [];
      tengenezaCategories();
      choraOrodha();
      jengaIndex();
    } catch (error) {
      console.error(error);
      listContainer.innerHTML = '<p style="text-align:center;color:#777;padding:20px">Samahani, imeshindwa kupakia masomo ya kategoria hii.</p>';
    }
  }

  /* ============================================================
     CATEGORIES ZA NDANI YA KATEGORIA
     ============================================================ */
  function tengenezaCategories() {
    const categories = ["Zote", ...new Set(masomo.map(s => s.category || "Mengineyo"))];
    categoriesBox.innerHTML = categories
      .map(cat => `<button class="cat-btn ${cat === filterActive ? "active" : ""}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`)
      .join("");
    categoriesBox.querySelectorAll(".cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        filterActive = btn.dataset.category;
        tengenezaCategories();
        choraOrodha();
      });
    });
  }

  /* ============================================================
     UTAFUTAJI
     ============================================================ */
  const MARKS = /[\u0300-\u036f\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
  const AR_FIX = { "ٱ":"ا", "ى":"ي", "ة":"ه" };

  function normChar(c) {
    return c.normalize("NFD").replace(MARKS, "").toLowerCase()
      .replace(/[’‘'`\-–—]/g, "").replace(/[ٱىة]/g, m => AR_FIX[m]);
  }
  function normMap(t) {
    t = String(t == null ? "" : t);
    let out = ""; const map = [];
    for (let i = 0; i < t.length; i++) {
      for (const ch of normChar(t[i])) {
        if ("aeiou".includes(ch) && out.endsWith(ch)) continue;
        out += ch;
        for (let k = 0; k < ch.length; k++) map.push(i);
      }
    }
    return { out, map };
  }
  const norm = t => normMap(t).out;
  const queryWords = () => norm(searchInput.value).split(/\s+/).filter(Boolean);

  /* ============================================================
     INDEX YA NDANI YA MASOMO
     ============================================================ */
  function maandishiYote(v, acc = []) {
    if (typeof v === "string") { if (v.trim()) acc.push(v); }
    else if (Array.isArray(v)) v.forEach(x => maandishiYote(x, acc));
    else if (v && typeof v === "object") Object.values(v).forEach(x => maandishiYote(x, acc));
    return acc;
  }

  let indexPending = 0;
  function jengaIndex() {
    masomo.forEach(somo => {
      if (!somo.file || somo._index) return;
      indexPending++;
      fetch(somo.file)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          somo._segs = maandishiYote(data).map(t => ({ t, n: norm(t) }));
          somo._index = somo._segs.map(x => x.n).join(" \n ");
        })
        .catch(() => {})
        .finally(() => {
          indexPending--;
          if (searchInput.value.trim()) choraOrodha();
        });
    });
  }

  /* ============================================================
     HIGHLIGHT YA MANENO
     ============================================================ */
  function highlightIn(root, words) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue;
      const { out, map } = normMap(text);
      let ranges = [];
      words.forEach(w => {
        let i = out.indexOf(w);
        while (i !== -1) {
          let end = map[i + w.length - 1] + 1;
          while (end < text.length && normChar(text[end]) === "") end++;
          ranges.push([map[i], end]);
          i = out.indexOf(w, i + w.length);
        }
      });
      if (!ranges.length) return;
      ranges.sort((a, b) => a[0] - b[0]);
      const merged = [ranges[0].slice()];
      for (const r of ranges.slice(1)) {
        const l = merged[merged.length - 1];
        if (r[0] <= l[1]) l[1] = Math.max(l[1], r[1]);
        else merged.push(r.slice());
      }
      const frag = document.createDocumentFragment();
      let pos = 0;
      merged.forEach(([s0, e0]) => {
        if (s0 > pos) frag.appendChild(document.createTextNode(text.slice(pos, s0)));
        const m = document.createElement("mark");
        m.textContent = text.slice(s0, e0);
        frag.appendChild(m);
        pos = e0;
      });
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      node.replaceWith(frag);
    });
  }

  /* ============================================================
     SNIPPET
     ============================================================ */
  function snippetFor(somo, words) {
    const segs = somo._segs || [];
    const seg = segs.find(x => words.every(w => x.n.includes(w)))
             || segs.find(x => words.some(w => x.n.includes(w)));
    if (!seg) return "";
    const { out, map } = normMap(seg.t);
    const w = words.find(w => out.includes(w));
    const p = out.indexOf(w);
    const st = map[Math.max(0, p - 45)];
    const en = map[Math.min(map.length - 1, p + 110)] + 1;
    return (st > 0 ? "… " : "") + seg.t.slice(st, en).trim() + (en < seg.t.length ? " …" : "");
  }

  /* ============================================================
     KURASA YA ORODHA (ya kategoria iliyochaguliwa)
     ============================================================ */
  function choraOrodha() {
    const words = queryWords();
    const filtered = masomo.filter(somo => {
      const category = somo.category || "Mengineyo";
      const matchesCategory = filterActive === "Zote" || category === filterActive;
      const haystack = norm(`${somo.title || ""} ${somo.subtitle || ""} ${typeof somo.content === "string" ? somo.content : ""} ${category}`) + " " + (somo._index || "");
      return matchesCategory && words.every(w => haystack.includes(w));
    });

    listContainer.innerHTML = "";
    count.textContent = `${filtered.length}/${masomo.length}`;
    emptyMsg.textContent = (words.length && indexPending > 0) ? "Inatafuta ndani ya masomo..." : "Hakuna somo lililopatikana.";
    emptyMsg.classList.toggle("hidden", filtered.length !== 0);

    filtered.forEach(somo => {
      const item = document.createElement("div");
      item.className = "lesson-item";
      item.innerHTML = `
        <img src="${escapeAttr(somo.image || "")}" alt="" loading="lazy" />
        <div class="info">
          <div class="title">${escapeHtml(somo.title || "Bila jina")}</div>
          <div class="subtitle">${escapeHtml(somo.subtitle || "")}</div>
        </div><span class="arrow">›</span>`;
      if (words.length) {
        const sn = snippetFor(somo, words);
        if (sn) {
          const d = document.createElement("div");
          d.className = "snippet"; d.dir = "auto"; d.textContent = sn;
          highlightIn(d, words);
          item.querySelector(".info").appendChild(d);
        }
      }
      item.addEventListener("click", () => funguaSomo(somo));
      listContainer.appendChild(item);
    });
  }

  /* ============================================================
     MATCH BAR
     ============================================================ */
  let marks = [], curMark = -1;
  function onyeshaMatches() {
    const words = queryWords();
    const bar = document.getElementById("matchBar");
    marks = []; curMark = -1;
    if (words.length) {
      highlightIn(lessonContent, words);
      marks = [...lessonContent.querySelectorAll("mark")];
    }
    bar.classList.toggle("hidden", marks.length === 0);
    if (marks.length) ruka(0);
  }
  function ruka(i) {
    if (!marks.length) return;
    if (marks[curMark]) marks[curMark].classList.remove("cur");
    curMark = (i + marks.length) % marks.length;
    marks[curMark].classList.add("cur");
    marks[curMark].scrollIntoView({ block: "center", behavior: "smooth" });
    document.getElementById("matchInfo").textContent = `${curMark + 1}/${marks.length}`;
  }

  /* ============================================================
     KUFUNGUA SOMO
     ============================================================ */
  async function funguaSomo(somo) {
    document.getElementById("lessonImage").src = somo.image || "";
    document.getElementById("lessonTitle").textContent = somo.title || "";
    document.getElementById("lessonMeta").textContent = somo.subtitle || somo.category || "";
    lessonContent.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
    document.body.classList.add("reading");
    lessonList.classList.add("hidden");
    lessonView.style.display = "block";
    tg.BackButton.show();
    window.scrollTo(0, 0);

    let content = somo.content || "";
    if (!content && somo.file) {
      try {
        const res = await fetch(somo.file);
        if (!res.ok) throw new Error("Imeshindwa kupakia " + somo.file);
        const data = await res.json();
        content = (RENDERERS[data.type] || Array.isArray(data.blocks)) ? data : (data.content || "");
      } catch (error) {
        console.error(error);
        lessonContent.innerHTML = '<p class="content-body">Samahani, imeshindwa kupakia somo hili.</p>';
        return;
      }
    }

    const R = (content && typeof content === "object" && !Array.isArray(content))
      ? (RENDERERS[content.type] || (Array.isArray(content.blocks) ? RENDERERS.somo : null))
      : null;

    document.getElementById("lessonImage").classList.toggle("hidden", !somo.image || !!(R && R.hideImage));
    lessonView.className = (R && R.cls) || "";
    lessonContent.innerHTML = R
      ? R.render(content)
      : (Array.isArray(content)
          ? pangaAya(content)
          : (content && typeof content === "object" ? pangaKitu(content) : pangaRangiYaContent(String(content || ""))));
    onyeshaMatches();
  }

  /* ============================================================
     RENDERERS
     ============================================================ */
  const RENDERERS = {
    sura:    { render: d => pangaSura(d),    cls: "quran-reader",   hideImage: true },
    hadiyth: { render: d => pangaHadiyth(d), cls: "hadiyth-reader" },
    somo:    { render: d => pangaBlocks(d) }
  };

  /* ============================================================
     BLOCKS
     ============================================================ */
  function pangaBlocks(d) {
    const txt = b => b.text != null ? b.text : (b.maandishi != null ? b.maandishi : "");
    const src = b => (b.source || b.chanzo)
      ? `<span class="content-src">${escapeHtml(b.source || b.chanzo)}</span>` : "";

    const blocks = (d.blocks || []).map(b => {
      if (typeof b === "string") return `<p class="content-body">${alama(b)}</p>`;
      const t = (b.t || b.type || "p").toLowerCase();

      /* KIARABU — RANGI 2 TU */
      if (t === "red_arabic" || t === "quran_arabic") {
        return `<p class="ayah-arabic">${escapeHtml(b.arabic || txt(b))}</p>`;
      }
      if (t === "blue_arabic" || t === "hadith_arabic") {
        return `<p class="ayah-arabic hadith">${escapeHtml(b.arabic || txt(b))}</p>`;
      }

      /* BOX — 4 TU */
      if (BOX_COLORS.includes(t)) {
        const ar = b.arabic ? `<div class="ar">${escapeHtml(b.arabic)}</div>` : "";
        const sw = b.swahili ? `<div class="sw">${alama(b.swahili)}</div>` : "";
        const tx = (!b.arabic && !b.swahili && txt(b)) ? `<div class="sw">${alama(txt(b))}</div>` : "";
        return `<div class="box" data-color="${t}">${ar}${sw}${tx}</div>`;
      }

      /* TEXT — 3 TU */
      if (TEXT_COLORS.includes(t)) {
        const ar = b.arabic ? `<div class="ar">${escapeHtml(b.arabic)}</div>` : "";
        const sw = b.swahili ? `<div class="sw">${alama(b.swahili)}</div>` : "";
        const tx = (!b.arabic && !b.swahili && txt(b)) ? `<div class="sw">${alama(txt(b))}</div>` : "";
        return `<div class="text-color" data-color="${t}">${ar}${sw}${tx}</div>`;
      }

      switch (t) {
        case "h": case "heading": case "kichwa":
          return `<p class="content-heading">${alama(txt(b))}</p>`;

        case "quote": case "nukuu":
          return `<div class="content-quote">${alama(txt(b))}${src(b)}</div>`;
        case "note": case "dokezo": case "note_orange":
          return `<div class="content-quote" data-variant="note">${alama(txt(b))}${src(b)}</div>`;
        case "white_quote": case "nukuu_nyeupe":
          return `<div class="content-quote" data-variant="white">${alama(txt(b))}${src(b)}</div>`;
        case "black_quote": case "nukuu_nyeusi":
          return `<div class="content-quote" data-variant="black">${alama(txt(b))}${src(b)}</div>`;
        case "teal_quote": case "nukuu_teal":
          return `<div class="content-quote" data-variant="teal">${alama(txt(b))}${src(b)}</div>`;

        case "ayah": case "aya":
          return `<div class="ayah-block">
            ${b.sura ? `<div class="ayah-number">${escapeHtml(b.sura)}</div>` : ""}
            ${b.arabic ? `<p class="ayah-arabic">${escapeHtml(b.arabic)}</p>` : ""}
            ${txt(b) ? `<p class="tafsiri">${alama(txt(b))}</p>` : ""}
          </div>`;

        case "list": case "orodha": {
          const tag = b.ordered ? "ol" : "ul";
          return `<${tag} class="content-list">${(b.items || []).map(i => `<li>${alama(i)}</li>`).join("")}</${tag}>`;
        }

        case "dot_box": case "box_doti":
          return `<div class="dot-box">${b.title ? `<p class="dot-title">${alama(b.title)}</p>` : ""}<p class="dot-text">${alama(txt(b))}</p></div>`;

        case "hr": return `<hr class="content-hr">`;
        case "img": case "picha":
          return `<img class="content-img" src="${escapeAttr(b.src || "")}" alt="">`;

        default:
          return txt(b) ? `<p class="content-body">${alama(txt(b))}</p>` : "";
      }
    }).join("");
    return blocks;
  }

  /* ============================================================
     SURA (QUR'ANI)
     ============================================================ */
  function pangaSura(sura) {
    const pages = [...new Set((sura.content || []).map(a => a.page || 1))].sort((a, b) => a - b);
    const pageHtml = pages.map(page => {
      const ayat = sura.content.filter(a => (a.page || 1) === page);
      const title = page === pages[0] ? `
        <div class="quran-title-row">
          <div class="quran-title-sw">SURA YA ${escapeHtml(sura.name || "").toUpperCase()}</div>
          <div class="quran-title-ar">${escapeHtml(sura.arabic_name || "")}</div>
        </div>
        ${sura.intro ? `<p class="quran-intro">${escapeHtml(sura.intro)}</p>` : ""}` : "";
      return `<section class="quran-page">
        <div class="quran-page-header">
          <span>${escapeHtml(sura.surah_number || "")} - ${escapeHtml(sura.name || "")}</span>
          <span>Juzuu ${escapeHtml(sura.juz || 1)}</span>
          <span class="quran-page-number">${escapeHtml(page)}</span>
          <span>${escapeHtml(sura.name || "")}</span>
          <span>${escapeHtml(sura.arabic_name || "")}</span>
        </div>
        ${title}
        ${ayat.map(ayah => `<div class="quran-ayah-row">
          <div class="quran-translation" data-number="${escapeAttr(ayah.number ?? "")}">${escapeHtml(ayah.translation || "")}</div>
          <div class="quran-arabic-cell">
            <span class="quran-arabic-number">${escapeHtml(ayah.number ?? "")}</span>
            <span class="quran-arabic-text">${escapeHtml(ayah.arabic || "")}</span>
          </div>
        </div>`).join("")}
      </section>`;
    }).join("");
    return `<div class="quran-pages">${pageHtml}</div>`;
  }

  /* ============================================================
     AYA (plain list)
     ============================================================ */
  function pangaAya(ayahList) {
    return ayahList.map(ayah => `
      <div class="ayah-block">
        <div class="ayah-number">Aya ${ayah.number ?? ""}</div>
        <p class="ayah-arabic">${escapeHtml(ayah.arabic || "")}</p>
        <p class="ayah-translation">${escapeHtml(ayah.translation || "")}</p>
      </div>`).join("");
  }

  /* ============================================================
     HADITH
     ============================================================ */
  function pangaHadiyth(d) {
    const head = `<div class="hd-head">
      <div class="ar">${escapeHtml(d.kitabu_ar || "")}</div>
      <div class="sw">${escapeHtml(d.kitabu || "")}</div>
      <div class="ar">${escapeHtml(d.sura_ar || "")}</div>
      <div class="sw">${escapeHtml(d.sura || "")}</div>
    </div>`;
    const items = (d.hadiyth || []).map(h => `<div class="hd-item">
      ${[].concat(h.kwaarabu || []).map(a => `<p class="hd-ar">${alama(a)}</p>`).join("")}
      <p class="hd-sw">
        <span class="msimulizi">${escapeHtml(h.msimulizi || "")}</span>
        ${alama(h.tafsiri)}${h.chanzo ? ` <span class="chanzo">[${escapeHtml(h.chanzo)}]</span>` : ""}
      </p>
      ${[].concat(h.zaidi || []).map(z => `<p class="hd-sw">${alama(z)}</p>`).join("")}
      ${(h.ufafanuzi && h.ufafanuzi.length)
        ? `<p class="hd-ufa-title">UFAFANUZI</p>` + [].concat(h.ufafanuzi).map(u => `<p class="hd-ufa">${alama(u)}</p>`).join("")
        : ""}
    </div>`).join("");
    return head + items;
  }

  /* ============================================================
     KURUDI ORODHANI
     - Kama tuko kwenye somo → rudi kwenye orodha ya masomo
     - Kama tuko kwenye orodha ya masomo → rudi kwenye kategoria
     ============================================================ */
  function rudiOrodhani() {
    // Kama somo linaonekana → funga somo, rudi kwenye orodha ya kategoria
    if (lessonView.style.display === "block") {
      lessonView.style.display = "none";
      document.body.classList.remove("reading");
      document.getElementById("matchBar").classList.add("hidden");
      lessonList.classList.remove("hidden");
      window.scrollTo(0, 0);
      return;
    }
    // Kama tuko kwenye orodha ya masomo ya kategoria → rudi kwenye kategoria
    if (kategoriaActive) {
      onyeshaKategoria();
      tg.BackButton.hide();
    }
  }

  /* ============================================================
     FALLBACK RENDERERS
     ============================================================ */
  function pangaRangiYaContent(text) {
    return text.split("\n").map(mstari => {
      const s = mstari.trim();
      if (!s) return "";
      if (s.startsWith(">")) return `<p class="content-quote">${escapeHtml(s.substring(1).trim())}</p>`;
      const niHeading = s === s.toUpperCase() && /[A-Z]/.test(s);
      return niHeading
        ? `<p class="content-heading">${escapeHtml(s)}</p>`
        : `<p class="content-body">${escapeHtml(s)}</p>`;
    }).join("");
  }

  function pangaKitu(v, key = "") {
    if (v == null) return "";
    if (typeof v === "string") {
      if (key === "kwaarabu") return `<p class="ayah-arabic hadith">${escapeHtml(v)}</p>`;
      if (key === "hadiyth")  return `<div class="content-quote">${escapeHtml(v)}</div>`;
      if (key === "maelezo_ya_wanachuoni") return `<div class="content-quote">${escapeHtml(v)}</div>`;
      if (key === "tafsiri")  return `<p class="tafsiri">${escapeHtml(v)}</p>`;
      return pangaRangiYaContent(v);
    }
    if (Array.isArray(v)) return v.map(x => pangaKitu(x, key)).join("");
    if (typeof v === "object") {
      let html = "";
      if (v.kichwa) html += `<p class="content-heading">${escapeHtml(v.kichwa)}</p>`;
      if (v.sura && v.kwaarabu) html += `<div class="ayah-number">${escapeHtml(v.sura)}</div>`;
      for (const [k, val] of Object.entries(v)) {
        if (k === "kichwa" || k === "sura") continue;
        html += pangaKitu(val, k);
      }
      return html;
    }
    return `<p class="content-body">${escapeHtml(v)}</p>`;
  }

  /* ============================================================
     ALAMA ZA NDANI
     ============================================================ */
  function alama(t) {
    return escapeHtml(t || "")
      .replace(/\[\[(.+?)\]\]/g, '<span class="aya-red">$1</span>')
      .replace(/\{\{(.+?)\}\}/g, '<i>$1</i>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  /* ============================================================
     ESCAPE
     ============================================================ */
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"
    }[c]));
  }
  const escapeAttr = escapeHtml;

  /* ============================================================
     EVENTS
     ============================================================ */
  searchInput.addEventListener("input", () => {
    clearSearch.style.display = searchInput.value ? "block" : "none";
    if (kategoriaActive) choraOrodha();
    else choraKategoria();
  });
  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    clearSearch.style.display = "none";
    if (kategoriaActive) choraOrodha();
    else choraKategoria();
    searchInput.focus();
  });
  document.getElementById("prevM").addEventListener("click", () => ruka(curMark - 1));
  document.getElementById("nextM").addEventListener("click", () => ruka(curMark + 1));
  tg.BackButton.onClick(rudiOrodhani);

  /* ============================================================
     UTAFUTAJI WA KATEGORIA (wakati wa kategoria zote)
     ============================================================ */
  function choraKategoria() {
    const words = queryWords();
    const filtered = kategoria.filter(k => {
      const haystack = norm(`${k.title || ""} ${k.subtitle || ""} ${k.category || ""}`);
      return words.every(w => haystack.includes(w));
    });
    listContainer.innerHTML = "";
    count.textContent = `${filtered.length}/${kategoria.length}`;
    emptyMsg.textContent = "Hakuna kategoria iliyopatikana.";
    emptyMsg.classList.toggle("hidden", filtered.length !== 0);
    filtered.forEach(k => {
      const item = document.createElement("div");
      item.className = "lesson-item";
      item.innerHTML = `
        <img src="${escapeAttr(k.image || "")}" alt="" loading="lazy" />
        <div class="info">
          <div class="title">${escapeHtml(k.title || "Bila jina")}</div>
          <div class="subtitle">${escapeHtml(k.subtitle || "")}</div>
        </div><span class="arrow">›</span>`;
      item.addEventListener("click", () => funguaKategoria(k));
      listContainer.appendChild(item);
    });
  }
