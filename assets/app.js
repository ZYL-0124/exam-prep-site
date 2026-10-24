/* =========================================================
 *  app.js —— 界面与交互逻辑
 *  依赖：seed.js（示例题库）、store.js（数据层）
 * ========================================================= */
(function () {
  "use strict";

  /* ---------------- 常量 ---------------- */
  var TYPE = {
    single:   { label: "单选题", choice: true,  multi: false },
    multiple: { label: "多选题", choice: true,  multi: true },
    judge:    { label: "判断题", choice: true,  multi: false, fixed: ["正确", "错误"] },
    fill:     { label: "填空题", choice: false },
    short:    { label: "简答题", choice: false }
  };
  var DIFF = { 1: "★", 2: "★★", 3: "★★★", 4: "★★★★", 5: "★★★★★" };

  var PAGE_TITLE = {
    dashboard: "概览", bank: "题库管理", practice: "开始练习",
    wrong: "错题本", favorites: "收藏夹", exam: "模拟考试",
    stats: "成绩统计", history: "练习记录", data: "数据备份", recite: "背题模式"
  };

  /* ---------------- 工具 ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var m = Math.floor(s / 60), ss = s % 60;
    return m + ":" + (ss < 10 ? "0" : "") + ss;
  }
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
  }

  /* ---------------- 弹窗 ---------------- */
  function openModal(html) {
    $("#modal").innerHTML = html;
    $("#modalMask").hidden = false;
  }
  function closeModal() { $("#modalMask").hidden = true; $("#modal").innerHTML = ""; }

  /* ---------------- 导航 ---------------- */
  var current = "dashboard";
  var session = null; // 当前答题会话

  function navigate(sec) {
    current = sec; session = null;
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.dataset.section === sec);
    });
    $("#pageTitle").textContent = PAGE_TITLE[sec] || "";
    $("#topActions").innerHTML = "";
    var c = $("#content");
    c.scrollTop = 0;
    if (sec === "dashboard") renderDashboard();
    else if (sec === "bank") renderBank();
    else if (sec === "practice") renderPracticeConfig();
    else if (sec === "wrong") renderWrong();
    else if (sec === "exam") renderExamConfig();
    else if (sec === "stats") renderStats();
    else if (sec === "history") renderHistory();
    else if (sec === "favorites") renderFavorites();
    else if (sec === "recite") renderReciteConfig();
    else if (sec === "data") renderData();
  }

  /* =====================================================
   *  概览页
   * ===================================================== */
  function renderDashboard() {
    var st = Store.stats();
    var resume = Store.getResume();
    var resumeKeys = Object.keys(resume);
    var practicedDistinct = Object.keys(Store.getQStats()).length;
    var progressPct = st.totalQuestions ? Math.round(practicedDistinct / st.totalQuestions * 100) : 0;

    var hero = '';
    if (resumeKeys.length) {
      var r = resume[resumeKeys[0]];
      hero = '<div class="hero"><div><h2>继续上次的练习</h2><p>' +
        esc((r.subject || "全部科目") + (r.knowledge ? " · " + r.knowledge : "")) +
        ' · 上次做到第 ' + (r.index + 1) + ' 题</p></div>' +
        '<div class="hero-actions"><button class="btn btn-primary" data-action="resume-practice" data-key="' +
        esc(resumeKeys[0]) + '">继续练习</button>' +
        '<button class="btn" data-action="clear-resume">清除进度</button></div></div>';
    } else {
      hero = '<div class="hero"><div><h2>欢迎使用考前刷题</h2><p>先去「题库管理」录入题目，或直接开始练习 / 背题。</p></div>' +
        '<div class="hero-actions"><button class="btn btn-primary" data-action="go-practice">开始练习</button>' +
        '<button class="btn" data-action="go-recite">背题</button>' +
        '<button class="btn" data-action="go-bank">录入题目</button></div></div>';
    }

    var html = hero +
      '<div class="stat-grid">' +
        statCard("题库题目", st.totalQuestions, "涵盖 " + Object.keys(st.bySubject).length + " 个科目", "M12 6.5C10.5 5 8 5 6.5 6.5S5 10.5 6.5 12 10.5 19 12 19s5.5-5.5 5.5-7S13.5 5 12 6.5z", "book") +
        statCard("练习次数", st.totalAttempts, "累计答题", "M9 11l3 3L22 4", "pen") +
        statCard("总体正确率", st.accuracy + "%", "基于全部作答", "M20 6L9 17l-5-5", "check") +
        statCard("错题数量", st.wrongCount, "待巩固", "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "warn") +
      '</div>' +
      '<div class="grid-2">' +
        '<div class="card">' +
          '<div class="card-title"><span class="ic">📈</span>学习进度</div>' +
          '<div class="mini-row"><div><div class="mr-main">已练习题目</div><div class="mr-sub">' +
            practicedDistinct + ' / ' + st.totalQuestions + ' 题</div></div>' +
            '<div class="progress-bar"><i style="width:' + progressPct + '%"></i></div>' +
            '<div style="font-weight:700;color:var(--primary)">' + progressPct + '%</div></div>' +
          '<div class="mini-row"><div><div class="mr-main">模拟考试</div><div class="mr-sub">已完成 ' + st.examCount + ' 场</div></div>' +
            '<button class="btn btn-sm" data-action="go-exam">去考试</button></div>' +
          '<div class="mini-row" style="background:transparent;padding:6px 0"><span class="mr-sub">建议：每天刷 20 题，错题反复练，考前做 2~3 套模拟卷。</span></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-title"><span class="ic">📚</span>各科目题量</div>' +
          subjectList(st.bySubject) +
        '</div>' +
      '</div>' +
      recentPracticeHtml();
    $("#content").innerHTML = html;
  }
  function recentPracticeHtml() {
    var logs = Store.getPracticeLogs().map(function (l) { return { type: "practice", raw: l }; });
    var exams = Store.getExams().map(function (e) { return { type: "exam", raw: e }; });
    var all = logs.concat(exams).sort(function (a, b) { return b.raw.date - a.raw.date; }).slice(0, 4);
    if (!all.length) {
      return '<div class="card" style="margin-top:18px"><div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3.5" y1="6" x2="3.51" y2="6"/><line x1="3.5" y1="12" x2="3.51" y2="12"/><line x1="3.5" y1="18" x2="3.51" y2="18"/></svg></span>最近练习</div>' +
        '<div class="row-empty">还没有练习记录，去「开始练习」做一组题吧</div></div>';
    }
    var rows = all.map(function (it) {
      var r = it.raw;
      var pct = r.total ? Math.round(r.correct / r.total * 100) : 0;
      var d = new Date(r.date);
      var ds = (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
      return '<div class="mini-row" data-action="view-log" data-type="' + it.type + '" data-id="' + esc(r.id) + '" style="cursor:pointer">' +
        '<div><div class="mr-main" style="font-size:13px">' + esc(r.title) + '</div>' +
        '<div class="mr-sub">' + ds + ' · ' + (it.type === "exam" ? "模拟考试" : "练习") + ' · ' + r.correct + '/' + r.total + ' 题 · 用时 ' + fmtTime((r.duration || 0) * 1000) + '</div></div>' +
        '<span class="pill ' + (pct >= 60 ? "pill-green" : "pill-red") + '">' + pct + '%</span></div>';
    }).join("");
    return '<div class="card" style="margin-top:18px"><div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3.5" y1="6" x2="3.51" y2="6"/><line x1="3.5" y1="12" x2="3.51" y2="12"/><line x1="3.5" y1="18" x2="3.51" y2="18"/></svg></span>最近练习' +
      '<a class="link-btn" data-action="go-history" style="margin-left:auto;font-size:13px;color:var(--primary);font-weight:600;cursor:pointer">查看全部 →</a></div>' +
      '<div class="mini-list">' + rows + '</div></div>';
  }
  function statCard(lab, val, sub, path, kind) {
    return '<div class="card stat"><svg class="stat-ic" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"></path></svg>' +
      '<div class="stat-val">' + esc(val) + '</div><div class="stat-lab">' + esc(lab) + '</div><div class="stat-sub">' + esc(sub) + '</div></div>';
  }
  function subjectList(bySubject) {
    var keys = Object.keys(bySubject);
    if (!keys.length) return '<div class="row-empty">还没有题目，快去录入吧</div>';
    return '<div class="mini-list">' + keys.map(function (k) {
      var s = bySubject[k];
      var acc = s.attempts ? Math.round(s.corrects / s.attempts * 100) : 0;
      return '<div class="mini-row"><div><div class="mr-main">' + esc(k) + '</div>' +
        '<div class="mr-sub">' + s.total + ' 题 · 正确率 ' + acc + '%</div></div>' +
        '<button class="btn btn-sm" data-action="go-practice-sub" data-sub="' + esc(k) + '">练习</button></div>';
    }).join("") + '</div>';
  }

  /* =====================================================
   *  题库管理
   * ===================================================== */
  var bankFilter = { subject: "", knowledge: "", type: "", keyword: "" };

  function renderBank() {
    var subs = Store.getSubjects();
    var know = Store.getKnowledges(bankFilter.subject);

    var filterHtml =
      '<div class="filter-bar">' +
        '<div class="fg"><label class="lbl">科目</label><select class="field" id="fSubject">' +
          '<option value="">全部</option>' + subs.map(function (s) {
            return '<option value="' + esc(s) + '"' + (bankFilter.subject === s ? " selected" : "") + '>' + esc(s) + '</option>';
          }).join("") + '</select></div>' +
        '<div class="fg"><label class="lbl">知识点</label><select class="field" id="fKnowledge">' +
          '<option value="">全部</option>' + know.map(function (k) {
            return '<option value="' + esc(k) + '"' + (bankFilter.knowledge === k ? " selected" : "") + '>' + esc(k) + '</option>';
          }).join("") + '</select></div>' +
        '<div class="fg"><label class="lbl">题型</label><select class="field" id="fType">' +
          '<option value="">全部</option>' + Object.keys(TYPE).map(function (t) {
            return '<option value="' + t + '"' + (bankFilter.type === t ? " selected" : "") + '>' + TYPE[t].label + '</option>';
          }).join("") + '</select></div>' +
        '<div class="fg"><label class="lbl">搜索</label><input class="field" id="fKeyword" placeholder="题干/解析关键词" value="' + esc(bankFilter.keyword) + '"></div>' +
        '<button class="btn btn-primary" data-action="add-question">+ 新增题目</button>' +
      '</div>';

    // 表格单独放在 #bankList 里，搜索时只刷这一块，输入框本身不动
    $("#content").innerHTML = filterHtml + '<div id="bankList"></div>';

    // 绑定筛选（下拉变更需要重建，因为知识点选项要跟着科目变）
    $("#fSubject").onchange = function () { bankFilter.subject = this.value; bankFilter.knowledge = ""; renderBank(); };
    $("#fKnowledge").onchange = function () { bankFilter.knowledge = this.value; renderBank(); };
    $("#fType").onchange = function () { bankFilter.type = this.value; renderBank(); };

    // 搜索框：实时检索。始终记录输入值并轻量防抖渲染，不依赖 isComposing 硬中断
    // （部分中文输入法上屏时的 input 事件 isComposing 仍为 true，硬 return 会导致“输入不搜、删除才搜”）
    var kw = $("#fKeyword");
    var kwTimer = null;
    kw.oninput = function () {
      bankFilter.keyword = kw.value.trim();
      clearTimeout(kwTimer);
      kwTimer = setTimeout(renderBankList, 60);
    };
    kw.oncompositionend = function () {  // 组词结束立即渲染，避开防抖等待，保证中文实时
      clearTimeout(kwTimer);
      bankFilter.keyword = kw.value.trim();
      renderBankList();
    };

    renderBankList();
  }

  function renderBankList() {
    var list = Store.filterQuestions(bankFilter);
    var rows = list.map(function (q) {
      var t = TYPE[q.type];
      return '<tr>' +
        '<td><div class="q-content">' + esc(q.content) + '</div>' +
          '<div class="q-meta">' +
            '<span class="pill pill-blue">' + esc(q.subject) + '</span>' +
            '<span class="pill pill-gray">' + esc(q.knowledge) + '</span>' +
            '<span class="pill pill-gray">' + t.label + '</span>' +
            '<span class="pill pill-warn">' + (DIFF[q.difficulty] || "") + '</span>' +
          '</div></td>' +
        '<td style="white-space:nowrap">' + (Store.isWrong(q.id) ? '<span class="pill pill-red">错题</span>' : '<span class="pill pill-green">已掌握</span>') + '</td>' +
        '<td style="white-space:nowrap"><div class="q-actions">' +
          '<button class="btn btn-sm ' + (Store.isFavorite(q.id) ? "btn-primary" : "btn-ghost") + '" data-action="toggle-fav" data-id="' + q.id + '">' + (Store.isFavorite(q.id) ? "已收藏" : "收藏") + '</button>' +
          '<button class="btn btn-sm btn-ghost" data-action="edit-question" data-id="' + q.id + '">编辑</button>' +
          '<button class="btn btn-sm btn-danger" data-action="delete-question" data-id="' + q.id + '">删除</button>' +
        '</div></td>' +
      '</tr>';
    }).join("");

    var table = '<div class="card"><div style="margin-bottom:12px;color:var(--sub);font-size:13px">共 ' + list.length + ' 道题</div>' +
      (list.length ? '<table class="q-table"><thead><tr><th>题目</th><th>状态</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<div class="row-empty">没有符合条件的题目</div>') + '</div>';

    var box = $("#bankList");
    if (box) box.innerHTML = table;
  }

  /* ---------------- 题目表单弹窗 ---------------- */
  var formState = null; // 暂存表单（切换题型时保留已输入内容）

  function openQuestionForm(q) {
    formState = q ? JSON.parse(JSON.stringify(q)) : {
      subject: "", knowledge: "", type: "single", difficulty: 2,
      content: "", options: ["", ""], answer: 0, explanation: ""
    };
    openModal("");
    $("#modal").innerHTML = questionFormHTML();
    bindQuestionForm();
  }

  function questionFormHTML() {
    var f = formState;
    var subs = Store.getSubjects();
    var datalist = subs.length ? '<datalist id="subList">' + subs.map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + '</datalist>' : "";
    return '' +
      '<div class="modal-head"><h3>' + (f.id ? "编辑题目" : "新增题目") + '</h3>' +
        '<button class="modal-close" data-action="close-modal">×</button></div>' +
      '<div class="modal-body">' +
        datalist +
        '<div class="form-grid">' +
          '<div><label class="lbl">科目</label><input class="field" id="fSubj" list="subList" value="' + esc(f.subject) + '" placeholder="如：数学"></div>' +
          '<div><label class="lbl">知识点</label><input class="field" id="fKnow" value="' + esc(f.knowledge) + '" placeholder="如：函数"></div>' +
          '<div><label class="lbl">题型</label><select class="field" id="fType2">' + Object.keys(TYPE).map(function (t) {
            return '<option value="' + t + '"' + (f.type === t ? " selected" : "") + '>' + TYPE[t].label + '</option>';
          }).join("") + '</select></div>' +
          '<div><label class="lbl">难度</label><select class="field" id="fDiff">' + [1,2,3,4,5].map(function (d) {
            return '<option value="' + d + '"' + (f.difficulty == d ? " selected" : "") + '>' + DIFF[d] + '</option>';
          }).join("") + '</select></div>' +
          '<div class="full"><label class="lbl">题干</label><textarea class="field" id="fContent" placeholder="请输入题目内容">' + esc(f.content) + '</textarea></div>' +
          '<div class="full" id="optWrap"></div>' +
          '<div class="full" id="ansWrap"></div>' +
          '<div class="full"><label class="lbl">解析（答题后展示）</label><textarea class="field" id="fExp" placeholder="选填，用于巩固知识点">' + esc(f.explanation) + '</textarea></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-action="close-modal">取消</button>' +
        '<button class="btn btn-primary" data-action="save-question">保存</button></div>';
  }

  function renderOptAndAns() {
    var f = formState, t = TYPE[f.type];
    var optWrap = $("#optWrap"), ansWrap = $("#ansWrap");
    if (t.choice) {
      var opts = t.fixed ? t.fixed.slice() : (f.options || ["", ""]);
      if (t.fixed) f.options = opts;
      var optHtml = '<label class="lbl">' + (t.multi ? "选项（可多选正确答案）" : "选项（点击圆圈设为正确答案）") + '</label>' +
        '<div class="opt-editor" id="optEditor">' +
        opts.map(function (o, i) {
          var mark = t.multi
            ? '<input type="checkbox" class="opt-correct" data-i="' + i + '"' + (Array.isArray(f.answer) && f.answer.indexOf(i) >= 0 ? " checked" : "") + '>'
            : '<input type="radio" name="optCorrect" class="opt-correct" data-i="' + i + '"' + (f.answer === i ? " checked" : "") + '>';
          var input = t.fixed ? '<div class="field" style="padding:8px 12px;background:#FBFDFE">' + esc(o) + '</div>'
            : '<input class="field opt-text" data-i="' + i + '" value="' + esc(o) + '">';
          var del = t.fixed ? '' : '<button class="opt-del" data-action="opt-del" data-i="' + i + '" title="删除">×</button>';
          return '<div class="opt-line">' + mark + '<span class="opt-key">' + String.fromCharCode(65 + i) + '</span>' + input + del + '</div>';
        }).join("") +
        (t.fixed ? '' : '<button class="btn btn-sm btn-ghost" data-action="opt-add" style="align-self:flex-start">+ 添加选项</button>') +
        '</div>';
      optWrap.innerHTML = optHtml; optWrap.style.display = "";
      ansWrap.innerHTML = ""; ansWrap.style.display = "none";
    } else {
      optWrap.innerHTML = ""; optWrap.style.display = "none";
      var ansVal = typeof f.answer === "string" ? f.answer : "";
      ansWrap.innerHTML = '<label class="lbl">' + (f.type === "fill" ? "参考答案（填空，判分时忽略大小写与首尾空格）" : "参考答案 / 评分要点") + '</label>' +
        '<textarea class="field" id="fAnswerText" placeholder="请输入参考答案">' + esc(ansVal) + '</textarea>';
      ansWrap.style.display = "";
    }
  }

  function bindQuestionForm() {
    renderOptAndAns();
    $("#fType2").onchange = function () {
      // 切换题型时保留已输入内容
      syncFormToState();
      var t = TYPE[formState.type = this.value];
      if (t.choice) {
        if (!formState.options || (!t.fixed && formState.options.length < 2)) formState.options = ["", ""];
        if (t.multi) formState.answer = []; else formState.answer = 0;
      } else {
        formState.answer = "";
      }
      renderOptAndAns();
    };
    // 选项文本 / 答案 输入：用事件委托
    $("#optWrap").oninput = function (e) {
      if (e.target.classList.contains("opt-text")) {
        var i = +e.target.dataset.i; formState.options[i] = e.target.value;
      }
    };
  }

  function syncFormToState() {
    var f = formState;
    f.subject = $("#fSubj").value.trim();
    f.knowledge = $("#fKnow").value.trim();
    f.content = $("#fContent").value.trim();
    f.difficulty = +$("#fDiff").value;
    f.explanation = $("#fExp").value.trim();
    if (!TYPE[f.type].choice) f.answer = $("#fAnswerText").value.trim();
  }

  function saveQuestion() {
    syncFormToState();
    var f = formState, t = TYPE[f.type];
    if (!f.subject) { toast("请填写科目"); return; }
    if (!f.knowledge) { toast("请填写知识点"); return; }
    if (!f.content) { toast("请填写题干"); return; }
    if (t.choice) {
      if (!t.fixed) {
        f.options = (f.options || []).map(function (o) { return o.trim(); }).filter(function (o) { return o; });
        if (f.options.length < 2) { toast("选项至少需要 2 个"); return; }
      }
      if (t.multi) {
        if (!Array.isArray(f.answer) || !f.answer.length) { toast("请至少选择一个正确答案"); return; }
      } else {
        if (f.answer === "" || f.answer == null) { toast("请选择正确答案"); return; }
        f.answer = +f.answer;
      }
    } else {
      if (!f.answer) { toast("请填写参考答案"); return; }
    }
    if (f.id) { Store.updateQuestion(f.id, f); toast("已保存"); }
    else { Store.addQuestion(f); toast("已添加"); }
    closeModal(); renderBank();
  }

  /* =====================================================
   *  练习 / 考试 通用答题引擎
   * ===================================================== */
  function startSession(cfg) {
    // cfg: {questions, mode:'practice'|'exam', title, timeLimit(秒,仅exam), examCfg}
    session = {
      questions: cfg.questions,
      index: 0,
      mode: cfg.mode,
      title: cfg.title,
      answers: {},     // qid -> 用户答案
      results: {},     // qid -> {correct, answerText, userText}
      startTime: Date.now(),
      timeLimit: cfg.timeLimit || 0,
      remain: cfg.timeLimit || 0,
      timer: null,
      examCfg: cfg.examCfg || null,
      revealed: {}        // 背题模式：qid -> 是否已揭晓答案
    };
    if (session.mode === "exam" && session.timeLimit) {
      session.timer = setInterval(function () {
        session.remain--;
        var tEl = $("#quizTimer"); if (tEl) tEl.textContent = "剩余 " + fmtTime(session.remain * 1000);
        if (session.remain <= 0) { clearInterval(session.timer); finishSession(); }
      }, 1000);
    }
    renderQuiz();
  }

  function curQ() { return session.questions[session.index]; }

  function grade(q, ans) {
    var t = TYPE[q.type];
    var correct = false, answerText = "", userText = "";
    if (q.type === "single" || q.type === "judge") {
      correct = (ans === q.answer);
      answerText = q.options[q.answer];
      userText = (ans == null || ans < 0) ? "（未作答）" : q.options[ans];
    } else if (q.type === "multiple") {
      var a = (q.answer || []).slice().sort(), b = (ans || []).slice().sort();
      correct = a.length === b.length && a.every(function (v, i) { return v === b[i]; });
      answerText = q.answer.map(function (i) { return String.fromCharCode(65 + i) + ". " + q.options[i]; }).join("；");
      userText = (ans && ans.length) ? ans.map(function (i) { return String.fromCharCode(65 + i) + ". " + q.options[i]; }).join("；") : "（未作答）";
    } else if (q.type === "fill") {
      var norm = function (s) { return String(s == null ? "" : s).trim().toLowerCase(); };
      correct = norm(ans) === norm(q.answer);
      answerText = q.answer; userText = ans || "（未作答）";
    } else if (q.type === "short") {
      // 简答题由用户自评，ans 为 {text, rate}
      answerText = q.answer; userText = (ans && ans.text) || "（未作答）";
      correct = ans && ans.rate === "full";
    }
    return { correct: correct, answerText: answerText, userText: userText };
  }

  function renderQuiz() {
    var q = curQ();
    var t = TYPE[q.type];
    var total = session.questions.length;
    var idx = session.index + 1;
    var saved = session.answers[q.id];
    var res = session.results[q.id];

    var favOn = Store.isFavorite(q.id);
    var head = '<div class="quiz-head">' +
      '<div class="quiz-progress">第 ' + idx + ' / ' + total + ' 题' +
        (session.mode === "practice" ? ' · ' + esc(session.title) : '') + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px">' +
      (session.mode === "exam" && session.timeLimit ? '<div class="timer" id="quizTimer">剩余 ' + fmtTime(session.remain * 1000) + '</div>' : '') +
      '<button class="fav-btn ' + (favOn ? "on" : "") + '" data-action="toggle-fav" data-id="' + q.id + '" title="收藏本题">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="' + (favOn ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>' +
      '</button></div>' +
      '</div>';

    var tags = '<div class="q-tag-row">' +
      '<span class="pill pill-blue">' + esc(q.subject) + '</span>' +
      '<span class="pill pill-gray">' + esc(q.knowledge) + '</span>' +
      '<span class="pill pill-gray">' + t.label + '</span>' +
      '<span class="pill pill-warn">' + (DIFF[q.difficulty] || "") + '</span>' +
      (Store.isWrong(q.id) ? '<span class="pill pill-red">我的错题</span>' : '') +
      '</div>';

    var body = '<div class="q-text">' + (session.mode === "exam" ? idx + ". " : "") + esc(q.content) + '</div>';

    // 选项 / 填空 / 简答
    var inputArea = "";
    if (t.choice) {
      var opts = q.options;
      var sel = saved != null ? (Array.isArray(saved) ? saved : [saved]) : [];
      inputArea = '<div class="options" id="optList">' + opts.map(function (o, i) {
        var cls = "option";
        var mark = String.fromCharCode(65 + i);
        if (res) { // 已判分（练习模式回看）
          if (Array.isArray(q.answer) ? q.answer.indexOf(i) >= 0 : q.answer === i) cls += " correct";
          if (sel.indexOf(i) >= 0 && !res.correct && (Array.isArray(q.answer) ? q.answer.indexOf(i) < 0 : q.answer !== i)) cls += " wrong";
          mark = (Array.isArray(q.answer) ? q.answer.indexOf(i) >= 0 : q.answer === i) ? "✓" : (sel.indexOf(i) >= 0 ? "✕" : mark);
        } else if (sel.indexOf(i) >= 0) { cls += " sel"; }
        return '<div class="' + cls + '" data-action="quiz-option" data-i="' + i + '"><span class="opt-mark">' + mark + '</span><span>' + esc(o) + '</span></div>';
      }).join("") + '</div>';
    } else if (q.type === "fill") {
      inputArea = '<div class="answer-area"><input class="field fill-input" id="fillInput" placeholder="输入答案" value="' + esc(saved || "") + '"' + (res ? " disabled" : "") + '></div>';
    } else if (q.type === "short") {
      var sv = saved && typeof saved === "object" ? saved.text : "";
      inputArea = '<div class="answer-area"><textarea class="field" id="shortInput" placeholder="输入你的作答" ' + (res ? "disabled" : "") + '>' + esc(sv) + '</textarea></div>';
    }

    // 反馈区（练习模式且已作答）
    var fb = "";
    if (res) {
      fb = '<div class="feedback show ' + (res.correct ? "ok" : "no") + '">' +
        '<div class="fb-title">' + (res.correct ? "✓ 回答正确" : "✕ 回答错误") + '</div>' +
        '<div class="fb-ans">你的答案：' + esc(res.userText) + '</div>' +
        '<div class="fb-ans">正确答案：' + esc(res.answerText) + '</div>' +
        (q.explanation ? '<div class="fb-exp">💡 ' + esc(q.explanation) + '</div>' : '') +
        (q.type === "short" && !res.correct ? '<div class="fb-exp">评分要点：' + esc(q.answer) + '</div>' : '') +
        '</div>';
      if (q.type === "short" && !res.correct) {
        fb += '<div class="self-rate"><span style="color:var(--sub);font-size:13px;align-self:center">请自评：</span>' +
          '<button class="btn btn-sm" data-action="self-rate" data-v="full">完全正确</button>' +
          '<button class="btn btn-sm btn-ghost" data-action="self-rate" data-v="partial">部分正确</button>' +
          '<button class="btn btn-sm btn-danger" data-action="self-rate" data-v="wrong">答错</button></div>';
      }
    }

    // 底部按钮
    var foot = '<div class="quiz-foot">';
    foot += '<button class="btn btn-ghost" data-action="quiz-exit">退出</button>';
    if (session.mode === "exam" && session.index > 0 && !res) {
      foot += '<button class="btn btn-ghost" data-action="quiz-prev">← 上一题</button>';
    }
    if (res) {
      if (session.index > 0 && session.mode === "exam") foot += '<button class="btn btn-ghost" data-action="quiz-prev">← 上一题</button>';
      foot += (session.index < total - 1)
        ? '<button class="btn btn-primary" data-action="quiz-next">下一题 →</button>'
        : '<button class="btn btn-primary" data-action="quiz-finish">查看结果</button>';
    } else {
      foot += '<button class="btn btn-primary" data-action="quiz-submit"' + (session.mode === "exam" ? ' data-quiet="1"' : '') + '>提交答案</button>';
    }
    foot += '</div>';

    $("#content").innerHTML = '<div class="quiz-wrap"><div class="card question-card">' + head + tags + body + inputArea + fb + foot + '</div></div>';
  }

  function quizSubmit() {
    var q = curQ(), t = TYPE[q.type];
    var ans, valid = true;
    if (t.choice) {
      if (t.multi) {
        ans = [];
        document.querySelectorAll('#optList .option.sel').forEach(function (el) { ans.push(+el.dataset.i); });
        if (!ans.length) valid = false;
      } else {
        var sel = document.querySelector('#optList .option.sel');
        ans = sel ? +sel.dataset.i : -1;
        if (ans < 0) valid = false;
      }
    } else if (q.type === "fill") {
      ans = $("#fillInput").value.trim(); if (!ans) valid = false;
    } else if (q.type === "short") {
      ans = { text: $("#shortInput").value.trim(), rate: null }; if (!ans.text) valid = false;
    }
    if (!valid) { toast("请先作答"); return; }

    session.answers[q.id] = ans;

    if (session.mode === "practice") {
      var r = grade(q, ans);
      session.results[q.id] = r;
      Store.recordAttempt(q.id, r.correct);
      if (!r.correct) Store.addWrong(q.id);
      renderQuiz();
    } else {
      // 考试模式：静默记录，不立即判分
      toast("已记录答案");
      // 考试模式自动跳下一题
      if (session.index < session.questions.length - 1) { session.index++; renderQuiz(); }
      else { finishSession(); }
    }
  }

  function quizNext() {
    if (session.index < session.questions.length - 1) { session.index++; renderQuiz(); }
    else { finishSession(); }
  }

  function finishSession() {
    if (session.timer) clearInterval(session.timer);
    // 考试模式：统一判分
    if (session.mode === "exam") {
      session.questions.forEach(function (q) {
        var r = grade(q, session.answers[q.id]);
        session.results[q.id] = r;
        Store.recordAttempt(q.id, r.correct);
        if (!r.correct) Store.addWrong(q.id);
      });
      // 保存考试记录
      var correct = 0;
      session.questions.forEach(function (q) { if (session.results[q.id].correct) correct++; });
      Store.addExam({
        title: session.title,
        subject: session.examCfg && session.examCfg.subject,
        knowledge: session.examCfg && session.examCfg.knowledge,
        total: session.questions.length,
        correct: correct,
        duration: session.timeLimit ? (session.timeLimit - session.remain) : Math.round((Date.now() - session.startTime) / 1000),
        answers: session.answers,
        results: session.results
      });
    } else {
      // 顺序练习续做位置清理
      if (session.resumeKey) Store.clearResume(session.resumeKey);
      // 记录本次练习会话到「练习记录」
      var pCorrect = 0;
      session.questions.forEach(function (q) { if (session.results[q.id] && session.results[q.id].correct) pCorrect++; });
      Store.addPracticeLog({
        title: session.title,
        mode: "practice",
        total: session.questions.length,
        correct: pCorrect,
        duration: Math.round((Date.now() - session.startTime) / 1000),
        results: session.results
      });
    }
    renderResult();
  }

  function renderResult() {
    var total = session.questions.length, correct = 0;
    session.questions.forEach(function (q) { if (session.results[q.id] && session.results[q.id].correct) correct++; });
    var pct = total ? Math.round(correct / total * 100) : 0;
    var wrong = total - correct;

    var review = session.questions.map(function (q, i) {
      var r = session.results[q.id] || { correct: false, userText: "（未作答）", answerText: "" };
      return '<div class="mini-row" style="' + (r.correct ? "" : "background:var(--danger-soft)") + '">' +
        '<div style="flex:1"><div class="mr-main" style="font-size:13px">' + (i + 1) + '. ' + esc(q.content.slice(0, 40)) + (q.content.length > 40 ? "…" : "") + '</div>' +
        '<div class="mr-sub">你的答案：' + esc(r.userText) + '</div>' +
        (r.correct ? '' : '<div class="mr-sub" style="color:var(--danger)">正确答案：' + esc(r.answerText) + '</div>') +
        '</div>' +
        '<span class="pill ' + (r.correct ? "pill-green" : "pill-red") + '">' + (r.correct ? "对" : "错") + '</span></div>';
    }).join("");

    var html = '<div class="result-wrap"><div class="card">' +
      '<div class="result-score"><div class="num">' + pct + '%</div><div class="den">' + correct + ' / ' + total + '</div></div>' +
      '<h2 style="margin-bottom:4px">' + (pct >= 80 ? "优秀！继续保持 🎉" : pct >= 60 ? "及格，还有提升空间" : "需要多加练习 💪") + '</h2>' +
      '<p style="color:var(--muted);font-size:13px">' + esc(session.title) + '</p>' +
      '<div class="result-stats">' +
        '<div class="result-stat"><div class="v" style="color:var(--success)">' + correct + '</div><div class="l">答对</div></div>' +
        '<div class="result-stat"><div class="v" style="color:var(--danger)">' + wrong + '</div><div class="l">答错</div></div>' +
        '<div class="result-stat"><div class="v" style="color:var(--primary)">' + pct + '%</div><div class="l">正确率</div></div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-action="result-again">再来一组</button>' +
        '<button class="btn btn-ghost" data-action="go-dashboard">返回首页</button>' +
      '</div></div>' +
      '<div class="card" style="margin-top:18px"><div class="card-title"><span class="ic">📝</span>逐题回顾</div>' +
        '<div class="mini-list">' + review + '</div></div></div>';
    $("#content").innerHTML = html;
  }

  /* =====================================================
   *  练习配置页
   * ===================================================== */
  function renderPracticeConfig(presetSub) {
    var subs = Store.getSubjects();
    if (!subs.length) {
      $("#content").innerHTML = '<div class="card row-empty">题库还是空的，请先去「题库管理」录入题目。</div>';
      return;
    }
    var html = '<div class="card" style="max-width:640px;margin:0 auto">' +
      '<div class="card-title"><span class="ic">🎯</span>练习设置</div>' +
      '<div class="form-grid">' +
        '<div><label class="lbl">科目</label><select class="field" id="pSubject"><option value="">全部科目</option>' +
          subs.map(function (s) { return '<option value="' + esc(s) + '"' + (presetSub === s ? " selected" : "") + '>' + esc(s) + '</option>'; }).join("") + '</select></div>' +
        '<div><label class="lbl">知识点</label><select class="field" id="pKnowledge"><option value="">全部</option></select></div>' +
        '<div><label class="lbl">题型</label><select class="field" id="pType"><option value="">不限</option>' +
          Object.keys(TYPE).map(function (t) { return '<option value="' + t + '">' + TYPE[t].label + '</option>'; }).join("") + '</select></div>' +
        '<div><label class="lbl">题目数量</label><input class="field" id="pCount" type="number" min="1" placeholder="留空=全部"></div>' +
      '</div>' +
      '<div style="margin:18px 0 10px;font-weight:700">练习模式</div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-action="start-practice" data-mode="random" style="flex:1;justify-content:center">🎲 随机抽题</button>' +
        '<button class="btn" data-action="start-practice" data-mode="sequential" style="flex:1;justify-content:center">📑 顺序练习</button>' +
      '</div>' +
      '</div>';
    $("#content").innerHTML = html;

    var pSub = $("#pSubject"), pKnow = $("#pKnowledge");
    function refreshKnow() {
      var k = Store.getKnowledges(pSub.value);
      pKnow.innerHTML = '<option value="">全部</option>' + k.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join("");
    }
    pSub.onchange = refreshKnow; refreshKnow();
  }

  function practiceStart(mode) {
    var sub = $("#pSubject").value, know = $("#pKnowledge").value, type = $("#pType").value;
    var count = parseInt($("#pCount").value, 10);
    var pool = Store.filterQuestions({ subject: sub, knowledge: know, type: type });
    if (!pool.length) { toast("没有符合条件的题目"); return; }
    if (isNaN(count) || count <= 0 || count > pool.length) count = pool.length;

    if (mode === "random") {
      // 洗牌
      var arr = pool.slice();
      for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
      arr = arr.slice(0, count);
      startSession({ questions: arr, mode: "practice", title: (sub || "全部") + (know ? "·" + know : "") + " · 随机练习" });
    } else {
      // 顺序：检查续做进度
      var key = "seq:" + (sub || "") + ":" + (know || "");
      var rIdx = Store.getResume()[key];
      var list = pool.slice(0, count);
      var startIdx = (rIdx != null && rIdx < list.length) ? rIdx : 0;
      session = null;
      startSession({ questions: list, mode: "practice", title: (sub || "全部") + (know ? "·" + know : "") + " · 顺序练习" });
      session.index = startIdx;
      session.resumeKey = key;
      session.resumeSub = sub;
      session.resumeKnow = know;
      if (startIdx > 0) toast("已从上次进度继续（第 " + (startIdx + 1) + " 题）");
      renderQuiz();
    }
  }

  /* =====================================================
   *  背题模式（翻卡记忆，不判分、不计时）
   * ===================================================== */
  function renderReciteConfig(presetSub) {
    var subs = Store.getSubjects();
    if (!subs.length) {
      $("#content").innerHTML = '<div class="card row-empty">题库还是空的，请先去「题库管理」录入题目。</div>';
      return;
    }
    var html = '<div class="card" style="max-width:640px;margin:0 auto">' +
      '<div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>背题设置</div>' +
      '<div class="form-grid">' +
        '<div><label class="lbl">科目</label><select class="field" id="pSubject"><option value="">全部科目</option>' +
          subs.map(function (s) { return '<option value="' + esc(s) + '"' + (presetSub === s ? " selected" : "") + '>' + esc(s) + '</option>'; }).join("") + '</select></div>' +
        '<div><label class="lbl">知识点</label><select class="field" id="pKnowledge"><option value="">全部</option></select></div>' +
        '<div><label class="lbl">题型</label><select class="field" id="pType"><option value="">不限</option>' +
          Object.keys(TYPE).map(function (t) { return '<option value="' + t + '">' + TYPE[t].label + '</option>'; }).join("") + '</select></div>' +
        '<div><label class="lbl">题目数量</label><input class="field" id="pCount" type="number" min="1" placeholder="留空=全部"></div>' +
      '</div>' +
      '<p style="color:var(--muted);font-size:12px;margin:14px 0 4px">背题模式一题一页，先自己想、再点「显示答案」揭晓，不判分不计时。记不住的可一键加入错题本。</p>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-action="start-recite" data-mode="random" style="flex:1;justify-content:center">🎲 随机背题</button>' +
        '<button class="btn" data-action="start-recite" data-mode="sequential" style="flex:1;justify-content:center">📑 顺序背题</button>' +
      '</div>' +
      '</div>';
    $("#content").innerHTML = html;
    var pSub = $("#pSubject"), pKnow = $("#pKnowledge");
    function refreshKnow() {
      var k = Store.getKnowledges(pSub.value);
      pKnow.innerHTML = '<option value="">全部</option>' + k.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join("");
    }
    pSub.onchange = refreshKnow; refreshKnow();
  }

  function reciteStart(mode) {
    var sub = $("#pSubject").value, know = $("#pKnowledge").value, type = $("#pType").value;
    var count = parseInt($("#pCount").value, 10);
    var pool = Store.filterQuestions({ subject: sub, knowledge: know, type: type });
    if (!pool.length) { toast("没有符合条件的题目"); return; }
    if (isNaN(count) || count <= 0 || count > pool.length) count = pool.length;
    var list;
    if (mode === "random") {
      list = pool.slice();
      for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
      list = list.slice(0, count);
    } else {
      list = pool.slice(0, count);
    }
    startSession({ questions: list, mode: "recite", title: (sub || "全部") + (know ? "·" + know : "") + " · 背题" });
    renderRecite();
  }

  function renderRecite() {
    var q = curQ(), t = TYPE[q.type], total = session.questions.length, idx = session.index + 1;
    var favOn = Store.isFavorite(q.id);
    var revealed = !!session.revealed[q.id];

    var head = '<div class="quiz-head">' +
      '<div class="quiz-progress">第 ' + idx + ' / ' + total + ' 题 · 背题</div>' +
      '<button class="fav-btn ' + (favOn ? "on" : "") + '" data-action="toggle-fav" data-id="' + q.id + '" title="收藏本题">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="' + (favOn ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>' +
      '</button></div>';

    var tags = '<div class="q-tag-row">' +
      '<span class="pill pill-blue">' + esc(q.subject) + '</span>' +
      '<span class="pill pill-gray">' + esc(q.knowledge) + '</span>' +
      '<span class="pill pill-gray">' + t.label + '</span>' +
      '<span class="pill pill-warn">' + (DIFF[q.difficulty] || "") + '</span>' +
      (Store.isWrong(q.id) ? '<span class="pill pill-red">我的错题</span>' : '') +
      '</div>';

    var body = '<div class="q-text">' + esc(q.content) + '</div>';

    // 选项 / 答案区
    var optArea = "", fb = "";
    if (t.choice) {
      var opts = q.options;
      optArea = '<div class="options">' + opts.map(function (o, i) {
        var cls = "option";
        var mark = String.fromCharCode(65 + i);
        var isCorrect = Array.isArray(q.answer) ? q.answer.indexOf(i) >= 0 : q.answer === i;
        if (revealed && isCorrect) { cls += " correct"; mark = "✓"; }
        return '<div class="' + cls + '"><span class="opt-mark">' + mark + '</span><span>' + esc(o) + '</span></div>';
      }).join("") + '</div>';
      if (revealed) {
        var ansText = Array.isArray(q.answer)
          ? q.answer.map(function (i) { return String.fromCharCode(65 + i) + ". " + q.options[i]; }).join("；")
          : String.fromCharCode(65 + q.answer) + ". " + q.options[q.answer];
        fb = '<div class="feedback show ok"><div class="fb-title">正确答案</div>' +
          '<div class="fb-ans">' + esc(ansText) + '</div>' +
          (q.explanation ? '<div class="fb-exp">' + esc(q.explanation) + '</div>' : '') + '</div>';
      }
    } else {
      if (revealed) {
        fb = '<div class="feedback show ok"><div class="fb-title">' + (q.type === "fill" ? "参考答案" : "参考答案 / 评分要点") + '</div>' +
          '<div class="fb-ans">' + esc(q.answer) + '</div>' +
          (q.explanation ? '<div class="fb-exp">' + esc(q.explanation) + '</div>' : '') + '</div>';
      } else {
        optArea = '<div class="row-empty" style="padding:22px;color:var(--muted)">这是' + t.label + '，点击「显示答案」查看参考答案</div>';
      }
    }

    var foot = '<div class="quiz-foot">';
    foot += '<button class="btn btn-ghost" data-action="recite-exit">退出</button>';
    foot += '<button class="btn btn-ghost" data-action="recite-prev"' + (session.index > 0 ? '' : ' disabled') + '>← 上一题</button>';
    if (!revealed) {
      foot += '<button class="btn btn-primary" data-action="recite-reveal">显示答案</button>';
    } else {
      foot += '<button class="btn btn-sm btn-danger" data-action="recite-wrong">× 记到错题本</button>';
      foot += (session.index < total - 1)
        ? '<button class="btn btn-primary" data-action="recite-next">下一题 →</button>'
        : '<button class="btn btn-primary" data-action="recite-finish">完成</button>';
    }
    foot += '</div>';

    $("#content").innerHTML = '<div class="quiz-wrap"><div class="card question-card">' + head + tags + body + optArea + fb + foot + '</div></div>';
  }

  // 练习过程中记录续做位置（每次进入下一题时）
  function markResume() {
    if (session && session.mode === "practice" && session.resumeKey) {
      Store.setResume(session.resumeKey, {
        index: session.index,
        subject: session.resumeSub || "",
        knowledge: session.resumeKnow || ""
      });
    }
  }

  /* =====================================================
   *  错题本
   * ===================================================== */
  function renderWrong() {
    var wrong = Store.getWrong();
    if (!wrong.length) {
      $("#content").innerHTML = '<div class="card row-empty">🎉 还没有错题，继续保持！</div>';
      return;
    }
    var rows = wrong.map(function (w) {
      var q = Store.getQuestion(w.id);
      if (!q) { Store.removeWrong(w.id); return ""; }
      return '<tr>' +
        '<td><div class="q-content">' + esc(q.content) + '</div>' +
          '<div class="q-meta"><span class="pill pill-blue">' + esc(q.subject) + '</span>' +
          '<span class="pill pill-gray">' + esc(q.knowledge) + '</span>' +
          '<span class="pill pill-gray">' + TYPE[q.type].label + '</span></div></td>' +
        '<td style="white-space:nowrap"><span class="pill pill-red">错 ' + w.count + ' 次</span></td>' +
        '<td style="white-space:nowrap"><div class="q-actions">' +
          '<button class="btn btn-sm" data-action="practice-one" data-id="' + q.id + '">重练</button>' +
          '<button class="btn btn-sm btn-ghost" data-action="edit-question" data-id="' + q.id + '">查看</button>' +
          '<button class="btn btn-sm btn-danger" data-action="remove-wrong" data-id="' + q.id + '">移除</button>' +
        '</div></td></tr>';
    }).join("");

    $("#content").innerHTML = '<div class="filter-bar"><div class="fg" style="flex:0"><button class="btn btn-primary" data-action="practice-wrong">🔁 重练全部错题</button></div>' +
      '<div class="fg" style="flex:0"><button class="btn btn-ghost" data-action="clear-wrong">清空错题本</button></div>' +
      '<div style="margin-left:auto;align-self:center;color:var(--sub);font-size:13px">共 ' + wrong.length + ' 道错题</div></div>' +
      '<div class="card"><table class="q-table"><thead><tr><th>题目</th><th>错误次数</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* =====================================================
   *  模拟考试配置
   * ===================================================== */
  function renderExamConfig() {
    var subs = Store.getSubjects();
    if (!subs.length) {
      $("#content").innerHTML = '<div class="card row-empty">题库还是空的，请先去录入题目再来模拟考试。</div>';
      return;
    }
    var html = '<div class="card" style="max-width:640px;margin:0 auto">' +
      '<div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>模拟考试设置</div>' +
      '<div class="form-grid">' +
        '<div><label class="lbl">科目</label><select class="field" id="eSubject"><option value="">全部科目</option>' +
          subs.map(function (s) { return '<option value="' + esc(s) + '">' + esc(s) + '</option>'; }).join("") + '</select></div>' +
        '<div><label class="lbl">知识点</label><select class="field" id="eKnowledge"><option value="">全部</option></select></div>' +
        '<div><label class="lbl">题目数量</label><input class="field" id="eCount" type="number" min="1" value="10"></div>' +
        '<div><label class="lbl">限时（分钟，0=不限时）</label><input class="field" id="eTime" type="number" min="0" value="20"></div>' +
      '</div>' +
      '<div style="margin-top:18px"><button class="btn btn-primary" data-action="start-exam" style="width:100%;justify-content:center">开始考试</button></div>' +
      '<p style="color:var(--muted);font-size:12px;margin-top:12px">说明：考试过程不立即判分，交卷后统一评分并记入「成绩统计」。考试时间结束会自动交卷。</p>' +
      '</div>';
    $("#content").innerHTML = html;
    var eSub = $("#eSubject"), eKnow = $("#eKnowledge");
    function refresh() {
      var k = Store.getKnowledges(eSub.value);
      eKnow.innerHTML = '<option value="">全部</option>' + k.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join("");
    }
    eSub.onchange = refresh; refresh();
  }

  function examStart() {
    var sub = $("#eSubject").value, know = $("#eKnowledge").value;
    var count = parseInt($("#eCount").value, 10) || 10;
    var time = parseInt($("#eTime").value, 10) || 0;
    var pool = Store.filterQuestions({ subject: sub, knowledge: know });
    if (!pool.length) { toast("没有符合条件的题目"); return; }
    if (count > pool.length) count = pool.length;
    var arr = pool.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    arr = arr.slice(0, count);
    startSession({
      questions: arr, mode: "exam",
      title: (sub || "综合") + (know ? "·" + know : "") + " 模拟考",
      timeLimit: time * 60,
      examCfg: { subject: sub, knowledge: know }
    });
  }

  /* =====================================================
   *  成绩统计
   * ===================================================== */
  function renderStats() {
    var st = Store.stats();
    var exams = Store.getExams().slice().reverse(); // 新->旧

    // 科目正确率横向条
    var bySub = Object.keys(st.bySubject).map(function (k) {
      var s = st.bySubject[k];
      var acc = s.attempts ? Math.round(s.corrects / s.attempts * 100) : 0;
      return { name: k, acc: acc, total: s.total };
    });
    var bars = bySub.length ? bySub.map(function (s) {
      return '<div class="bar-row"><div class="bar-lab">' + esc(s.name) + '</div>' +
        '<div class="bar-track"><i style="width:' + s.acc + '%"></i></div>' +
        '<div class="bar-val">' + s.acc + '%</div></div>';
    }).join("") : '<div class="row-empty">暂无练习数据</div>';

    // 考试趋势折线
    var examPts = exams.map(function (e, i) {
      return { label: (i + 1), value: e.total ? Math.round(e.correct / e.total * 100) : 0, raw: e };
    });
    var lineSvg = examPts.length ? lineChart(examPts) : '<div class="row-empty">还没有模拟考试记录</div>';

    var examList = exams.length ? exams.map(function (e) {
      var d = new Date(e.date);
      var ds = (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
      var pct = e.total ? Math.round(e.correct / e.total * 100) : 0;
      return '<div class="mini-row"><div><div class="mr-main">' + esc(e.title) + '</div>' +
        '<div class="mr-sub">' + ds + ' · 答对 ' + e.correct + '/' + e.total + ' · 用时 ' + fmtTime((e.duration || 0) * 1000) + '</div></div>' +
        '<span class="pill ' + (pct >= 60 ? "pill-green" : "pill-red") + '">' + pct + '%</span></div>';
    }).join("") : '<div class="row-empty">暂无考试记录</div>';

    var html = '<div class="grid-2" style="grid-template-columns:1fr 1fr">' +
      '<div class="card"><div class="card-title"><span class="ic">🎯</span>总体表现</div>' +
        '<div class="stat-grid" style="grid-template-columns:1fr 1fr;gap:14px">' +
          miniStat("总题量", st.totalQuestions) +
          miniStat("练习次数", st.totalAttempts) +
          miniStat("总正确率", st.accuracy + "%") +
          miniStat("错题数", st.wrongCount) +
        '</div></div>' +
      '<div class="card"><div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>模拟考试</div>' +
        (exams.length ? '<div class="mini-list">' + examList + '</div>' : '<div class="row-empty">暂无记录</div>') + '</div>' +
      '</div>' +
      '<div class="grid-2" style="margin-top:18px">' +
        '<div class="card"><div class="card-title"><span class="ic">📊</span>各科目正确率</div>' + bars + '</div>' +
        '<div class="card"><div class="card-title"><span class="ic">📈</span>模拟考试成绩趋势</div>' +
          (examPts.length ? '<div class="chart">' + lineSvg + '</div><div class="legend"><span><i style="background:var(--primary)"></i>得分率</span></div>' : lineSvg) +
        '</div>' +
      '</div>';
    $("#content").innerHTML = html;
  }
  function miniStat(l, v) {
    return '<div class="stat" style="box-shadow:none;background:var(--bg);padding:14px"><div class="stat-val" style="font-size:24px">' + esc(v) + '</div><div class="stat-sub">' + esc(l) + '</div></div>';
  }
  function lineChart(pts) {
    var W = 600, H = 240, padL = 36, padR = 16, padT = 16, padB = 28;
    var n = pts.length;
    var x = function (i) { return padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1)); };
    var y = function (v) { return padT + (H - padT - padB) * (1 - v / 100); };
    var grid = "";
    [0, 25, 50, 75, 100].forEach(function (g) {
      grid += '<line x1="' + padL + '" y1="' + y(g) + '" x2="' + (W - padR) + '" y2="' + y(g) + '" stroke="#EDF2F7" stroke-width="1"></line>' +
        '<text x="' + (padL - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="#8A94A6">' + g + '</text>';
    });
    var line = "", dots = "", labels = "";
    pts.forEach(function (p, i) {
      line += (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(p.value).toFixed(1) + " ";
      dots += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="4" fill="#2F9BD6" stroke="#fff" stroke-width="2"></circle>' +
        '<text x="' + x(i).toFixed(1) + '" y="' + (y(p.value) - 10) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#1F2D3D">' + p.value + '%</text>';
      labels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#8A94A6">#' + p.label + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" preserveAspectRatio="xMidYMid meet">' +
      grid + '<path d="' + line + '" fill="none" stroke="#2F9BD6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>' +
      dots + labels + '</svg>';
  }

  /* =====================================================
   *  练习记录（练习历史）
   * ===================================================== */
  function renderHistory() {
    var logs = Store.getPracticeLogs().map(function (l) { return { type: "practice", raw: l }; });
    var exams = Store.getExams().map(function (e) { return { type: "exam", raw: e }; });
    var all = logs.concat(exams).sort(function (a, b) { return b.raw.date - a.raw.date; });

    var totalGroups = all.length;
    var totalQ = 0, totalC = 0;
    all.forEach(function (it) { totalQ += it.raw.total || 0; totalC += it.raw.correct || 0; });
    var avg = totalQ ? Math.round(totalC / totalQ * 100) : 0;

    var summary = '<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">' +
      miniStat("练习组数", totalGroups) +
      miniStat("累计题量", totalQ) +
      miniStat("平均正确率", avg + "%") + '</div>';

    if (!all.length) {
      $("#content").innerHTML = summary + '<div class="card"><div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3.5" y1="6" x2="3.51" y2="6"/><line x1="3.5" y1="12" x2="3.51" y2="12"/><line x1="3.5" y1="18" x2="3.51" y2="18"/></svg></span>全部记录</div>' +
        '<div class="row-empty">还没有记录。完成一组练习或一场模拟考试后，会自动出现在这里。</div></div>';
      return;
    }

    var rows = all.map(function (it) {
      var r = it.raw;
      var pct = r.total ? Math.round(r.correct / r.total * 100) : 0;
      var d = new Date(r.date);
      var ds = d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " +
        ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
      return '<div class="mini-row" data-action="view-log" data-type="' + it.type + '" data-id="' + esc(r.id) + '" style="cursor:pointer">' +
        '<div style="flex:1"><div class="mr-main" style="font-size:14px">' + esc(r.title) + '</div>' +
        '<div class="mr-sub">' + ds + ' · ' + (it.type === "exam" ? "模拟考试" : "练习") + ' · ' + r.correct + '/' + r.total + ' 题 · 用时 ' + fmtTime((r.duration || 0) * 1000) + '</div></div>' +
        '<span class="pill ' + (it.type === "exam" ? "pill-blue" : "pill-gray") + '" style="margin-right:10px">' + (it.type === "exam" ? "考试" : "练习") + '</span>' +
        '<span class="pill ' + (pct >= 60 ? "pill-green" : "pill-red") + '">' + pct + '%</span></div>';
    }).join("");

    var html = summary +
      '<div class="card"><div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3.5" y1="6" x2="3.51" y2="6"/><line x1="3.5" y1="12" x2="3.51" y2="12"/><line x1="3.5" y1="18" x2="3.51" y2="18"/></svg></span>全部记录' +
        (totalGroups ? '<button class="btn btn-sm btn-ghost" data-action="clear-logs" style="margin-left:auto">清空记录</button>' : '') +
        '</div><div class="mini-list">' + rows + '</div></div>';
    $("#content").innerHTML = html;
  }

  function renderLogReview(type, id) {
    var raw = type === "exam"
      ? Store.getExams().filter(function (e) { return e.id === id; })[0]
      : Store.getPracticeLogs().filter(function (l) { return l.id === id; })[0];
    if (!raw) { toast("记录不存在"); navigate("history"); return; }

    var results = raw.results || {};
    var ids = Object.keys(results);
    var correct = 0;
    ids.forEach(function (k) { if (results[k] && results[k].correct) correct++; });
    var pct = ids.length ? Math.round(correct / ids.length * 100) : 0;

    var review = ids.map(function (qid, i) {
      var r = results[qid] || { correct: false, userText: "（未作答）", answerText: "" };
      var q = Store.getQuestion(qid);
      var content = q ? q.content : "（题目已被删除）";
      return '<div class="mini-row" style="' + (r.correct ? "" : "background:var(--danger-soft)") + '">' +
        '<div style="flex:1"><div class="mr-main" style="font-size:13px">' + (i + 1) + '. ' + esc(content.slice(0, 60)) + (content.length > 60 ? "…" : "") + '</div>' +
        '<div class="mr-sub">你的答案：' + esc(r.userText) + '</div>' +
        (r.correct ? '' : '<div class="mr-sub" style="color:var(--danger)">正确答案：' + esc(r.answerText) + '</div>') +
        '</div>' +
        '<span class="pill ' + (r.correct ? "pill-green" : "pill-red") + '">' + (r.correct ? "对" : "错") + '</span></div>';
    }).join("");

    var html = '<div class="result-wrap" style="text-align:left"><div class="card">' +
      '<div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>' + esc(raw.title) + '</div>' +
      '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:6px">' +
        '<div><div class="stat-val" style="font-size:24px">' + pct + '%</div><div class="stat-sub">正确率</div></div>' +
        '<div class="mini-row" style="background:transparent;padding:0"><span class="pill pill-green" style="margin-right:8px">对 ' + correct + '</span><span class="pill pill-red">错 ' + (ids.length - correct) + '</span></div>' +
        '<div class="mr-sub">共 ' + ids.length + ' 题 · 用时 ' + fmtTime((raw.duration || 0) * 1000) + '</div>' +
      '</div>' +
      '<button class="btn btn-ghost" data-action="go-history" style="margin-top:8px">← 返回练习记录</button>' +
      '</div>' +
      '<div class="card" style="margin-top:18px"><div class="card-title"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>逐题回顾</div>' +
        (review ? '<div class="mini-list">' + review + '</div>' : '<div class="row-empty">没有可展示的题目</div>') +
      '</div></div>';
    $("#content").innerHTML = html;
  }

  /* =====================================================
   *  收藏夹
   * ===================================================== */
  function renderFavorites() {
    var favs = Store.getFavorites().map(function (id) { return Store.getQuestion(id); }).filter(Boolean);
    if (!favs.length) {
      $("#content").innerHTML = '<div class="card row-empty">还没有收藏的题目。<br>在「题库管理」或答题时点击「收藏」即可加入这里，方便重点复习。</div>';
      return;
    }
    var rows = favs.map(function (q) {
      var t = TYPE[q.type];
      return '<tr>' +
        '<td><div class="q-content">' + esc(q.content) + '</div>' +
          '<div class="q-meta"><span class="pill pill-blue">' + esc(q.subject) + '</span>' +
          '<span class="pill pill-gray">' + esc(q.knowledge) + '</span>' +
          '<span class="pill pill-gray">' + t.label + '</span></div></td>' +
        '<td style="white-space:nowrap"><div class="q-actions">' +
          '<button class="btn btn-sm" data-action="practice-one" data-id="' + q.id + '">练习</button>' +
          '<button class="btn btn-sm btn-danger" data-action="toggle-fav" data-id="' + q.id + '">取消收藏</button>' +
        '</div></td></tr>';
    }).join("");

    var html = '<div class="filter-bar"><div class="fg" style="flex:0"><button class="btn btn-primary" data-action="practice-fav">练习全部收藏</button></div>' +
      '<div style="margin-left:auto;align-self:center;color:var(--sub);font-size:13px">共 ' + favs.length + ' 道收藏</div></div>' +
      '<div class="card"><table class="q-table"><thead><tr><th>题目</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    $("#content").innerHTML = html;
  }

  /* =====================================================
   *  数据备份（导入/导出/清空）
   * ===================================================== */
  function renderData() {
    var st = Store.stats();
    var html = '<div class="card" style="max-width:680px;margin:0 auto">' +
      '<div class="card-title"><span class="ic">💾</span>数据备份与恢复</div>' +
      '<p style="color:var(--sub);font-size:13px;margin-bottom:18px">所有数据保存在本浏览器本地。换设备或清理浏览器前，请导出备份；也可把备份文件分享给他人或导入自己的题库。</p>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" data-action="export-json">⬇ 导出备份（JSON）</button>' +
        '<button class="btn" data-action="import-json">⬆ 导入备份</button>' +
        '<button class="btn btn-ghost" data-action="export-template">⬇ 下载录入模板</button>' +
      '</div>' +
      '<hr style="border:none;border-top:1px solid var(--line);margin:22px 0">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
        '<div><div style="font-weight:700">清空全部数据</div><div style="font-size:12px;color:var(--muted)">将删除 ' + st.totalQuestions + ' 道题、' + st.wrongCount + ' 道错题、' + st.examCount + ' 场考试记录、' + Store.getPracticeLogs().length + ' 条练习记录、' + Store.getFavorites().length + ' 个收藏，且不可恢复。</div></div>' +
        '<button class="btn btn-danger" data-action="clear-data">清空</button>' +
      '</div>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '</div>';
    $("#content").innerHTML = html;
    $("#importFile").onchange = function (e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var merge = confirm("导入方式：\n[确定] 合并（保留原有题目，仅补充新题）\n[取消] 覆盖（用备份完全替换现有数据）");
          Store.importAll(data, merge);
          toast("导入成功"); renderData();
        } catch (err) { toast("导入失败：文件格式错误"); }
      };
      reader.readAsText(file);
    };
  }

  function exportJSON() {
    var data = Store.exportAll();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "考前刷题备份_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("已导出");
  }

  function exportTemplate() {
    var tpl = {
      note: "按此格式整理题目后，在「数据备份-导入备份」中选择覆盖导入即可。type: single/multiple/judge/fill/short；choice 题型 answer 为选项下标（multiple 为数组）；fill/short answer 为字符串。",
      questions: [
        { subject: "数学", knowledge: "函数", type: "single", difficulty: 2, content: "示例：f(x)=x+1，f(1)=?", options: ["1", "2", "3", "4"], answer: 1, explanation: "代入得 2" },
        { subject: "英语", knowledge: "词汇", type: "fill", difficulty: 2, content: "happy 的反义词是?", options: [], answer: "sad", explanation: "" }
      ]
    };
    var blob = new Blob([JSON.stringify(tpl, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "题库录入模板.json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* =====================================================
   *  事件委托
   * ===================================================== */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var a = el.dataset.action;
    var id = el.dataset.id;

    switch (a) {
      case "close-modal": closeModal(); break;
      case "go-practice": navigate("practice"); break;
      case "go-recite": navigate("recite"); break;
      case "go-bank": navigate("bank"); break;
      case "go-exam": navigate("exam"); break;
      case "go-dashboard": navigate("dashboard"); break;

      case "add-question": openQuestionForm(null); break;
      case "edit-question": openQuestionForm(Store.getQuestion(id)); break;
      case "save-question": saveQuestion(); break;
      case "opt-add": formState.options.push(""); renderOptAndAns(); break;
      case "opt-del": {
        var di = +el.dataset.i; formState.options.splice(di, 1);
        if (!Array.isArray(formState.answer)) formState.answer = 0;
        renderOptAndAns(); break;
      }

      case "delete-question":
        if (confirm("确定删除这道题？错题本与统计中也会同步移除。")) {
          Store.deleteQuestion(id); toast("已删除"); renderBank();
        } break;

      case "start-practice": practiceStart(el.dataset.mode); break;
      case "go-practice-sub": renderPracticeConfig(id); break;

      case "quiz-option": {
        if (session.results[curQ().id]) break; // 已判分不可改
        var qi = +el.dataset.i, t = TYPE[curQ().type];
        if (t.multi) {
          el.classList.toggle("sel");
        } else {
          document.querySelectorAll("#optList .option").forEach(function (o) { o.classList.remove("sel"); });
          el.classList.add("sel");
        }
        break;
      }
      case "quiz-submit": quizSubmit(); break;
      case "quiz-next": markResume(); quizNext(); break;
      case "quiz-prev": session.index = Math.max(0, session.index - 1); renderQuiz(); break;
      case "quiz-finish": finishSession(); break;
      case "quiz-exit":
        if (session && session.mode === "practice" && session.resumeKey) markResume();
        if (session && session.timer) clearInterval(session.timer);
        navigate(session && session.mode === "exam" ? "exam" : (session && session.mode === "recite" ? "recite" : "practice"));
        break;
      case "self-rate": {
        var q = curQ();
        var rate = el.dataset.v;
        var ans = session.answers[q.id];
        ans = { text: ans.text, rate: rate };
        session.answers[q.id] = ans;
        var r = grade(q, ans);
        session.results[q.id] = r;
        Store.recordAttempt(q.id, r.correct);
        if (!r.correct) Store.addWrong(q.id);
        renderQuiz();
        break;
      }

      case "result-again":
        if (session.mode === "practice") renderPracticeConfig(); else renderExamConfig();
        break;

      case "practice-wrong": {
        var ws = Store.getWrong().map(function (w) { return Store.getQuestion(w.id); }).filter(Boolean);
        if (!ws.length) { toast("没有错题"); break; }
        startSession({ questions: ws, mode: "practice", title: "错题重练" });
        break;
      }
      case "practice-one": {
        var one = Store.getQuestion(id);
        if (one) startSession({ questions: [one], mode: "practice", title: "单题重练" });
        break;
      }
      case "remove-wrong": Store.removeWrong(id); toast("已移除"); renderWrong(); break;
      case "clear-wrong":
        if (confirm("清空错题本？（不会删除题库中的题目）")) { Store.getWrong().forEach(function (w) { Store.removeWrong(w.id); }); toast("已清空"); renderWrong(); }
        break;

      case "go-history": navigate("history"); break;
      case "view-log": renderLogReview(el.dataset.type, el.dataset.id); break;
      case "toggle-fav": {
        var nowOn = Store.toggleFavorite(id);
        toast(nowOn ? "已收藏" : "已取消收藏");
        if (session) {
          // 正在答题：仅更新收藏按钮，不重渲染以免丢失作答
          var fbtn = el.classList.contains("fav-btn") ? el : el.closest(".fav-btn");
          if (fbtn) {
            fbtn.classList.toggle("on", nowOn);
            var fsvg = fbtn.querySelector("svg");
            if (fsvg) fsvg.setAttribute("fill", nowOn ? "currentColor" : "none");
          }
        } else if (current === "bank") renderBank();
        else if (current === "favorites") renderFavorites();
        else if (current === "wrong") renderWrong();
        break;
      }
      case "clear-logs":
        if (confirm("清空全部练习 / 考试记录？此操作不可恢复。")) {
          Store.clearPracticeLogs(); Store.clearExams();
          toast("已清空记录"); navigate("history");
        }
        break;
      case "practice-fav": {
        var favQs = Store.getFavorites().map(function (x) { return Store.getQuestion(x); }).filter(Boolean);
        if (!favQs.length) { toast("收藏夹是空的"); break; }
        startSession({ questions: favQs, mode: "practice", title: "收藏夹专项练习" });
        break;
      }

      case "start-exam": examStart(); break;

      /* ---- 背题模式 ---- */
      case "start-recite": reciteStart(el.dataset.mode); break;
      case "recite-reveal": session.revealed[curQ().id] = true; renderRecite(); break;
      case "recite-next": session.index++; renderRecite(); break;
      case "recite-prev": session.index = Math.max(0, session.index - 1); renderRecite(); break;
      case "recite-finish": toast("背题完成"); navigate("recite"); break;
      case "recite-exit":
        if (session && session.timer) clearInterval(session.timer);
        navigate("recite"); break;
      case "recite-wrong": Store.addWrong(curQ().id); toast("已加入错题本"); break;

      case "resume-practice": {
        var key = el.dataset.key, r = Store.getResume()[key];
        if (!r) { navigate("practice"); break; }
        var sub2 = r.subject || "", know2 = r.knowledge || "";
        var pool2 = Store.filterQuestions({ subject: sub2, knowledge: know2 });
        if (!pool2.length) { toast("原筛选已无题目"); navigate("practice"); break; }
        var k2 = "seq:" + sub2 + ":" + know2;
        startSession({ questions: pool2, mode: "practice", title: (sub2 || "全部") + (know2 ? "·" + know2 : "") + " · 顺序练习" });
        session.index = Math.min(r.index, pool2.length - 1);
        session.resumeKey = k2;
        session.resumeSub = sub2;
        session.resumeKnow = know2;
        renderQuiz();
        if (r.index > 0) toast("已从上次进度继续（第 " + (r.index + 1) + " 题）");
        break;
      }
      case "clear-resume": Store.clearResume(el.dataset.key); toast("已清除进度"); renderDashboard(); break;

      case "export-json": exportJSON(); break;
      case "import-json": $("#importFile").click(); break;
      case "export-template": exportTemplate(); break;
      case "clear-data":
        if (confirm("确定清空全部数据？此操作不可恢复！")) { Store.clearAll(); toast("已清空，重新载入种子题"); Store.ensureSeed(); navigate("dashboard"); }
        break;
    }
  });

  // 选项「正确答案」勾选（radio/checkbox）
  document.addEventListener("change", function (e) {
    if (e.target.classList && e.target.classList.contains("opt-correct")) {
      var i = +e.target.dataset.i;
      if (TYPE[formState.type].multi) {
        formState.answer = formState.answer || [];
        if (e.target.checked) { if (formState.answer.indexOf(i) < 0) formState.answer.push(i); }
        else { formState.answer = formState.answer.filter(function (x) { return x !== i; }); }
      } else {
        formState.answer = i;
      }
    }
  });

  // 侧边栏导航
  document.querySelectorAll(".nav-item").forEach(function (b) {
    b.addEventListener("click", function () { navigate(b.dataset.section); });
  });

  // 键盘：Esc 关闭弹窗；答题时回车提交（焦点不在文本域时）
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!$("#modalMask").hidden) closeModal(); return; }
    var modalOpen = !$("#modalMask").hidden;
    if (e.key === "Enter" && session && session.mode !== "recite" && !session.results[curQ().id] && !modalOpen && e.target.tagName !== "TEXTAREA") {
      quizSubmit();
    }
  });

  /* ---------------- 启动 ---------------- */
  Store.ensureSeed();
  navigate("dashboard");
})();
