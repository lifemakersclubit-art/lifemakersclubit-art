/* ============================================================
 * FEEDBACK.JS — صفحة تقييم الجلسات
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const FMT = function () { return window.Dashboard.fmt; };

  function kpi(label, value, foot, accent) {
    return '<div class="kpi' + (accent ? ' accent' : '') + '"><div class="kpi-rule"></div><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  function renderKPIs(fb) {
    const el = document.getElementById('kpi-feedback');
    const st = fb.overallStats;
    const h = fb.highest, l = fb.lowest;
    const cards = [
      kpi('استجابات صالحة', FMT().num(fb.totals)),
      kpi('المتوسط العام', st.mean != null ? FMT().stat2(st.mean) + ' <small>/ 4</small>' : '—', st.sd != null ? 'انحراف معياري: ' + FMT().stat2(st.sd) : ''),
      kpi('أعلى محور', h ? h.label.replace(/^تقييم /, '') : '—', h ? FMT().stat2(h.stats.mean) + ' (ن=' + h.n + ')' : ''),
      kpi('أدنى محور', l ? l.label.replace(/^تقييم /, '') : '—', l ? FMT().stat2(l.stats.mean) + ' (ن=' + l.n + ')' : ''),
      kpi('نسبة مشاكل تقنية', fb.techRate == null ? '—' : FMT().pct1(fb.techRate * 100), fb.techYes + ' من ' + fb.techAnswered + ' أجابوا', true),
      kpi('عدد المدربين', fb.trainerPerf.length, 'بعد توحيد الأسماء'),
      kpi('عدد الجلسات', fb.sessionPerf.length, 'بعد توحيد التسميات')
    ];
    el.innerHTML = cards.join('');
  }

  function renderDims(fb) {
    const el = document.getElementById('fb-dims');
    const minN = C.alerts.minResponsesForMean;
    const dims = Object.keys(fb.dims)
      .map(function (k) { return fb.dims[k]; })
      .filter(function (d) { return d.n >= minN; });
    if (!dims.length) {
      el.innerHTML = '<div class="alert info"><span class="a-ico">ℹ</span><span>لا توجد بيانات محاور كافية في هذا النطاق (يُشترط ' + minN + ' استجابات للمحور).</span></div>';
      return;
    }
    const opt = Charts.radarOpt(
      dims.map(function (d) { return { name: (d.label || '').replace(/^تقييم /, '') + ' — ن=' + d.n, max: 4 }; }),
      [{ value: dims.map(function (d) { return +(d.stats.mean != null ? d.stats.mean : 0).toFixed(2); }), name: 'المتوسط', areaStyle: { color: C.colors.primary, opacity: 0.18 } }]
    );
    Charts.chart('fb-dims', opt);
    // جدول المحاور تحت الرادار
    const rows = dims.map(function (d) {
      return '<tr><td>' + d.label + '</td><td class="num">' + d.n + '</td><td class="num">' + FMT().stat2(d.stats.mean) + '</td></tr>';
    }).join('');
    const t = document.createElement('div');
    t.style.marginTop = '10px';
    t.innerHTML = '<table class="tbl"><thead><tr><th>المحور</th><th class="num">العدد</th><th class="num">المتوسط</th></tr></thead><tbody>' + rows + '</tbody></table>';
    el.appendChild(t);
  }

  function renderTech(fb) {
    const el = document.getElementById('fb-tech');
    const cats = fb.techCats;
    if (!cats.length) {
      el.innerHTML = '<div class="alert ok"><span class="a-ico">✓</span><span>لا توجد مشاكل تقنية مسجلة في هذه الفترة.</span></div>';
      return;
    }
    const opt = Charts.barOpt(
      cats.map(function (c) { return c.label; }),
      cats.map(function (c) { return c.count; })
    );
    opt.series[0].itemStyle = { color: C.colors.accent, borderRadius: [4, 4, 0, 0] };
    opt.xAxis.axisLabel.rotate = 10;
    Charts.chart('fb-tech', opt);

    const samples = cats.map(function (c) {
      if (!c.samples.length) return '';
      return '<li><b>' + c.label + ' (' + c.count + ')</b><ul class="list-dense micro">' + c.samples.map(function (s) { return '<li class="text-muted">“' + esc(s) + '”</li>'; }).join('') + '</ul></li>';
    }).join('');
    const wrap = document.createElement('div');
    wrap.className = 'card-body flush';
    wrap.innerHTML = '<ul class="list-dense" style="margin-top:10px">' + samples + '</ul>';
    el.appendChild(wrap);
  }

  function renderTrainers(fb) {
    const el = document.getElementById('trainer-table');
    const rows = fb.trainerPerf.slice(0, 40).map(function (t) {
      return '<tr><td>' + esc(t.trainer) + '<div class="micro text-faint">خام: ' + esc(t.raw) + '</div></td>' +
        '<td class="num">' + t.n + '</td>' +
        '<td class="num">' + (t.overall.mean == null ? '—' : FMT().stat2(t.overall.mean)) + '</td>' +
        '<td>' + issueBadge(t.issues) + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="tbl"><thead><tr><th>المدرب</th><th class="num">استجابات</th><th class="num">متوسط التقييم</th><th>مشاكل تقنية</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="text-muted">لا توجد بيانات.</td></tr>') + '</tbody></table>';
  }
  function issueBadge(n) {
    if (!n) return '<span class="badge gray">0</span>';
    return '<span class="badge ' + (n > 3 ? 'red' : 'warn') + '">' + n + '</span>';
  }

  function renderSessions(fb) {
    const el = document.getElementById('session-table');
    const rows = fb.sessionPerf.slice(0, 40).map(function (s) {
      return '<tr><td>' + esc(s.session) + '</td>' +
        '<td class="num">' + s.n + '</td>' +
        '<td class="num">' + (s.overall.mean == null ? '—' : FMT().stat2(s.overall.mean)) + '</td>' +
        '<td class="micro text-muted">' + s.trainers.filter(Boolean).slice(0, 3).map(esc).join(' · ') + (s.trainers.filter(Boolean).length > 3 ? ' …' : '') + '</td></tr>';
    }).join('');
    el.innerHTML = '<table class="tbl"><thead><tr><th>الجلسة</th><th class="num">استجابات</th><th class="num">المتوسط</th><th>المدربون</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="text-muted">لا توجد بيانات.</td></tr>') + '</tbody></table>';
  }

  function renderLists(fb) {
    const rec = document.getElementById('recommendations');
    const fut = document.getElementById('future');
    rec.innerHTML = fb.recommendations.length ? fb.recommendations.slice(0, 40).map(function (t) { return '<li class="micro">' + esc(t) + '</li>'; }).join('') : '<li class="micro text-faint">لا توجد توصيات نصية في الفترة.</li>';
    fut.innerHTML = fb.future.length ? fb.future.slice(0, 30).map(function (t) { return '<li class="micro">' + esc(t) + '</li>'; }).join('') : '<li class="micro text-faint">لا توجد مقترحات نصية في الفترة.</li>';
  }

  function esc(s) { return window.AppHelpers.esc(s); }

  function renderAll() {
    const D = window.Dashboard;
    if (!D || !D.results) return;
    const fb = D.results.feedback;
    renderKPIs(fb);
    renderDims(fb);
    renderTech(fb);
    renderTrainers(fb);
    renderSessions(fb);
    renderLists(fb);
  }

  window.addEventListener('campReady', renderAll);
  window.addEventListener('campResultsUpdated', renderAll);
})();