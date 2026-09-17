/**************************************************************
 * كود جوجل أبلز سكربت — الواجهة الخلفية لنظام متابعة
 * «كامب جذور» — نوادي صناع الحياة بالجامعات المصرية
 *
 * الوظيفة:
 *   - قراءة 5 جداول (attendence / feedback / assignment /
 *     prequiz / postquiz) من جدول البيانات الرئيسي.
 *   - إرجاع JSON بنفس مخطط processed-data.json بحيث يظل
 *     منطق التنظيف والتحليل في المتصفح هو المصدر الوحيد للحقيقة.
 *
 * للاستخدام: غيّر SPREADSHEET_ID ثم انشر Web App.
 * الإرجاع عبر: GET <url>?data=1  ->  JSON خام
 **************************************************************/

// ====== الإعدادات (عدّلها هنا فقط) ======
var SPREADSHEET_ID = '16eWk8qzvbSSwiYZCNBTw6gbszFzaYxzoJURhTGyogo8'; // معرف جدول بيانات Google Sheets

var SHEET_NAMES = {
  attendance: 'attendence',
  feedback:   'feedback',
  assignment: 'assignment',
  prequiz:    'prequiz',
  postquiz:   'postquiz',
  registration: 'camp_registration'
};

var APP_META = {
  name: 'كامب جذور',
  org: 'صناع الحياة',
  orgFull: 'نوادي صناع الحياة بالجامعات المصرية',
  systemLabel: 'نظام المتابعة والتقييم المركزي',
  version: '1.0.0',
  dataSourceLabel: 'الإدارة المركزية لكامب جذور'
};

/**************************************************************
 * نقطة الدخول لبيانات JSON
 * GET <webapp-url>?data=1
 **************************************************************/
function doGet(e) {
  if (e && e.parameter && e.parameter.data === '1') {
    var payload = buildPayload(true);
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // صفحة حالة بسيطة
  var html = buildStatusPage();
  return HtmlService.createHtmlOutput(html)
    .setTitle('كامب جذور — التحقق من بيانات الواجهة')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**************************************************************
 * يستدعيه لوحة التحكم عندما تُستضاف داخل بيئة Apps Script
 **************************************************************/
function getDashboardData() {
  return buildPayload(true);
}

/**************************************************************
 * بناء الحمولة: {meta, sheets:{name:{headers, rows}}}
 **************************************************************/
function buildPayload(withCache) {
  var cacheKey = 'camp_juzur_payload_v1';
  var cache = CacheService.getScriptCache();
  if (withCache !== false) {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = {};
  var ok = 0;
  var errs = [];
  for (var key in SHEET_NAMES) {
    try {
      var sh = ss.getSheetByName(SHEET_NAMES[key]);
      if (!sh) { errs.push(SHEET_NAMES[key] + ': غير موجود'); continue; }
      var values = sh.getDataRange().getValues();
      if (!values.length) { sheets[key] = { headers: [], rows: [] }; continue; }
      var headers = values[0].map(function (h) { return String(h); });
      var rows = [];
      for (var i = 1; i < values.length; i++) {
        rows.push(values[i].map(function (v) {
          if (v instanceof Date) {
            // تاريخ -> serial (متوافق مع قاعدة parseDate)
            return (v.getTime() / 86400000) + 25569;
          }
          if (v === null || typeof v === 'undefined') return '';
          return String(v);
        }));
      }
      sheets[key] = { headers: headers, rows: rows };
      ok++;
    } catch (err) {
      errs.push(SHEET_NAMES[key] + ': ' + err.message);
    }
  }
  var payload = {
    meta: {
      source: 'google-apps-script',
      app: APP_META,
      spreadsheetId: SPREADSHEET_ID,
      exportedAt: new Date().toISOString(),
      serialBaseDate: '1899-12-30',
      sheetNames: SHEET_NAMES,
      sheetsLoaded: ok,
      errors: errs
    },
    sheets: sheets
  };
  if (withCache !== false && ok > 0) {
    try { cache.put(cacheKey, JSON.stringify(payload), 1800); } catch (e) {}
  }
  return payload;
}

/**************************************************************
 * صفحة حالة للتحقق اليدوي
 **************************************************************/
function buildStatusPage() {
  var p = buildPayload(false);
  var lines = ['<meta charset="utf-8">', '<h1 dir="rtl">كامب جذور — الواجهة الخلفية تعمل</h1>',
    '<p dir="rtl">عدد الجداول المحمّلة: <b>' + p.meta.sheetsLoaded + '</b> من 5</p>',
    '<ul dir="rtl">'];
  for (var key in p.sheets) {
    lines.push('<li>' + key + ': ' + p.sheets[key].rows.length + ' صفًا × ' + p.sheets[key].headers.length + ' عمودًا</li>');
  }
  lines.push('</ul>');
  if (p.meta.errors.length) {
    lines.push('<p dir="rtl" style="color:#c0392b">أخطاء: ' + p.meta.errors.join(' • ') + '</p>');
  }
  lines.push('<p dir="rtl">آخر تصدير: ' + p.meta.exportedAt + '</p>');
  lines.push('<p dir="rtl"><a href="?data=1">فتح البيانات JSON</a></p>');
  return lines.join('\n');
}