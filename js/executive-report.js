/* ============================================================
 * EXECUTIVE-REPORT.JS — التقرير التنفيذي (وضع الطباعة)
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const FMT = function () { return window.Dashboard.fmt; };
  function esc(s) { return window.AppHelpers.esc(s); }
  function sc(label, value, note) {
    return '<div class="stat-cell"><div class="sc-label">' + label + '</div><div class="sc-value">' + value + '</div>' + (note ? '<div class="sc-note">' + note + '</div>' : '') + '</div>';
  }

  let rendered = false;

  function render() {
    if (rendered) { refillTextNodes(); }
    rendered = true;
    const D = window.Dashboard;
    const r = D.results;

    setText('report-date', new Date().toLocaleDateString('ar-EG'));
    setText('report-meta', 'نطاق الفترة: ' + r.filters.dateFrom + ' ← ' + r.filters.dateTo + ' · مصدر البيانات: ' + esc(D.sourceLabel) + ' · تاريخ الإعداد: ' + new Date().toISOString().slice(0, 10));

    renderSummary(r);
    renderKPIs(r);
    renderAttendance(r);
    renderFeedback(r);
    renderAssignments(r);
    renderAssessment(r);
    renderMatrix(r);
    renderDQ(r);
  }

  function refillTextNodes() { /* يحافظ على النصوص عند إعادة الفلتر رغم عدم وجود فلاتر في التقرير */ }

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v || '—'; }

  /* ---------- الملخص ---------- */
  function renderSummary(r) {
    const a = r.attendance, fb = r.feedback, asg = r.assignment, as = r.assessment, mv = r.movement;
    const op = as.overallPaired;
    const pts = [];
    pts.push('سُجِّل <b>' + FMT().num(a.nRecords) + '</b> حضورًا لعملية تشغيل «كامب جذور» على مدار <b>' + a.activeDays + '</b> يومًا (أعلى يوم ' + (a.high != null ? FMT().num(a.high) : '—') + ' في ' + (a.highDay || '—') + ').');
    if (a.uniqueParticipants) pts.push('بلغ المشاركون النشطون <b>' + FMT().num(a.uniqueParticipants) + '</b> مشاركًا حسب الهوية المتاحة.');
    if (fb.totals) pts.push('وُردت <b>' + FMT().num(fb.totals) + '</b> استجابة تقييم بمتوسط عام ' + (fb.overallStats.mean != null ? '<b>' + FMT().stat2(fb.overallStats.mean) + '/4</b>' : '—') + (fb.techRate != null ? '، ونسبة مشاكل تقنية ' + FMT().pct1(fb.techRate * 100) + '.' : '.'));
    if (asg.totals) pts.push('سُلِّمت <b>' + FMT().num(asg.totals) + '</b> تاسكًا موزعة على ' + asg.tracks.length + ' مساقات.');
    if (op.n) pts.push('المقارنة المزدوجة للقياس: <b>' + op.improved + '</b> تحسّن، <b>' + op.declined + '</b> تراجع، <b>' + op.unchanged + '</b> ثبات (ن=' + op.n + ')، بمتوسط تغير ' + (op.meanImprovement != null ? FMT().stat2(op.meanImprovement) + ' نقطة' : '—') + '.');
    const mvDir = mv.rows[0].move.direction;
    pts.push('اتجاه الحضور مقارنة بالفترة المساوية السابقة: <b>' + dirLabel(mvDir) + '</b>.');
    document.getElementById('report-exec-summary').innerHTML = '<ul class="list-spaced">' + pts.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
  }
  function dirLabel(d) { return { rising: 'صعود', declining: 'هبوط', stable: 'ثبات', none: 'غير محسوب (بيانات غير كافية)' }[d] || '—'; }

  /* ---------- القيم ---------- */
  function renderKPIs(r) {
    const a = r.attendance, fb = r.feedback;
    const overallPct = fb.overallStats.mean != null ? (fb.overallStats.mean / 4) * 100 : null;
    const cards = [
      '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">سجلات الحضور</div><div class="kpi-value">' + FMT().num(a.nRecords) + '</div><div class="kpi-foot">أيام: ' + a.activeDays + '</div></div>',
      '<div class="kpi accent"><div class="kpi-rule"></div><div class="kpi-label">استجابات التقييم</div><div class="kpi-value">' + FMT().num(fb.totals) + '</div><div class="kpi-foot">تقني ' + (fb.techRate == null ? '—' : FMT().pct1(fb.techRate * 100)) + '</div></div>',
      '<div class="kpi accent"><div class="kpi-rule"></div><div class="kpi-label">المتوسط العام</div><div class="kpi-value">' + (fb.overallStats.mean != null ? FMT().stat2(fb.overallStats.mean) + ' <small>/4</small>' : '—') + '</div><div class="kpi-foot">' + (overallPct != null ? FMT().stat1(overallPct) + '%' : '') + '</div></div>',
      '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">تاسكات</div><div class="kpi-value">' + FMT().num(r.assignment.totals) + '</div></div>',
      '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">أزواج القياس</div><div class="kpi-value">' + FMT().num(r.assessment.overallPaired.n) + '</div></div>'
    ];
    document.getElementById('report-kpis').innerHTML = cards.join('');
  }

  /* ---------- 1 · الحضور ---------- */
  function renderAttendance(r) {
    const a = r.attendance;
    const opt = Charts.lineOpt(a.dates, a.dates.map(function (d) { return a.byDate[d]; }), null, true);
    opt.series[0].itemStyle = { color: C.colors.primary };
    opt.areaStyle = { opacity: 0.08 };
    opt.xAxis.axisLabel.rotate = 35;
    Charts.chart('report-att-trend', opt);
    setText('report-att-n', FMT().num(a.nRecords));
    setText('report-att-uniq', FMT().num(a.uniqueParticipants));
    setText('report-att-days', a.activeDays);
    setText('report-att-high', a.high != null ? FMT().num(a.high) + ' (' + (a.highDay || '—') + ')' : '—');
    setText('report-att-low', a.low != null ? FMT().num(a.low) + ' (' + (a.lowDay || '—') + ')' : '—');
  }

  /* ---------- 2 · التقييم ---------- */
  function renderFeedback(r) {
    const fb = r.feedback;
    const minN = C.alerts.minResponsesForMean;
    const dims = Object.keys(fb.dims).map(function (k) { return fb.dims[k]; }).filter(function (d) { return d.n >= minN; });
    if (dims.length) {
      const opt = Charts.radarOpt(
        dims.map(function (d) { return { name: (d.label || '').replace(/^تقييم /, ''), max: 4 }; }),
        [{ value: dims.map(function (d) { return +(d.stats.mean != null ? d.stats.mean : 0).toFixed(2); }), name: 'المتوسط', areaStyle: { color: C.colors.primary, opacity: 0.18 } }]
      );
      Charts.chart('report-fb-radar', opt);
    } else {
      document.getElementById('report-fb-radar').innerHTML = '<div class="alert info"><span class="a-ico">ℹ</span><span>لا توجد بيانات محاور كافية.</span></div>';
    }
    setText('report-fb-n', FMT().num(fb.totals));
    setText('report-fb-avg', fb.overallStats.mean != null ? FMT().stat2(fb.overallStats.mean) + ' / 4' : '—');
    setText('report-fb-tech', fb.techRate == null ? '—' : FMT().pct1(fb.techRate * 100));
    // أفضل المدربين
    const ranked = fb.trainerPerf.filter(function (t) { return t.overall.mean != null && t.n >= 2; }).sort(function (x, y) { return y.overall.mean - x.overall.mean; }).slice(0, 5);
    const rows = ranked.map(function (t) { return '<tr><td>' + esc(t.trainer) + '</td><td class="num">' + t.n + '</td><td class="num">' + FMT().stat2(t.overall.mean) + '</td></tr>'; }).join('');
    document.getElementById('report-trainers').innerHTML = rows ? '<p class="card-sub">أعلى المدربين تقييمًا (بحد أدنى استجابتين)</p><table class="tbl"><thead><tr><th>المدرب</th><th class="num">استجابات</th><th class="num">المتوسط</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="note-line">لا يوجد ما يكفي لتسجيل ترتيب المدربين في نطاق التقرير.</p>';
  }

  /* ---------- 3 · التاسكات ---------- */
  function renderAssignments(r) {
    const asg = r.assignment;
    const body = asg.table.map(function (t) {
      return '<tr><td>' + esc(t.track) + '</td><td class="num">' + t.count + '</td><td class="num">' + FMT().pct1(t.share * 100) + '</td><td class="micro">' + (t.first || '—') + ' → ' + (t.last || '—') + '</td></tr>';
    }).join('');
    document.getElementById('report-assignments').innerHTML =
      '<div class="stat-row" style="margin-bottom:.8rem">' + sc('إجمالي التسليمات', FMT().num(asg.totals)) + sc('مساقات', asg.tracks.length) + sc('أيام نشطة', asg.dates.length) + '</div>' +
      '<table class="tbl"><thead><tr><th>المساق</th><th class="num">تسليمات</th><th class="num">نسبة</th><th>الفترة</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  /* ---------- 4 · القياس ---------- */
  function renderAssessment(r) {
    const as = r.assessment;
    const cats = [], pre = [], postObj = [];
    Object.keys(as.perExam).forEach(function (k) {
      const e = as.perExam[k];
      if (e.preN === 0 && e.postN === 0) return;
      cats.push(short(e.label));
      pre.push(e.preAvgPct == null ? null : +e.preAvgPct.toFixed(1));
      postObj.push(e.postAvgPct == null ? null : +e.postAvgPct.toFixed(1));
    });
    const opt = Charts.groupBarOpt(cats, [
      { name: 'قبل', data: pre }, { name: 'بعد', data: postObj }
    ].filter(function (s) { return s.data.some(function (v) { return v != null; }); }));
    opt.yAxis.name = '%'; opt.yAxis.max = 100;
    Charts.chart('report-assess', opt);

    const op = as.overallPaired;
    document.getElementById('report-paired').innerHTML = op.n
      ? sc('أزواج مرتبطة', FMT().num(op.n)) +
        sc('تحسّن', FMT().num(op.improved), FMT().pct1(op.improvedRate * 100)) +
        sc('تراجع', FMT().num(op.declined)) +
        sc('ثبات', FMT().num(op.unchanged)) +
        sc('متوسط قبل', op.preStats.mean != null ? FMT().stat2(op.preStats.mean) : '—') +
        sc('متوسط بعد', op.postStats.mean != null ? FMT().stat2(op.postStats.mean) : '—') +
        sc('متوسط الفرق', op.meanImprovement != null ? FMT().stat2(op.meanImprovement) : '—', op.pctImprovement != null ? FMT().stat1(op.pctImprovement) + '%' : '')
      : '<div class="alert info" style="grid-column:span 2"><span class="a-ico">ℹ</span><span>لا توجد أزواج مرتبطة — نماذج القياس القابل للربط قليلة (هوية ناقصة في القيادة/المحتوى).</span></div>';

    const rows = Object.keys(as.perExam).map(function (k) {
      const e = as.perExam[k];
      const p = as.pairedByExam[k];
      return '<tr><td>' + e.label + '</td><td class="num">' + e.preN + '</td><td class="num">' + e.postN + '</td>' +
        '<td class="num">' + (e.preAvgPct == null ? '—' : FMT().stat1(e.preAvgPct) + '%') + '</td>' +
        '<td class="num">' + (e.postAvgPct == null ? '—' : FMT().stat1(e.postAvgPct) + '%') + '</td>' +
        '<td class="num">' + (p.available ? p.pairs.length + ' زوج (▲' + p.summary.improved + ')' : 'غير متاح') + '</td></tr>';
    }).join('');
    document.getElementById('report-per-exam').innerHTML = '<p class="card-sub" style="margin-top:.8rem">تفاصيل كل نموذج</p><table class="tbl"><thead><tr><th>النموذج</th><th class="num">قبل</th><th class="num">بعد</th><th class="num">قبل%</th><th class="num">بعد%</th><th>زوجي</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ---------- 5 · المسارات ---------- */
  function renderMatrix(r) {
    const rows = r.trackMatrix.map(function (m) {
      return '<tr><td><b>' + esc(m.track) + '</b></td>' +
        '<td class="num">' + m.attendance + '</td>' +
        '<td class="num">' + m.assignments + '</td>' +
        '<td class="num">' + (m.preN || 0) + '</td>' +
        '<td class="num">' + (m.postN || 0) + '</td>' +
        '<td class="num">' + (m.pairedN || '<span class="na-badge">—</span>') + '</td></tr>';
    }).join('');
    document.getElementById('report-matrix').innerHTML = '<table class="tbl"><thead><tr><th>المسار</th><th class="num">حضور</th><th class="num">تاسكات</th><th class="num">قبل</th><th class="num">بعد</th><th class="num">أزواج</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ---------- 6 · جودة البيانات ---------- */
  function renderDQ(r) {
    const dq = window.Analytics.dataQuality(window.Dashboard.dataset.raw, window.Dashboard.dataset);
    const items = [
      'الحضور: ' + dq.attendance.total + ' صف · رقم قومي فريد ' + dq.attendance.uniqueNid + ' · تواريخ خارج النطاق ' + dq.attendance.dateOutliers + ' · مكررات دقيقة ' + dq.attendance.duplicateExact + '.',
      'التقييم: ' + dq.feedback.total + ' استجابة · بلا جلسة ' + dq.feedback.missingSession + ' · نماذج قصيرة ' + dq.feedback.shortForm + ' · أعمدة حضورية فارغة 100%.',
      'التاسكات: ' + dq.assignment.total + ' · بلا اسم ' + dq.assignment.missingName + ' · بلا واتساب ' + dq.assignment.missingWhatsapp + ' · بلا رابط ' + dq.assignment.missingLink + '.',
      'الاختبارات: صفوف قوالب داخلي (' + dq.prequiz.headerRows + ' قبلي / ' + dq.postquiz.headerRows + ' بعدي) · درجات غير رقمية (' + dq.prequiz.nonNumeric + ' / ' + dq.postquiz.nonNumeric + ') · بدون هوية (' + dq.prequiz.noIdentity + ' / ' + dq.postquiz.noIdentity + ').'
    ];
    document.getElementById('report-dq').innerHTML = '<ul>' + items.map(function (i) { return '<li class="micro">' + i + '</li>'; }).join('') + '</ul>';
  }

  function short(s) { return s.indexOf('(') !== -1 ? s.split('(')[0].trim() : s; }

  /* ---------- إطاق ---------- */
  window.addEventListener('campReady', render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.DashboardBootstrap.bootstrap(); });
  } else {
    window.DashboardBootstrap.bootstrap();
  }
})();