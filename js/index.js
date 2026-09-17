/* ============================================================
 * INDEX.JS — صفحة النظرة التنفيذية
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const FMT = function () { return window.Dashboard.fmt; };

  function esc(s) { return window.AppHelpers.esc(s); }
  function DeltaBadge(m) {
    if (!m || m.direction === 'none' || m.current == null || m.previous == null) return '<span class="badge gray">قاعدة بيانات غير كافية</span>';
    if (m.direction === 'rising') return '<span class="delta up">▲ +' + (+(m.changePct != null ? m.changePct : 0)).toFixed(1) + '%</span>';
    if (m.direction === 'declining') return '<span class="delta down">▼ ' + (+(m.changePct != null ? m.changePct : 0)).toFixed(1) + '%</span>';
    return '<span class="delta flat">— 0%</span>';
  }

  function renderKPIs(r) {
    const el = document.getElementById('kpi-overview');
    const a = r.attendance, fb = r.feedback, asg = r.assignment, as = r.assessment;
    const overallStat = fb.overallStats;
    const overallPct = overallStat.mean != null ? (overallStat.mean / 4) * 100 : null;

    const cards = [
      kpi('سجلات الحضور', FMT().num(a.nRecords), 'فترة الفلتر', 'var(--c-primary)'),
      kpi('مشاركون نشطون', FMT().num(a.uniqueParticipants), 'أسماء/أرقام قومية فريدة', 'var(--c-primary)'),
      kpi('متوسط الحضور اليومي', FMT().stat2(a.avgDaily), 'أيام فعالة: ' + a.activeDays, 'var(--c-primary)'),
      kpi('استجابات التقييم', FMT().num(fb.totals), 'تقني ' + (fb.techRate == null ? '—' : FMT().pct1(fb.techRate * 100)), 'var(--c-accent)', true),
      kpi('متوسط التقييم العام', overallStat.mean != null ? FMT().stat2(overallStat.mean) + ' <small>/ 4</small>' : '—', overallPct != null ? '≈ ' + FMT().stat1(overallPct) + '%' : '—', 'var(--c-accent)', true),
      kpi('تسليم تاسكات', FMT().num(asg.totals), asg.totals ? 'رابط/ملف لكل تسليم' : '—', 'var(--c-accent)', true),
      kpi('أزواج الربط (قبل/بعد)', FMT().num(as.overallPaired.n), 'مستخدمو الهوية المشتركة', 'var(--c-primary)'),
      kpi('المسارات', a.tracks.length, 'حضور فعلي', 'var(--c-primary)')
    ];
    el.innerHTML = cards.join('');
  }

  function kpi(label, value, foot, color, accent) {
    return '<div class="kpi' + (accent ? ' accent' : '') + '"><div class="kpi-rule" style="background:' + color + '"></div>' +
      '<div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  function renderAttTrend(r) {
    const a = r.attendance;
    const opt = Charts.lineOpt(a.dates, a.dates.map(function (d) { return a.byDate[d]; }), null, true);
    opt.xAxis.axisLabel.rotate = 35;
    opt.series[0].itemStyle = { color: C.colors.primary };
    opt.areaStyle = { opacity: 0.08 };
    opt.yAxis.name = 'سجلات';
    opt.yAxis.nameTextStyle = { fontFamily: '"IBM Plex Sans Arabic", sans-serif' };
    Charts.chart('chart-att-trend', opt);
  }

  function renderAttTrack(r) {
    const a = r.attendance;
    const data = Object.keys(a.byTrack).sort(function (x, y) { return a.byTrack[y] - a.byTrack[x]; })
      .map(function (k) { return { name: k, value: a.byTrack[k] }; });
    Charts.chart('chart-att-track', Charts.donutOpt(data));
  }

  function renderAttHeat(r) {
    const a = r.attendance;
    const matrix = a.heat.map(function (col) { return col.map(function (c) { return c.value; }); });
    Charts.chart('chart-att-heat', Charts.heatmapOpt(a.heatDates, a.heatTracks, matrix), { resize: true });
  }

  function renderFbDims(r) {
    const fb = r.feedback;
    const minN = C.alerts.minResponsesForMean;
    const dims = Object.keys(fb.dims)
      .map(function (k) { return fb.dims[k]; })
      .filter(function (d) { return d.n >= minN; });
    if (!dims.length) {
      Charts.chart('chart-fb-dims', emptyChart('لا توجد بيانات كافية لمحاور التقييم في هذا النطاق'));
      return;
    }
    const opt = Charts.radarOpt(
      dims.map(function (d) { return { name: (d.label || '').replace(/^تقييم /, '') + ' — ن=' + d.n, max: 4 }; }),
      [{ value: dims.map(function (d) { return +(d.stats.mean != null ? d.stats.mean : 0).toFixed(2); }), name: 'المتوسط', areaStyle: { color: C.colors.primary, opacity: 0.18 } }]
    );
    Charts.chart('chart-fb-dims', opt);
  }

  function renderFbTrend(r) {
    const fb = r.feedback;
    const cats = fb.trend.map(function (t) { return t.date; });
    const counts = fb.trend.map(function (t) { return t.n; });
    const avgs = fb.trend.map(function (t) { return t.avg == null ? null : +(t.avg.toFixed(2)); });
    const opt = {
      legend: { show: true, data: ['عدد الاستجابات', 'متوسط التقييم'] },
      xAxis: { type: 'category', data: cats, axisLabel: { rotate: 35, fontSize: 10 } },
      yAxis: [
        { type: 'value', name: 'استجابة' },
        { type: 'value', name: 'متوسط', max: 4, min: 0 }
      ],
      series: [
        { name: 'عدد الاستجابات', type: 'bar', data: counts, barMaxWidth: 22, itemStyle: { color: C.colors.primaryLight, opacity: .85 } },
        { name: 'متوسط التقييم', type: 'line', yAxisIndex: 1, data: avgs, smooth: true, symbolSize: 6, lineStyle: { color: C.colors.accent, width: 2.5 } }
      ],
      tooltip: { trigger: 'axis' },
      grid: { top: 40, bottom: 40, left: 60, right: 60, containLabel: true }
    };
    Charts.chart('chart-fb-trend', opt);
  }

  function renderAsgTrack(r) {
    const asg = r.assignment;
    const data = asg.tracks.map(function (t) { return { name: t, value: asg.byTrack[t] }; });
    Charts.chart('chart-asg-track', Charts.donutOpt(data));
  }

  function renderAssessAgg(r) {
    const as = r.assessment;
    const cats = [];
    const pre = [], post = [];
    Object.keys(as.perExam).forEach(function (k) {
      const e = as.perExam[k];
      if (e.preN === 0 && e.postN === 0) return;
      cats.push(shortLabel(e.label));
      pre.push(e.preAvgPct == null ? null : +(e.preAvgPct.toFixed(1)));
      post.push(e.postAvgPct == null ? null : +(e.postAvgPct.toFixed(1)));
    });
    const opt = Charts.groupBarOpt(cats, [
      { name: 'قبل (Pre)', data: pre },
      { name: 'بعد (Post)', data: post }
    ].filter(function (s) { return s.data.some(function (v) { return v != null; }); }));
    opt.yAxis.name = '%';
    opt.yAxis.nameTextStyle = { fontFamily: '"IBM Plex Sans Arabic", sans-serif' };
    Charts.chart('chart-assess-agg', opt);
  }

  function shortLabel(label) {
    if (label.indexOf('(') !== -1) return label.split('(')[0].trim();
    return label;
  }

  function renderMovement(r) {
    const el = document.getElementById('movement-table');
    const rows = r.movement.rows;
    const body = rows.map(function (row) {
      const m = row.move;
      return '<tr><td>' + row.metric + '</td>' +
        '<td class="num">' + (row.current == null ? '—' : FMT().num(+row.current.toFixed(2))) + '</td>' +
        '<td class="num">' + (row.previous == null ? '—' : FMT().num(+row.previous.toFixed(2))) + '</td>' +
        '<td>' + DeltaBadge(m) + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="tbl"><thead><tr><th>المؤشر</th><th class="num">الفترة الحالية</th><th class="num">الفترة السابقة</th><th>الاتجاه</th></tr></thead><tbody>' + body + '</tbody></table>';
    const note = document.createElement('p');
    note.className = 'note-line';
    note.textContent = 'ملاحظة المنهجية: ' + r.movement.spanNote;
    el.appendChild(note);
  }

  function renderAlerts(r) {
    const el = document.getElementById('alerts');
    const a = r.attendance, fb = r.feedback, as = r.assessment;
    const alerts = [];

    const dailyBottom = a.dates.length && a.dayStats.mean * (1 - 0.35);
    if (a.dates.length && a.dayStats.mean < 15) {
      alerts.push(['warn', 'متوسط الحضور اليومي ' + FMT().stat1(a.dayStats.mean) + ' سجلًا — أقل من خط الأساس المرجعي (15).']);
    }
    if (fb.techRate != null && fb.techRate > 0.12) {
      alerts.push(['danger', 'نسبة الشكاوى التقنية ' + FMT().pct1(fb.techRate * 100) + ' — تتجاوز العتبة (12%)']);
    }
    const fbNoSession = fb.totals && (window.Dashboard.dataset.feedback.filter(function (e) { return e.flags.missingSession; }).length);
    if (fbNoSession) {
      alerts.push(['info', 'عدد استجابات التقييم دون تحديد جلسة/مدرب: ' + fbNoSession + ' — تُعرض تحت "غير محدد".']);
    }
    if (as.overallPaired.n === 0) {
      alerts.push(['info', 'لا يوجد أزواج قبل/بعد قابلة للربط على مستوى الكامب لهذه الفترة.']);
    } else {
      alerts.push(['ok', 'أزواج الربط: ' + as.overallPaired.n + ' — تحسّن ' + as.overallPaired.improved + '، تراجع ' + as.overallPaired.declined + '، ثبات ' + as.overallPaired.unchanged + '.']);
    }
    if (!alerts.length) {
      alerts.push(['ok', 'لا توجد تنبيهات تتجاوز العتبات المحددة في هذه الفترة.']);
    }
    el.innerHTML = alerts.map(function (x) {
      const ic = { info: 'ℹ', warn: '⚠', danger: '✕', ok: '✓' }[x[0]] || 'ℹ';
      return '<div class="alert ' + x[0] + '"><span class="a-ico">' + ic + '</span><span>' + x[1] + '</span></div>';
    }).join('');
  }

  function emptyChart(msg) {
    return {
      title: { text: msg, left: 'center', top: 'middle', textStyle: { fontSize: 14, color: '#9FB3C8', fontWeight: 400, fontFamily: '"IBM Plex Sans Arabic", sans-serif' } },
      xAxis: { show: false }, yAxis: { show: false }, series: []
    };
  }

  function renderAll() {
    const D = window.Dashboard;
    if (!D || !D.results) return;
    const r = D.results;
    renderKPIs(r);
    renderAttTrend(r);
    renderAttTrack(r);
    renderAttHeat(r);
    renderFbDims(r);
    renderFbTrend(r);
    renderAsgTrack(r);
    renderAssessAgg(r);
    renderMovement(r);
    renderAlerts(r);
  }

  function bindExports() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-export]');
      if (!btn) return;
      Charts.exportPNG(btn.dataset.export, btn.dataset.export);
    });
  }

  window.addEventListener('campReady', renderAll);
  window.addEventListener('campResultsUpdated', renderAll);
  document.addEventListener('DOMContentLoaded', bindExports);
})();