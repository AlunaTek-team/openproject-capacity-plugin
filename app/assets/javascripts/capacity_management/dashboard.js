(function () {
  'use strict';

  var retroChartsInitialized = false;

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
    } catch (e) { /* Chart.js error */ }
  }

  // ── Retrospective charts ──────────────────────────────────────────────────
  function initRetroChart(canvasId, type, label, unit) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    var raw = ctx.getAttribute('data-chart');
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data.labels || data.labels.length === 0) return;

    var t = getThemeVars();
    var chartType = type || 'bar';

    try {
      new Chart(ctx, {
        type: chartType,
        data: {
          labels: data.labels,
          datasets: [{
            label: label,
            data: data.values,
            borderColor: t.primary,
            backgroundColor: chartType === 'line' ? 'transparent' : (t.isDark ? 'rgba(83,155,245,0.4)' : 'rgba(0,120,212,0.5)'),
            fill: chartType === 'line' ? false : true,
            tension: 0.3,
            pointRadius: chartType === 'line' ? 4 : 0,
            pointBackgroundColor: t.primary,
            borderWidth: chartType === 'line' ? 2 : 0,
            borderRadius: chartType === 'bar' ? 4 : 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + c.parsed.y + (unit || ''); } } } },
          scales: {
            y: { beginAtZero: true, grid: { color: t.gridColor }, ticks: { color: t.tickColor, callback: function (v) { return v + (unit || ''); } } },
            x: { grid: { display: false }, ticks: { color: t.tickColor, maxRotation: 45 } }
          }
        }
      });
    } catch (e) { /* Chart.js error */ }
  }

  function initAllRetroCharts() {
    if (retroChartsInitialized) return;
    retroChartsInitialized = true;
    initRetroChart('cm-velocity-chart', 'bar', 'Velocity', 'h');
    initRetroChart('cm-throughput-chart', 'bar', 'Tareas cerradas', '');
    initRetroChart('cm-predictability-chart', 'line', 'Predictibilidad', '%');
    initRetroChart('cm-completion-chart', 'line', 'Completado', '%');
  }

  // ── Tab switching ─────────────────────────────────────────────────────────
  function initTabs() {
    var tabs = document.querySelectorAll('.cm-tab');
    var tabInput = document.getElementById('cm-tab-input');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.remove('cm-tab-active'); });
        tab.classList.add('cm-tab-active');
        document.querySelectorAll('.cm-tab-content').forEach(function (c) { c.style.display = 'none'; });
        var content = document.getElementById('cm-tab-' + target);
        if (content) content.style.display = '';
        if (tabInput) tabInput.value = target;
        if (target === 'retrospective') {
          setTimeout(initAllRetroCharts, 50);
        }
      });
    });

    // Si la pestaña retrospectiva ya está activa al cargar
    var activeTab = document.querySelector('.cm-tab-active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'retrospective') {
      setTimeout(initAllRetroCharts, 100);
    }
  }

  // ── Retrospective save ────────────────────────────────────────────────────
  function initRetroSave() {
    var dash = document.getElementById('cm-dashboard');
    var retroPath = dash ? dash.getAttribute('data-retro-path') : null;
    if (!retroPath) return;

    document.querySelectorAll('.cm-retro-sprint').forEach(function (section) {
      var saveBtn = section.querySelector('.cm-retro-save-btn');
      var textareas = section.querySelectorAll('.cm-retro-textarea');
      if (!saveBtn) return;

      textareas.forEach(function (ta) {
        ta.addEventListener('input', function () { saveBtn.disabled = false; });
      });

      saveBtn.addEventListener('click', function () {
        var versionId = section.getAttribute('data-version-id');
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

  // ── Main init ─────────────────────────────────────────────────────────────
  var cmReady = false;

  function cmInit() {
    var dashboard = document.getElementById('cm-dashboard');
    if (!dashboard) return;

    // Clean up previous listeners by cloning nodes (prevents double-binding on turbo nav)
    if (cmReady) {
      document.querySelectorAll('.cm-tab').forEach(function (el) {
        var clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
      });
    }
    cmReady = true;

    try { initBurndownChart(); } catch (e) { /* burndown error */ }
    initTabs();
    initRetroSave();

    // Dropdown proyectos
    var trigger = document.getElementById('cm-multiselect-trigger');
    if (trigger) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var panel = document.getElementById('cm-multiselect-panel');
        if (panel && panel.style.display !== 'none') cmClosePanel(); else cmOpenPanel();
      });
    }

    document.addEventListener('click', function (e) {
      var panel = document.getElementById('cm-multiselect-panel');
      var btn = document.getElementById('cm-multiselect-trigger');
      if (!panel || panel.style.display === 'none') return;
      if (!panel.contains(e.target) && btn && !btn.contains(e.target)) cmClosePanel();
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
          var search2 = document.getElementById('cm-ms-search');
          var isAll = document.getElementById('cm-tab-all').classList.contains('cm-ms-tab-active');
          cmFilterProjects(search2 ? search2.value : '', isAll ? 'all' : 'selected');
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

    // Selector sprint
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

    // Capacidad save
    var capacityChanged = false;
    function markChanged() {
      capacityChanged = true;
      var btn = document.getElementById('cm-save-capacity-btn');
      if (btn) btn.disabled = false;
    }

    function updatePreview(input) {
      markChanged();
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
    }

    var capTable = document.querySelector('.cm-capacity-table');
    if (capTable) {
      capTable.addEventListener('change', function (e) {
        if (e.target.classList.contains('cm-input-hours') || e.target.classList.contains('cm-input-days')) updatePreview(e.target);
      });
      capTable.addEventListener('input', function (e) {
        if (e.target.classList.contains('cm-input-hours') || e.target.classList.contains('cm-input-days')) updatePreview(e.target);
      });
    }

    var saveBtn = document.getElementById('cm-save-capacity-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var dashboard = document.getElementById('cm-dashboard');
        var sprintId = dashboard ? dashboard.getAttribute('data-sprint-id') : null;
        var savePath = dashboard ? dashboard.getAttribute('data-save-path') : null;
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
          if (data.success) { capacityChanged = false; saveBtn.disabled = true; location.reload(); }
          else alert('Error al guardar: ' + (data.error || 'Error desconocido'));
        })
        .catch(function (err) { alert('Error de conexion: ' + err.message); });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cmInit);
  else cmInit();
  document.addEventListener('turbo:load', cmInit);
  document.addEventListener('turbolinks:load', cmInit);

}());
