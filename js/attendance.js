/* ============================================================
 * ATTENDANCE.JS — صفحة الحضور
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const FMT = function () { return window.Dashboard.fmt; };

  function renderKPIs(a) {
    const el = document.getElementById('kpi-attendance');
    const cards = [
      kpi('سجلات الحضور', FMT().num(a.nRecords)),
      kpi('مشاركون نشطون', FMT().num(a.uniqueParticipants), 'أسماء/رقم قومي فريد'),
      kpi('أيام فعالة', a.activeDays, a.firstDate + ' ← ' + a.lastDate),
      kpi('متوسط يومي', FMT().stat2(a.avgDaily)),
      kpi('أعلى يوم', a.high != null ? FMT().num(a.high) : '—', a.highDay || ''),
      kpi('أقل يوم', a.low != null ? FMT().num(a.low) : '—', a.lowDay || ''),
      kpi('مسارات نشطة', a.tracks.length),
      kpi('تكرارات (يوم/نid)', a.multiSameDay, 'قد تعني حضورًا متعددًا بنفس اليوم')
    ];
    el.innerHTML = cards.join('');
  }
  function kpi(label, value, foot) {
    return '<div class="kpi"><div class="kpi-rule"></div><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  function renderDaily(r) {
    const a = r.attendance;
    const cats = a.dates;
    const vals = cats.map(function (d) { return a.byDate[d]; });
    const maxV = Math.max.apply(null, vals.concat([1]));
    const data = vals.map(function (v, i) {
      const isTop = a.highDay === cats[i] && v === a.high;
      const isLow = a.lowDay === cats[i] && v === a.low;
      return {
        value: v,
        itemStyle: isTop ? { color: C.colors.primary, borderRadius: [4, 4, 0, 0] }
          : isLow ? { color: '#E5A1A1', borderRadius: [4, 4, 0, 0] }
          : { color: C.colors.primaryLight, borderRadius: [4, 4, 0, 0] }
      };
    });
    const opt = Charts.barOpt(cats, data);
    opt.xAxis.axisLabel.rotate = 35;
    opt.yAxis.max = Math.ceil(maxV * 1.15);
    opt.tooltip.formatter = function (p) {
      const tag = (a.highDay === p[0].axisValue && p[0].value === a.high) ? ' — أعلى يوم' : ((a.lowDay === p[0].axisValue && p[0].value === a.low) ? ' — أقل يوم' : '');
      return p[0].axisValue + '<br>الحضور: <b>' + p[0].value + '</b>' + tag;
    };
    Charts.chart('att-trend-d', opt);
  }

  function renderTrack(r) {
    const a = r.attendance;
    const data = Object.keys(a.byTrack).sort(function (x, y) { return a.byTrack[y] - a.byTrack[x]; })
      .map(function (k) { return { name: k + '  (' + a.byTrack[k] + ')', value: a.byTrack[k] }; });
    Charts.chart('att-track-d', Charts.donutOpt(data));
  }

  function renderHeat(r) {
    const a = r.attendance;
    const matrix = a.heat.map(function (col) { return col.map(function (c) { return c.value; }); });
    Charts.chart('att-heat-d', Charts.heatmapOpt(a.heatDates, a.heatTracks, matrix));
  }

  function renderTable(r) {
    const el = document.getElementById('att-table');
    const a = r.attendance;
    const sorted = a.dates.slice().sort(function (x, y) { return a.byDate[y] - a.byDate[x]; });
    let rank = 1;
    const body = sorted.map(function (d) {
      const row = '<tr><td class="rank">' + (rank++) + '</td><td>' + d + '</td><td class="num">' + a.byDate[d] + '</td></tr>';
      return row;
    }).join('');
    el.innerHTML = '<table class="tbl"><thead><tr><th>الترتيب</th><th>اليوم</th><th class="num">السجلات</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderAll() {
    const D = window.Dashboard;
    if (!D || !D.results) return;
    const r = D.results;
    renderKPIs(r.attendance);
    renderDaily(r);
    renderTrack(r);
    renderHeat(r);
    renderTable(r);
  }

  window.addEventListener('campReady', renderAll);
  window.addEventListener('campResultsUpdated', renderAll);
})();