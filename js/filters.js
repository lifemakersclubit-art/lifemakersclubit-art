/* ============================================================
 * FILTERS — State Manager
 * يُنشئ حالة الفلتر ويُ广播 التغييرات على أي عنصر يحمل data-filter.
 * الفلتر: dateFrom / dateTo / week / track / trainer / session / trainingType
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const AC = window.Analytics;

  const state = {
    dateFrom: C.defaultDateFrom,
    dateTo:   C.defaultDateTo,
    week:     null,    // null = جميع الأسابيع، أو {start,end,label}
    track:    null,
    trainer:  null,
    session:  null,
    trainingType: null
  };

  /* --- Weeks list: تُملأ من البيانات بعد التنظيف --- */
  let _weeksList = [];

  function setWeeks(attendanceEntities) {
    const map = {};
    attendanceEntities.forEach(function (e) {
      if (!e.date) return;
      const wi = AC.weekInfo(e.date);
      if (!wi || map[wi.start]) return;
      map[wi.start] = wi;
    });
    _weeksList = Object.keys(map)
      .sort()
      .map(function (k) { return map[k]; });
  }

  function getWeeksList() { return _weeksList; }

  /* --- Setters --- */
  function set(k, v) {
    if (k === 'week') return setWeek(v);
    state[k] = v;
    emit();
  }

  function setWeek(week) {
    // week = null (reset) أو week = {start, end}
    state.week = week;
    if (week) {
      state.dateFrom = week.start;
      state.dateTo   = week.end;
    } else {
      state.dateFrom = C.defaultDateFrom;
      state.dateTo   = C.defaultDateTo;
    }
    emit();
  }

  function resetAll() {
    state.dateFrom = C.defaultDateFrom;
    state.dateTo   = C.defaultDateTo;
    state.week     = null;
    state.track    = null;
    state.trainer  = null;
    state.session  = null;
    state.trainingType = null;
    emit();
  }

  function get() { return Object.assign({}, state); }

  /* --- خيارات الفلاتر (تُملأ من البيانات) --- */
  let _options = {};
  function setOptions(opts) { _options = opts; }
  function getOptions() { return _options; }

  /* --- بثّ الحدث --- */
  function emit() {
    window.dispatchEvent(new CustomEvent('campFilterChanged', { detail: get() }));
  }

  /* --- ربط عناصر الواجهة بقائمة منسدلة أو selects --- */
  function bindUI() {
    document.addEventListener('change', function (e) {
      const el = e.target;
      const key = el.dataset && el.dataset.filter;
      if (!key) return;
      if (key === 'week') {
        if (el.value === '__all__') { setWeek(null); return; }
        const wi = AC.weekInfo(el.value) || {};
        setWeek(wi.start ? { start: wi.start, end: wi.end, label: wi.label } : null);
        return;
      }
      set(key, el.value || null);
    });

    document.addEventListener('click', function (e) {
      const el = e.target.closest && e.target.closest('[data-filter-reset]');
      if (!el) return;
      resetAll();
    });
  }

  window.Filters = { state: state, set: set, setWeek: setWeek, resetAll: resetAll, get: get, setWeeks: setWeeks, getWeeksList: getWeeksList, setOptions: setOptions, getOptions: getOptions, bindUI: bindUI };
})();