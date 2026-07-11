/**
 * [INPUT]   : 页面里组件标注的 data-edit / data-edit-label 属性、父窗口（Studio）的模式开关消息
 * [OUTPUT]  : "点哪改哪"交互层：hover 高亮可编辑区域，点击后通知 Studio 跳到对应表单
 * [POS]     : 仅由 studio 插件在 dev 模式注入到预览页面，构建产物中不存在
 * [DECISION]: 只在 iframe（Studio 预览）里激活；用捕获阶段拦截点击，避免触发页面原有交互
 */

(function () {
  if (window.self === window.top) return; // 只在 Studio 预览 iframe 里生效

  var editOn = false;

  function init() {
    var style = document.createElement('style');
    style.textContent = [
      '.studio-edit-on [data-edit] { cursor: pointer !important; }',
      '.studio-edit-on [data-edit]:hover { outline: 2px dashed #E0745C !important; outline-offset: 3px; border-radius: 4px; }',
      '#studio-edit-hint { position: fixed; z-index: 2147483647; bottom: 16px; left: 50%; transform: translateX(-50%);',
      '  background: rgba(15,23,42,.88); color: #fff; font-size: 13px; padding: 7px 16px; border-radius: 999px;',
      '  pointer-events: none; opacity: 0; transition: opacity .15s; font-family: sans-serif; white-space: nowrap; }',
      '#studio-edit-hint.show { opacity: 1; }',
    ].join('\n');
    document.head.appendChild(style);

    var hint = document.createElement('div');
    hint.id = 'studio-edit-hint';
    document.body.appendChild(hint);

    window.addEventListener('message', function (event) {
      var data = event.data;
      if (!data) return;
      if (data.type === 'studio-edit-mode') {
        editOn = !!data.on;
        document.documentElement.classList.toggle('studio-edit-on', editOn);
        if (!editOn) hint.classList.remove('show');
      }
      // Studio 主题控件的"未保存实时预览"：直接把 CSS 变量打到根元素上。
      if (data.type === 'studio-theme-preview' && data.vars) {
        Object.keys(data.vars).forEach(function (key) {
          document.documentElement.style.setProperty(key, String(data.vars[key]));
        });
        (data.webfonts || []).forEach(function (href) {
          if (document.querySelector('link[data-theme-webfont="' + href + '"]')) return;
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.setAttribute('data-theme-webfont', href);
          document.head.appendChild(link);
        });
      }
    });

    document.addEventListener('mouseover', function (event) {
      if (!editOn) return;
      var target = event.target && event.target.closest ? event.target.closest('[data-edit]') : null;
      if (target) {
        var label = target.getAttribute('data-edit-label') || '这块内容';
        var isHint = (target.getAttribute('data-edit') || '').indexOf('hint:') === 0;
        hint.textContent = isHint ? '💡 点击查看「' + label + '」在哪里改' : '✏️ 点击编辑「' + label + '」';
        hint.classList.add('show');
      } else {
        hint.classList.remove('show');
      }
    });

    // 捕获阶段拦截，阻止页面自身的弹窗 / 跳转逻辑。
    document.addEventListener('click', function (event) {
      if (!editOn) return;
      var target = event.target && event.target.closest ? event.target.closest('[data-edit]') : null;
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.parent.postMessage({
        type: 'studio-edit',
        field: target.getAttribute('data-edit'),
        label: target.getAttribute('data-edit-label') || '',
        lang: (document.documentElement.lang || 'zh').indexOf('zh') === 0 ? 'zh' : 'en',
      }, '*');
    }, true);

    window.parent.postMessage({ type: 'studio-overlay-ready' }, '*');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
