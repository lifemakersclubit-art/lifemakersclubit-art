/* ============================================================
 * APP — بوتستراب التطبيق
 * - تحميل البيانات (DataLoader) + تنظيف (DataCleaner) + حساب (Analytics)
 * - تجميع جميع النتائج في window.Dashboard
 * - إدارة واجهة الهيكل: Sidebar / Header / شريط الفلاتر / حالات التحميل
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;

  const READY_EVENT = 'campReady';

  /* ---------- بنية البيانات الأولية بعد التنظيف ---------- */
  // القيم تأتي من Apps Script كأرقام/تواريخ/كبوليات؛ نعيدها لنصوص
  // (نفس طبيعة التصدير الأصلي للـ Excel) قبل أي معالجة.
  const BOOL_NA = { 'true': 'نعم', 'false': 'لا' };
  function cellToStr(v) {
    if (v == null) return '';
    if (typeof v === 'boolean') return BOOL_NA[String(v)] || '';
    return typeof v === 'string' ? v : String(v);
  }
  function normRows(rows) {
    return (rows || []).map(function (r) { return (r || []).map(cellToStr); });
  }
  function buildDataset(raw) {
    const norm = {
      attendance: normRows(raw.sheets.attendance.rows),
      feedback: normRows(raw.sheets.feedback.rows),
      assignment: normRows(raw.sheets.assignment.rows),
      prequiz: normRows(raw.sheets.prequiz.rows),
      postquiz: normRows(raw.sheets.postquiz.rows),
      registration: raw.sheets.registration ? { headers: raw.sheets.registration.headers, rows: normRows(raw.sheets.registration.rows) } : null
    };
    return {
      raw: raw,
      attendance: window.DataCleaner.cleanAttendance(norm.attendance),
      feedback: window.DataCleaner.cleanFeedback(norm.feedback),
      assignment: window.DataCleaner.cleanAssignment(norm.assignment),
      prequiz: window.DataCleaner.cleanQuiz(norm.prequiz, false),
      postquiz: window.DataCleaner.cleanQuiz(norm.postquiz, true),
      registration: norm.registration
    };
  }

  /* ---------- إعادة الحساب عند كل تغيير فلتر ---------- */
  function computeAll() {
    const ds = window.Dashboard.dataset;
    const f = window.Filters.get();
    const fullF = {
      dateFrom: f.dateFrom, dateTo: f.dateTo, track: f.track,
      trainer: f.trainer, session: f.session, trainingType: f.trainingType
    };
    const att = window.Analytics.attendanceAnalytics(ds.attendance, fullF);
    const fb = window.Analytics.feedbackAnalytics(ds.feedback, fullF);
    const asg = window.Analytics.assignmentAnalytics(ds.assignment, fullF);
    const assess = window.Analytics.assessmentAnalytics(ds.prequiz, ds.postquiz, fullF);
    const matrix = window.Analytics.trackMatrix(att, fb, asg, assess, fullF);
    const movement = window.Analytics.movementReport(fullF, ds.attendance, ds.feedback, ds.assignment, ds.prequiz, ds.postquiz);
    const registration = window.Analytics.registrationAnalytics(ds.registration, fullF);
    return { filters: fullF, attendance: att, feedback: fb, assignment: asg, assessment: assess, trackMatrix: matrix, movement: movement, registration: registration };
  }

  /* ---------- خيارات الفلاتر (track/trainer/session/types) ---------- */
  function computeOptions(dataset) {
    const attTracks = Array.from(new Set(dataset.attendance.filter(function (e) { return e.track; }).map(function (e) { return e.track; }))).sort();
    const trains = Array.from(new Set(dataset.feedback.filter(function (e) { return e.trainer; }).map(function (e) { return e.trainer; }))).sort();
    const sessions = Array.from(new Set(dataset.feedback.filter(function (e) { return e.session; }).map(function (e) { return e.session; }))).sort();
    const types = Array.from(new Set(dataset.feedback.filter(function (e) { return e.trainingType; }).map(function (e) { return e.trainingType; }))).sort();
    return { tracks: attTracks, trainers: trains, sessions: sessions, types: types };
  }

  /* ---------- القيم المعروضة في الجداول ---------- */
  const fmt = {
    num: function (v) { return v == null ? '—' : Number(v).toLocaleString('en-US'); },
    pct1: function (v) { return v == null ? '—' : Number(v).toFixed(1) + '%'; },
    stat1: function (v) { return v == null ? '—' : Number(v).toFixed(1); },
    stat2: function (v) { return v == null ? '—' : Number(v).toFixed(2); },
    date: function (d) { return d || '—'; },
    na: function (cond, msg) { return cond ? (msg || 'غير متاح من البيانات الحالية') : false; }
  };

  /* ---------- تحميل ---------- */
  let _bootstrapped = false;
  async function bootstrap() {
    if (_bootstrapped) return;
    _bootstrapped = true;
    showAppState('loading', 'جارٍ تجهيز البيانات…');
    const mountEl = document.getElementById('app-root');

    try {
      const raw = await window.DataLoader.load();
      const dataset = buildDataset(raw);
      window.Dashboard = {
        dataset: dataset,
        options: computeOptions(dataset),
        results: null,
        fmt: fmt,
        recompute: recompute,
        sourceLabel: window.DataLoader.sourceLabel(),
        readyAt: new Date().toISOString()
      };

      // تعبئة أسابيع + خيارات الفلاتر
      window.Filters.setWeeks(dataset.attendance);
      window.Filters.setOptions(window.Dashboard.options);
      window.Dashboard.results = computeAll();

      if (document.body.dataset.mode !== 'report') {
        renderChrome();
      } else {
        showAppState('ready');
      }

      window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: window.Dashboard }));

      // إعادة الحساب عند تغيير الفلاتر
      window.addEventListener('campFilterChanged', function () {
        window.Dashboard.results = computeAll();
        updateFilterStats();
        window.dispatchEvent(new CustomEvent('campResultsUpdated', { detail: window.Dashboard.results }));
      });

      window.addEventListener('resize', function () {
        if (window.Charts) window.Charts.resizeAll();
      });

      const preloader = document.getElementById('preloader');
      if (preloader) preloader.style.display = 'none';
    } catch (err) {
      console.error('[App] Bootstrapping failed', err);
      showAppState('error', 'تعذر تحميل البيانات — تحقق من اتصال الإنترنت وملف processed-data.json.');
    }
  }

  function recompute() {
    window.Dashboard.results = computeAll();
    return window.Dashboard.results;
  }

  /* ---------- واجهة: Sidebar + Header + Filter bar ---------- */
  function renderChrome() {
    const sidebar = document.getElementById('page-sidebar');
    if (sidebar && !sidebar.classList.contains('rendered')) {
      sidebar.innerHTML = buildSidebar();
      sidebar.classList.add('rendered');
    }
    const header = document.getElementById('page-header');
    if (header && !header.classList.contains('rendered')) {
      header.innerHTML = buildHeader();
      header.classList.add('rendered');
    }
    const filterbar = document.getElementById('filter-bar');
    if (filterbar && !filterbar.classList.contains('rendered')) {
      filterbar.innerHTML = buildFilterBar();
      filterbar.classList.add('rendered');
      bindFilterBar();
      window.Filters.bindUI();
    }
    updateFilterStats();
    showAppState('ready');
  }

  const NAV = [
    { href: 'index.html', label: 'النظرة التنفيذية', icon: '◈', active: 'index.html' },
    { href: 'attendance.html', label: 'الحضور', icon: '▦', active: 'attendance.html' },
    { href: 'assessment.html', label: 'القياس والاختبارات', icon: '◉', active: 'assessment.html' },
    { href: 'feedback.html', label: 'تقييم الجلسات', icon: '✉', active: 'feedback.html' },
    { href: 'registration.html', label: 'ملخص التسجيل', icon: '✎', active: 'registration.html' },
    { href: 'assignments.html', label: 'التاسكات', icon: '☰', active: 'assignments.html' },
    { href: 'tracks.html', label: 'مصفوفة المسارات', icon: '▤', active: 'tracks.html' },
    { href: 'data-quality.html', label: 'جودة البيانات', icon: '✓', active: 'data-quality.html' },
    { href: 'executive-report.html', label: 'التقرير التنفيذي', icon: '⑂', active: 'executive-report.html' }
  ];

  function buildSidebar() {
    const current = window.location.pathname.split('/').pop();
    const rows = NAV.map(function (n) {
      const cls = (current === n.active || (!current && n.active === 'index.html')) ? 'active' : '';
      return '<a class="nav-link ' + cls + '" href="' + n.href + '"><span class="nav-ico">' + n.icon + '</span><span>' + n.label + '</span></a>';
    }).join('');
    return '<div class="sidebar-brand"><img src="assets/logo-nouadi.png" alt="شعار نوادي صناع الحياة" class="sidebar-logo"><div class="brand-text"><strong>نوادي صناع الحياة</strong><span>بالجامعات المصرية</span></div></div>' +
           '<nav class="nav-list">' + rows + '</nav>' +
           '<div class="sidebar-foot">كامب جذور &#9642; نظام المتابعة<br>النسخة المعتمدة على البيانات</div>';
  }

  function buildHeader() {
    const current = window.location.pathname.split('/').pop();
    const active = NAV.filter(function (n) { return n.active === current || (!current && n.active === 'index.html'); })[0];
    const pageTitle = (active && active.label) || (window.__PAGE_TITLE__ || 'لوحة التحكم');
    return '<div class="header-side"><button id="menu-toggle" class="menu-toggle" aria-label="القائمة">☰</button>' +
           '<div class="header-title"><h1 class="page-title">' + pageTitle + '</h1><span class="header-sub">كامب جذور — نظام المتابعة</span></div></div>' +
           '<div class="header-actions"><span class="source-pill" id="data-source">' + window.Dashboard.sourceLabel + '</span><span class="updated-pill" id="data-stamp">مُحدَّث للتو</span></div>';
  }

  function buildFilterBar() {
    const opts = window.Dashboard.options;
    const weeks = window.Filters.getWeeksList();
    const weekOptions = ['<option value="__all__">كل الفترة</option>']
      .concat(weeks.map(function (w) { return '<option value="' + w.start + '">' + w.label + ' (' + w.start + ' → ' + w.end + ')</option>'; }))
      .join('');
    function field(key, labelText, controlHtml) {
      return '<label class="f-label"><span class="f-caption">' + labelText + '</span>' + controlHtml + '</label>';
    }
    let tracksHtml = '<option value="">كل المسارات</option>';
    tracksHtml += opts.tracks.map(function (t) { return '<option value="' + escAttr(t) + '">' + esc(t) + '</option>'; }).join('');
    let trainersHtml = '<option value="">كل المدربين</option>' + opts.trainers.map(function (t) { return '<option value="' + escAttr(t) + '">' + esc(t) + '</option>'; }).join('');
    let sessionsHtml = '<option value="">كل الجلسات</option>' + opts.sessions.map(function (s) { return '<option value="' + escAttr(s) + '">' + esc(s) + '</option>'; }).join('');
    let typesHtml = '<option value="">كل الأنواع</option>' + opts.types.map(function (t) { return '<option value="' + escAttr(t) + '">' + esc(t) + '</option>'; }).join('');

    return '<div class="filter-row">' +
           field('week', 'الأسبوع', '<select data-filter="week">' + weekOptions + '</select>') +
           field('dateFrom', 'من تاريخ', '<input type="date" data-filter="dateFrom" value="' + window.Filters.state.dateFrom + '">') +
           field('dateTo', 'إلى تاريخ', '<input type="date" data-filter="dateTo" value="' + window.Filters.state.dateTo + '">') +
           field('track', 'المسار', '<select data-filter="track">' + tracksHtml + '</select>') +
           field('trainer', 'المدرب', '<select data-filter="trainer">' + trainersHtml + '</select>') +
           field('session', 'الجلسة', '<select data-filter="session">' + sessionsHtml + '</select>') +
           field('trainingType', 'النوع', '<select data-filter="trainingType">' + typesHtml + '</select>') +
           '<button class="btn-reset" data-filter-reset>إعادة تعيين</button>' +
           '</div>';
  }

  function updateFilterStats() {
    const el = document.getElementById('filter-stats');
    if (!el) return;
    const f = window.Filters.get();
    const r = window.Dashboard.results;
    const barRendered = document.getElementById('filter-bar') && document.getElementById('filter-bar').classList.contains('rendered');
    if (!barRendered) return;
    const days = r.attendance.activeDays;
    const parts = ['الفترة: <b>' + (f.dateFrom || '—') + ' ← ' + (f.dateTo || '—') + '</b>'];
    if (days) parts.push('أيام فعالة: <b>' + days + '</b>');
    if (f.week) parts.push('أسبوع محدد');
    if (f.track) parts.push('المسار: <b>' + esc(f.track) + '</b>');
    if (f.trainer) parts.push('المدرب: <b>' + esc(f.trainer) + '</b>');
    if (f.session) parts.push('الجلسة: <b>' + esc(f.session) + '</b>');
    if (f.trainingType) parts.push('النوع: <b>' + esc(f.trainingType) + '</b>');
    el.innerHTML = parts.join(' · ');
  }

  function bindFilterBar() {
    const toggle = document.getElementById('menu-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 1024px)').matches) {
        document.body.classList.toggle('nav-open');
      } else {
        document.body.classList.toggle('sidebar-collapsed');
      }
    });

    // على الجوال: إغلاق القائمة الجانبية عند الضغط خارجها (الطبقة الخلفية)
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nav-open')) return;
      const tray = document.querySelector('.app-sidebar');
      if (!tray) return;
      if (tray.contains(e.target)) return;
      if (e.target.closest && e.target.closest('.app-header')) return;
      document.body.classList.remove('nav-open');
    });

    // تحديث عنوان الصفحة من data-page
    const t = document.querySelector('[data-page-title]');
    if (t && window.__PAGE_TITLE__) t.textContent = window.__PAGE_TITLE__;
  }

  /* ---------- حالة التطبيق ---------- */
  function showAppState(state, msg) {
    const el = document.getElementById('app-state');
    if (!el) return;
    if (state === 'ready') { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = '<div class="app-state-box ' + state + '"><div class="spinner"></div><p>' + (msg || '') + '</p></div>';
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function escAttr(s) { return esc(s); }

  /* ---------- اللوجو الافتتاحي: يُعرض عند أول فتح أو Refresh فقط ----------
   * عند النقر على رابط من الشريط الجانبي نحو صفحة أخرى نضع كلمة
   * sessionStorage، فتُتخطَّى الشاشة الافتتاحية دون أن تظهر أثناء التنقل. */
  function bindNavSplashSkip() {
    document.addEventListener('click', function (e) {
      let t = e.target;
      while (t && t !== document) {
        if (t.tagName === 'A' && t.getAttribute && t.getAttribute('href')) {
          const h = t.getAttribute('href');
          if (t.classList.contains('nav-link') || /\.html$/.test(h)) {
            try { sessionStorage.setItem('camp_splash_skip', '1'); } catch (err) { /* ignore */ }
            return;
          }
        }
        t = t.parentNode;
      }
    });
  }
  bindNavSplashSkip();

  window.DashboardBootstrap = { bootstrap: bootstrap };
  window.AppHelpers = { esc: esc, escAttr: escAttr };

  // تشغيل تلقائي (الصفحات الوظيفية)
  if (typeof window.__REPORT_MODE__ === 'undefined' || !window.__REPORT_MODE__) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
      bootstrap();
    }
  }
})();