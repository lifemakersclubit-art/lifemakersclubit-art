/* ============================================================
 * REGISTRATION.JS — صفحة ملخص التسجيل (camp_registration)
 * ملخص سريع: KPIs + نقاط قوة/ضعف من الأرقام + رسوم + جاهزية
 * ============================================================ */
(function () {
  const FMT = function () { return window.Dashboard.fmt; };

  function render() {
    const D = window.Dashboard;
    if (!D || !D.results) return;
    const reg = D.results.registration;
    if (!reg || !reg.totals) {
      renderEmpty();
      return;
    }
    renderKPI(reg);
    renderInsights(reg);
    renderCharts(reg);
    renderReadiness(reg);
    renderNotes(reg);
  }

  function renderEmpty() {
    const msg = '<div class="alert info"><span class="a-ico">ℹ</span><span>لا توجد بيانات تسجيل (camp_registration) في النسخة الحالية — تظهر الأرقام هنا فور إضافة الورقة إلى نسخة البيانات.</span></div>';
    const kpi = document.getElementById('kpi-registration');
    if (kpi) kpi.innerHTML = '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">إجمالي المسجلين</div><div class="kpi-value">0</div></div>';
    const s = document.getElementById('reg-strengths');
    const w = document.getElementById('reg-weaknesses');
    if (s) s.innerHTML = '<li class="micro muted">لا توجد بيانات كافية بعد</li>';
    if (w) w.innerHTML = '<li class="micro muted">لا توجد بيانات كافية بعد</li>';
    const r = document.getElementById('reg-readiness');
    if (r) r.innerHTML = msg;
    const n = document.getElementById('reg-notes');
    if (n) n.innerHTML = '<li class="micro">هذه النسخة لا تحتوي بيانات التسجيل بعد — عند توفرها تُحسب تلقائيًا.</li>';
  }

  /* ---------- خلايا KPI ---------- */
  function renderKPI(r) {
    const el = document.getElementById('kpi-registration');
    const cards = [
      kpi('إجمالي المسجلين', FMT().num(r.totals), r.firstDate && r.lastDate ? r.firstDate + ' ← ' + r.lastDate : ''),
      kpi('إجمالي الورقة (كل الفترات)', FMT().num(r.sheetTotal), 'قبل فلترة التاريخ'),
      kpi('رقم قومي فريد', FMT().num(r.uniqueNid), 'مقياس لتفرد البيانات'),
      kpi('عدد المحافظات', FMT().num(r.governorates.length), r.governorates.map(function (g) { return g.name; }).slice(0, 3).join('، ') + (r.governorates.length > 3 ? '…' : '')),
      kpi('اللجان المطلوبة', FMT().num(r.committees.length), 'من عدد ' + r.totals + ' مسجل'),
      kpi('متوسط المهارات', r.avgSkill != null ? r.avgSkill.toFixed(2) + ' /5' : '—', r.rated.length ? 'من ' + r.rated.length + ' مهارات مقيّمة' : 'قلة بيانات مقيمة'),
      kpi('نية الحضور الكامل', r.willAttendPct != null ? (r.willAttendPct * 100).toFixed(1) + '%' : '—', 'أكدوا المشاركة كل الأيام')
    ];
    if (r.wantLeadPct != null) cards.push(kpi('الطموح القيادي', (r.wantLeadPct * 100).toFixed(1) + '%', 'يرغبون في تولي منصب'));
    if (r.seniorPct != null) cards.push(kpi('مناصب قيادية حاليًا', (r.seniorPct * 100).toFixed(1) + '%', 'مسؤول مركزي / لجنة'));
    el.innerHTML = cards.join('');
  }
  function kpi(label, value, foot) {
    return '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  /* ---------- نقاط القوة والضعف ---------- */
  function renderInsights(r) {
    const strengths = document.getElementById('reg-strengths');
    const weaknesses = document.getElementById('reg-weaknesses');
    const sAll = r.insights.filter(function (i) { return i.type === 'strength'; });
    const wAll = r.insights.filter(function (i) { return i.type === 'weakness'; });
    function li(i) {
      return '<li class="micro"><span class="badge ' + (i.type === 'strength' ? 'good' : 'bad') + '">' + i.value + '</span> ' + i.title +
        (i.note ? ' <span class="muted">(' + i.note + ')</span>' : '') + '</li>';
    }
    strengths.innerHTML = sAll.length ? sAll.map(li).join('') : '<li class="micro muted">لا توجد بيانات كافية للتقييم (يحتاج ≥3 مستجيبين لكل مهارة)</li>';
    weaknesses.innerHTML = wAll.length ? wAll.map(li).join('') : '<li class="micro muted">لا نقاط ضعف ظاهرة — بيانات غير كافية أو مؤشرات قوية</li>';
  }

  /* ---------- الرسوم ---------- */
  function renderCharts(r) {
    const C = window.CAMP_CONFIG.colors;
    const charter = window.Charts;
    if (!charter) return;

    // المهارات (متوسط /5)
    const rated = r.rated.slice().sort(function (a, b) { return b.mean - a.mean; });
    if (rated.length) {
      charter.chart('reg-skills', charter.barOpt(rated.map(function (s) { return s.label; }), rated.map(function (s) { return +s.mean.toFixed(2); }), 'متوسط التقييم الذاتي (من 5)'));
    }

    // المحافظات (حلقية)
    if (r.governorates.length) {
      charter.chart('reg-governorates', charter.donutOpt(r.governorates.map(function (g) { return { name: g.name, value: g.count }; }), 'التوزيع حسب المحافظة'));
    }

    // اللجان (أعمدة)
    if (r.committees.length) {
      charter.chart('reg-committees', charter.barOpt(r.committees.map(function (c) { return c.name; }), r.committees.map(function (c) { return c.count; }), 'عدد الطلبات لكل لجنة'));
    }

    // المسارات (أعمدة)
    if (r.tracks.length) {
      charter.chart('reg-tracks', charter.barOpt(r.tracks.map(function (t) { return t.name; }), r.tracks.map(function (t) { return t.count; }), 'طلبات المسارات (T1+T2)'));
    }
  }

  /* ---------- الجاهزية الرقمية ---------- */
  function renderReadiness(r) {
    const el = document.getElementById('reg-readiness');
    const bars = r.readiness.map(function (it) {
      const pct = it.pct != null ? it.pct * 100 : 0;
      const cls = it.pct == null ? 'warn' : (pct >= 90 ? 'good' : (pct >= 60 ? 'warn' : 'bad'));
      const note = it.pct == null ? 'لا إجابات بعد' : it.total + ' مستجيبًا · ' + ('لا: ' + it.no);
      return '<div class="stat-row" style="margin-bottom:.55rem">' +
        '<div class="stat-cell"><div class="sc-label">' + it.label + ' — <b>' + (it.pct != null ? pct.toFixed(1) : 0) + '%</b></div>' +
        '<div class="progress-track" style="margin-top:.4rem"><div class="progress-fill ' + cls + '" style="width:' + Math.min(100, pct) + '%"></div></div>' +
        '<div class="sc-note">' + note + '</div></div></div>';
    }).join('');
    let internetInfo = '';
    if (r.internetTop && r.internetTop.length) {
      internetInfo = '<div class="pill-group" style="margin-top:.7rem">' +
        r.internetTop.map(function (it) { return '<span class="badge gray">الجودة «' + it.name + '»: ' + it.count + '</span>'; }).join(' ') + '</div>';
    }
    el.innerHTML = bars + internetInfo;
  }

  /* ---------- ملاحظات ---------- */
  function renderNotes(r) {
    const el = document.getElementById('reg-notes');
    const notes = [
      'تُحتسب النسب من إجابات الفترة المحددة فقط; الصفوف الفارغة والقوالب مستبعدة تلقائيًا.',
      'الأعمدة الحساسة (رقم قومي، هاتف، واتساب، إيميل) لا تُعرض في أي مكان — تُستخدم للعدّ والدقق الداخلي فقط.',
      r.headerRows ? 'تم استبعاد ' + r.headerRows + ' صفوف قالب/تسمية مكررة من بيانات الورقة.' : 'لا توجد صفوف قالب مكررة في الورقة.',
      'المهارات ذات مستجيبين فقط (ن < 3) تُستبعد من قوائم القوة/الضعف والرسم.',
      r.seniorPct != null ? 'مناصب حاليّة مسؤولة: ' + FMT().num(r.seniorPositions) + ' مسجلًا → رصيد قيادي داخلي.' : ''
    ].filter(function (n) { return n; });
    el.innerHTML = notes.map(function (n) { return '<li class="micro">' + n + '</li>'; }).join('');
  }

  window.addEventListener('campReady', render);
  window.addEventListener('campResultsUpdated', render);
})();