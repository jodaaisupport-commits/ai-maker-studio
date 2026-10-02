/* ==========================================================================
   AI Maker Studio — shared script
   Small, dependency-free helpers that power the static demo:
     - theme toggle (persisted in localStorage)
     - mobile navigation
     - accessible tabs
     - card filters + search
     - range slider outputs
     - template "use" buttons that pre-fill builder forms
     - mock generators for every builder (no backend, everything is local)
   To add a new builder: create a page, add `data-builder="name"` to its form
   and register a renderer in the `renderers` object below.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Theme (runs immediately to avoid flashes) ---------- */
  var THEME_KEY = "ams-theme";
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) { /* storage unavailable */ }

  /* ---------- Small helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Build DOM safely (always uses textContent, never innerHTML for user input).
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val == null || val === false) return;
        if (key === "class") node.className = val;
        else if (key === "text") node.textContent = val;
        else if (key === "style") node.setAttribute("style", val);
        else node.setAttribute(key, val === true ? "" : val);
      });
    }
    (children || []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  function formValues(form) {
    var data = {};
    $$("input, select, textarea", form).forEach(function (field) {
      if (!field.name) return;
      if (field.type === "checkbox") {
        if (!data[field.name]) data[field.name] = [];
        if (field.checked) data[field.name].push(field.value);
      } else if (field.type === "radio") {
        if (field.checked) data[field.name] = field.value;
      } else {
        data[field.name] = field.value.trim();
      }
    });
    return data;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(message) {
    var node = $(".toast");
    if (!node) {
      node = el("div", { class: "toast", role: "status", "aria-live": "polite" });
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("is-visible"); }, 2400);
  }

  /* ---------- Theme toggle ---------- */
  function initTheme() {
    $$("[data-theme-toggle]").forEach(function (btn) {
      var update = function () {
        var light = root.getAttribute("data-theme") === "light";
        btn.textContent = light ? "🌙" : "☀️";
        btn.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      };
      update();
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
        update();
      });
    });
  }

  /* ---------- Mobile nav ---------- */
  function initNav() {
    $$("[data-nav-toggle]").forEach(function (btn) {
      var nav = document.getElementById(btn.getAttribute("aria-controls"));
      if (!nav) return;
      btn.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open ? "✕" : "☰";
      });
      $$("a", nav).forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("is-open");
          btn.setAttribute("aria-expanded", "false");
          btn.textContent = "☰";
        });
      });
    });
  }

  /* ---------- Tabs (WAI-ARIA pattern) ---------- */
  function initTabs() {
    $$(".tabs").forEach(function (tabs) {
      var tabList = $("[role='tablist']", tabs);
      if (!tabList) return;
      var tabButtons = $$("[role='tab']", tabList);

      function select(tab, focus) {
        tabButtons.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute("aria-selected", String(selected));
          t.tabIndex = selected ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !selected;
        });
        if (focus) tab.focus();
      }

      tabButtons.forEach(function (tab, i) {
        tab.addEventListener("click", function () { select(tab); });
        tab.addEventListener("keydown", function (e) {
          var idx = null;
          if (e.key === "ArrowRight") idx = (i + 1) % tabButtons.length;
          if (e.key === "ArrowLeft") idx = (i - 1 + tabButtons.length) % tabButtons.length;
          if (e.key === "Home") idx = 0;
          if (e.key === "End") idx = tabButtons.length - 1;
          if (idx !== null) { e.preventDefault(); select(tabButtons[idx], true); }
        });
      });

      var initial = tabButtons.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabButtons[0];
      if (initial) select(initial);
    });
  }

  function selectTabById(id) {
    var tab = document.getElementById(id);
    if (tab) tab.click();
  }

  /* ---------- Filters & search ---------- */
  function initFilters() {
    $$("[data-filter-group]").forEach(function (group) {
      var target = document.querySelector(group.getAttribute("data-filter-group"));
      if (!target) return;
      var searchInput = document.querySelector("[data-search-target='" + group.getAttribute("data-filter-group") + "']");
      var empty = target.getAttribute("data-empty") ? document.querySelector(target.getAttribute("data-empty")) : null;
      var chips = $$("[data-filter]", group);
      var active = "all";

      function apply() {
        var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        var visible = 0;
        $$("[data-category]", target).forEach(function (card) {
          var cats = card.getAttribute("data-category").split(" ");
          var matchCat = active === "all" || cats.indexOf(active) !== -1;
          var matchText = !query || card.textContent.toLowerCase().indexOf(query) !== -1;
          card.hidden = !(matchCat && matchText);
          if (!card.hidden) visible++;
        });
        if (empty) empty.hidden = visible !== 0;
      }

      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          active = chip.getAttribute("data-filter");
          chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
          apply();
        });
      });
      if (searchInput) searchInput.addEventListener("input", apply);
      apply();
    });
  }

  /* ---------- Range outputs ---------- */
  function initRanges() {
    $$("input[type='range']").forEach(function (range) {
      var out = document.querySelector("output[for='" + range.id + "']");
      if (!out) return;
      var suffix = range.getAttribute("data-suffix") || "";
      var update = function () { out.textContent = range.value + suffix; };
      range.addEventListener("input", update);
      update();
    });
  }

  /* ---------- Templates pre-fill forms ---------- */
  function initTemplates() {
    $$("[data-template]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var form = document.querySelector(btn.getAttribute("data-form") || "[data-builder]");
        var values;
        try { values = JSON.parse(btn.getAttribute("data-template")); } catch (e) { return; }
        if (!form || !values) return;
        Object.keys(values).forEach(function (name) {
          var value = values[name];
          $$("[name='" + name + "']", form).forEach(function (field) {
            if (field.type === "checkbox") field.checked = [].concat(value).indexOf(field.value) !== -1;
            else if (field.type === "radio") field.checked = field.value === value;
            else field.value = value;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
          });
        });
        var title = btn.closest("article") ? $("h3", btn.closest("article")) : null;
        toast("Template loaded: " + (title ? title.textContent : "custom"));
        var workspace = document.getElementById("workspace");
        if (workspace) workspace.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
      });
    });
  }

  /* ---------- Copy buttons ---------- */
  function initCopy() {
    $$("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var source = document.querySelector(btn.getAttribute("data-copy"));
        if (!source) return;
        var text = source.textContent;
        var done = function () { toast("Copied to clipboard ✓"); };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, function () { toast("Copy failed — select the text manually"); });
        } else {
          var area = el("textarea", { style: "position:fixed;opacity:0" });
          area.value = text;
          document.body.appendChild(area);
          area.select();
          try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed"); }
          document.body.removeChild(area);
        }
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      items.forEach(function (i) { i.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (i) { io.observe(i); });
  }

  /* ======================================================================
     Builder renderers — each receives (values, outputElement, form)
     ====================================================================== */
  var renderers = {};

  /* Chatbot ---------------------------------------------------------- */
  var chatReplies = {
    friendly: ["Great question! 😊 Here's what I found:", "Happy to help! Let me walk you through it.", "Sure thing — here's a quick answer:"],
    professional: ["Certainly. Here is the relevant information:", "Thank you for your question. In summary:", "Understood. The recommended approach is:"],
    playful: ["Ooh, fun one! 🎉 Check this out:", "Buckle up — answer incoming! 🚀", "Ta-da! ✨ Here you go:"],
    concise: ["Short answer:", "In brief:", "TL;DR:"]
  };

  function chatMessage(role, text, avatar) {
    return el("div", { class: "msg " + role }, [
      el("span", { class: "avatar", "aria-hidden": "true", text: avatar }),
      el("div", { class: "bubble", text: text })
    ]);
  }

  renderers.chatbot = function (v, out) {
    var name = v.botName || "Nova";
    var avatar = v.avatar || "🤖";
    var tone = v.tone || "friendly";
    var win = $("#chat-window") || out;
    clear(win);
    win.setAttribute("data-tone", tone);
    win.setAttribute("data-avatar", avatar);
    win.appendChild(chatMessage("bot", v.greeting || ("Hi! I'm " + name + ". How can I help you today?"), avatar));
    win.appendChild(chatMessage("user", "What can you do for me?", "🙂"));
    var skills = (v.skills && v.skills.length ? v.skills.join(", ") : "answering questions");
    win.appendChild(chatMessage("bot", chatReplies[tone][0] + " I'm a " + (v.role || "helpful assistant") + " and I'm great at " + skills + ".", avatar));
    var title = $("#chat-title");
    if (title) title.textContent = name;

    var code = $("#embed-code");
    if (code) {
      code.textContent =
        "<script src=\"https://cdn.example.com/ams-chat.js\"></script>\n" +
        "<script>\n  AMSChat.init({\n" +
        "    name: " + JSON.stringify(name) + ",\n" +
        "    avatar: " + JSON.stringify(avatar) + ",\n" +
        "    tone: " + JSON.stringify(tone) + ",\n" +
        "    model: " + JSON.stringify(v.model || "ams-chat-pro") + ",\n" +
        "    temperature: " + (Number(v.temperature || 70) / 100).toFixed(2) + ",\n" +
        "    skills: " + JSON.stringify(v.skills || []) + "\n  });\n</script>";
    }
  };

  function initChatInput() {
    var form = $("[data-chat-form]");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("input", form);
      var text = input.value.trim();
      if (!text) return;
      var win = $("#chat-window");
      var avatar = win.getAttribute("data-avatar") || "🤖";
      var tone = win.getAttribute("data-tone") || "friendly";
      win.appendChild(chatMessage("user", text, "🙂"));
      input.value = "";
      var typing = el("div", { class: "msg bot" }, [
        el("span", { class: "avatar", "aria-hidden": "true", text: avatar }),
        el("div", { class: "bubble" }, [el("span", { class: "typing", "aria-label": "Typing" }, [el("i"), el("i"), el("i")])])
      ]);
      win.appendChild(typing);
      win.scrollTop = win.scrollHeight;
      setTimeout(function () {
        win.removeChild(typing);
        var replies = chatReplies[tone] || chatReplies.friendly;
        var reply = replies[hash(text) % replies.length] + " This is a demo response to “" + text + "”. Connect a real model to make me smart!";
        win.appendChild(chatMessage("bot", reply, avatar));
        win.scrollTop = win.scrollHeight;
      }, 900);
    });
  }

  /* Image ------------------------------------------------------------ */
  var palettes = {
    photoreal: ["#0f172a", "#334155", "#f59e0b", "#fde68a"],
    anime: ["#f472b6", "#a78bfa", "#60a5fa", "#fef3c7"],
    "3d": ["#06b6d4", "#3b82f6", "#a855f7", "#e0f2fe"],
    watercolor: ["#fca5a5", "#fcd34d", "#86efac", "#bfdbfe"],
    cyberpunk: ["#0f0326", "#e11d48", "#22d3ee", "#facc15"],
    minimal: ["#f5f5f4", "#d6d3d1", "#78716c", "#1c1917"]
  };

  function artStyle(seed, palette) {
    var a = seed % 360;
    var p = palette;
    return "background:" +
      "radial-gradient(circle at " + (20 + seed % 60) + "% " + (20 + (seed >> 3) % 60) + "%, " + p[3] + " 0, transparent 35%)," +
      "radial-gradient(circle at " + (70 - seed % 40) + "% " + (80 - (seed >> 5) % 50) + "%, " + p[2] + " 0, transparent 45%)," +
      "conic-gradient(from " + a + "deg at 50% 60%, " + p[0] + ", " + p[1] + ", " + p[2] + ", " + p[0] + ");";
  }

  renderers.image = function (v, out) {
    var style = v.style || "photoreal";
    var palette = palettes[style] || palettes.photoreal;
    var count = Number(v.count || 4);
    var prompt = v.prompt || "A dreamy landscape";
    clear(out);
    out.setAttribute("data-ratio", v.ratio || "1:1");
    for (var i = 0; i < count; i++) {
      var seed = hash(prompt + style + i + (v.seed || ""));
      out.appendChild(el("figure", { class: "image-tile", style: "margin:0;animation-delay:" + (i * 0.08) + "s" }, [
        el("div", { class: "art", role: "img", "aria-label": "Generated preview " + (i + 1) + " for: " + prompt, style: artStyle(seed, palette) }),
        el("figcaption", { text: "#" + (i + 1) + " · " + style + " · seed " + (seed % 99999) })
      ]));
    }
  };

  /* Video ------------------------------------------------------------ */
  renderers.video = function (v) {
    var scenes = Math.max(2, Math.min(6, Number(v.scenes || 4)));
    var duration = Number(v.duration || 30);
    var title = $("#video-title");
    var sub = $("#video-sub");
    var time = $("#video-time");
    if (title) title.textContent = v.title || "Untitled video";
    if (sub) sub.textContent = (v.format || "16:9") + " · " + (v.vstyle || "cinematic") + " · " + duration + "s";
    if (time) time.textContent = "00:00 / 00:" + String(duration).padStart(2, "0");
    var stage = $("#video-stage");
    if (stage) {
      var fmt = v.format || "16:9";
      stage.style.aspectRatio = fmt.replace(":", " / ");
      stage.style.maxWidth = fmt === "9:16" ? "240px" : fmt === "1:1" ? "380px" : "";
      stage.style.marginInline = "auto";
    }

    var videoTrack = $("#track-video");
    var textTrack = $("#track-text");
    var audioTrack = $("#track-audio");
    [videoTrack, textTrack, audioTrack].forEach(function (t) { if (t) $$(".clip", t).forEach(function (c) { t.removeChild(c); }); });
    var lines = (v.script || "").split(/\n+/).filter(Boolean);
    for (var i = 0; i < scenes; i++) {
      var grow = 1 + (hash(String(i) + v.title) % 3);
      videoTrack.appendChild(el("div", { class: "clip" + (i % 2 ? " alt" : ""), style: "flex:" + grow + ";animation-delay:" + i * 0.07 + "s", text: "Scene " + (i + 1) }));
      textTrack.appendChild(el("div", { class: "clip alt", style: "flex:" + grow + ";opacity:.75", text: lines[i] || "Caption " + (i + 1) }));
    }
    audioTrack.appendChild(el("div", { class: "clip audio", style: "flex:1", text: "♪ " + (v.music || "Ambient") + (v.voiceover && v.voiceover.length ? " + voice-over" : "") }));
  };

  /* Agent ------------------------------------------------------------ */
  renderers.agent = function (v, out, form, done) {
    var log = $("#agent-log");
    var nodes = $$(".agent-node");
    clear(log);
    nodes.forEach(function (n) { n.classList.remove("is-active", "is-done"); });
    var tools = v.tools && v.tools.length ? v.tools : ["web-search"];
    var goal = v.goal || "Research the market";
    var steps = [
      { node: 0, cls: "", text: "🎯 Goal received: " + goal },
      { node: 1, cls: "", text: "🧠 Planning with " + (v.model || "ams-reasoner") + " — " + (v.autonomy || "3") + " max iterations" }
    ];
    tools.forEach(function (t) { steps.push({ node: 2, cls: "tool", text: "🛠 Calling tool: " + t }); });
    steps.push({ node: 3, cls: "", text: "🧾 Saving findings to " + (v.memory || "short-term") + " memory" });
    steps.push({ node: 4, cls: "ok", text: "✅ " + (v.agentName || "Agent") + " finished: report ready (" + tools.length + " tools used)" });

    var json = $("#agent-json");
    if (json) {
      json.textContent = JSON.stringify({
        name: v.agentName || "Agent",
        goal: goal,
        model: v.model || "ams-reasoner",
        tools: tools,
        memory: v.memory || "short-term",
        max_iterations: Number(v.autonomy || 5),
        guardrails: v.guardrails || []
      }, null, 2);
    }

    var i = 0;
    (function next() {
      if (i >= steps.length) { nodes.forEach(function (n) { n.classList.remove("is-active"); n.classList.add("is-done"); }); done(); return; }
      var s = steps[i++];
      nodes.forEach(function (n, idx) {
        n.classList.toggle("is-active", idx === s.node);
        if (idx < s.node) n.classList.add("is-done");
      });
      log.appendChild(el("li", { class: s.cls, text: s.text }));
      log.scrollTop = log.scrollHeight;
      setTimeout(next, prefersReducedMotion() ? 0 : 450);
    })();
  };
  renderers.agent.async = true;

  /* Prompt ----------------------------------------------------------- */
  renderers.prompt = function (v, out) {
    var parts = [];
    if (v.role) parts.push("# Role\nYou are " + v.role + ".");
    if (v.task) parts.push("# Task\n" + v.task);
    if (v.context) parts.push("# Context\n" + v.context);
    var rules = v.techniques || [];
    if (rules.indexOf("cot") !== -1) parts.push("# Reasoning\nThink step by step before answering.");
    if (rules.indexOf("examples") !== -1) parts.push("# Examples\nInput: {{example_input}}\nOutput: {{example_output}}");
    if (v.constraints) parts.push("# Constraints\n" + v.constraints);
    parts.push("# Output format\nRespond in " + (v.format || "Markdown") + ". Tone: " + (v.ptone || "neutral") + ".");
    if (rules.indexOf("selfcheck") !== -1) parts.push("Before finishing, verify your answer against the constraints.");
    var text = parts.join("\n\n");

    clear(out);
    // highlight {{variables}} safely
    text.split(/(\{\{[^}]+\}\})/g).forEach(function (chunk) {
      if (/^\{\{[^}]+\}\}$/.test(chunk)) out.appendChild(el("mark", { text: chunk }));
      else out.appendChild(document.createTextNode(chunk));
    });

    var tokens = Math.round(text.length / 4);
    var clarity = Math.min(98, 55 + (v.role ? 12 : 0) + (v.context ? 10 : 0) + (v.constraints ? 10 : 0) + rules.length * 4);
    var setScore = function (id, val) { var n = document.getElementById(id); if (n) n.textContent = val; };
    setScore("score-tokens", "~" + tokens);
    setScore("score-clarity", clarity + "%");
    setScore("score-vars", String((text.match(/\{\{[^}]+\}\}/g) || []).length));
    setScore("score-cost", "$" + (tokens * 0.000003).toFixed(5));
  };
  renderers.prompt.live = true;

  /* App -------------------------------------------------------------- */
  var appBlocks = {
    hero: function (n) { return el("div", { class: "phone-block hero-block", text: "Welcome to " + n }); },
    list: function () { return el("div", { class: "phone-block" }, [el("strong", { text: "Items" }), el("br"), "• First item  • Second item"]); },
    form: function () { return el("div", { class: "phone-block" }, [el("strong", { text: "Form" }), el("br"), "Name ▢  Email ▢"]); },
    chart: function () { return el("div", { class: "phone-block", text: "📊 Weekly stats ▁▃▅▇▅▃" }); },
    map: function () { return el("div", { class: "phone-block", text: "🗺 Map · 3 locations nearby" }); },
    chat: function () { return el("div", { class: "phone-block", text: "💬 AI assistant: How can I help?" }); },
    payments: function () { return el("div", { class: "phone-block", text: "💳 Checkout · Apple Pay / Card" }); },
    button: function () { return el("div", { class: "phone-block btn-block", text: "Get started" }); }
  };

  renderers.app = function (v) {
    var phone = $("#phone");
    if (!phone) return;
    phone.style.setProperty("--app-color", v.color || "#3b82f6");
    var bar = $("#phone-title");
    if (bar) bar.textContent = (v.appName || "My App");
    var body = $("#phone-body");
    clear(body);
    var comps = v.components && v.components.length ? v.components : ["hero"];
    comps.forEach(function (c, i) {
      if (appBlocks[c]) { var b = appBlocks[c](v.appName || "My App"); b.style.animationDelay = i * 0.05 + "s"; body.appendChild(b); }
    });
    body.appendChild(appBlocks.button());
    var list = $("#component-list");
    if (list) {
      clear(list);
      comps.forEach(function (c) { list.appendChild(el("li", {}, [el("span", { text: "▦ " + c }), el("span", { class: "badge", text: v.platform || "web" })])); });
    }
    var code = $("#app-code");
    if (code) {
      code.textContent = "// Generated by AI Maker Studio\nexport default function " + (v.appName || "MyApp").replace(/[^A-Za-z0-9]/g, "") + "() {\n  return (\n    <Screen theme=\"" + (v.color || "#3b82f6") + "\">\n" +
        comps.map(function (c) { return "      <" + c.charAt(0).toUpperCase() + c.slice(1) + " />"; }).join("\n") +
        "\n    </Screen>\n  );\n}";
    }
  };
  renderers.app.live = true;

  /* Workflow --------------------------------------------------------- */
  var flowMeta = {
    form: ["📝", "Form submitted", "Trigger · Typeform / Website"],
    email: ["📧", "New email received", "Trigger · Gmail / Outlook"],
    schedule: ["⏰", "Every day at 09:00", "Trigger · Schedule"],
    webhook: ["🪝", "Incoming webhook", "Trigger · HTTP POST"],
    summarize: ["🧠", "Summarize with AI", "AI · LLM step"],
    classify: ["🏷", "Classify & tag", "AI · Classifier"],
    translate: ["🌍", "Translate content", "AI · Translation"],
    extract: ["🔍", "Extract data", "AI · Structured output"],
    slack: ["💬", "Post to Slack", "Action · #team-channel"],
    sheet: ["📊", "Add row to sheet", "Action · Google Sheets"],
    crm: ["🤝", "Update CRM", "Action · HubSpot"],
    notify: ["🔔", "Send notification", "Action · Push / Email"]
  };

  renderers.workflow = function (v, out, form, done) {
    clear(out);
    var steps = [v.trigger || "form"].concat(v.aiSteps || [], v.actions || []);
    var nodes = [];
    steps.forEach(function (key, i) {
      var m = flowMeta[key];
      if (!m) return;
      if (i > 0) out.appendChild(el("div", { class: "flow-connector", "aria-hidden": "true" }));
      var node = el("div", { class: "flow-node" + (i === 0 ? " trigger" : ""), style: "animation-delay:" + i * 0.06 + "s" }, [
        el("span", { class: "emoji", "aria-hidden": "true", text: m[0] }),
        el("div", {}, [el("strong", { text: m[1] }), el("small", { text: m[2] })]),
        el("span", { class: "badge badge--muted", text: "queued" })
      ]);
      nodes.push(node);
      out.appendChild(node);
    });
    var name = $("#flow-name");
    if (name) name.textContent = v.flowName || "Untitled workflow";
    var i = 0;
    (function run() {
      if (i > 0) {
        var prev = nodes[i - 1];
        prev.classList.remove("is-running");
        var b = $(".badge", prev); b.className = "badge badge--success"; b.textContent = "done";
      }
      if (i >= nodes.length) { done(); return; }
      nodes[i].classList.add("is-running");
      var badge = $(".badge", nodes[i]); badge.className = "badge"; badge.textContent = "running";
      i++;
      setTimeout(run, prefersReducedMotion() ? 0 : 420);
    })();
  };
  renderers.workflow.async = true;
  renderers.workflow.initial = true;

  /* Voice ------------------------------------------------------------ */
  renderers.voice = function (v) {
    var wave = $("#waveform");
    if (wave) {
      clear(wave);
      var seed = hash((v.text || "") + (v.voice || ""));
      for (var i = 0; i < 48; i++) {
        var h = 15 + ((seed >> (i % 16)) + i * 37) % 85;
        wave.appendChild(el("span", { style: "height:" + h + "%;animation-delay:" + (i % 8) * 0.08 + "s" }));
      }
    }
    var transcript = $("#transcript");
    if (transcript) transcript.textContent = "“" + (v.text || "Hello from AI Maker Studio!") + "”";
    var meta = $("#voice-meta");
    var ssml = $("#ssml-code");
    if (ssml) {
      var pitch = Number(v.pitch || 100) - 100;
      ssml.textContent =
        "<speak>\n  <voice name=\"" + (v.voice || "Aria") + "\" xml:lang=\"" + (v.language || "en-US") + "\">\n" +
        "    <prosody rate=\"" + (v.speed || 100) + "%\" pitch=\"" + (pitch >= 0 ? "+" : "") + pitch + "%\">\n" +
        "      <express-as style=\"" + (v.emotion || "neutral") + "\">\n        " + (v.text || "") + "\n      </express-as>\n" +
        "    </prosody>\n  </voice>\n</speak>";
    }
    if (meta) meta.textContent = (v.voice || "Aria") + " · " + (v.language || "en-US") + " · " + (v.emotion || "neutral") + " · speed " + (Number(v.speed || 100) / 100).toFixed(2) + "x";
  };

  function initVoicePlayer() {
    var btn = $("[data-voice-play]");
    if (!btn) return;
    var wave = $("#waveform");
    var bar = $("#voice-progress");
    var timer;
    function stop() {
      clearInterval(timer);
      wave.classList.remove("is-playing");
      btn.textContent = "▶";
      btn.setAttribute("aria-label", "Play preview");
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }
    btn.addEventListener("click", function () {
      if (wave.classList.contains("is-playing")) { stop(); return; }
      var form = $("[data-builder='voice']");
      var v = formValues(form);
      wave.classList.add("is-playing");
      btn.textContent = "❚❚";
      btn.setAttribute("aria-label", "Stop preview");
      var pct = 0;
      bar.style.width = "0%";
      timer = setInterval(function () {
        pct += 2;
        bar.style.width = pct + "%";
        if (pct >= 100) stop();
      }, 80);
      // Use the browser's built-in speech synthesis when available (no backend needed).
      if ("speechSynthesis" in window && v.text) {
        var u = new SpeechSynthesisUtterance(v.text);
        u.lang = v.language || "en-US";
        u.rate = Number(v.speed || 100) / 100;
        u.pitch = Number(v.pitch || 100) / 100;
        u.onend = stop;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    });
  }

  function initVideoPlayer() {
    var btn = $(".video-stage .play");
    var time = $("#video-time");
    if (!btn || !time) return;
    var timer;
    btn.addEventListener("click", function () {
      if (timer) {
        clearInterval(timer); timer = null;
        btn.textContent = "▶"; btn.setAttribute("aria-label", "Play preview");
        return;
      }
      var total = parseInt(time.textContent.split("/")[1].split(":")[1], 10) || 30;
      var sec = 0;
      btn.textContent = "❚❚"; btn.setAttribute("aria-label", "Pause preview");
      timer = setInterval(function () {
        sec++;
        time.textContent = "00:" + String(sec).padStart(2, "0") + " / 00:" + String(total).padStart(2, "0");
        if (sec >= total) { clearInterval(timer); timer = null; btn.textContent = "▶"; btn.setAttribute("aria-label", "Play preview"); }
      }, 120);
    });
  }

  /* ---------- Generic builder form handling ---------- */
  function initBuilders() {
    $$("form[data-builder]").forEach(function (form) {
      var type = form.getAttribute("data-builder");
      var render = renderers[type];
      if (!render) return;
      var out = document.querySelector(form.getAttribute("data-output") || "#output");
      var progress = $("[data-progress]");
      var status = $("[data-status]");
      var statusText = status ? $(".status-text", status) : null;
      var submit = $("button[type='submit']", form);
      var originalLabel = submit ? submit.textContent : "";

      function finish() {
        if (submit) { submit.disabled = false; submit.textContent = originalLabel; }
        if (status) status.classList.remove("is-generating");
        if (statusText) statusText.textContent = "Ready · generated " + new Date().toLocaleTimeString();
        if (progress) progress.style.width = "100%";
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var values = formValues(form);
        if (submit) { submit.disabled = true; submit.textContent = "Generating…"; }
        if (status) status.classList.add("is-generating");
        if (statusText) statusText.textContent = "Generating with AI…";
        var resultTab = form.getAttribute("data-result-tab");
        if (resultTab) selectTabById(resultTab);
        var pct = 0;
        if (progress) progress.style.width = "0%";
        var delay = prefersReducedMotion() ? 0 : 1200;
        var tick = setInterval(function () {
          pct = Math.min(90, pct + 9);
          if (progress) progress.style.width = pct + "%";
        }, 110);
        setTimeout(function () {
          clearInterval(tick);
          if (render.async) {
            render(values, out, form, finish);
          } else {
            render(values, out, form);
            finish();
          }
        }, delay);
      });

      if (render.live) {
        form.addEventListener("input", function () { render(formValues(form), out, form); });
        form.addEventListener("change", function () { render(formValues(form), out, form); });
      }

      form.addEventListener("reset", function () {
        if (render.async && !render.initial) return;
        setTimeout(function () { render(formValues(form), out, form, function () {}); }, 0);
      });

      // initial render so the preview is never empty
      if (!render.async || render.initial) render(formValues(form), out, form, function () {});
    });
  }

  /* ---------- Misc ---------- */
  function initYear() {
    $$("[data-year]").forEach(function (n) { n.textContent = String(new Date().getFullYear()); });
  }

  function init() {
    initTheme();
    initNav();
    initTabs();
    initFilters();
    initRanges();
    initTemplates();
    initCopy();
    initReveal();
    initBuilders();
    initChatInput();
    initVoicePlayer();
    initVideoPlayer();
    initYear();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
