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

  // While a reply is still arriving, a formula may be cut in half. Drop the unfinished
  // tail from its last unmatched "$" or "$$" so it appears whole once it is complete.
  function completePrefix(md) {
    var i = 0;
    var open = -1;
    var openLen = 0;
    while (i < md.length) {
      var ch = md[i];
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '$') {
        var len = md[i + 1] === '$' ? 2 : 1;
        if (open < 0) {
          open = i;
          openLen = len;
        } else if (len === openLen) {
          open = -1;
        }
        i += len;
        continue;
      }
      i += 1;
    }
    return open < 0 ? md : md.slice(0, open);
  }

  // Math is cut out before markdown parsing (so `_` and `*` inside formulas survive)
  // and swapped back in afterwards.
  function renderMarkdown(md, inline) {
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
        return hold(renderTex(tex, !inline));
      })
      .replace(/\\\[([\s\S]+?)\\\]/g, function (_, tex) {
        return hold(renderTex(tex, !inline));
      })
      .replace(/\\\(([\s\S]+?)\\\)/g, function (_, tex) {
        return hold(renderTex(tex, false));
      })
      .replace(/\$([^$\n]+?)\$/g, function (_, tex) {
        return hold(renderTex(tex, false));
      });
    var html = inline ? marked.parseInline(src) : marked.parse(src);
    return html.replace(/MATHPLACEHOLDER(\d+)END/g, function (_, i) {
      return store[Number(i)];
    });
  }

  // Native: the WebView bridge. Web preview: this page is an iframe, so talk to the parent.
  var bridge = window.ReactNativeWebView || (window.parent !== window ? { postMessage: function (data) { window.parent.postMessage(data, '*'); } } : null);
  function send(msg) {
    if (bridge) bridge.postMessage(JSON.stringify(msg));
  }

  var lastHeight = -1;
  function postHeight() {
    // scrollHeight also covers KaTeX parts that overflow the box (tall fractions).
    var h = Math.max(Math.ceil(content.getBoundingClientRect().height), content.scrollHeight);
    if (h !== lastHeight) {
      lastHeight = h;
      send({ type: 'height', height: h });
    }
  }

  // ---- Answer choices -------------------------------------------------------------
  // Buttons under the stem. The app owns the state (picked, sealing, right, wrong) and
  // passes it in; a tap only reports the letter back. A state change on the same choices
  // updates the buttons in place, so the verdict can animate on the row itself.

  var MARKS = {
    check: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path class="m1" d="M6.5 12.5 L10.5 16.5 L17.5 8.5"/></svg>',
    cross: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path class="m1" d="M7.5 7.5 L16.5 16.5"/><path class="m2" d="M16.5 7.5 L7.5 16.5"/></svg>',
  };

  function choiceLook(label, state) {
    var cls = ['choice'];
    var mark = null;
    if (state.correct === label) {
      cls.push('correct');
      mark = 'check';
    } else if (state.wrong === label) {
      cls.push('wrong');
      mark = 'cross';
    } else if (state.selected === label) {
      cls.push('selected');
      if (state.sealing) cls.push('sealing');
    } else if (state.correct || state.wrong) {
      cls.push('dim');
    }
    var aria = label + ' şıkkı' + (state.correct === label ? ', doğru cevap' : state.wrong === label ? ', senin cevabın, yanlış' : '');
    return { cls: cls, mark: mark, aria: aria, checked: state.selected === label || state.wrong === label };
  }

  function choicesHtml(choices, state) {
    state = state || {};
    var html = '<div class="choices" role="radiogroup" aria-label="Şıklar">';
    for (var i = 0; i < choices.length; i++) {
      var c = choices[i];
      var look = choiceLook(c.label, state);
      html +=
        '<button type="button" class="' + look.cls.join(' ') + '" style="--i:' + i + '" data-label="' + escapeHtml(c.label) +
        '" role="radio" aria-checked="' + (look.checked ? 'true' : 'false') + '" aria-label="' + escapeHtml(look.aria) + '"' +
        (state.disabled ? ' disabled' : '') + '><span class="letter">' + escapeHtml(c.label) + '</span><span class="ctext">' +
        renderMarkdown(c.text, true) + '</span>' + (look.mark ? MARKS[look.mark] : '') + '</button>';
    }
    return html + '</div>';
  }

  function rectOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }

  // Updates the existing buttons to a new state. Going from "not graded" to "graded" plays
  // the verdict once: a right pick floods green and pops, a wrong pick shakes and the right
  // row fills in after a beat (so the eye travels from your answer to the right one).
  function applyChoiceState(prev, state) {
    prev = prev || {};
    state = state || {};
    var buttons = content.querySelectorAll('.choice');
    var verdict = !(prev.correct || prev.wrong) && !!(state.correct || state.wrong);
    var focus = null;
    var kind = null;
    for (var i = 0; i < buttons.length; i++) {
      var el = buttons[i];
      var label = el.getAttribute('data-label');
      var look = choiceLook(label, state);
      if (verdict) {
        if (state.correct === label) {
          if (state.wrong) look.cls.push('v-reveal');
          else if (prev.selected === label) look.cls.push('v-correct');
          else look.cls.push('v-reveal');
        }
        if (state.wrong === label) look.cls.push('v-wrong');
      } else if (state.selected === label && prev.selected !== label && !state.correct) {
        look.cls.push('v-pick');
      }
      el.className = look.cls.join(' ');
      el.setAttribute('aria-checked', look.checked ? 'true' : 'false');
      el.setAttribute('aria-label', look.aria);
      el.disabled = !!state.disabled;
      var old = el.querySelector('.mark');
      if (old) old.remove();
      if (look.mark) el.insertAdjacentHTML('beforeend', MARKS[look.mark]);
      if (verdict && state.wrong === label) {
        focus = el;
        kind = 'wrong';
      } else if (verdict && state.correct === label && !focus) {
        focus = el;
        kind = state.wrong ? 'wrong' : prev.selected === label ? 'correct' : 'blank';
      }
    }
    if (focus) send({ type: 'verdict', kind: kind, label: focus.getAttribute('data-label'), rect: rectOf(focus) });
  }

  content.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== content && !(el.classList && el.classList.contains('choice'))) el = el.parentNode;
    if (!el || el === content || el.disabled) return;
    send({ type: 'choice', label: el.getAttribute('data-label') });
  });

  // ---- Typing -----------------------------------------------------------------------
  // New text appears word by word, like someone typing. Every word and every formula is a
  // "unit"; units already shown stay shown when the content grows (a streamed reply), so
  // only the new part types out.

  var shown = 0;
  var timer = null;
  var units = [];
  var blocks = [];
  // Index of the first unit inside each block (a block shows once that unit does).
  var blockFirst = [];
  var streaming = false;
  var announcedDone = false;
  var BLOCK_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, table, pre, hr, .katex-display, .choices';

  function collectUnits() {
    units = [];
    blocks = [];
    var walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (node.nodeType === 1) {
          // A formula, a choice list or a rule is one unit; don't look inside.
          if (node.classList.contains('katex') || node.classList.contains('choices') || node.tagName === 'HR') return NodeFilter.FILTER_ACCEPT;
          return NodeFilter.FILTER_SKIP;
        }
        return /\S/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    // A KaTeX node's descendants were not skipped by the walker; keep only the outer ones.
    nodes = nodes.filter(function (node) {
      var p = node.parentNode;
      while (p && p !== content) {
        if (p.classList && (p.classList.contains('katex') || p.classList.contains('choices'))) return false;
        p = p.parentNode;
      }
      return true;
    });
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.nodeType === 1) {
        units.push(node);
        continue;
      }
      // Split a text node into word spans (keeping the spaces with the words).
      var parts = node.nodeValue.match(/\s*\S+\s*/g) || [];
      var frag = document.createDocumentFragment();
      for (var j = 0; j < parts.length; j++) {
        var span = document.createElement('span');
        span.className = 'tw';
        span.textContent = parts[j];
        frag.appendChild(span);
        units.push(span);
      }
      node.parentNode.replaceChild(frag, node);
    }
    var all = content.querySelectorAll(BLOCK_SELECTOR);
    blockFirst = [];
    for (var k = 0; k < all.length; k++) {
      var first = -1;
      for (var u = 0; u < units.length; u++) {
        if (all[k] === units[u] || all[k].contains(units[u])) {
          first = u;
          break;
        }
      }
      blocks.push(all[k]);
      blockFirst.push(first);
    }
  }

  function setVisible(index) {
    for (var i = 0; i < units.length; i++) units[i].classList.toggle('tw-hidden', i >= index);
    for (var b = 0; b < blocks.length; b++) {
      blocks[b].classList.toggle('tw-hidden', blockFirst[b] >= index || blockFirst[b] < 0);
    }
    var caret = content.querySelector('.caret');
    if (caret) caret.remove();
    if (streaming || index < units.length) {
      caret = document.createElement('span');
      caret.className = 'caret';
      caret.setAttribute('aria-hidden', 'true');
      var host = index > 0 ? units[Math.min(index, units.length) - 1] : null;
      if (host && host.parentNode) host.parentNode.insertBefore(caret, host.nextSibling);
      else content.appendChild(caret);
    }
    postHeight();
  }

  function tick() {
    var left = units.length - shown;
    if (left <= 0) {
      clearInterval(timer);
      timer = null;
      setVisible(shown);
      if (!streaming && !announcedDone) {
        announcedDone = true;
        send({ type: 'typed' });
      }
      return;
    }
    // Catch up when far behind (a long reply arrived at once) without losing the effect.
    shown += Math.max(1, Math.ceil(left / 45));
    setVisible(shown);
  }

  function startTyping() {
    if (!timer) timer = setInterval(tick, 32);
  }

  // ---- Render -----------------------------------------------------------------------

  var lastContent = null;
  var lastState = null;

  window.__render = function (payload) {
    var vars = payload.vars || {};
    for (var key in vars) {
      document.documentElement.style.setProperty('--' + key, vars[key]);
    }
    document.body.classList.toggle('no-motion', payload.motion === false);
    var typing = payload.typing || null;
    var hasChoices = !!(payload.choices && payload.choices.length);
    // Same text and choices, only the choice state changed: update in place.
    var contentKey = JSON.stringify([payload.markdown, payload.choices || null]);
    if (!typing && hasChoices && contentKey === lastContent) {
      applyChoiceState(lastState, payload.choiceState);
      lastState = payload.choiceState || null;
      return;
    }
    lastContent = typing ? null : contentKey;
    lastState = payload.choiceState || null;
    var md = typing && typing.streaming ? completePrefix(payload.markdown || '') : payload.markdown;
    var html = renderMarkdown(md, false);
    if (hasChoices) html += choicesHtml(payload.choices, payload.choiceState);
    content.innerHTML = html;

    if (typing && typing.animate) {
      streaming = !!typing.streaming;
      if (streaming) announcedDone = false;
      collectUnits();
      shown = Math.min(shown, units.length);
      setVisible(shown);
      startTyping();
      // A finished reply with nothing left to type still reports that it is done.
      if (!streaming && shown >= units.length) tick();
    } else {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      units = [];
      blocks = [];
      blockFirst = [];
      postHeight();
    }
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
