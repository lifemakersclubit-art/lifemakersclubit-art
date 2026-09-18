/* ============================================================
 * DATA LOADER — تحميل البيانات مرة واحدة + كاش + دعم Apps Script
 * ترتيب المحاولات:
 *   1) google.script.run (عند تشغيل التطبيق داخل Google Apps Script)
 *   2) window.CAMP_APPS_SCRIPT_URL (نقطة نهاية Apps Script Web App)
 *   3) data/processed-data.json (النسخة المعتمدة محليًا / GitHub Pages)
 * ============================================================ */
(function () {
  const LS_KEY = 'camp_juzur_ds_v3';
  const URL_KEY = 'camp_juzur_url';
  const SOURCE_KEY = 'camp_juzur_src';
  const STAMP_KEY = 'camp_juzur_stamp';

  function readLS(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function writeLS(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* ignore */ } }

  function fetchJSON(url) {
    return fetch(url, { method: 'GET', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  function scriptServerLoad() {
    return new Promise(function (resolve, reject) {
      if (typeof window.google === 'undefined' || !window.google.script) return reject(new Error('no-google-run'));
      window.google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(function (err) { reject(new Error(err && err.message ? err.message : 'script-run-fail')); })
        .getDashboardData();
    });
  }

  async function loadRemote(url) {
    const res = await fetchJSON(url);
    if (!res || !res.meta || !res.sheets) throw new Error('invalid-remote-schema');
    return res;
  }

  async function loadLocal() {
    const today = new Date().toISOString().slice(0, 10);
    const cached = readLS(LS_KEY);
    if (cached && readLS(STAMP_KEY) === today) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.sheets) { window.__CAMP_CACHE_HIT__ = true; return parsed; }
      } catch (e) { /* fallthrough */ }
    }
    const data = await fetchJSON('data/processed-data.json');
    try {
      writeLS(LS_KEY, JSON.stringify(data));
      writeLS(STAMP_KEY, today);
    } catch (e) { /* storage full — ignore */ }
    return data;
  }

  function inlineBundle() {
    return new Promise(function (resolve, reject) {
      if (typeof window.CAMP_BUNDLED !== 'undefined' && window.CAMP_BUNDLED && window.CAMP_BUNDLED.sheets) {
        resolve(window.CAMP_BUNDLED);
      } else {
        reject(new Error('no-inline-bundle'));
      }
    });
  }

  function isFileProtocol() {
    try { return window.location.protocol === 'file:'; } catch (e) { return false; }
  }

  async function load() {
    const remoteUrl = readLS(URL_KEY) || (window.CAMP_APPS_SCRIPT_URL || '');
    const attemptOrder = [];
    if (typeof window.google !== 'undefined' && window.google.script) attemptOrder.push('google-run');
    if (remoteUrl) attemptOrder.push('remote');

    let lastError = null;

    // عند الفتح المباشر file:// لا يعمل fetch إطلاقًا (قيود المتصفح) →
    // استخدم النسخة المضمّنة داخل المشروع فورًا.
    if (isFileProtocol()) {
      try {
        const data = await inlineBundle();
        writeLS(SOURCE_KEY, 'bundled-inline');
        return data;
      } catch (e) { lastError = e; }
    } else {
      if (remoteUrl) {
        // نقطة نهاية Apps Script تُعيد أحيانًا 404 مؤقتًا عند النشر —
        // محاولة ثانية بعد 900ms قبل العدول للنسخة المرفقة.
        let done = false;
        for (let attempt = 0; attempt < 2 && !done; attempt++) {
          try {
            const data = await loadRemote(remoteUrl);
            writeLS(SOURCE_KEY, 'google-sheets');
            return data;
          } catch (e) {
            lastError = e;
            if (attempt === 0) await new Promise(function (r) { setTimeout(r, 900); });
          }
        }
      }

      if (attemptOrder.indexOf('google-run') !== -1) {
        try {
          const data = await scriptServerLoad();
          writeLS(SOURCE_KEY, 'google-run');
          return data;
        } catch (e) { lastError = e; }
      }
    }

    try {
      const data = await loadLocal();
      writeLS(SOURCE_KEY, 'bundled-json');
      return data;
    } catch (e) { lastError = e; }

    try {
      const data = await inlineBundle();
      writeLS(SOURCE_KEY, 'bundled-inline');
      return data;
    } catch (e) { lastError = e; }

    throw lastError || new Error('no-data-source');
  }

  function sourceLabel() {
    const s = readLS(SOURCE_KEY);
    if (s === 'google-sheets') return 'مباشرة من Google Sheets (Apps Script)';
    if (s === 'google-run') return 'داخل بيئة Google Apps Script';
    if (s === 'bundled-inline') return 'النسخة المعتمدة المرفقة (مضمّنة بملف اللوحة)';
    return 'النسخة المعتمدة المرفقة (processed-data.json)';
  }

  window.DataLoader = { load: load, sourceLabel: sourceLabel, LS_KEY: LS_KEY };
})();