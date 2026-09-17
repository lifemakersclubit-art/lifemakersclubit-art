/* ============================================================
 * CHARTS — ECharts Wrapper
 * 차트 인스턴스 관리, 로딩/에러 상태, 내보내기(PNG), RTL 텍스트 렌더링
 * CDN: https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
 * ============================================================ */
(function () {
  const C = window.CAMP_CONFIG;
  const instances = {};

  function getTheme() {
    return {
      color: [C.colors.primary, C.colors.accent, C.colors.primaryLight, C.colors.accentLight,
              '#94A3B8', '#F87171', '#34D399', '#FBBF24', '#818CF8', '#FB923C'],
      backgroundColor: 'transparent',
      textStyle: { fontFamily: '"IBM Plex Sans Arabic", "Noto Sans Arabic", sans-serif', color: '#475569' },
      title: {
        textStyle: { fontFamily: '"Alexandria", "IBM Plex Sans Arabic", sans-serif', fontSize: 16, fontWeight: 600, color: C.colors.text }
      },
      legend: {
        textStyle: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 12, color: '#64748B' }
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        textStyle: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 13, color: C.colors.text },
        extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,.08);direction:rtl;text-align:right;'
      },
      categoryAxis: {
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisTick: { show: false },
        axisLabel: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 11, color: '#64748B' },
        splitLine: { show: false }
      },
      valueAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 11, color: '#94A3B8' },
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } }
      }
    };
  }

  function getThemeDark() {
    var t = getTheme();
    t.backgroundColor = '#0F172A';
    t.textStyle.color = '#CBD5E1';
    t.tooltip.backgroundColor = '#1E293B';
    t.tooltip.borderColor = '#334155';
    t.tooltip.textStyle.color = '#F1F5F9';
    t.categoryAxis.axisLine.lineStyle.color = '#475569';
    t.categoryAxis.axisLabel.color = '#94A3B8';
    t.valueAxis.axisLabel.color = '#64748B';
    t.valueAxis.splitLine.lineStyle.color = '#1E293B';
    return t;
  }

  /** ينشئ أو يحدّث رسمًا بيانيًا */
  function chart(id, option, opts) {
    opts = opts || {};
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) return null;

    // تحميل ECharts عند أول استخدام
    if (!window.echarts) {
      showChartError(el, 'مكتبة الرسوم البيانية ECharts غير متوفرة');
      return null;
    }

    let inst = instances[id || el.id];
    if (!inst) {
      inst = window.echarts.init(el, null, { renderer: 'canvas' });
      instances[id || el.id] = inst;
    }
    if (opts.resize !== false) {
      setTimeout(function () { inst.resize(); }, 0);
    }

    try {
      const themed = applyTheme(option, opts.dark);
      inst.setOption(themed, true);
      hideChartError(el);
    } catch (err) {
      console.error('[Chart]', id, err);
      showChartError(el, 'خطأ في تحميل الرسم البياني');
    }
    return inst;
  }

  function applyTheme(option, dark) {
    const theme = dark ? getThemeDark() : getTheme();
    const merged = Object.assign({}, theme, option || {});
    // تطبيق الحواف على tier titles
    return merged;
  }

  function showChartError(el, msg) {
    el.classList.add('chart-error');
    let box = el.parentElement.querySelector('.chart-error-msg');
    if (!box) {
      box = document.createElement('div');
      box.className = 'chart-error-msg';
      el.parentElement.style.position = 'relative';
      el.parentElement.appendChild(box);
    }
    box.innerHTML = '<div class="chart-error-icon">⚠</div><span>' + (msg || 'خطأ في تحميل الرسم') + '</span>';
  }
  function hideChartError(el) {
    el.classList.remove('chart-error');
    const box = el.parentElement && el.parentElement.querySelector('.chart-error-msg');
    if (box) box.remove();
  }

  /** توليد خيارات افتراضية ل الأنواع الشائعة */
  function barOpt(categories, data, label) {
    return {
      title: label ? { text: label, left: 'center' } : undefined,
      xAxis: { type: 'category', data: categories, axisLabel: {} },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data, barMaxWidth: 36, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
      tooltip: { trigger: 'axis' },
      grid: { top: label ? 40 : 20, bottom: 40, left: 50, right: 16, containLabel: false }
    };
  }

  function lineOpt(categories, data, label, smooth) {
    return {
      title: label ? { text: label, left: 'center' } : undefined,
      xAxis: { type: 'category', data: categories, axisLabel: {} },
      yAxis: { type: 'value' },
      series: [{ type: 'line', data: data, smooth: !!smooth, symbolSize: 6, lineStyle: { width: 2.5 } }],
      tooltip: { trigger: 'axis' },
      grid: { top: label ? 40 : 20, bottom: 40, left: 50, right: 16, containLabel: false }
    };
  }

  function donutOpt(data, label) {
    return {
      title: label ? { text: label, left: 'center' } : undefined,
      series: [{
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '55%'],
        data: data,
        label: { show: true, formatter: '{b}\n{d}%', fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 11 },
        itemStyle: { borderRadius: 4, borderColor: '#FFFFFF', borderWidth: 2 }
      }],
      tooltip: { trigger: 'item' }
    };
  }

  function radarOpt(dims, data, label) {
    return {
      title: label ? { text: label, left: 'center' } : undefined,
      radar: { indicator: dims, radius: '65%', center: ['50%', '56%'] },
      series: [{ type: 'radar', data: data, areaStyle: { opacity: 0.15 } }],
      tooltip: { trigger: 'item' }
    };
  }

  function heatmapOpt(dates, tracks, matrix, label) {
    const data = [];
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        data.push([i, j, matrix[i][j]]);
      }
    }
    return {
      title: label ? { text: label, left: 'center' } : undefined,
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45, fontSize: 10 }, splitArea: { show: false } },
      yAxis: { type: 'category', data: tracks, splitArea: { show: false } },
      visualMap: {
        min: 0, max: Math.max.apply(null, data.map(function (d) { return d[2]; }).concat([1])),
        calculable: false, orient: 'horizontal', left: 'center', bottom: 0, inRange: {
          color: ['#F1F5F9', C.colors.primaryLight, C.colors.primary, '#1E3A5F']
        },
        textStyle: { fontFamily: '"IBM Plex Sans Arabic", sans-serif', fontSize: 11 }
      },
      series: [{
        type: 'heatmap', data: data,
        label: { show: true, fontSize: 10, fontFamily: '"IBM Plex Sans Arabic", sans-serif' },
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 2, borderRadius: 2 }
      }],
      grid: { top: label ? 40 : 10, bottom: 80, left: 100, right: 16, containLabel: false },
      tooltip: {
        formatter: function (p) { return '<b>' + tracks[p.value[1]] + '</b><br>' + dates[p.value[0]] + '<br>عدد الحضور: <b>' + p.value[2] + '</b>'; }
      }
    };
  }

  function groupBarOpt(categories, seriesArr, label) {
    // seriesArr = [{name, data}]
    return {
      title: label ? { text: label, left: 'center' } : undefined,
      xAxis: { type: 'category', data: categories, axisLabel: {} },
      yAxis: { type: 'value' },
      series: seriesArr.map(function (s) { return { type: 'bar', name: s.name, data: s.data, barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] } }; }),
      legend: seriesArr.length > 1 ? { show: true } : { show: false },
      tooltip: { trigger: 'axis' },
      grid: { top: label ? 50 : 20, bottom: 40, left: 50, right: 16, containLabel: false }
    };
  }

  /** توليد صورة PNG من الرسم البياني */
  function exportPNG(id, filename) {
    const inst = instances[id];
    if (!inst) return;
    const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#FFFFFF' });
    const link = document.createElement('a');
    link.download = (filename || 'chart') + '.png';
    link.href = url;
    link.click();
  }

  /** تغيير حجم جميع الرسوم البيانية */
  function resizeAll() {
    Object.keys(instances).forEach(function (k) {
      try { instances[k].resize(); } catch (e) { /* ignore */ }
    });
  }

  /** إزالة جميع الرسوم البيانية */
  function disposeAll() {
    Object.keys(instances).forEach(function (k) {
      try { instances[k].dispose(); } catch (e) { /* ignore */ }
      delete instances[k];
    });
  }

  window.Charts = {
    chart: chart, exportPNG: exportPNG, resizeAll: resizeAll, disposeAll: disposeAll,
    barOpt: barOpt, lineOpt: lineOpt, donutOpt: donutOpt, radarOpt: radarOpt,
    heatmapOpt: heatmapOpt, groupBarOpt: groupBarOpt,
    instances: instances
  };
})();