// Runs inside the MathView WebView. Inlined into the generated HTML by build-math-html.mjs.
// Globals `katex` and `marked` are inlined before this script. Plain ES2017, no modules.
(function () {
  var content = document.getElementById('content');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderTex(tex, displayMode) {
    try {
      return katex.renderToString(tex, { displayMode: displayMode, throwOnError: false, strict: 'ignore', output: 'html' });
    } catch (e) {
      return '<code>' + escapeHtml(tex) + '</code>';
    }
  }

  // Raw HTML in the markdown is shown as text, never interpreted.
  marked.use({
    gfm: true,
    breaks: true,
    renderer: {
      html: function (token) {
        return escapeHtml(token.text);
      },
    },
  });

  // Math is cut out before markdown parsing (so `_` and `*` inside formulas survive)
  // and swapped back in afterwards.
  function renderMarkdown(md) {
    var store = [];
    function hold(html) {
      store.push(html);
      return 'MATHPLACEHOLDER' + (store.length - 1) + 'END';
    }
    var src = String(md || '')
      .replace(/\\\$/g, function () {
        return hold('$');
      })
      .replace(/\$\$([\s\S]+?)\$\$/g, function (_, tex) {
        return hold(renderTex(tex, true));
      })
      .replace(/\\\[([\s\S]+?)\\\]/g, function (_, tex) {
        return hold(renderTex(tex, true));
      })
      .replace(/\\\(([\s\S]+?)\\\)/g, function (_, tex) {
        return hold(renderTex(tex, false));
      })
      .replace(/\$([^$\n]+?)\$/g, function (_, tex) {
        return hold(renderTex(tex, false));
      });
    var html = marked.parse(src);
    return html.replace(/MATHPLACEHOLDER(\d+)END/g, function (_, i) {
      return store[Number(i)];
    });
  }

  // Native: the WebView bridge. Web preview: this page is an iframe, so talk to the parent.
  var bridge = window.ReactNativeWebView || (window.parent !== window ? { postMessage: function (data) { window.parent.postMessage(data, '*'); } } : null);

  var lastHeight = -1;
  function postHeight() {
    // scrollHeight also covers KaTeX parts that overflow the box (tall fractions).
    var h = Math.max(Math.ceil(content.getBoundingClientRect().height), content.scrollHeight);
    if (h !== lastHeight && bridge) {
      lastHeight = h;
      bridge.postMessage(JSON.stringify({ type: 'height', height: h }));
    }
  }

  window.__render = function (payload) {
    var vars = payload.vars || {};
    for (var key in vars) {
      document.documentElement.style.setProperty('--' + key, vars[key]);
    }
    content.innerHTML = renderMarkdown(payload.markdown);
    postHeight();
  };

  // Web preview: the parent sends { type: 'render', payload } with postMessage.
  window.addEventListener('message', function (e) {
    var msg = e.data;
    if (typeof msg === 'string') {
      try {
        msg = JSON.parse(msg);
      } catch (err) {
        return;
      }
    }
    if (msg && msg.type === 'render') window.__render(msg.payload);
  });

  if (window.ResizeObserver) {
    new ResizeObserver(postHeight).observe(content);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(postHeight);
  }
})();
