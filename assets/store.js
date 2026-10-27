/* =========================================================
 *  store.js —— 数据层
 *  所有数据保存在浏览器 localStorage 中，无需后端服务器。
 *  对外暴露全局对象 Store，app.js 通过它读写数据。
 * ========================================================= */
(function (global) {
  "use strict";

  var KEYS = {
    questions: "exam_q",
    wrong: "exam_wrong",
    exams: "exam_exams",
    qstats: "exam_qstats",     // 每题练习统计 {qid:{attempts,corrects}}
    resume: "exam_resume",     // 顺序练习续做位置
    practice_logs: "exam_practice_logs", // 每次练习/考试会话记录（练习历史）
    favorites: "exam_favorites",        // 收藏的题目 id 列表
    settings: "exam_settings"
  };

  function read(key, def) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) { return def; }
  }
  function write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function uid() {
    return "q_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // 题库种子版本：改题库内容时 +1，已使用站点的用户会在下次打开时被强制整体换新
  // v3：最终干净题库 365 题（经源 PDF 逐题反查答案键验证，剔除源文件本身重复且答案矛盾的副本）
  var SEED_VERSION = 3;

  var Store = {
    /* ---------- 题库 ---------- */
    getQuestions: function () { return read(KEYS.questions, []); },

    saveQuestions: function (list) { write(KEYS.questions, list); },

    getQuestion: function (id) {
      return this.getQuestions().filter(function (q) { return q.id === id; })[0] || null;
    },

    addQuestion: function (q) {
      var list = this.getQuestions();
      q.id = uid();
      q.createdAt = Date.now();
      list.push(q);
      this.saveQuestions(list);
      return q;
    },

    updateQuestion: function (id, patch) {
      var list = this.getQuestions();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          list[i] = Object.assign({}, list[i], patch, { id: id });
          break;
        }
      }
      this.saveQuestions(list);
    },

    deleteQuestion: function (id) {
      this.saveQuestions(this.getQuestions().filter(function (q) { return q.id !== id; }));
      // 同步清理错题本与统计里对该题的引用
      this.removeWrong(id);
      var st = this.getQStats(); delete st[id]; write(KEYS.qstats, st);
    },

    getSubjects: function () {
      var set = {};
      this.getQuestions().forEach(function (q) { set[q.subject] = true; });
      return Object.keys(set);
    },

    getKnowledges: function (subject) {
      var set = {};
      this.getQuestions().forEach(function (q) {
        if (!subject || q.subject === subject) set[q.knowledge] = true;
      });
      return Object.keys(set);
    },

    /* 按科目/知识点/题型/关键词筛选 */
    filterQuestions: function (opt) {
      opt = opt || {};
      return this.getQuestions().filter(function (q) {
        if (opt.subject && q.subject !== opt.subject) return false;
        if (opt.knowledge && q.knowledge !== opt.knowledge) return false;
        if (opt.type && q.type !== opt.type) return false;
        if (opt.keyword) {
          var k = opt.keyword.toLowerCase();
          var hay = (q.content + " " + (q.knowledge || "") + " " + (q.explanation || "")).toLowerCase();
          if (hay.indexOf(k) === -1) return false;
        }
        return true;
      });
    },

    /* ---------- 错题本 ---------- */
    getWrong: function () { return read(KEYS.wrong, []); },

    addWrong: function (id) {
      var list = this.getWrong();
      var item = list.filter(function (w) { return w.id === id; })[0];
      var now = Date.now();
      if (item) { item.count++; item.lastAt = now; }
      else { list.push({ id: id, count: 1, firstAt: now, lastAt: now }); }
      write(KEYS.wrong, list);
    },

    removeWrong: function (id) {
      write(KEYS.wrong, this.getWrong().filter(function (w) { return w.id !== id; }));
    },

    isWrong: function (id) {
      return this.getWrong().some(function (w) { return w.id === id; });
    },

    /* ---------- 收藏夹 ---------- */
    getFavorites: function () { return read(KEYS.favorites, []); },
    isFavorite: function (id) { return this.getFavorites().indexOf(id) >= 0; },
    addFavorite: function (id) {
      var list = this.getFavorites();
      if (list.indexOf(id) < 0) { list.push(id); write(KEYS.favorites, list); }
    },
    removeFavorite: function (id) {
      write(KEYS.favorites, this.getFavorites().filter(function (x) { return x !== id; }));
    },
    toggleFavorite: function (id) {
      if (this.isFavorite(id)) this.removeFavorite(id); else this.addFavorite(id);
      return this.isFavorite(id);
    },

    /* ---------- 考试记录 ---------- */
    getExams: function () { return read(KEYS.exams, []); },

    addExam: function (exam) {
      var list = this.getExams();
      exam.id = "e_" + Date.now().toString(36);
      exam.date = Date.now();
      list.push(exam);
      write(KEYS.exams, list);
      return exam;
    },

    /* ---------- 练习/考试会话记录（练习历史） ---------- */
    getPracticeLogs: function () { return read(KEYS.practice_logs, []); },

    addPracticeLog: function (log) {
      var list = this.getPracticeLogs();
      log.id = "pl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      log.date = Date.now();
      list.push(log);
      write(KEYS.practice_logs, list);
      return log;
    },

    clearPracticeLogs: function () { write(KEYS.practice_logs, []); },
    clearExams: function () { write(KEYS.exams, []); },

    /* ---------- 题目统计（进度/正确率） ---------- */
    getQStats: function () { return read(KEYS.qstats, {}); },

    recordAttempt: function (id, correct) {
      var st = this.getQStats();
      if (!st[id]) st[id] = { attempts: 0, corrects: 0 };
      st[id].attempts++;
      if (correct) st[id].corrects++;
      write(KEYS.qstats, st);
    },

    /* ---------- 顺序练习续做 ---------- */
    getResume: function () { return read(KEYS.resume, {}); },
    setResume: function (key, index) { var r = this.getResume(); r[key] = index; write(KEYS.resume, r); },
    clearResume: function (key) { var r = this.getResume(); delete r[key]; write(KEYS.resume, r); },

    /* ---------- 设置 ---------- */
    getSettings: function () { return read(KEYS.settings, { seeded: false }); },
    saveSettings: function (s) { write(KEYS.settings, s); },

    /* ---------- 整体统计 ---------- */
    stats: function () {
      var qs = this.getQuestions();
      var st = this.getQStats();
      var attempted = 0, correct = 0;
      Object.keys(st).forEach(function (k) {
        attempted += st[k].attempts; correct += st[k].corrects;
      });
      // 按科目聚合
      var bySubject = {};
      qs.forEach(function (q) {
        if (!bySubject[q.subject]) bySubject[q.subject] = { total: 0, attempts: 0, corrects: 0 };
        bySubject[q.subject].total++;
        var s = st[q.id];
        if (s) { bySubject[q.subject].attempts += s.attempts; bySubject[q.subject].corrects += s.corrects; }
      });
      return {
        totalQuestions: qs.length,
        totalAttempts: attempted,
        totalCorrect: correct,
        accuracy: attempted ? Math.round(correct / attempted * 100) : 0,
        wrongCount: this.getWrong().length,
        examCount: this.getExams().length,
        bySubject: bySubject
      };
    },

    /* ---------- 导入 / 导出 / 清空 ---------- */
    exportAll: function () {
      return {
        version: 2,
        exportedAt: Date.now(),
        questions: this.getQuestions(),
        wrong: this.getWrong(),
        exams: this.getExams(),
        practiceLogs: this.getPracticeLogs(),
        favorites: this.getFavorites(),
        qstats: this.getQStats()
      };
    },

    importAll: function (data, merge) {
      if (!data || !Array.isArray(data.questions)) throw new Error("文件格式不正确");
      if (merge) {
        var exist = this.getQuestions();
        var ids = {}; exist.forEach(function (q) { ids[q.id] = true; });
        data.questions.forEach(function (q) { if (!ids[q.id]) exist.push(q); });
        this.saveQuestions(exist);
        // 收藏取并集，练习历史不跨设备合并（避免重复统计）
        var fav = this.getFavorites();
        (data.favorites || []).forEach(function (id) { if (fav.indexOf(id) < 0) fav.push(id); });
        write(KEYS.favorites, fav);
      } else {
        this.saveQuestions(data.questions || []);
        write(KEYS.wrong, data.wrong || []);
        write(KEYS.exams, data.exams || []);
        write(KEYS.qstats, data.qstats || {});
        write(KEYS.practice_logs, data.practiceLogs || []);
        write(KEYS.favorites, data.favorites || []);
      }
    },

    clearAll: function () {
      Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
    },

    /* 首次使用：整体载入种子数据；版本变更时强制整体换新题库 */
    ensureSeed: function () {
      var s = this.getSettings();
      var seed = global.SEED_QUESTIONS || [];
      var stamp = function (q) { return Object.assign({}, q, { id: uid(), createdAt: Date.now() }); };
      if (!s.seeded) {
        // 全新用户：直接灌入当前种子
        this.saveQuestions(seed.map(stamp));
        s.seeded = true; s.seedVersion = SEED_VERSION; this.saveSettings(s);
      } else if (s.seedVersion !== SEED_VERSION) {
        // 版本升级：整体替换为新题库。旧题 id 已全部失效，清理失效的逐题数据
        // （错题本 / 正确率统计 / 收藏 / 顺序续做），但保留考试记录与练习历史作为档案
        // （它们不依赖具体题号，留作历史记录）。
        this.saveQuestions(seed.map(stamp));
        write(KEYS.wrong, []);
        write(KEYS.qstats, {});
        write(KEYS.favorites, []);
        write(KEYS.resume, {});
        s.seeded = true; s.seedVersion = SEED_VERSION; this.saveSettings(s);
      } else if (seed.length) {
        // 兜底：已使用过但尚缺某些分类，则追加（幂等，不破坏已有题目）
        var have = {};
        this.getQuestions().forEach(function (q) { if (q.subject) have[q.subject] = true; });
        var need = seed.filter(function (q) { return !have[q.subject]; });
        if (need.length) {
          var list = this.getQuestions();
          need.forEach(function (q) { list.push(stamp(q)); });
          this.saveQuestions(list);
        }
      }
    }
  };

  global.Store = Store;
})(window);
