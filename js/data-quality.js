/* ============================================================
 * DATA-QUALITY.JS — صفحة جودة البيانات
 * ============================================================ */
(function () {
  const FMT = function () { return window.Dashboard.fmt; };

  function renderOnce() {
    const D = window.Dashboard;
    if (!D) return;

    // إعادة الحساب ليس ضروريًا هنا: جودة البيانات صفة للملف الخام
    const dq = window.Analytics.dataQuality(D.dataset.raw, D.dataset);
    renderKPI(dq);
    renderAttendance(dq.attendance);
    renderFeedback(dq.feedback);
    renderAssignment(dq.assignment);
    renderQuiz(dq.prequiz, 'dq-prequiz');
    renderQuiz(dq.postquiz, 'dq-postquiz');
    renderNotes(dq.globalNotes);
  }

  function renderKPI(dq) {
    const el = document.getElementById('kpi-dq');
    const a = dq.attendance, f = dq.feedback, q = dq.assignment;
    const cards = [
      kpi('إجمالي صفوف الحضور', FMT().num(a.total)),
      kpi('رقم قومي فريد', FMT().num(a.uniqueNid)),
      kpi('تواريخ خارج النطاق', FMT().num(a.dateOutliers)),
      kpi('استجابات التقييم', FMT().num(f.total)),
      kpi('نموذج قصير (جزئي)', FMT().num(f.shortForm)),
      kpi('تسليم تاسكات', FMT().num(q.total)),
      kpi('صفوف قالب في الاختبارات', FMT().num(dq.prequiz.headerRows + dq.postquiz.headerRows), 'فوق البيانات الفعلية'),
      kpi('درجات غير رقمية', FMT().num(dq.prequiz.nonNumeric + dq.postquiz.nonNumeric))
    ];
    el.innerHTML = cards.join('');
  }
  function kpi(label, value, foot) {
    return '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  function renderAttendance(a) {
    const el = document.getElementById('dq-attendence');
    el.innerHTML = rows([
      [bar('بدون اسم', a.missingName, a.total), bar('بدون رقم قومي', a.missingNid, a.total)],
      [bar('بدون تاريخ', a.missingDate, a.total), bar('تاريخ خارج النطاق', a.dateOutliers, a.total)],
      [bar('صفوف مكررة حرفيًا', a.duplicateExact, a.total), bar('تكرارات (نid+يوم)', a.multiSameDay, a.total)]
    ]);
  }

  function renderFeedback(f) {
    const el = document.getElementById('dq-feedback');
    el.innerHTML = rows([
      [bar('بلا جلسة محددة', f.missingSession, f.total), bar('بلا مدرب محدد', f.missingTrainer, f.total)],
      [bar('نموذج قصير/جزئي', f.shortForm, f.total), bar('UUID مكرر', f.duplicateUuid, f.total)],
      [bar('أعمدة حضورية فارغة', f.offlineColumnsEmpty ? f.total : 0, f.total, true), bar('تفاصيل جزئية (dims<10)', f.onlineMissingDetail, f.total)]
    ]);
  }

  function renderAssignment(q) {
    const el = document.getElementById('dq-assignment');
    el.innerHTML = rows([
      [bar('بلا اسم', q.missingName, q.total), bar('بلا واتساب', q.missingWhatsapp, q.total)],
      [bar('بلا رابط', q.missingLink, q.total), bar('بلا ملف/رابط معًا', q.missingFile, q.total)],
      [bar('مرشح تكرار (طابع زمني+مسار+ملف)', q.duplicateRowCandidates, q.total)]
    ]);
  }

  function renderQuiz(q, containerId) {
    const el = document.getElementById(containerId);
    const totalsCell = '<div class="stat-cell"><div class="sc-label">إجمالي الصفوف</div><div class="sc-value">' + q.total + '</div></div>';
    const byExam = Object.keys(q.byExam).map(function (k) { return '<span class="badge gray">' + window.DataCleaner.EXAMS[k].label + ': ' + q.byExam[k] + '</span>'; }).join(' ') || '<span class="na-badge">لا تصنيف</span>';
    el.innerHTML =
      '<div class="stat-row">' + totalsCell +
      sc('صفوف قالب', q.headerRows) +
      sc('درجات غير رقمية', q.nonNumeric) +
      sc('خارج النطاق', q.outOfRange) +
      sc('بدون هوية', q.noIdentity) +
      '</div>' +
      '<div class="pill-group" style="margin-top:.7rem">' + byExam + '</div>';
  }
  function sc(label, value) {
    return '<div class="stat-cell"><div class="sc-label">' + label + '</div><div class="sc-value">' + value + '</div></div>';
  }

  function renderNotes(notes) {
    document.getElementById('dq-notes').innerHTML = notes.map(function (n) { return '<li class="micro">' + n + '</li>'; }).join('');
  }

  function bar(label, count, total, reverse) {
    const pct = total ? Math.min(100, (count / total) * 100) : 0;
    const cls = reverse
      ? (pct === 0 ? 'good' : (pct < 40 ? 'warn' : 'bad'))
      : (pct < 8 ? 'good' : (pct < 25 ? 'warn' : 'bad'));
    return '<div class="stat-cell"><div class="sc-label">' + label + ' — <b>' + count + '</b> من ' + total + '</div>' +
      '<div class="progress-track" style="margin-top:.4rem"><div class="progress-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
      '<div class="sc-note">' + pct.toFixed(1) + '%</div></div>';
  }

  function rows(cells) {
    return cells.map(function (pair) { return '<div class="stat-row" style="margin-bottom:.55rem">' + pair.join('') + '</div>'; }).join('');
  }

  window.addEventListener('campReady', renderOnce);
})();