/* ============================================================
 * ASSIGNMENTS.JS — صفحة التاسكات
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const FMT = function () { return window.Dashboard.fmt; };

  function kpi(label, value, foot) {
    return '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  function renderKPI(asg) {
    const el = document.getElementById('kpi-assignments');
    const q = asg.quality;
    const cards = [
      kpi('إجمالي التسليمات', FMT().num(asg.totals)),
      kpi('مساقات', asg.tracks.length),
      kpi('أيام نشطة', asg.dates.length),
      kpi('مساقات نشطة بالربط', asg.tracks.filter(function (t) { return C.assignmentTrackCampMap[t]; }).length, 'مرتبطة بمسار الكامب'),
      kpi('بدون اسم', FMT().num(q.missingName)),
      kpi('بدون واتساب', FMT().num(q.missingWhatsapp)),
      kpi('بدون رابط', FMT().num(q.missingLink), 'از خدمة النموذج'),
      kpi('بدون ملف/رابط', FMT().num(q.missingFile))
    ];
    el.innerHTML = cards.join('');
  }

  function renderTrack(asg) {
    const data = asg.tracks.map(function (t) { return { name: t, value: asg.byTrack[t] }; });
    Charts.chart('asg-track', Charts.donutOpt(data));
  }

  function renderTrend(asg) {
    const opt = Charts.lineOpt(asg.dates, asg.trend.map(function (t) { return t.value; }), null, true);
    opt.series[0].itemStyle = { color: C.colors.accent };
    opt.series[0].areaStyle = { opacity: 0.08 };
    opt.xAxis.axisLabel.rotate = 35;
    Charts.chart('asg-trend', opt);
  }

  function renderTable(asg) {
    const el = document.getElementById('asg-table');
    const rows = asg.table.map(function (r) {
      const campBadge = r.campTrack ? '<span class="badge blue">' + r.campTrack + '</span>' : '<span class="na-badge">لا يوجد مسار مقابل</span>';
      return '<tr><td>' + esc(r.track) + '<div class="micro text-faint">' + campBadge + '</div></td>' +
        '<td class="num">' + r.count + '</td>' +
        '<td class="num">' + FMT().pct1(r.share * 100) + '</td>' +
        '<td class="micro">' + (r.first || '—') + ' → ' + (r.last || '—') + '</td>' +
        '<td class="num">' + r.missingLinks + '</td>' +
        '<td class="num">' + r.missingFiles + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="tbl"><thead><tr><th>المساق</th><th class="num">تسليمات</th><th class="num">نسبة</th><th>الفترة</th><th class="num">بلا رابط</th><th class="num">بلا ملف</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="text-muted">لا توجد بيانات.</td></tr>') + '</tbody></table>';
  }

  function esc(s) { return window.AppHelpers.esc(s); }

  function renderAll() {
    const D = window.Dashboard;
    if (!D || !D.results) return;
    const asg = D.results.assignment;
    renderKPI(asg);
    renderTrack(asg);
    renderTrend(asg);
    renderTable(asg);
  }

  window.addEventListener('campReady', renderAll);
  window.addEventListener('campResultsUpdated', renderAll);
})();