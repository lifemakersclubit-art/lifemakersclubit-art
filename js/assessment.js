/* ============================================================
 * ASSESSMENT.JS — صفحة القياس والاختبارات
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const FMT = function () { return window.Dashboard.fmt; };

  function kpi(label, value, foot) {
    return '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  function renderKPIs(as) {
    const el = document.getElementById('kpi-assessment');
    const agg = as.aggregated;
    const op = as.overallPaired;
    const cards = [
      kpi('قبل (سجلات خام)', FMT().num(as.preCount), 'بعد استبعاد صفوف القوالب تلقائيًا'),
      kpi('بعد (سجلات خام)', FMT().num(as.postCount), FMT().num(agg.post.length) + ' منها بدرجة صحيحة'),
      kpi('نتائج صحيحة قبل', FMT().num(agg.preN)),
      kpi('نتائج صحيحة بعد', FMT().num(agg.postN)),
      kpi('المتوسط المئوي قبل', agg.prePctStats.mean != null ? FMT().pct1(agg.prePctStats.mean) : '—'),
      kpi('المتوسط المئوي بعد', agg.postPctStats.mean != null ? FMT().pct1(agg.postPctStats.mean) : '—'),
      kpi('أزواج مرتطبة', FMT().num(op.n), op.meanImprovement != null ? 'متوسط الفرق: ' + FMT().stat2(op.meanImprovement) + ' نقطة' : ''),
      kpi('الاتجاه المزدوج', op.improved + '▲ / ' + op.declined + '▼ / ' + op.unchanged + '—')
    ];
    // ملاحظة المنهجية
    cards.push('<div class="kpi accent" style="grid-column:span 2"><div class="kpi-rule"></div><div class="kpi-label">ملاحظات المقارنة المُجمّعة</div><div class="kpi-value" style="font-size:1.05rem">' +
      (agg.preN && agg.postN ? 'فرق مئوي (Aggregate): ' + (agg.absoluteImprovement == null ? '—' : FMT().stat2(agg.absoluteImprovement) + ' نقطة مئوية') + ' — يُفسَّر بحذر نظرًا لاختلاف أسئلة النماذج.' : 'لا توجد بيانات صحيحة قبل وبعد معًا في الفترة.') +
      '</div><div class="kpi-foot">الـ Paired هو المصدر الأساسي الموثوق للاتجاه</div></div>');
    el.innerHTML = cards.join('');
  }

  function renderAgg(as) {
    const cats = [], pre = [], post = [];
    Object.keys(as.perExam).forEach(function (k) {
      const e = as.perExam[k];
      if (e.preN === 0 && e.postN === 0) return;
      cats.push(short(e.label));
      pre.push(e.preAvgPct == null ? null : +e.preAvgPct.toFixed(1));
      post.push(e.postAvgPct == null ? null : +e.postAvgPct.toFixed(1));
    });
    const opt = Charts.groupBarOpt(cats, [
      { name: 'قبل', data: pre }, { name: 'بعد', data: post }
    ].filter(function (s) { return s.data.some(function (v) { return v != null; }); }));
    opt.yAxis.name = '%';
    opt.yAxis.nameTextStyle = { fontFamily: '"IBM Plex Sans Arabic", sans-serif' };
    opt.yAxis.max = 100;
    opt.tooltip.formatter = function (p) {
      return p[0].axisValue + '<br>' + p.map(function (o) { return o.marker + o.seriesName + ': <b>' + (o.value == null ? '—' : o.value + '%') + '</b>'; }).join('<br>');
    };
    Charts.chart('assess-agg', opt);
  }

  function renderPaired(as) {
    const el = document.getElementById('paired-summary');
    const op = as.overallPaired;
    if (!op.n) {
      el.innerHTML = '<div class="alert info"><span class="a-ico">ℹ</span><span>لا توجد أزواج مرتبطة في هذه الفترة — معظم نماذج القياس لا تحمل هوية (قيادة/محتوى) أو لا توجد نسخة بعدية (محتوى/متقدم).</span></div>';
      return;
    }
    const st = op.preStats, ds = op.diffStats;
    el.innerHTML =
      '<div class="stat-row">' +
      sc('الأزواج', FMT().num(op.n)) +
      sc('تحسّن', FMT().num(op.improved), 'نسبة: ' + FMT().pct1(op.improvedRate * 100)) +
      sc('تراجع', FMT().num(op.declined)) +
      sc('ثبات', FMT().num(op.unchanged)) +
      sc('متوسط قبل', st.mean != null ? FMT().stat2(st.mean) : '—') +
      sc('متوسط بعد', op.postStats.mean != null ? FMT().stat2(op.postStats.mean) : '—') +
      sc('متوسط الفرق', ds.mean != null ? FMT().stat2(ds.mean) : '—', ds.sd != null ? 'انحراف معياري: ' + FMT().stat2(ds.sd) : '') +
      sc('متوسط الفرق المتوسطي', ds.median != null ? FMT().stat2(ds.median) : '—') +
      '</div>' +
      (op.pctImprovement != null ? '<p class="note-line">التحسن المئوي على المتوسط: ' + FMT().stat1(op.pctImprovement) + '% — نطاق تغير النسب الفردية ينبغي مراجعته من بيانات التفاصيل.</p>' : '');
  }
  function sc(label, value, note) {
    return '<div class="stat-cell"><div class="sc-label">' + label + '</div><div class="sc-value">' + value + '</div>' + (note ? '<div class="sc-note">' + note + '</div>' : '') + '</div>';
  }

  function renderTable(as) {
    const el = document.getElementById('per-exam-table');
    const rows = Object.keys(as.perExam).map(function (k) {
      const e = as.perExam[k];
      const p = as.pairedByExam[k];
      const pairedCell = p.available
        ? '<span class="badge blue">' + p.pairs.length + ' زوج</span> <span class="micro">' + p.summary.improved + '▲</span>'
        : '<span class="na-badge">' + (p.reason || 'غير متاح') + '</span>';
      return '<tr><td>' + e.label + '</td>' +
        '<td class="num">' + e.max + '</td>' +
        '<td class="num rtl">' + e.preRawN + ' (صحيح: ' + e.preN + ')</td>' +
        '<td class="num rtl">' + e.postRawN + ' (صحيح: ' + e.postN + ')</td>' +
        '<td class="num">' + (e.preAvgPct == null ? '—' : FMT().stat1(e.preAvgPct) + '%') + '</td>' +
        '<td class="num">' + (e.postAvgPct == null ? '—' : FMT().stat1(e.postAvgPct) + '%') + '</td>' +
        '<td>' + pairedCell + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="tbl"><thead><tr><th>النموذج</th><th class="num">أقصى درجة</th><th>قبل (سجلات)</th><th>بعد (سجلات)</th><th class="num">متوسط% قبل</th><th class="num">متوسط% بعد</th><th>زوجي</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function short(s) { return s.indexOf('(') !== -1 ? s.split('(')[0].trim() : s; }

  function renderAll() {
    const D = window.Dashboard;
    if (!D || !D.results) return;
    const as = D.results.assessment;
    renderKPIs(as);
    renderAgg(as);
    renderPaired(as);
    renderTable(as);
  }

  window.addEventListener('campReady', renderAll);
  window.addEventListener('campResultsUpdated', renderAll);
})();