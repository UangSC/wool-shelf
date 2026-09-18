(function () {
  "use strict";

  var PERKS = (window.PERKS || []).filter(function (p) { return !p.offline; });

  var state = { q: "", cat: "全部" };
  var animated = false; // 入场动画只播放一次

  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var chipsBox = document.getElementById("chips");
  var resultBar = document.getElementById("resultBar");
  var searchInput = document.getElementById("searchInput");
  var searchClear = document.getElementById("searchClear");
  var stats = document.getElementById("stats");
  var toasts = document.getElementById("toasts");

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var ICON_INFO =
    '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M12 11v6M12 7.6v.9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  var ICON_ARROW =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
    '<path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_SHARE =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path d="M12 3.5v10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
    '<path d="m7.5 8.5 4.5-5 4.5 5" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" ' +
    'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  /* ---------- Toast ---------- */
  function toast(msg, icon) {
    var el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = '<span class="ico">' + (icon || "✅") + '</span><span>' + esc(msg) + "</span>";
    toasts.appendChild(el);
    // 保持最多 3 条
    while (toasts.children.length > 3) {
      toasts.removeChild(toasts.firstChild);
    }
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 240);
    }, 2200);
  }

  /* ---------- 复制邀请码 ---------- */
  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---------- 分类 ---------- */
  function categories() {
    var seen = ["全部"];
    PERKS.forEach(function (p) {
      if (seen.indexOf(p.cat) === -1) seen.push(p.cat);
    });
    return seen;
  }

  function renderChips() {
    var count = categories();
    var html = count.map(function (c) {
      var n = c === "全部" ? PERKS.length : PERKS.filter(function (p) { return p.cat === c; }).length;
      return '<button class="chip' + (c === state.cat ? " chip--active" : "") +
        '" type="button" data-cat="' + esc(c) + '">' + esc(c) + ' <span style="opacity:.65">' + n + '</span></button>';
    }).join("");
    chipsBox.innerHTML = html;
  }

  /* ---------- 过滤 ----------
   * 搜索用的匹配串只跟卡片数据有关，与筛选状态无关，
   * 因此首次用到时算一次并缓存，避免每次按键都对全部卡片做一遍拼接 + 转小写 */
  var hayCache = {};
  function haystack(p) {
    var h = hayCache[p.id];
    if (h === undefined) {
      h = [p.name, p.cat, p.desc, p.perk, p.note, p.condition, (p.code || ""), (p.tags || []).join(" ")]
        .join(" ").toLowerCase();
      hayCache[p.id] = h;
    }
    return h;
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return PERKS.filter(function (p) {
      if (state.cat !== "全部" && p.cat !== state.cat) return false;
      if (!q) return true;
      return haystack(p).indexOf(q) !== -1;
    });
  }

  /* ---------- 标签样式映射：平台/类型的独立配色 ---------- */
  var TAG_CLASS = {
    "API": "api",
    "官方应用": "official",
    "公益中转": "green",
    "付费中转": "paid",
    "国产模型": "model",
    "GitHub": "github",
    "Linux do": "linuxdo",
    "公益": "green",
    "付费": "paid",
    "按量付费": "paid",
    "国模": "model",
    "免费": "blackgold",
    "全模态": "blackgold",
    "邮箱注册": "email",
    "教育邮箱": "edu",
    "VIP 签到": "vip",
    "无注册限制": "nolimit",
    "多模型": "holographic",
    "语音": "holographic",
    "音乐": "holographic",
    "音效": "holographic",
    "订阅制": "vip",
    "字体": "model",
    "商用授权": "green",
    "图片处理": "model",
    "PDF": "email",
    "工具箱": "model",
    "格式转换": "email",
    "画图": "model",
    "免注册": "nolimit",
    "ICO 生成": "email",
    "开发者": "linuxdo",
    "台词搜索": "model",
    "影视": "holographic",
    "视频": "holographic",
    "图片": "model",
    "需注册": "nolimit",
    "AI 生图": "holographic",
    "游戏素材": "green",
    "软件下载": "model",
    "教程": "email",
    "动漫": "holographic",
    "特效": "holographic",
    "音频": "holographic",
    "AI 应用": "holographic",
    "新客优惠": "gold",
    "云服务": "model",
    "对象存储": "email",
    "邀请有礼": "holographic",
    "每日签到": "vip"
  };

  /* ---------- 卡片模板 ---------- */
  function cardHTML(p) {
    // 图片图标优先，否则用文字 Logo
    var isImg = /\.(png|jpe?g|svg|ico|webp)(\?|$)/i.test(p.logo);
    var logoHtml = isImg
      ? '<img class="logo__img" src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' 图标" loading="lazy" decoding="async">'
      : esc(p.logo);
    var logoCls = "logo" + (isImg ? " logo--img" : " logo--glyph");

    var codeBlock = "";
    if (p.code) {
      codeBlock =
        '<div class="perk__code"><span>邀请码</span>' +
        '<code>' + esc(p.code) + '</code>' +
        '<button class="copy" type="button" data-code="' + esc(p.code) + '" aria-label="复制邀请码 ' + esc(p.code) + '">' +
        '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">' +
        '<rect x="9" y="9" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
        '<path d="M15 5.5A2 2 0 0 0 13 4H6a2 2 0 0 0-2 2v7a2 2 0 0 0 1.5 1.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
        '</svg><span class="copy__text">复制</span></button></div>';
    }

    var tags = (p.tags || []).map(function (t) {
      var cls = TAG_CLASS[t] ? " tag tag--" + TAG_CLASS[t] : " tag";
      return '<span class="' + cls.trim() + '">' + esc(t) + "</span>";
    }).join("");

    return (
      '<article class="card" data-id="' + esc(p.id) + '">' +
        (p.featured ? '<span class="card__pick" aria-label="推荐">荐</span>' : "") +
        '<div class="card__head">' +
          '<div class="' + logoCls + '" style="--c:' + esc(p.color) + '">' + logoHtml + "</div>" +
          '<div class="card__title"><h3>' + esc(p.name) + '</h3><span class="card__cat">' + esc(p.cat) + "</span></div>" +
          '<button class="share" type="button" data-share="' + esc(p.url) + '" ' +
          'aria-label="分享 ' + esc(p.name) + ' 的链接">' +
          ICON_SHARE + "</button>" +
        "</div>" +
        '<p class="desc">' + esc(p.desc) + "</p>" +
        '<div class="perk">' +
          '<div class="perk__label">' + esc(p.perkLabel || "🎁 新用户福利") + "</div>" +
          '<div class="perk__value">' + esc(p.perk) + "</div>" +
          '<div class="perk__note">' + esc(p.note) + "</div>" +
          codeBlock +
        "</div>" +
        '<div class="tags">' + tags + "</div>" +
        '<div class="cond">' + ICON_INFO +
          '<span class="cond__clip"><span class="cond__track">' +
            '<span class="cond__chunk"><span class="cond__text">' + esc(p.condition) + "</span></span>" +
          "</span></span>" +
        "</div>" +
        '<div class="card__foot">' +
          '<a class="btn" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(p.cta) + ICON_ARROW + "</a>" +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- 渲染 ---------- */
  function renderStats() {
    var withCode = PERKS.filter(function (p) { return !!p.code; }).length;
    stats.innerHTML = "已收录 <b>" + PERKS.length + "</b> 个资源 · <b>" + withCode + "</b> 个含邀请码";
  }

  function renderResultBar(list) {
    var parts = [];
    if (state.cat !== "全部") parts.push('分类 <b>' + esc(state.cat) + "</b>");
    if (state.q.trim()) parts.push('关键词 <b>“' + esc(state.q.trim()) + '”</b>');
    var head = "共 <b>" + PERKS.length + "</b> 个资源 <span class='dot'>·</span> 当前 <b>" + list.length + "</b> 个";
    resultBar.innerHTML = parts.length ? head + " <span class='dot'>·</span> 已筛选：" + parts.join("，") : head;
  }

  /* 卡片 HTML 只取决于卡片自身数据，与搜索/筛选状态无关，
   * 缓存后翻页、搜索、切分类都只是拼接现成字符串，不再重复转义与模板拼接 */
  var cardCache = {};
  function cardCached(p) {
    var html = cardCache[p.id];
    if (html === undefined) {
      html = cardHTML(p);
      cardCache[p.id] = html;
    }
    return html;
  }

  function render() {
    var list = filtered();
    syncChips();
    renderResultBar(list);

    if (!list.length) {
      grid.innerHTML = "";
      grid.hidden = true;
      empty.hidden = false;
    } else {
      empty.hidden = true;
      grid.hidden = false;
      grid.innerHTML = list.map(cardCached).join("");
      if (!animated) {
        animated = true;
        grid.classList.add("grid--animate");
        // 动画播完即移除，后续筛选/搜索不再重播
        setTimeout(function () { grid.classList.remove("grid--animate"); }, 700);
      }
      setupMarquee();
    }

    searchClear.hidden = !state.q;
  }

  /* 分类 chips 只在分类变化或首次渲染时重建，搜索时不必重算计数 */
  var chipsRenderedFor = null;
  function syncChips() {
    if (chipsRenderedFor === state.cat) return;
    chipsRenderedFor = state.cat;
    renderChips();
  }

  /* ---------- 过长的「使用限制」文案：无缝滚动字幕 ----------
   * 文案过长时不折行也不省略号，改为横向循环滚动：
   * 把文案复制一份、中间留 4 个空格宽作间隔，向前滚过一个周期后
   * 画面与起点完全一致，因此可以无缝接回开头（不会像回弹那样跳一下）。
   * 每滚完一个周期停顿 MARQUEE_HOLD 毫秒再继续，鼠标移上去暂停。
   * 用 Web Animations API 而非 CSS 关键帧——因为周期长度随文案变化，
   * 而「停顿」时长固定，两者比例无法预先写成固定百分比的关键帧。*/
  var MARQUEE_SPEED = 30;  // px/s，约合每秒 2.4 个汉字，比正常阅读速度更慢
  var MARQUEE_HOLD = 2000; // 每滚完一个周期后的停顿时长
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setupMarquee() {
    var nodes = grid.querySelectorAll(".cond");
    for (var i = 0; i < nodes.length; i++) {
      (function (cond) {
        var clip = cond.querySelector(".cond__clip");
        var track = cond.querySelector(".cond__track");
        var chunk = cond.querySelector(".cond__chunk");
        var text = cond.querySelector(".cond__text");
        if (!clip || !track || !chunk || !text) return;

        // 复位上一轮的状态（卡片会被整块重建，但缩放窗口时需要重算）
        if (cond._anim) { cond._anim.cancel(); cond._anim = null; }
        cond.classList.remove("cond--scroll", "cond--wrap");
        track.style.transform = "";
        while (track.children.length > 1) track.removeChild(track.lastChild);

        // 减少动态效果：折行显示，不做滚动
        if (reduceMotion) { cond.classList.add("cond--wrap"); return; }

        // 以裁剪视口宽度为基准，判断文字是否超出
        if (text.getBoundingClientRect().width - clip.clientWidth <= 1) return;

        // 复制一份接在后面，屏幕阅读器忽略副本
        var clone = chunk.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);

        // 一个周期 = 单份文案宽度 + 尾部间隔
        var period = chunk.getBoundingClientRect().width;
        var scrollMs = Math.max(1500, (period / MARQUEE_SPEED) * 1000);
        var total = scrollMs + MARQUEE_HOLD;

        cond.classList.add("cond--scroll");
        var anim = track.animate([
          { transform: "translateX(0)", offset: 0 },
          { transform: "translateX(" + (-period) + "px)", offset: scrollMs / total },
          { transform: "translateX(" + (-period) + "px)", offset: 1 }
        ], { duration: total, iterations: Infinity, easing: "linear" });
        cond._anim = anim;

        cond.addEventListener("mouseenter", function () { anim.pause(); });
        cond.addEventListener("mouseleave", function () { anim.play(); });
      })(nodes[i]);
    }
  }

  // 卡片宽度随视口变化，超长文案的滚动距离也要跟着重算
  var marqueeResizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(marqueeResizeTimer);
    marqueeResizeTimer = setTimeout(setupMarquee, 220);
  });

  /* ---------- 事件绑定 ---------- */
  // 搜索（轻量防抖 + 中文输入法组词抑制）
  var searchTimer = null;
  var composing = false;

  searchInput.addEventListener("input", function () {
    state.q = searchInput.value;
    searchClear.hidden = !state.q;
    if (composing) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 110);
  });
  searchInput.addEventListener("compositionstart", function () { composing = true; });
  searchInput.addEventListener("compositionend", function () {
    composing = false;
    state.q = searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 110);
  });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      searchInput.value = "";
      state.q = "";
      render();
    }
  });
  searchClear.addEventListener("click", function () {
    searchInput.value = "";
    state.q = "";
    render();
    searchInput.focus();
  });

  // 分类
  chipsBox.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    state.cat = chip.dataset.cat;
    render();
  });

  // 卡片内交互：分享链接 + 复制邀请码
  grid.addEventListener("click", function (e) {
    var shareBtn = e.target.closest(".share");
    if (shareBtn) {
      var url = shareBtn.dataset.share;
      var name = (PERKS.filter(function (p) { return p.url === url; })[0] || {}).name || "";
      shareBtn.classList.remove("pop");
      void shareBtn.offsetWidth; // 重启动画
      copyText(url, function () {
        shareBtn.classList.add("pop");
        toast("「" + name + "」链接复制成功，快去分享给你的小伙伴吧～！", "🔗");
      });
      return;
    }

    var copyBtn = e.target.closest(".copy");
    if (copyBtn) {
      var code = copyBtn.dataset.code;
      var label = copyBtn.querySelector(".copy__text");
      copyText(code, function () {
        copyBtn.classList.add("copied");
        label.textContent = "已复制 ✓";
        toast("邀请码 " + code + " 已复制，去注册时粘贴", "🎁");
        setTimeout(function () {
          copyBtn.classList.remove("copied");
          label.textContent = "复制";
        }, 1800);
      });
    }
  });

  // 清空筛选
  document.getElementById("resetFilters").addEventListener("click", function () {
    state.q = "";
    state.cat = "全部";
    searchInput.value = "";
    render();
    searchInput.focus();
    toast("已清空全部筛选条件", "🧹");
  });

  /* ---------- 友情提醒：右下角气泡，10 秒自动消失，可提前关闭 ---------- */
  var noticeBubble = document.getElementById("noticeBubble");
  var noticeBar = document.getElementById("noticeBar");
  var noticeTimer = null;

  function closeNotice() {
    if (noticeBubble.hidden) return;
    clearTimeout(noticeTimer);
    noticeBubble.classList.add("out");
    setTimeout(function () {
      noticeBubble.hidden = true;
      noticeBubble.classList.remove("out");
      // 重置进度条动画，下次显示重新计时
      noticeBar.style.animation = "none";
      void noticeBar.offsetWidth;
      noticeBar.style.animation = "";
    }, 220);
  }

  document.getElementById("noticeClose").addEventListener("click", closeNotice);

  /* ---------- 隐蔽入口：页脚图标 1.5s 内连续点按 5 次进入管理台 ---------- */
  (function () {
    var secret = document.getElementById("secretEntry");
    if (!secret) return;
    var taps = 0;
    var firstTapAt = 0;
    var REQUIRED = 5;
    var WINDOW_MS = 1500; // 超过这个间隔就不再算「快速连点」

    function reset() {
      taps = 0;
      firstTapAt = 0;
      secret.classList.remove("tap", "ready");
    }

    secret.addEventListener("click", function () {
      var now = Date.now();
      // 距首击太久，或在计时窗口外又点：从这次点击重新开始数
      if (!taps || now - firstTapAt > WINDOW_MS) {
        taps = 0;
        firstTapAt = now;
        secret.classList.remove("ready");
      }
      taps++;
      secret.classList.add("tap");

      if (taps >= REQUIRED) {
        secret.classList.add("ready");
        toast("🛠 正在打开卡片管理台…", "🧺");
        // 一次性口令 + 跳转参数，管理台据此放行；直接访问 URL 会被重定向回首页
        sessionStorage.setItem("perksAdmin", "1");
        setTimeout(function () { location.href = "admin.html?from=secret"; }, 480);
        reset();
      }
    });
  })();

  renderStats();
  render();

  // 页面加载后显示友情提醒
  noticeBubble.hidden = false;
  noticeTimer = setTimeout(closeNotice, 30000);
})();
