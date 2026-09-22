/* 羊毛货架 · 前台与管理台共用的常量与工具
 * ------------------------------------------------------------------
 * 首页(app.js)和管理台(admin.js)都要用到「HTML 转义、标签配色、内联图标」。
 * 以前这三块在两处各写一份，改一处忘一处就会导致前台与预览不一致，
 * 因此统一收进本文件，挂到 window.PerksShared 命名空间，两边共享同一份。
 *
 * 加载顺序：本文件需在 app.js / admin.js 之前引入。
 */
(function (global) {
  "use strict";

  /* 把用户数据里的特殊字符转义，避免直接拼进 innerHTML 时被当作标签解析。
   * 兼容 null / undefined（管理台预览时字段可能为空）。 */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* 标签 → 配色类名映射：决定每个标签用哪套 .tag--xxx 样式。
   * key 是 data.js 里写的标签文本，value 是 css/style.css 中的样式后缀。
   * 新增标签配色只需在此处加一行，前台与管理台预览会同步生效。 */
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
    "每日签到": "vip",
    "GPT": "holographic",
    "Grok": "holographic"
  };

  /* 卡片内联使用的 SVG 图标，避免额外的图片请求。 */
  var ICONS = {
    // ℹ️ 使用限制行前的信息图标
    info:
      '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '<path d="M12 11v6M12 7.6v.9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    // → CTA 按钮尾部的箭头
    arrow:
      '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' +
      '<path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    // ↑ 分享按钮图标（仅首页用到）
    share:
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
      '<path d="M12 3.5v10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
      '<path d="m7.5 8.5 4.5-5 4.5 5" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" ' +
      'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
  };

  /* 判断 logo 字段是图片路径还是文字 Logo（图片走 <img>，文字直接渲染）。 */
  function isImageLogo(logo) {
    return /\.(png|jpe?g|svg|ico|webp)(\?|$)/i.test(logo || "");
  }

  global.PerksShared = {
    esc: esc,
    TAG_CLASS: TAG_CLASS,
    ICONS: ICONS,
    isImageLogo: isImageLogo
  };
})(window);
