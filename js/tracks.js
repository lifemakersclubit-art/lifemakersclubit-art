/* ============================================================
 * TRACKS.JS — صفحة مصفوفة المسارات
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const FMT = function () { return window.Dashboard.fmt; };

  function esc(s) { return window.AppHelpers.esc(s); }

  function renderMatrix(r) {
    const el = document.getElementById('matrix-table');
    const rows = r.trackMatrix.map(function (m) {
      const assessCell = (m.preN + m.postN) > 0
        ? '<span class="num">قبل: ' + m.preN + '</span> · <span class="num">بعد: ' + m.postN + '</span>'
        : '<span class="na-badge">غير متاح</span>';
      return '<tr>' +
        '<td><b>' + esc(m.track) + '</b></td>' +
        '<td class="num">' + m.attendance + '</td>' +
        '<td class="num">' + (m.uniqueParticipants == null ? '<span class="na-badge">—</span>' : m.uniqueParticipants) + '</td>' +
        '<td>' + (m.feedback == null ? '<span class="na-badge">غير متاح من البيانات الحالية</span>' : m.feedback) + '</td>' +
        '<td class="num">' + m.assignments + '</td>' +
        '<td>' + assessCell + '</td>' +
        '<td class="num">' + (m.pairedN ? m.pairedN : '<span class="na-badge">—</span>') + '</td>' +
        '</tr>';
    }).join('');

    el.innerHTML = '<table class="tbl"><thead><tr>' +
      '<th>المسار</th><th class="num">حضور</th><th class="num">مشاركون فريدون</th><th>تقييم الجلسات</th>' +
      '<th class="num">تاسكات</th><th>اختبارات (قبل/بعد)</th><th class="num">أزواج</th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="7" class="text-muted">لا توجد مسارات في النطاق.</td></tr>') + '</tbody></table>';

    const note = document.createElement('div');
    note.className = 'note-line';
    note.textContent = 'خلية «غير متاح» تعني عدم وجود ربط موثوق به في بيانات المصدر (لا تطابق معرفات أو لا توجد نسخة). تُترك نصوص المسارات المؤكدة فقط.';
    el.appendChild(note);
  }

  function maxOfExam(track) {
    // لأغراض العرض فقط؛ الوسيط المبين في الصفحة احتياطي.
    return 100;
  }

  function renderMaps() {
    const em = document.getElementById('exam-map');
    const am = document.getElementById('asg-map');
    em.innerHTML = Object.keys(C.examToTrackMap).map(function (k) {
      return '<li>' + esc(C.examToTrackMap[k]) + ' ← نموذج: ' + esc(k) + '</li>';
    }).join('');
    am.innerHTML = Object.keys(C.assignmentTrackCampMap).map(function (k) {
      return '<li>' + esc(k) + ' ← ' + esc(C.assignmentTrackCampMap[k]) + '</li>';
    }).join('');
  }

  function renderAll() {
    const D = window.Dashboard;
    if (!D || !D.results) return;
    renderMatrix(D.results);
    renderMaps();
  }

  window.addEventListener('campReady', renderAll);
  window.addEventListener('campResultsUpdated', renderAll);
})();