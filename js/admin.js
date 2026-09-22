/* 羊毛货架 · 卡片管理台逻辑
 * ------------------------------------------------------------------
 * 职责：可视化编辑 window.PERKS 列表 → 生成 / 预览卡片代码 → 导出完整 data.js。
 * 数据只存本机内存，导出后由维护者手动覆盖 js/data.js，不涉及任何后端。
 *
 * 依赖加载顺序：js/shared.js → js/data.js → js/admin.js
 */
(function () {
  "use strict";

  /* ---------- 入口校验：只放行从首页隐蔽入口（快速连点 5 次）进来的访客 ---------- */
  var adminWrap = document.getElementById("adminWrap");
  var ok = false;
  try {
    ok = sessionStorage.getItem("perksAdmin") === "1" &&
         new URLSearchParams(location.search).get("from") === "secret";
  } catch (e) { ok = false; }
  if (!ok) {
    // 直接访问 / 收藏 / 历史记录：静默重定向回首页，不暴露管理台的存在
    location.replace("index.html");
    return;
  }
  try { sessionStorage.removeItem("perksAdmin"); } catch (e) {}
  adminWrap.hidden = false;

  /* ---------- 共用常量与工具（来自 js/shared.js） ---------- */
  var esc = window.PerksShared.esc;
  var TAG_CLASS = window.PerksShared.TAG_CLASS;
  var ICON_INFO = window.PerksShared.ICONS.info;
  var ICON_ARROW = window.PerksShared.ICONS.arrow;
  var isImageLogo = window.PerksShared.isImageLogo;

  // 编辑用的卡片列表（复制一份，避免直接改动全局 PERKS）
  var list = (window.PERKS || []).slice();
  var editingId = null;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 工具 ---------- */
  function uid() {
    return "card-" + Date.now().toString(36);
  }
  // 兼容旧浏览器
  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (fn) {
      for (var i = 0; i < this.length; i++) if (fn(this[i], i)) return i;
      return -1;
    };
  }
  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast--admin";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .25s";
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 260);
    }, 2000);
  }

  /* ---------- 表单读写 ---------- */
  function readForm() {
    var name = $("f-name").value.trim();
    var url = $("f-url").value.trim();
    var perk = $("f-perk").value.trim();
    if (!name) { toast("请填写名称"); $("f-name").focus(); return null; }
    if (!url) { toast("请填写官网链接"); $("f-url").focus(); return null; }
    if (!perk) { toast("请填写福利 / 特点"); $("f-perk").focus(); return null; }
    var tags = $("f-tags").value.split(/[,，]/).map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length > 0; });
    return {
      id: editingId || uid(),
      name: name,
      logo: $("f-logo").value.trim() || "assets/" + name.toLowerCase().replace(/\s+/g, "-") + ".png",
      color: $("f-color").value || "#0d9488",
      cat: $("f-cat").value.trim() || "其他",
      desc: $("f-desc").value.trim(),
      perk: perk,
      note: $("f-note").value.trim(),
      code: $("f-code").value.trim(),
      condition: $("f-condition").value.trim(),
      tags: tags,
      url: url,
      cta: $("f-cta").value.trim() || "去薅一下",
      perkLabel: $("f-perkLabel").value,
      featured: $("f-featured").checked,
      offline: $("f-offline").checked
    };
  }
  function writeForm(p) {
    $("f-name").value = p.name || "";
    $("f-cat").value = p.cat || "";
    $("f-url").value = p.url || "";
    $("f-desc").value = p.desc || "";
    $("f-perk").value = p.perk || "";
    $("f-note").value = p.note || "";
    $("f-code").value = p.code || "";
    $("f-condition").value = p.condition || "";
    $("f-tags").value = (p.tags || []).join(", ");
    $("f-logo").value = p.logo || "";
    $("f-color").value = /^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : "#0d9488";
    $("f-cta").value = p.cta || "";
    $("f-perkLabel").value = p.perkLabel || "";
    $("f-featured").checked = !!p.featured;
    $("f-offline").checked = !!p.offline;
  }
  function resetForm() {
    editingId = null;
    ["f-name","f-cat","f-url","f-desc","f-perk","f-note","f-code","f-condition","f-tags","f-logo","f-cta"]
      .forEach(function (id) { $(id).value = ""; });
    $("f-color").value = "#0d9488";
    $("f-perkLabel").value = "";
    $("f-cta").value = "";
    $("f-featured").checked = false;
    $("f-offline").checked = false;
    $("editHint").textContent = "（新增模式）";
    $("output").value = "";
    $("previewPanel").hidden = true;
  }

  /* ---------- 代码生成 ---------- */
  function indent(obj) {
    // 序列化为 2 空格缩进的 JS 对象字面量（与 data.js 风格一致）
    var lines = ["  {"];
    var keys = ["id","name","logo","color","cat","desc","perk","note","code","condition","tags","url","cta","perkLabel","featured","offline"];
    keys.forEach(function (k) {
      if (!(k in obj)) return;
      var v = obj[k];
      var s;
      if (typeof v === "boolean") {
        s = v ? "true" : "false";
      } else if (Array.isArray(v)) {
        s = "[" + v.map(function (t) { return '"' + t + '"'; }).join(", ") + "]";
      } else {
        s = '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
      }
      lines.push("    " + k + ": " + s + ",");
    });
    // 去掉最后一个逗号
    if (lines[lines.length - 1].endsWith(",")) lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
    lines.push("  }");
    return lines.join("\n");
  }

  function regenerate() {
    // 生成完整 data.js 内容
    var header = [
      "/* 羊毛货架 · 资源数据",
      " * 字段：name 名称 / logo 图标路径 / color 标识色 / cat 分类",
      " *      desc 这是什么（含邀请码的卡片可留空） / perk 福利 / note 福利说明 / code 邀请码（无则留空）",
      " *      condition 使用限制 / tags 标签 / url / cta 按钮文案",
      " *      perkLabel 福利区标签（可选，默认「🎁 新用户福利」）",
      " *      featured 推荐（可选，卡片左上角显示金色「荐」徽标）",
      " *      offline 暂时下线（可选，true 时前台隐藏该卡片，仅在管理台可见）",
      " * 添加卡片请用 admin.html 可视化编辑器，导出后覆盖本文件即可",
      " */"
    ].join("\n");
    var body = "window.PERKS = [\n" +
      list.map(function (p) { return indent(p); }).join(",\n") +
      "\n];\n";
    return header + "\n" + body;
  }

  /* ---------- 卡片预览（复用首页样式） ----------
   * 与首页 app.js 的 cardHTML 略有差异：预览需容忍字段为空，图标加载失败时回退为文字，
   * 且不含分享按钮，因此单独实现，配色 / 图标仍走共用的 TAG_CLASS 与 ICONS。 */
  function cardHTML(p) {
    var isImg = isImageLogo(p.logo);
    var logoHtml = isImg
      ? '<img class="logo__img" src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' 图标" ' +
        'onerror="this.style.display=\'none\';this.parentNode.classList.add(\'logo--glyph\');this.parentNode.textContent=\'' + esc(p.name).slice(0, 2) + '\'">'
      : esc(p.logo || p.name.slice(0, 2));
    var logoCls = "logo" + (isImg ? " logo--img" : " logo--glyph");
    var codeBlock = "";
    if (p.code) {
      codeBlock = '<div class="perk__code"><span class="code__label">邀请码</span>' +
        '<span class="code__clip"><span class="code__track"><span class="code__chunk"><code>' + esc(p.code) + '</code></span></span></span>' +
        '<button class="copy" type="button">复制</button></div>';
    }
    var tags = (p.tags || []).map(function (t) {
      var cls = TAG_CLASS[t] ? "tag tag--" + TAG_CLASS[t] : "tag";
      return '<span class="' + cls + '">' + esc(t) + "</span>";
    }).join("");
    return (
      '<article class="card" data-id="' + esc(p.id) + '">' +
        (p.featured ? '<span class="card__pick" aria-label="推荐">荐</span>' : "") +
        '<div class="card__head">' +
          '<div class="' + logoCls + '" style="--c:' + esc(p.color) + '">' + logoHtml + "</div>" +
          '<div class="card__title"><h3>' + esc(p.name) + '</h3><span class="card__cat">' + esc(p.cat) + "</span></div>" +
        "</div>" +
        '<p class="desc">' + esc(p.desc || "") + "</p>" +
        '<div class="perk">' +
          '<div class="perk__label">' + esc(p.perkLabel || "🎁 新用户福利") + "</div>" +
          '<div class="perk__value">' + esc(p.perk) + "</div>" +
          '<div class="perk__note">' + esc(p.note || "") + "</div>" +
          codeBlock +
        "</div>" +
        '<div class="tags">' + tags + "</div>" +
        '<div class="cond">' + ICON_INFO + '<span class="cond__clip"><span class="cond__track"><span class="cond__chunk"><span class="cond__text">' + esc(p.condition || "") + "</span></span></span></span></div>" +
        '<div class="card__foot">' +
          '<a class="btn" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(p.cta || "去薅一下") + ICON_ARROW + "</a>" +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- 列表渲染 ---------- */
  function renderList() {
    var offlineN = list.filter(function (p) { return p.offline; }).length;
    $("listCount").textContent = "共 " + list.length + " 个" +
      (offlineN ? " · " + offlineN + " 个已下线" : "");
    var box = $("itemList");
    if (!list.length) {
      box.innerHTML = '<div class="empty-tip">暂无卡片，填写上方表单生成第一个吧</div>';
      return;
    }
    box.innerHTML = "";
    list.forEach(function (p, i) {
      var el = document.createElement("div");
      el.className = "item" + (p.offline ? " item--offline" : "");
      var isImg = isImageLogo(p.logo);
      el.innerHTML =
        '<span class="idx">' + (i + 1) + "</span>" +
        '<span class="logo" style="background:#fff;border:1px solid var(--border)">' +
          (isImg ? '<img src="' + esc(p.logo) + '" alt="">' : esc((p.name || "").slice(0, 2))) +
        "</span>" +
        '<span class="meta"><b>' + esc(p.name) + "</b>" +
          (p.featured ? '<span class="badge badge--pick">荐</span>' : "") +
          (p.offline ? '<span class="badge badge--off">已下线</span>' : "") +
          '<span>' + esc(p.cat) + (p.code ? " · 码 " + esc(p.code) : "") + "</span>" +
        "</span>" +
        '<span class="ops">' +
          '<button class="btn btn--sm" type="button" data-op="up" data-i="' + i + '">↑</button>' +
          '<button class="btn btn--sm" type="button" data-op="down" data-i="' + i + '">↓</button>' +
          '<button class="btn btn--sm" type="button" data-op="offline" data-i="' + i + '">' +
            (p.offline ? "恢复" : "下线") + "</button>" +
          '<button class="btn btn--sm" type="button" data-op="edit" data-i="' + i + '">编辑</button>' +
          '<button class="btn btn--sm btn--danger" type="button" data-op="del" data-i="' + i + '">删除</button>' +
        "</span>";
      box.appendChild(el);
    });
  }

  /* ---------- 分类提示 ---------- */
  function renderCatList() {
    var cats = [];
    list.forEach(function (p) {
      if (p.cat && cats.indexOf(p.cat) === -1) cats.push(p.cat);
    });
    $("catList").innerHTML = cats.map(function (c) {
      return "<option>" + esc(c) + "</option>";
    }).join("");
  }

  /* ---------- 事件 ---------- */
  $("btnGenerate").addEventListener("click", function () {
    var p = readForm();
    if (!p) return;
    // 编辑模式：更新原卡片；新增模式：追加到列表
    if (editingId) {
      var idx = list.findIndex(function (x) { return x.id === editingId; });
      if (idx !== -1) list[idx] = p;
    } else {
      list.push(p);
    }
    renderList();
    renderCatList();
    $("output").value = indent(p);
    $("genMsg").textContent = editingId
      ? "✅ 已更新「" + p.name + "」，点「导出完整 data.js」保存"
      : "✅ 已加入列表，点「导出完整 data.js」保存";
    toast(editingId ? "卡片已更新" : "已加入列表");
    // 只退出编辑态，保留表单和生成的代码，方便继续微调
    editingId = null;
    $("editHint").textContent = "（新增模式）";
  });

  $("btnPreview").addEventListener("click", function () {
    var p = readForm();
    if (!p) return;
    $("previewPanel").hidden = false;
    $("previewBox").innerHTML = cardHTML(p);
    $("previewPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("btnReset").addEventListener("click", function () {
    resetForm();
    toast("表单已清空");
  });

  $("btnCopy").addEventListener("click", function () {
    var out = $("output");
    if (!out.value) { toast("先点「生成卡片代码」"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out.value).then(function () { toast("已复制到剪贴板"); });
    } else {
      out.select();
      try { document.execCommand("copy"); toast("已复制到剪贴板"); }
      catch (e) { toast("复制失败，请手动选择复制"); }
    }
  });

  $("btnExport").addEventListener("click", function () {
    var content = regenerate();
    var blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
    toast("已导出 data.js，用它覆盖项目里的同名文件即可");
  });

  $("itemList").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-op]");
    if (!btn) return;
    var op = btn.dataset.op;
    var i = parseInt(btn.dataset.i, 10);
    if (isNaN(i) || !list[i]) return;

    if (op === "up" && i > 0) {
      var t = list[i - 1]; list[i - 1] = list[i]; list[i] = t;
      renderList(); renderCatList();
    } else if (op === "down" && i < list.length - 1) {
      var t2 = list[i + 1]; list[i + 1] = list[i]; list[i] = t2;
      renderList(); renderCatList();
    } else if (op === "offline") {
      list[i].offline = !list[i].offline;
      renderList();
      toast(list[i].offline ? "「" + list[i].name + "」已下线，前台将不再展示" : "「" + list[i].name + "」已恢复上线");
    } else if (op === "edit") {
      editingId = list[i].id;
      writeForm(list[i]);
      $("editHint").textContent = "（编辑中：" + list[i].name + "）";
      window.scrollTo({ top: 0, behavior: "smooth" });
      $("f-name").focus();
    } else if (op === "del") {
      var name = list[i].name;
      if (!confirm("确认删除「" + name + "」？")) return;
      if (editingId === list[i].id) resetForm();
      list.splice(i, 1);
      renderList(); renderCatList();
      toast("已删除「" + name + "」");
    }
  });

  // 初次渲染
  renderList();
  renderCatList();
})();
