(function () {
  'use strict';

  var retroChartsInitialized = false;
  var listenersRegistered = false;
  var currentChart = null;

  // ── Theme helpers ──────────────────────────────────────────────────────────
  function getThemeVars() {
    var dash = document.getElementById('cm-dashboard');
    var cs = dash ? getComputedStyle(dash) : null;
    function v(name, fb) { return cs ? cs.getPropertyValue(name).trim() || fb : fb; }
    var isDark = document.body.getAttribute('data-color-mode') === 'dark';
    return {
      primary: v('--cm-color-primary', '#0078d4'),
      success: v('--cm-color-success', '#107c10'),
      warning: v('--cm-color-warning', '#ff8c00'),
      danger: v('--cm-color-danger', '#a4262c'),
      tertiary: v('--cm-text-tertiary', '#a19f9d'),
      secondary: v('--cm-text-secondary', '#605e5c'),
      gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      tickColor: v('--cm-text-secondary', '#605e5c'),
      isDark: isDark
    };
  }

  // ── Burndown chart ────────────────────────────────────────────────────────
  function initBurndownChart() {
    var ctx = document.getElementById('cm-burndown-chart');
    if (!ctx) return;
    var raw = ctx.getAttribute('data-burndown');
    if (!raw) return;
    var bd;
    try { bd = JSON.parse(raw); } catch (e) { return; }
    if (!bd.labels || bd.labels.length === 0) return;
    var t = getThemeVars();
    try {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: bd.labels,
          datasets: [
            { label: 'Trabajo restante', data: bd.remaining, borderColor: t.primary, backgroundColor: t.isDark ? 'rgba(83,155,245,0.12)' : 'rgba(0,120,212,0.10)', fill: true, tension: 0.1, spanGaps: false, pointRadius: 3, pointHoverRadius: 5 },
            { label: 'Capacidad restante', data: bd.capacity, borderColor: t.success, backgroundColor: 'transparent', borderDash: [6, 3], tension: 0, pointRadius: 0, pointHoverRadius: 3 },
            { label: 'Tendencia ideal', data: bd.ideal, borderColor: t.tertiary, backgroundColor: 'transparent', borderDash: [3, 3], tension: 0, pointRadius: 0, pointHoverRadius: 3 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { var v = c.parsed.y; return c.dataset.label + ': ' + (v !== null ? v + 'h' : '-'); } } } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Horas restantes', color: t.tickColor }, grid: { color: t.gridColor }, ticks: { color: t.tickColor, callback: function (v) { return v + 'h'; } } },
            x: { grid: { color: t.gridColor }, ticks: { color: t.tickColor } }
          }
        }
      });
    } catch (e) { }
  }

  // ── Single chart with selector ─────────────────────────────────────────────
  function renderRetroChart(type) {
    var ctx = document.getElementById('cm-retro-chart');
    if (!ctx) return;
    var labels = JSON.parse(ctx.getAttribute('data-labels') || '[]');
    if (!labels.length) return;
    var t = getThemeVars();

    if (currentChart) { currentChart.destroy(); currentChart = null; }

    var config;
    switch (type) {
      case 'velocity':
        config = {
          type: 'bar',
          data: { labels: labels, datasets: [{ label: 'Velocity (h)', data: JSON.parse(ctx.getAttribute('data-velocity')), backgroundColor: t.isDark ? 'rgba(83,155,245,0.5)' : 'rgba(0,120,212,0.5)', borderColor: t.primary, borderWidth: 1, borderRadius: 4 }] },
          options: barOptions(t, 'h')
        };
        break;
      case 'throughput':
        config = {
          type: 'bar',
          data: { labels: labels, datasets: [{ label: 'Tareas cerradas', data: JSON.parse(ctx.getAttribute('data-throughput')), backgroundColor: t.isDark ? 'rgba(87,171,90,0.5)' : 'rgba(16,124,16,0.5)', borderColor: t.success, borderWidth: 1, borderRadius: 4 }] },
          options: barOptions(t, '')
        };
        break;
      case 'predictability':
        config = {
          type: 'line',
          data: { labels: labels, datasets: [
            { label: 'Predictibilidad', data: JSON.parse(ctx.getAttribute('data-predictability')), borderColor: t.primary, backgroundColor: 'transparent', tension: 0.3, pointRadius: 5, pointBackgroundColor: t.primary, borderWidth: 2 },
            { label: '85% (excelente)', data: labels.map(function () { return 85; }), borderColor: t.success, borderDash: [6, 3], pointRadius: 0, borderWidth: 1, fill: false },
            { label: '70% (bueno)', data: labels.map(function () { return 70; }), borderColor: t.warning, borderDash: [6, 3], pointRadius: 0, borderWidth: 1, fill: false }
          ] },
          options: pctOptions(t)
        };
        break;
      case 'completion':
        config = {
          type: 'line',
          data: { labels: labels, datasets: [
            { label: 'Completado', data: JSON.parse(ctx.getAttribute('data-completion')), borderColor: t.primary, backgroundColor: 'transparent', tension: 0.3, pointRadius: 5, pointBackgroundColor: t.primary, borderWidth: 2 },
            { label: '90% (excelente)', data: labels.map(function () { return 90; }), borderColor: t.success, borderDash: [6, 3], pointRadius: 0, borderWidth: 1, fill: false },
            { label: '75% (bueno)', data: labels.map(function () { return 75; }), borderColor: t.warning, borderDash: [6, 3], pointRadius: 0, borderWidth: 1, fill: false }
          ] },
          options: pctOptions(t)
        };
        break;
      case 'hours':
        config = {
          type: 'bar',
          data: { labels: labels, datasets: [
            { label: 'Estimadas', data: JSON.parse(ctx.getAttribute('data-estimated')), backgroundColor: t.isDark ? 'rgba(83,155,245,0.25)' : 'rgba(0,120,212,0.25)', borderColor: t.primary, borderWidth: 1, borderRadius: 4 },
            { label: 'Completadas', data: JSON.parse(ctx.getAttribute('data-completed')), backgroundColor: t.isDark ? 'rgba(87,171,90,0.5)' : 'rgba(16,124,16,0.5)', borderColor: t.success, borderWidth: 1, borderRadius: 4 }
          ] },
          options: barOptions(t, 'h')
        };
        break;
      case 'estimation':
        config = {
          type: 'line',
          data: { labels: labels, datasets: [
            { label: 'Precisión', data: JSON.parse(ctx.getAttribute('data-estimation')), borderColor: t.primary, backgroundColor: 'transparent', tension: 0.3, pointRadius: 5, pointBackgroundColor: t.primary, borderWidth: 2 },
            { label: '100% (perfecto)', data: labels.map(function () { return 100; }), borderColor: t.tertiary, borderDash: [6, 3], pointRadius: 0, borderWidth: 1, fill: false }
          ] },
          options: pctOptions(t)
        };
        break;
      default:
        config = { type: 'bar', data: { labels: labels, datasets: [] }, options: barOptions(t, '') };
    }

    try { currentChart = new Chart(ctx, config); } catch (e) { }
  }

  function barOptions(t, unit) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: t.tickColor, boxWidth: 12, padding: 12 } }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + c.parsed.y + unit; } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: t.gridColor }, ticks: { color: t.tickColor, callback: function (v) { return v + unit; } } },
        x: { grid: { display: false }, ticks: { color: t.tickColor, maxRotation: 45 } }
      }
    };
  }

  function pctOptions(t) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: t.tickColor, boxWidth: 12, padding: 12 } }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + c.parsed.y + '%'; } } } },
      scales: {
        y: { beginAtZero: true, max: 120, grid: { color: t.gridColor }, ticks: { color: t.tickColor, callback: function (v) { return v + '%'; } } },
        x: { grid: { display: false }, ticks: { color: t.tickColor, maxRotation: 45 } }
      }
    };
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function openRetroModal(versionId, sprintName) {
    var template = document.getElementById('cm-retro-template-' + versionId);
    var modal = document.getElementById('cm-retro-modal');
    var body = document.getElementById('cm-modal-body');
    var title = document.getElementById('cm-modal-title');
    if (!template || !modal || !body) return;

    body.innerHTML = template.innerHTML;
    title.textContent = 'Retrospectiva: ' + sprintName;
    modal.style.display = 'flex';

    initRetroSaveInModal(body);
  }

  function closeRetroModal() {
    var modal = document.getElementById('cm-retro-modal');
    if (modal) modal.style.display = 'none';
  }

  function initRetroSaveInModal(container) {
    var saveBtn = container.querySelector('.cm-retro-save-btn');
    var textareas = container.querySelectorAll('.cm-retro-textarea');
    if (!saveBtn) return;

    var retroPath = document.getElementById('cm-dashboard');
    retroPath = retroPath ? retroPath.getAttribute('data-retro-path') : null;

    textareas.forEach(function (ta) {
      ta.addEventListener('input', function () { saveBtn.disabled = false; });
    });

    saveBtn.addEventListener('click', function () {
      var versionId = saveBtn.getAttribute('data-version-id');
      var csrfToken = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';
      var payload = { version_id: parseInt(versionId) };
      textareas.forEach(function (ta) {
        payload[ta.getAttribute('data-field')] = ta.value;
      });
      fetch(retroPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Guardado';
          setTimeout(function () { saveBtn.textContent = 'Guardar retrospectiva'; }, 2000);
        } else {
          alert('Error: ' + (data.error || 'Error desconocido'));
        }
      })
      .catch(function (err) { alert('Error de conexion: ' + err.message); });
    });
  }

  // ── Multi-select dropdown ──────────────────────────────────────────────────
  function cmOpenPanel() {
    var panel = document.getElementById('cm-multiselect-panel');
    var btn = document.getElementById('cm-multiselect-trigger');
    if (!panel || !btn) return;
    var rect = btn.getBoundingClientRect();
    panel.style.top = (rect.bottom + 4) + 'px';
    panel.style.left = rect.left + 'px';
    panel.style.display = 'block';
    var pw = panel.offsetWidth;
    if (rect.left + pw > window.innerWidth - 8) {
      panel.style.left = Math.max(8, rect.right - pw) + 'px';
    }
    var search = document.getElementById('cm-ms-search');
    if (search) { search.value = ''; cmFilterProjects(''); }
    cmSwitchTab('all');
  }

  function cmClosePanel() {
    var panel = document.getElementById('cm-multiselect-panel');
    if (panel) panel.style.display = 'none';
  }

  function cmSwitchTab(tab) {
    var allBtn = document.getElementById('cm-tab-all');
    var selBtn = document.getElementById('cm-tab-selected');
    if (!allBtn || !selBtn) return;
    allBtn.classList.toggle('cm-ms-tab-active', tab === 'all');
    selBtn.classList.toggle('cm-ms-tab-active', tab === 'selected');
    var search = document.getElementById('cm-ms-search');
    cmFilterProjects(search ? search.value : '', tab);
  }

  function cmFilterProjects(query, tabOverride) {
    var q = (query || '').toLowerCase().trim();
    var isAll = tabOverride ? tabOverride === 'all' : document.getElementById('cm-tab-all').classList.contains('cm-ms-tab-active');
    document.querySelectorAll('#cm-ms-list .cm-multiselect-item-row').forEach(function (row) {
      var matchQ = !q || (row.dataset.name || '').includes(q);
      var cb = row.querySelector('input[type="checkbox"]');
      var matchT = isAll || (cb && cb.checked);
      row.style.display = (matchQ && matchT) ? '' : 'none';
    });
  }

  function cmUpdateSubprojectsCheckbox() {
    var children = document.querySelectorAll('#cm-ms-list input[data-is-child="true"]');
    var includeBox = document.getElementById('cm-include-sub');
    if (!children.length || !includeBox) return;
    includeBox.checked = Array.from(children).every(function (cb) { return cb.checked; });
  }

  function cmUpdateButtonLabel() {
    var items = document.querySelectorAll('#cm-ms-list input[name="project_ids[]"]');
    var checked = Array.from(items).filter(function (cb) { return cb.checked; });
    var label = document.getElementById('cm-multiselect-label');
    if (!label) return;
    if (checked.length === 0) label.textContent = 'Ning\u00fan proyecto';
    else if (checked.length === items.length) label.textContent = 'Todos los proyectos (' + items.length + ')';
    else if (checked.length === 1) {
      var ns = checked[0].closest('.cm-multiselect-item-row').querySelector('.cm-multiselect-item-name');
      label.textContent = ns ? ns.textContent.trim() : '1 proyecto';
    } else label.textContent = checked.length + ' proyectos seleccionados';
  }

  function cmApplyFilter() {
    var hiddenDiv = document.getElementById('cm-hidden-project-ids');
    if (hiddenDiv) hiddenDiv.innerHTML = '';
    cmClosePanel();
    document.getElementById('cm-filters-form').submit();
  }

  // ── Global listeners (registered once) ─────────────────────────────────────
  function registerGlobalListeners() {
    if (listenersRegistered) return;
    listenersRegistered = true;

    document.addEventListener('click', function (e) {
      var panel = document.getElementById('cm-multiselect-panel');
      var btn = document.getElementById('cm-multiselect-trigger');
      if (!panel || panel.style.display === 'none') return;
      if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
      cmClosePanel();
    });

    window.addEventListener('scroll', function () {
      var panel = document.getElementById('cm-multiselect-panel');
      var btn = document.getElementById('cm-multiselect-trigger');
      if (!panel || panel.style.display === 'none' || !btn) return;
      var rect = btn.getBoundingClientRect();
      panel.style.top = (rect.bottom + 4) + 'px';
      panel.style.left = rect.left + 'px';
    }, true);

    window.addEventListener('resize', cmClosePanel);

    // Modal close
    document.addEventListener('click', function (e) {
      if (e.target.id === 'cm-retro-modal' || e.target.id === 'cm-modal-close') {
        closeRetroModal();
      }
      if (e.target.closest && e.target.closest('#cm-modal-close')) {
        closeRetroModal();
      }
    });

    // Escape to close modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeRetroModal();
    });
  }

  // ── Per-page init ──────────────────────────────────────────────────────────
  function cmInit() {
    var dashboard = document.getElementById('cm-dashboard');
    if (!dashboard) return;

    registerGlobalListeners();

    try { initBurndownChart(); } catch (e) { }

    // Chart selector
    var chartSel = document.getElementById('cm-chart-selector');
    if (chartSel) {
      renderRetroChart(chartSel.value);
      chartSel.addEventListener('change', function () { renderRetroChart(this.value); });
    }

    // Retro detail buttons
    document.querySelectorAll('.cm-retro-detail-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var vid = btn.getAttribute('data-version-id');
        var sname = btn.getAttribute('data-sprint-name');
        openRetroModal(vid, sname);
      });
    });

    // Dropdown trigger
    var trigger = document.getElementById('cm-multiselect-trigger');
    if (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var panel = document.getElementById('cm-multiselect-panel');
        if (panel && panel.style.display !== 'none') cmClosePanel(); else cmOpenPanel();
      });
    }

    var tabAll = document.getElementById('cm-tab-all');
    var tabSel = document.getElementById('cm-tab-selected');
    if (tabAll) tabAll.addEventListener('click', function () { cmSwitchTab('all'); });
    if (tabSel) tabSel.addEventListener('click', function () { cmSwitchTab('selected'); });

    var search = document.getElementById('cm-ms-search');
    if (search) search.addEventListener('input', function () { cmFilterProjects(this.value); });

    var msList = document.getElementById('cm-ms-list');
    if (msList) {
      msList.addEventListener('change', function (e) {
        if (e.target.name === 'project_ids[]') {
          cmUpdateSubprojectsCheckbox();
          cmUpdateButtonLabel();
        }
      });
    }

    var includeSub = document.getElementById('cm-include-sub');
    if (includeSub) {
      includeSub.addEventListener('change', function () {
        document.querySelectorAll('#cm-ms-list input[data-is-child="true"]').forEach(function (cb) { cb.checked = includeSub.checked; });
        cmUpdateButtonLabel();
      });
    }

    var clearBtn = document.getElementById('cm-ms-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        document.querySelectorAll('#cm-ms-list input[name="project_ids[]"]').forEach(function (cb) { cb.checked = false; });
        if (includeSub) includeSub.checked = false;
        cmUpdateButtonLabel();
        cmSwitchTab('all');
      });
    }

    var applyBtn = document.getElementById('cm-ms-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', cmApplyFilter);

    var sprintSelect = document.getElementById('cm-sprint-select');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', function () {
        var items = document.querySelectorAll('#cm-ms-list input[name="project_ids[]"]:checked');
        var hiddenDiv = document.getElementById('cm-hidden-project-ids');
        if (hiddenDiv) {
          hiddenDiv.innerHTML = '';
          items.forEach(function (cb) {
            var inp = document.createElement('input');
            inp.type = 'hidden'; inp.name = 'project_ids[]'; inp.value = cb.value;
            hiddenDiv.appendChild(inp);
          });
          items.forEach(function (cb) { cb.disabled = true; });
        }
        document.getElementById('cm-filters-form').submit();
      });
    }

    // Capacity
    var capTable = document.querySelector('.cm-capacity-table');
    if (capTable) {
      capTable.addEventListener('change', function (e) {
        if (e.target.classList.contains('cm-input-hours') || e.target.classList.contains('cm-input-days')) {
          updatePreview(e.target);
        }
      });
      capTable.addEventListener('input', function (e) {
        if (e.target.classList.contains('cm-input-hours') || e.target.classList.contains('cm-input-days')) {
          updatePreview(e.target);
        }
      });
    }

    var saveBtn = document.getElementById('cm-save-capacity-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var dash = document.getElementById('cm-dashboard');
        var sprintId = dash ? dash.getAttribute('data-sprint-id') : null;
        var savePath = dash ? dash.getAttribute('data-save-path') : null;
        if (!sprintId || !savePath) return;
        var rows = document.querySelectorAll('.cm-capacity-table tbody tr');
        var configs = [];
        rows.forEach(function (row) {
          var hi = row.querySelector('.cm-input-hours');
          var di = row.querySelector('.cm-input-days');
          if (!hi) return;
          configs.push({ user_id: parseInt(hi.dataset.userId), hours_per_day: parseFloat(hi.value) || 8.0, available_days: di ? (parseInt(di.value) || null) : null });
        });
        var csrfToken = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';
        fetch(savePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ sprint_id: parseInt(sprintId), capacity_configs: configs })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) { saveBtn.disabled = true; location.reload(); }
          else alert('Error al guardar: ' + (data.error || 'Error desconocido'));
        })
        .catch(function (err) { alert('Error de conexion: ' + err.message); });
      });
    }
  }

  function updatePreview(input) {
    var row = input.closest('tr');
    if (!row) return;
    var hoursInput = row.querySelector('.cm-input-hours');
    var daysInput = row.querySelector('.cm-input-days');
    var userId = hoursInput ? hoursInput.dataset.userId : null;
    var preview = userId ? document.querySelector('.cm-capacity-preview[data-user-id="' + userId + '"]') : null;
    if (!hoursInput || !daysInput || !preview) return;
    var h = parseFloat(hoursInput.value) || 0;
    var d = parseInt(daysInput.value) || 0;
    preview.textContent = (Math.round(h * d * 10) / 10) + 'h';
    var btn = document.getElementById('cm-save-capacity-btn');
    if (btn) btn.disabled = false;
  }

  // ── Entry points ───────────────────────────────────────────────────────────
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cmInit);
  else cmInit();
  document.addEventListener('turbo:load', cmInit);
  document.addEventListener('turbolinks:load', cmInit);

}());
