/* ============================================================
 * ANALYTICS ENGINE — كل الحسابات مبنية على البيانات بعد التنظيف.
 * كل دالة تقبل فلترًا وتعيد قيمًا قابلة لإعادة الحساب.
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const DC = window.DataCleaner;

  /* ---------- إحصاءات ---------- */
  function statsVals(vals) {
    const a = vals.filter(function (v) { return v != null && Number.isFinite(v); }).sort(function (x, y) { return x - y; });
    if (!a.length) return { n: 0, sum: null, mean: null, median: null, variance: null, sd: null, min: null, max: null };
    const n = a.length;
    const sum = a.reduce(function (s, v) { return s + v; }, 0);
    const mean = sum / n;
    const mid = Math.floor(n / 2);
    const median = n % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
    const m2 = a.reduce(function (s, v) { const d = v - mean; return s + d * d; }, 0);
    const variance = n > 1 ? m2 / (n - 1) : 0;
    return { n, sum, mean, median, variance, sd: Math.sqrt(variance), min: a[0], max: a[n - 1] };
  }
  function pct(vals) { return vals.map(function (x) { return statsVals([x]).mean; }); }

  /* ---------- أسابيع ---------- */
  function weekInfo(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = (dt.getDay() + 6) % 7;              // 0=Monday
    const monday = new Date(dt);
    monday.setDate(dt.getDate() - day);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const iso = y + '-W' + String(Math.floor((Math.floor((Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()) - Date.UTC(monday.getFullYear(), 0, 1)) / 86400000) / 7) + 1)).padStart(2, '0');
    return {
      key: iso.split('-W')[1],
      label: 'أسبوع ' + String(iso.split('-W')[1]),
      start: y + '-' + pad(monday.getMonth() + 1) + '-' + pad(monday.getDate()),
      end: y + '-' + pad(sunday.getMonth() + 1) + '-' + pad(sunday.getDate())
    };
  }
  function pad(x) { return x < 10 ? '0' + x : String(x); }
  function weekKey(dateStr) { const w = weekInfo(dateStr); return w ? w.start : ''; }
  function inWeek(dateStr, weekStart) { return dateStr && weekKey(dateStr) === weekStart; }

  /* ---------- الفلاتر ---------- */
  function inRange(dateStr, f) {
    if (!dateStr) return true;
    if (f.dateFrom && dateStr < f.dateFrom) return false;
    if (f.dateTo && dateStr > f.dateTo) return false;
    return true;
  }
  function trackMatch(track, f) {
    if (!f.track) return true;
    if (!track) return false;
    return track === f.track;
  }

  /* ---------- الحضور ---------- */
  function attendanceAnalytics(ents, f, ctx) {
    f = f || {};
    const list = ents.filter(function (e) {
      if (!inRange(e.date, f)) return false;
      return trackMatch(e.track, f);
    });
    const valid = list.filter(function (e) { return e.date && !e.flags.dateOutlier; });
    const nRecords = valid.length;
    const uniqueNid = new Set();
    const uniqueName = new Set();
    valid.forEach(function (e) { if (e.nid) uniqueNid.add(e.nid); if (e.name) uniqueName.add(e.name); });
    const uniqCount = Math.max(uniqueNid.size, uniqueName.size);

    const byDate = {};
    valid.forEach(function (e) {
      byDate[e.date] = (byDate[e.date] || 0) + 1;
    });
    const dates = Object.keys(byDate).sort();
    let high = null, highDay = null, low = null, lowDay = null;
    dates.forEach(function (d) {
      if (high == null || byDate[d] > high) { high = byDate[d]; highDay = d; }
      if (low == null || byDate[d] < low) { low = byDate[d]; lowDay = d; }
    });

    const byTrack = {};
    valid.forEach(function (e) { byTrack[e.track] = (byTrack[e.track] || 0) + 1; });

    // Heatmap: يوم × تراك
    const heatDates = dates;
    const tracksHeat = Object.keys(byTrack).sort((a, b) => (byTrack[b] - byTrack[a]));
    const heat = heatDates.map(function (d) {
      return tracksHeat.map(function (t) {
        return { date: d, track: t, value: 0 };
      });
    });
    const cellMap = {};
    valid.forEach(function (e) {
      const k = e.date + '|' + e.track;
      cellMap[k] = (cellMap[k] || 0) + 1;
    });
    heatDates.forEach(function (d, di) {
      tracksHeat.forEach(function (t, ti) {
        heat[di][ti].value = cellMap[d + '|' + t] || 0;
      });
    });

    // التوزيع اليومي الإحصائي
    const dailyVals = dates.map(function (d) { return byDate[d]; });
    const dayStats = statsVals(dailyVals);

    // أيام الأسبوع لمعرفة الصعود والهبوط المتسلسل
    const trend = dates.map(function (d) {
      const idx = dates.indexOf(d);
      const prev = idx > 0 ? byDate[dates[idx - 1]] : null;
      return { date: d, value: byDate[d], prev: prev };
    });

    // مجموعات مكررة (نid + تاريخ)
    const dupCount = valid.reduce(function (acc, e) { const k = e.nid + '|' + e.date; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const multiSameDay = Object.keys(dupCount).filter(function (k) { return dupCount[k] > 1; }).length;

    // بيانات سياقية إضافية للـ Period compare
    const firstDate = dates[0] || null;
    const lastDate = dates.length ? dates[dates.length - 1] : null;

    const weeks = {};
    valid.forEach(function (e) {
      const wk = weekKey(e.date);
      if (!weeks[wk]) weeks[wk] = { count: 0, dates: {} };
      weeks[wk].count++;
      weeks[wk].dates[e.date] = true;
    });

    return {
      nRecords, uniqueNid: uniqueNid.size, uniqueName: uniqueName.size, uniqueParticipants: uniqCount,
      activeDays: dates.length, byDate, dates, firstDate, lastDate,
      highDay, high, lowDay, low,
      avgDaily: dayStats.mean,
      dayStats,
      byTrack, tracks: Object.keys(byTrack),
      heat, heatDates, heatTracks: tracksHeat,
      trend, multiSameDay,
      uniqueNidSet: uniqueNid
    };
  }

  /* ---------- الـ Feedback ---------- */
  function feedbackAnalytics(ents, f) {
    f = f || {};
    const list = ents.filter(function (e) {
      if (!inRange(e.date, f)) return false;
      if (f.trainer && e.trainer !== f.trainer) return false;
      if (f.session && e.session !== f.session) return false;
      if (f.trainingType && e.trainingType !== f.trainingType) return false;
      return true;
    });

    const totals = list.length;
    const overallVals = list.map(function (e) { return e.overall; }).filter(function (v) { return v != null; });
    const overallStats = statsVals(overallVals);

    // متوسط كل محور (على القيم المتاحة مع n لكل محور)
    const dimKeys = Object.keys(C.feedbackDimensions);
    const dims = {};
    dimKeys.forEach(function (k) {
      const vals = list.map(function (e) { return e.dims[k]; }).filter(function (v) { return v != null; });
      const st = statsVals(vals);
      dims[k] = {
        label: C.feedbackDimensions[k].label,
        stats: st,
        n: st.n,
        online: !!C.feedbackDimensions[k].online
      };
    });

    // أعلى / أدنى محور
    const ranked = dimKeys
      .map(function (k) { return dims[k]; })
      .filter(function (d) { return d.n >= C.alerts.minResponsesForMean; })
      .sort(function (a, b) { return b.stats.mean - a.stats.mean; });
    const highest = ranked[0] || null;
    const lowest = ranked.length ? ranked[ranked.length - 1] : null;

    // المشاكل التقنية
    const techAnswered = list.filter(function (e) { return e.techIssue != null; });
    const techYes = techAnswered.filter(function (e) { return e.techIssue === true; });
    const techRate = techAnswered.length ? techYes.length / techAnswered.length : null;
    const bullets = list.filter(function (e) { return e.techNote; }).map(function (e) { return e.techNote; });

    const techCats = categoryTally(bullets);

    // الأداء حسب المدرب (بعد التطبيع)
    const byTrainer = {};
    list.forEach(function (e) {
      const t = e.trainer || 'غير محدد';
      if (!byTrainer[t]) byTrainer[t] = { rows: [] };
      byTrainer[t].rows.push(e);
    });
    const trainerPerf = Object.keys(byTrainer).map(function (t) {
      const rows = byTrainer[t].rows;
      const vals = rows.map(function (e) { return e.overall; }).filter(function (v) { return v != null; });
      const st = statsVals(vals);
      const dimAvg = {};
      dimKeys.forEach(function (k) {
        const vv = rows.map(function (e) { return e.dims[k]; }).filter(function (v) { return v != null; });
        dimAvg[k] = statsVals(vv).mean;
      });
      return { trainer: t, raw: rows[0].trainerRaw, n: rows.length, overall: st, dimAvg: dimAvg, issues: rows.filter(function (e) { return e.techIssue === true; }).length };
    }).sort(function (a, b) { return b.n - a.n; });

    // الجلسات
    const bySession = {};
    list.forEach(function (e) {
      const s = e.session || 'غير محدد';
      if (!bySession[s]) bySession[s] = { rows: [] };
      bySession[s].rows.push(e);
    });
    const sessionPerf = Object.keys(bySession).map(function (s) {
      const rows = bySession[s].rows;
      const vals = rows.map(function (e) { return e.overall; }).filter(function (v) { return v != null; });
      return { session: s, n: rows.length, overall: statsVals(vals), trainers: uniqueArray(rows.map(function (e) { return e.trainer; })) };
    }).sort(function (a, b) { return b.n - a.n; });

    // حسب اليوم
    const byDate = {};
    list.forEach(function (e) {
      if (!e.date) return;
      const v = e.overall;
      if (!byDate[e.date]) byDate[e.date] = { n: 0, vals: [] };
      byDate[e.date].n++;
      if (v != null) byDate[e.date].vals.push(v);
    });
    const trend = Object.keys(byDate).sort().map(function (d) {
      const st = statsVals(byDate[d].vals);
      return { date: d, n: byDate[d].n, avg: st.mean };
    });

    // التوصيات والتدريبات المقترحة
    const recommendations = list.map(function (e) { return e.recommendations; }).filter(function (t) { return t && t !== '.' && !/^(لا|لايوجد|لا يوجد)/ .test(t); });
    const futureSuggestions = list.map(function (e) { return e.future; }).filter(function (t) { return t && t !== '.' && !/^(لا|لايوجد|لا يوجد)/ .test(t); });

    return {
      totals, overallStats,
      dims, ranked, highest, lowest,
      techAnswered: techAnswered.length, techYes: techYes.length, techRate, techCats,
      trainerPerf, sessionPerf, trend,
      recommendations: recommendations.slice(0, 40),
      future: futureSuggestions.slice(0, 30)
    };
  }

  function categoryTally(bullets) {
    const cats = { other: [] };
    Object.keys(C.techIssueCategories).forEach(function (k) { if (k !== 'other') cats[k] = []; });
    bullets.forEach(function (b) {
      const lb = b.toLowerCase();
      let placed = false;
      const keys = Object.keys(C.techIssueCategories);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (k === 'other') continue;
        const kw = C.techIssueCategories[k].keywords;
        if (kw.some(function (w) { return lb.indexOf(w.toLowerCase()) !== -1; })) {
          cats[k].push(b); placed = true; break;
        }
      }
      if (!placed) cats.other.push(b);
    });
    return Object.keys(cats).map(function (k) {
      return { key: k, label: C.techIssueCategories[k].label, count: cats[k].length, samples: cats[k].slice(0, 6) };
    }).filter(function (c) { return c.count > 0; }).sort(function (a, b) { return b.count - a.count; });
  }

  /* ---------- التاسكات ---------- */
  function assignmentAnalytics(ents, f) {
    f = f || {};
    const list = ents.filter(function (e) {
      if (!inRange(e.date, f)) return false;
      return trackMatch(e.campTrack, f);
    });
    const byTrack = {};
    list.forEach(function (e) { byTrack[e.track] = (byTrack[e.track] || 0) + 1; });
    const tracks = Object.keys(byTrack).sort(function (a, b) { return byTrack[b] - byTrack[a]; });

    const byDate = {};
    list.forEach(function (e) { if (e.date) byDate[e.date] = (byDate[e.date] || 0) + 1; });
    const dates = Object.keys(byDate).sort();
    const trend = dates.map(function (d) { return { date: d, value: byDate[d] }; });
    const byWeek = {};
    list.forEach(function (e) { if (e.date) { const wk = weekKey(e.date); byWeek[wk] = (byWeek[wk] || 0) + 1; } });

    const table = tracks.map(function (t) {
      const rows = list.filter(function (e) { return e.track === t; });
      const ds = rows.map(function (e) { return e.date; }).filter(Boolean).sort();
      return {
        track: t, count: rows.length, share: rows.length / (list.length || 1),
        first: ds[0] || null, last: ds[ds.length - 1] || null,
        campTrack: C.assignmentTrackCampMap[t] || null,
        missingLinks: rows.filter(function (e) { return e.flags.missingLink; }).length,
        missingFiles: rows.filter(function (e) { return e.flags.missingFile; }).length
      };
    }).sort(function (a, b) { return b.count - a.count; });

    const quality = {
      missingName: list.filter(function (e) { return e.flags.missingName; }).length,
      missingWhatsapp: list.filter(function (e) { return e.flags.missingWhatsapp; }).length,
      missingLink: list.filter(function (e) { return e.flags.missingLink; }).length,
      missingFile: list.filter(function (e) { return e.flags.missingFile; }).length
    };

    return { totals: list.length, byTrack, tracks, byDate, dates, trend, byWeek, table, quality };
  }

  /* ---------- الاختبارات (Pre / Post) ---------- */
  function assessmentAnalytics(preEnts, postEnts, f) {
    f = f || {};
    function filterQuiz(list) {
      return list.filter(function (e) {
        if (e.isHeader) return false;
        if (!inRange(e.date, f)) return false;
        return trackMatch(e.trackHint, f);
      });
    }
    const pre = filterQuiz(preEnts);
    const post = filterQuiz(postEnts);

    const exams = Object.keys(DC.EXAMS);
    const perExam = {};
    exams.forEach(function (k) {
      const preE = pre.filter(function (e) { return e.exam === k && e.scoreValid; });
      const postE = post.filter(function (e) { return e.exam === k && e.scoreValid; });
      const preRawN = pre.filter(function (e) { return e.exam === k; }).length;
      const postRawN = post.filter(function (e) { return e.exam === k; }).length;
      const preN = preE.length, postN = postE.length;
      perExam[k] = {
        key: k, label: DC.EXAMS[k].label, max: DC.EXAMS[k].max,
        preRawN, postRawN,
        preN, postN,
        preStats: statsVals(preE.map(function (e) { return e.scoreVal; })),
        postStats: statsVals(postE.map(function (e) { return e.scoreVal; })),
        preAvgPct: preN ? 100 * statsVals(preE.map(function (e) { return e.scoreVal; })).mean / DC.EXAMS[k].max : null,
        postAvgPct: postN ? 100 * statsVals(postE.map(function (e) { return e.scoreVal; })).mean / DC.EXAMS[k].max : null
      };
    });

    // على مستوى عام: المتوسط المئوي للنماذج المعروفة فقط (استبعاد 'غير محدد')
    const allPre = pre.filter(function (e) { return e.scoreValid && e.exam !== 'unknown'; });
    const allPost = post.filter(function (e) { return e.scoreValid && e.exam !== 'unknown'; });
    const aggregated = {
      pre: allPre,
      post: allPost,
      preN: allPre.length, postN: allPost.length,
      preStats: statsVals(allPre.map(function (e) { return e.scoreVal; })),
      postStats: statsVals(allPost.map(function (e) { return e.scoreVal; })),
      prePctStats: statsVals(normalizePcts(allPre)),
      postPctStats: statsVals(normalizePcts(allPost)),
      absoluteImprovement: null,
      percentageImprovement: null,
      computeAggregateDelta: function () {
        const a = this.prePctStats.mean, b = this.postPctStats.mean;
        if (a == null || b == null) return;
        this.absoluteImprovement = b - a;
        this.percentageImprovement = a > 0 ? ((b - a) / a) * 100 : null;
      }
    };
    aggregated.computeAggregateDelta();

    const pairedByExam = {};
    exams.forEach(function (k) {
      pairedByExam[k] = pairedForExam(k, pre, post);
    });

    // Paired عام: جمع الأزواج من كل النماذج مع تسوية النسبة المئوية
    const allPairs = [];
    exams.forEach(function (k) { if (pairedByExam[k].available) allPairs.push.apply(allPairs, pairedByExam[k].pairs); });

    const overallPaired = summarizePairs(allPairs);

    return { perExam, aggregated, pairedByExam, overallPaired, preCount: pre.length, postCount: post.length };
  }

  function normalizePcts(list) {
    return list.map(function (e) { return (e.scoreVal / e.maxScore) * 100; }).filter(function (v) { return Number.isFinite(v); });
  }

  function pairedForExam(exam, pre, post) {
    const preClean = pre.filter(function (e) { return e.exam === exam && e.scoreValid && e.hasIdentity; });
    const postClean = post.filter(function (e) { return e.exam === exam && e.scoreValid && e.hasIdentity; });
    if (!preClean.length || !postClean.length) {
      return { available: false, reason: 'لا يوجد ربط متاح', preKeyed: preClean.length, postKeyed: postClean.length, pairs: [] };
    }
    const map = {};
    preClean.forEach(function (e) {
      const k = DC.identityKey(e.id);
      if (!k) return;
      if (!map[k]) map[k] = [];
      map[k].push(e);
    });
    const pairs = [];
    const byMethod = {};
    const usedPost = new Set();
    postClean.forEach(function (e) {
      const k = DC.identityKey(e.id);
      if (!k || usedPost.has(k)) return;
      if (!map[k] || !map[k].length) return;
      const preSide = map[k][0];
      const method = DC.identityKeyMethod(preSide.id) === 'name' ? 'name' : DC.identityKeyMethod(e.id);
      byMethod[method] = (byMethod[method] || 0) + 1;
      const diff = e.scoreVal - preSide.scoreVal;
      const pct = preSide.scoreVal > 0 ? (diff / preSide.scoreVal) * 100 : null;
      pairs.push({
        preNames: preSide.id.name, postNames: e.id.name,
        key: k, method,
        pre: preSide.scoreVal, post: e.scoreVal, preMax: preSide.maxScore,
        diff, pct, improved: diff > 0, declined: diff < 0, unchanged: diff === 0
      });
      usedPost.add(k);
    });
    const sum = summarizePairs(pairs);
    return { available: true, reason: '', preKeyed: preClean.length, postKeyed: postClean.length, pairs, byMethod, summary: sum };
  }

  function summarizePairs(pairs) {
    if (!pairs.length) return {
      n: 0, improved: 0, declined: 0, unchanged: 0,
      preStats: nullStats(), postStats: nullStats(), diffStats: nullStats(),
      pctStats: nullStats(), meanImprovement: null, medianImprovement: null,
      improvedRate: null
    };
    const preVals = pairs.map(function (p) { return p.pre; });
    const postVals = pairs.map(function (p) { return p.post; });
    const diffVals = pairs.map(function (p) { return p.diff; });
    const pctVals = pairs.map(function (p) { return p.pct; }).filter(function (v) { return v != null; });
    const preStats = statsVals(preVals);
    const postStats = statsVals(postVals);
    const diffStats = statsVals(diffVals);
    const pctStats = statsVals(pctVals);
    const improved = pairs.filter(function (p) { return p.improved; }).length;
    const declined = pairs.filter(function (p) { return p.declined; }).length;
    const unchanged = pairs.filter(function (p) { return p.unchanged; }).length;
    const absMean = postStats.mean - preStats.mean;
    const pctMean = preStats.mean > 0 ? (absMean / preStats.mean) * 100 : null;
    return {
      n: pairs.length, improved, declined, unchanged,
      improvedRate: pairs.length ? improved / pairs.length : null,
      preStats, postStats, diffStats, pctStats,
      meanImprovement: absMean, medianImprovement: diffStats.median,
      pctImprovement: pctMean
    };
  }
  function nullStats() { return { n: 0, sum: null, mean: null, median: null, variance: null, sd: null, min: null, max: null }; }

  /* ---------- مصفوفة Tracks ---------- */
  function trackMatrix(att, fb, asg, assess, f) {
    // القائمة الديناميكية من الحضور + تلميحات الاختبارات
    const tracks = uniqueArray((att.tracks || []).concat(Object.keys(assess.perExam).map(function (k) {
      const hint = C.examToTrackMap[k];
      return hint;
    }).filter(Boolean)));
    return tracks.map(function (t) {
      const attRows = att.byTrack ? (att.byTrack[t] || 0) : 0;
      const fbRows = fb.trainerPerf.reduce(function (sum, tp) { return sum; }, 0);
      let fbN = 0, fbAvg = null;
      // feedback لكل تراك عبر ربط المدرب/الجلسة غير متاح مباشرة => يحدد عبر تلميحات الجلسات
      const asgRows = asg.table.filter(function (r) { return r.campTrack === t; }).reduce(function (s, r) { return s + r.count; }, 0);
      let preN = 0, postN = 0, preAvg = null, postAvg = null, pairedN = 0;
      Object.keys(assess.perExam).forEach(function (k) {
        if (C.examToTrackMap[k] !== t) return;
        const pe = assess.perExam[k];
        preN += pe.preN; postN += pe.postN;
        if (pe.preStats.mean != null && preAvg == null) preAvg = pe.preStats.mean;
        if (pe.postStats.mean != null) postAvg = (postAvg == null ? pe.postStats.mean : (postAvg + pe.postStats.mean) / 2);
        if (assess.pairedByExam[k].available) pairedN += assess.pairedByExam[k].pairs.length;
      });
      return {
        track: t,
        attendance: attRows,
        uniqueParticipants: null,
        feedback: null, // بيانات الربط غير متاحة لكل تراك — تظهر "غير متاح"
        feedbackN: fbN, feedbackAvg: fbAvg,
        assignments: asgRows,
        preN, postN, preAvg, postAvg,
        pairedN,
        linkage: {
          attendance: 'متاح', feedback: 'غير متاح من البيانات الحالية', assignments: asgRows > 0 ? 'متاح (اسم المساق)' : 'غير متاح', assessments: preN + postN > 0 ? 'متاح (نموذج الاختبار)' : 'غير متاح'
        }
      };
    });
  }

  function uniqueArray(arr) { return Array.from(new Set(arr.filter(function (x) { return x && x !== ''; }))); }

  /* ---------- مقارنة فترات + حركة الأداء ---------- */
  function periodSplit(list, f, accessor, predicate) {
    // يعيد {cur, prev} حسب الفترة المحددة مقابل نافذة مساوية قبلها
    const lo = f.dateFrom || null, hi = f.dateTo || null;
    if (!lo || !hi) return { cur: list, prev: [] };
    const span = dayDiff(lo, hi);
    const prevEnd = shiftDay(lo, -1);
    const prevStart = shiftDay(lo, -(span + 1));
    function inCur(e) { const d = accessor(e); return d && d >= lo && d <= hi; }
    function inPrev(e) { const d = accessor(e); return d && d >= prevStart && d <= prevEnd; }
    const cur = list.filter(function (e) { return predicate ? predicate(e) && inCur(e) : inCur(e); });
    const prev = list.filter(function (e) { return predicate ? predicate(e) && inPrev(e) : inPrev(e); });
    return { cur, prev };
  }
  function dayDiff(a, b) { const [ay, am, ad] = a.split('-').map(Number); const [by, bm, bd] = b.split('-').map(Number); return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000); }
  function shiftDay(d, n) { const [y, m, dd] = d.split('-').map(Number); const dt = new Date(y, m - 1, dd); dt.setDate(dt.getDate() + n); return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }

  function metricMovement(valueCur, valuePrev) {
    if (valueCur == null && valuePrev == null) return { current: null, previous: null, change: null, changePct: null, direction: 'none' };
    if (valuePrev == null) return { current: valueCur, previous: null, change: null, changePct: null, direction: 'none' };
    const change = valueCur - valuePrev;
    const base = valuePrev;
    const changePct = base !== 0 ? (change / Math.abs(base)) * 100 : null;
    let direction = 'stable';
    const th = C.trendThresholds;
    if (changePct != null && Math.abs(base) >= th.minBase) {
      if (changePct >= th.risePct) direction = 'rising';
      else if (changePct <= th.fallPct) direction = 'declining';
    }
    return { current: valueCur, previous: valuePrev, change, changePct, direction };
  }

  function movementReport(f, attEnts, fbEnts, asgEnts, preEnts, postEnts) {
    const mk = function (valueCur, valuePrev) { return metricMovement(valueCur, valuePrev); };

    // الحضور
    const attCur = attEnts.filter(function (e) { return e.date && (!f.dateFrom || e.date >= f.dateFrom) && (!f.dateTo || e.date <= f.dateTo) && (!f.track || e.track === f.track); }).length;
    const span = (f.dateFrom && f.dateTo) ? dayDiff(f.dateFrom, f.dateTo) + 1 : 7;
    const prevEnd = f.dateFrom ? shiftDay(f.dateFrom, -1) : null;
    const prevStart = prevEnd ? shiftDay(prevEnd, -(span - 1)) : null;
    const attPrev = (f.dateFrom && prevStart)
      ? attEnts.filter(function (e) { return e.date && e.date >= prevStart && e.date <= prevEnd && (!f.track || e.track === f.track); }).length
      : null;

    // Feedback
    function fbIn(lo, hi) { return fbEnts.filter(function (e) { return e.date && e.date >= lo && e.date <= hi; }).length; }
    const fbCur = (f.dateFrom && f.dateTo) ? fbIn(f.dateFrom, f.dateTo) : fbEnts.length;
    const fbPrev = (prevStart && prevEnd) ? fbIn(prevStart, prevEnd) : null;

    // تاسكات
    function asgIn(lo, hi) { return asgEnts.filter(function (e) { return e.date && e.date >= lo && e.date <= hi; }).length; }
    const asgCur = (f.dateFrom && f.dateTo) ? asgIn(f.dateFrom, f.dateTo) : asgEnts.length;
    const asgPrev = (prevStart && prevEnd) ? asgIn(prevStart, prevEnd) : null;

    // متوسط الـ Feedback
    function fbAvgIn(lo, hi) { const l = fbEnts.filter(function (e) { return e.date && e.date >= lo && e.date <= hi && e.overall != null; }); return statsVals(l.map(function (e) { return e.overall; })).mean; }
    const avgCur = (f.dateFrom && f.dateTo) ? fbAvgIn(f.dateFrom, f.dateTo) : statsVals(fbEnts.map(function (e) { return e.overall; }).filter(function (v) { return v != null; })).mean;
    const avgPrev = (prevStart && prevEnd) ? fbAvgIn(prevStart, prevEnd) : null;

    const rows = [
      { metric: 'حضور (عدد السجلات)', current: attCur, previous: attPrev, move: mk(attCur, attPrev) },
      { metric: 'الاستجابات (Feedback)', current: fbCur, previous: fbPrev, move: mk(fbCur, fbPrev) },
      { metric: 'تسليم التاسكات', current: asgCur, previous: asgPrev, move: mk(asgCur, asgPrev) },
      { metric: 'متوسط التقييم العام', current: avgCur, previous: avgPrev, move: mk(avgCur, avgPrev) }
    ];
    return { rows, spanNote: span + ' يومًا لكل فترة' };
  }

  /* ---------- بيانات جودة البيانات ---------- */
  function dataQuality(raw, cleanedPer) {
    const out = {};
    const rows = raw.sheets;
    function sheetRows(name) { return (rows[name] && rows[name].rows) || []; }

    const att = cleanedPer.attendance;
    out.attendance = {
      total: att.length,
      missingName: att.filter(function (e) { return e.flags.missingName; }).length,
      missingNid: att.filter(function (e) { return e.flags.missingNid; }).length,
      missingDate: att.filter(function (e) { return e.flags.missingDate; }).length,
      dateOutliers: att.filter(function (e) { return e.flags.dateOutlier; }).length,
      duplicateExact: att.filter(function (e) { return e.flags.duplicateExact; }).length,
      uniqueNid: new Set(att.map(function (e) { return e.nid; }).filter(Boolean)).size,
      multiSameDay: attAnalyticsMulti(att)
    };

    const fb = cleanedPer.feedback;
    out.feedback = {
      total: fb.length,
      missingSession: fb.filter(function (e) { return e.flags.missingSession; }).length,
      missingTrainer: fb.filter(function (e) { return e.flags.missingTrainer; }).length,
      shortForm: fb.filter(function (e) { return e.flags.shortForm; }).length,
      duplicateUuid: fb.filter(function (e) { return e.flags.duplicateUuid; }).length,
      offlineColumnsEmpty: true,
      onlineMissingDetail: fb.filter(function (e) { return e.dimCount > 0 && e.dimCount < 10; }).length
    };

    const asg = cleanedPer.assignment;
    out.assignment = {
      total: asg.length,
      missingName: asg.filter(function (e) { return e.flags.missingName; }).length,
      missingWhatsapp: asg.filter(function (e) { return e.flags.missingWhatsapp; }).length,
      missingLink: asg.filter(function (e) { return e.flags.missingLink; }).length,
      missingFile: asg.filter(function (e) { return e.flags.missingFile; }).length,
      missingBoth: asg.filter(function (e) { return e.flags.missingBoth; }).length,
      duplicateRowCandidates: countDupByKey(asg.map(function (e) { return (e.ts || '') + '|' + e.track + '|' + (e.file || e.link || ''); }))
    };

    const pre = cleanedPer.prequiz, post = cleanedPer.postquiz;
    function quizDQ(list, name) {
      return {
        name,
        total: list.length,
        headerRows: list.filter(function (e) { return e.isHeader; }).length,
        nonNumeric: list.filter(function (e) { return e.flags.nonNumericScore && !e.isHeader; }).length,
        outOfRange: list.filter(function (e) { return e.flags.scoreOutOfRange; }).length,
        noIdentity: list.filter(function (e) { return e.flags.noIdentity && !e.isHeader; }).length,
        byExam: countBy(list.filter(function (e) { return !e.isHeader; }), 'exam')
      };
    }
    out.prequiz = quizDQ(pre, 'Prequiz');
    out.postquiz = quizDQ(post, 'Postquiz');

    // أعمدة أو صفوف غير مستخدمة
    out.globalNotes = [
      'feedback: الأعمدة الحضورية (14–18) فارغة 100%',
      'feedback: لا صف قالب داخل البيانات (البيانات الفعلية 232)',
      'assignment: العمود 7 (رابط التاسك المكرر) فارغ 100%',
      'assignment: لا توجد بيانات إلزامية للتسليم — لا يُحسب Completion Rate',
      'prequiz/postquiz: نماذج اختبار متعددة مدمجة في sheet واحد — تُصنَّف تلقائيًا',
      'attendence: صف واحد بتاريخ 2024-06-09 خارج فترة الكامب'
    ];
    return out;
  }
  function attAnalyticsMulti(att) {
    const map = {};
    att.forEach(function (e) {
      const k = e.nid + '|' + e.date;
      if (k && e.nid && e.date) map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).filter(function (k) { return map[k] > 1; }).length;
  }
  function countDupByKey(keys) {
    const m = {};
    keys.forEach(function (k) { if (k && k !== '||') m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).filter(function (k) { return m[k] > 1; }).length;
  }
  function countBy(list, prop) {
    const m = {};
    list.forEach(function (e) { const v = e[prop]; m[v] = (m[v] || 0) + 1; });
    return m;
  }

  /* ---------- التسجيل camp_registration ----------
   * ملخص سريع (متوسطات المهارات، المحافظات، اللجان، الجاهزية،
   * نقاط القوة والضعف من الأرقام مباشرة). */
  function registrationAnalytics(reg, f) {
    f = f || {};
    const headers = (reg && reg.headers) || [];
    const rows = (reg && reg.rows) || [];
    const idx = {};
    headers.forEach(function (h, i) { idx[String(h).trim()] = i; });
    function col(name) { return idx[name]; }
    function get(r, name) { const i = col(name); return (i == null || typeof r[i] === 'undefined' || r[i] == null) ? '' : String(r[i]).trim(); }
    function addCount(map, v) { if (v && v !== '—') map[v] = (map[v] || 0) + 1; }

    function tsToDate(ts) {
      const d = String(ts).trim();
      if (/^\d+(\.\d+)?$/.test(d)) {
        const dt = new Date((parseFloat(d) - 25569) * 86400000);
        if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
      const m = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m) {
        const mo = +m[1], da = +m[2], yr = +m[3];
        const t2 = new Date(yr, mo - 1, da);
        if (!isNaN(t2.getTime())) return yr + '-' + String(mo < 10 ? '0' + mo : mo) + '-' + String(da < 10 ? '0' + da : da);
      }
      return null;
    }

    const realRows = rows.filter(function (r) {
      if (!r || !r.length) return false;
      const ts = get(r, 'Timestamp');
      if (!ts || ts === 'Timestamp' || /^timestamp$/i.test(ts)) return false;
      const nid = get(r, 'National ID');
      const name = get(r, 'Full Name');
      if (DC.isExcludedName(name)) return false;
      return ts || nid || name;
    });

    const filtered = realRows.filter(function (r) {
      return inRange(tsToDate(get(r, 'Timestamp')), f);
    });

    const total = filtered.length;
    const uniqueNid = new Set();
    const byGov = {}, byUni = {}, byCommittee = {}, byTrack = {}, byStatus = {}, byApplicant = {}, byPosition = {};
    let firstDate = null, lastDate = null;
    filtered.forEach(function (r) {
      const nid = get(r, 'National ID');
      if (/^\d{14}$/.test(nid)) uniqueNid.add(nid);
      addCount(byGov, get(r, 'Governorate'));
      addCount(byUni, get(r, 'University'));
      addCount(byCommittee, get(r, 'Committee'));
      addCount(byTrack, get(r, 'Track 1'));
      const t2 = get(r, 'Track 2');
      if (t2 && t2 !== get(r, 'Track 1')) addCount(byTrack, t2);
      addCount(byStatus, get(r, 'Status'));
      addCount(byApplicant, get(r, 'Applicant Type'));
      addCount(byPosition, get(r, 'Current Position'));
      const d = tsToDate(get(r, 'Timestamp'));
      if (d) { if (!firstDate || d < firstDate) firstDate = d; if (!lastDate || d > lastDate) lastDate = d; }
    });

    function topMap(map, n, filterFn) {
      return Object.keys(map)
        .filter(function (k) { return filterFn ? filterFn(k, map[k]) : true; })
        .sort(function (a, b) { return map[b] - map[a]; })
        .slice(0, n == null ? 10 : n)
        .map(function (k) { return { name: k, count: map[k] }; });
    }

    const skillKeys = ['Leadership', 'Team Management', 'Communication', 'Planning', 'Teamwork', 'Time Management', 'Problem Solving', 'Event Management', 'Follow-up'];
    const skillLabels = {
      Leadership: 'القيادة', 'Team Management': 'إدارة الفريق', Communication: 'التواصل', Planning: 'التخطيط',
      Teamwork: 'العمل الجماعي', 'Time Management': 'إدارة الوقت', 'Problem Solving': 'حل المشكلات',
      'Event Management': 'إدارة الفعاليات', 'Follow-up': 'المتابعة'
    };
    const skills = skillKeys.map(function (k) {
      const vals = filtered.map(function (r) { const v = get(r, k); return v === '' ? null : +v; })
        .filter(function (v) { return v != null && Number.isFinite(v) && v >= 1 && v <= 5; });
      const st = statsVals(vals);
      return { key: k, label: skillLabels[k], stats: st, mean: st.mean, n: st.n };
    });
    const rated = skills.filter(function (s) { return s.n >= 3; });
    const avgSkill = rated.length ? rated.reduce(function (s, x) { return s + x.mean; }, 0) / rated.length : null;
    const strengths = rated.slice().sort(function (a, b) { return (b.mean - a.mean) || (b.n - a.n); }).slice(0, 4);
    const weaknesses = rated.slice().sort(function (a, b) { return (a.mean - b.mean) || (a.n - b.n); }).slice(0, 4);

    function yesNoTotal(colName) {
      let yes = 0, no = 0;
      filtered.forEach(function (r) {
        const v = get(r, colName);
        if (v === 'نعم') yes++; else if (v && v !== 'لا' && v !== 'نعم' && v !== '') no++; else if (v === 'لا') no++;
      });
      const t = yes + no;
      return { yes, no, total: t, pct: t ? yes / t : null };
    }
    const readinessItems = [
      { key: 'laptop', label: 'يملك حاسوبًا محمولًا', col: 'Has Laptop' },
      { key: 'phone', label: 'يملك هاتفًا ذكيًا', col: 'Has Smartphone' },
      { key: 'gmail', label: 'يملك Gmail', col: 'Has Gmail' },
      { key: 'drive', label: 'Google Drive', col: 'Google Drive' },
      { key: 'sheets', label: 'Google Sheets', col: 'Google Sheets' },
      { key: 'forms', label: 'Google Forms', col: 'Google Forms' },
      { key: 'canva', label: 'Canva', col: 'Canva' }
    ].map(function (it) { const s = yesNoTotal(it.col); return { key: it.key, label: it.label, col: it.col, yes: s.yes, no: s.no, total: s.total, pct: s.pct }; });

    const willYes = filtered.filter(function (r) { return get(r, 'Will Attend All Days') === 'نعم'; }).length;
    const agree80 = filtered.filter(function (r) { return get(r, 'Agree 80%') === 'نعم'; }).length;
    const wantLead = filtered.filter(function (r) { return get(r, 'Want Leadership Position') === 'نعم'; }).length;
    const currentMember = filtered.filter(function (r) { return get(r, 'Is Current Member') === 'نعم'; }).length;
    const newApplicants = filtered.filter(function (r) { return get(r, 'Applicant Type') === 'جديد'; }).length;
    const seniorPositions = filtered.filter(function (r) {
      const p = get(r, 'Current Position');
      return p && (p.indexOf('مركزي') !== -1 || p.indexOf('لجنة') !== -1);
    }).length;
    const internet = {};
    filtered.forEach(function (r) { addCount(internet, get(r, 'Internet Quality')); });
    const internetTop = topMap(internet, 5);

    const excelInternet = (internet['ممتاز'] || 0);

    // نقاط القوة والضعف المبنية على الأرقام مباشرة
    const insights = [];
    strengths.forEach(function (s) {
      insights.push({ type: 'strength', title: 'مهارة «' + s.label + '»', value: s.mean.toFixed(2) + ' / 5', note: 'متوسط من ' + s.n + ' مستجيبًا' });
    });
    weaknesses.forEach(function (s) {
      insights.push({ type: 'weakness', title: 'مهارة «' + s.label + '»', value: s.mean.toFixed(2) + ' / 5', note: 'الأدنى بين المهارات (ن=' + s.n + ')' });
    });
    readinessItems.forEach(function (it) {
      if (it.pct != null && it.pct >= 0.9) insights.push({ type: 'strength', title: 'الجاهزية: ' + it.label, value: (it.pct * 100).toFixed(0) + '%', note: 'من أصل ' + it.total + ' مسجّلًا' });
      if (it.pct != null && it.pct < 0.55) insights.push({ type: 'weakness', title: 'الجاهزية: ' + it.label, value: (it.pct * 100).toFixed(0) + '%', note: 'يحتاج خطة تمكين' });
    });
    if (total) {
      const willPct = willYes / total;
      const internPct = (excelInternet + (internet['جيد جداً'] || 0)) / total;
      const leadPct = wantLead / total;
      const newPct = newApplicants / total;
      insights.push(willPct >= 0.75 ? { type: 'strength', title: 'الالتزام بالحضور', value: (willPct * 100).toFixed(0) + '%', note: 'أكدوا المشاركة في كل الأيام' } :
        { type: 'weakness', title: 'الالتزام بالحضور', value: (willPct * 100).toFixed(0) + '%', note: 'أقل من 75% يؤكدون الحضور كل الأيام' });
      insights.push(internPct >= 0.55 ? { type: 'strength', title: 'جودة الإنترنت', value: (internPct * 100).toFixed(0) + '%', note: 'ممتاز أو جيد جدًا' } :
        { type: 'weakness', title: 'جودة الإنترنت', value: (internPct * 100).toFixed(0) + '%', note: 'بنية تحتية ضعيفة لمعظم المسجلين' });
      insights.push(leadPct >= 0.4 ? { type: 'strength', title: 'الطموح القيادي', value: (leadPct * 100).toFixed(0) + '%', note: 'يرغبون في تولي منصب قيادي' } :
        { type: 'weakness', title: 'الطموح القيادي', value: (leadPct * 100).toFixed(0) + '%', note: 'نسبة منخفضة من يرغب في القيادة' });
      insights.push(newPct >= 0.35 ? { type: 'strength', title: 'جذب أعضاء جدد', value: (newPct * 100).toFixed(0) + '%', note: 'مسجلون جدد' } :
        { type: 'weakness', title: 'جذب أعضاء جدد', value: (newPct * 100).toFixed(0) + '%', note: 'الأغلبية من الأعضاء القدامى' });
    }

    return {
      totals: total,
      sheetTotal: realRows.length,
      headerRows: rows.length - realRows.length,
      uniqueNid: uniqueNid.size,
      firstDate, lastDate,
      governorates: topMap(byGov, 8),
      universities: topMap(byUni, 8),
      committees: topMap(byCommittee, 8),
      tracks: topMap(byTrack, 8),
      status: topMap(byStatus, 6),
      applicantTypes: topMap(byApplicant, 4),
      positions: topMap(byPosition, 6),
      skills, rated, avgSkill, strengths, weaknesses,
      readiness: readinessItems,
      willAttendPct: total ? willYes / total : null,
      agree80Pct: total ? agree80 / total : null,
      wantLeadPct: total ? wantLead / total : null,
      currentMemberPct: total ? currentMember / total : null,
      newApplicantPct: total ? newApplicants / total : null,
      seniorPositions, seniorPct: total ? seniorPositions / total : null,
      internet, internetTop, insights
    };
  }

  window.Analytics = {
    statsVals, weekInfo, weekKey, inWeek, normalizePcts, summarizePairs,
    attendanceAnalytics, feedbackAnalytics, assignmentAnalytics,
    assessmentAnalytics, trackMatrix, movementReport, dataQuality,
    periodSplit, metricMovement, registrationAnalytics
  };
})();