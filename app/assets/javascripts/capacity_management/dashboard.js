(function () {
  'use strict';

  // ── Burndown chart ──────────────────────────────────────────────────────────
  function initBurndownChart() {
    var ctx = document.getElementById('cm-burndown-chart');
    if (!ctx) return;

    var raw = ctx.getAttribute('data-burndown');
    if (!raw) return;
    var bd;
    try { bd = JSON.parse(raw); } catch (e) { return; }
    if (!bd.labels || bd.labels.length === 0) return;

    var dash = document.getElementById('cm-dashboard');
    var cs   = dash ? getComputedStyle(dash) : null;
    function cssVar(name, fallback) {
      return cs ? cs.getPropertyValue(name).trim() || fallback : fallback;
    }

    var colorPrimary  = cssVar('--cm-color-primary',  '#0078d4');
    var colorSuccess  = cssVar('--cm-color-success',  '#107c10');
    var colorTertiary = cssVar('--cm-text-tertiary',  '#a19f9d');
    var isDark = document.documentElement.classList.contains('dark') ||
                 window.matchMedia('(prefers-color-scheme: dark)').matches;
    var gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    var tickColor = cssVar('--cm-text-secondary', '#605e5c');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: bd.labels,
        datasets: [
          {
            label: 'Trabajo restante',
            data: bd.remaining,
            borderColor: colorPrimary,
            backgroundColor: isDark ? 'rgba(83,155,245,0.12)' : 'rgba(0,120,212,0.10)',
            fill: true,
            tension: 0.1,
            spanGaps: false,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Capacidad restante',
            data: bd.capacity,
            borderColor: colorSuccess,
            backgroundColor: 'transparent',
            borderDash: [6, 3],
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 3
          },
          {
            label: 'Tendencia ideal',
            data: bd.ideal,
            borderColor: colorTertiary,
            backgroundColor: 'transparent',
            borderDash: [3, 3],
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (c) {
                var v = c.parsed.y;
                return c.dataset.label + ': ' + (v !== null ? v + 'h' : '-');
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Horas restantes', color: tickColor },
            grid: { color: gridColor },
            ticks: { color: tickColor, callback: function (v) { return v + 'h'; } }
          },
          x: { grid: { color: gridColor }, ticks: { color: tickColor } }
        }
      }
    });
  }

  // ── Toda la lógica de eventos ───────────────────────────────────────────────

  function cmOpenPanel() {
    var panel = document.getElementById('cm-multiselect-panel');
    var btn   = document.getElementById('cm-multiselect-trigger');
    if (!panel || !btn) return;
    var rect = btn.getBoundingClientRect();
    panel.style.top  = (rect.bottom + 4) + 'px';
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
    var isAll = tabOverride
      ? tabOverride === 'all'
      : document.getElementById('cm-tab-all').classList.contains('cm-ms-tab-active');
    document.querySelectorAll('#cm-ms-list .cm-multiselect-item-row').forEach(function (row) {
      var matchQ = !q || (row.dataset.name || '').includes(q);
      var cb     = row.querySelector('input[type="checkbox"]');
      var matchT = isAll || (cb && cb.checked);
      row.style.display = (matchQ && matchT) ? '' : 'none';
    });
  }

  function cmUpdateSubprojectsCheckbox() {
    var children   = document.querySelectorAll('#cm-ms-list input[data-is-child="true"]');
    var includeBox = document.getElementById('cm-include-sub');
    if (!children.length || !includeBox) return;
    includeBox.checked = Array.from(children).every(function (cb) { return cb.checked; });
  }

  function cmUpdateButtonLabel() {
    var items   = document.querySelectorAll('#cm-ms-list input[name="project_ids[]"]');
    var checked = Array.from(items).filter(function (cb) { return cb.checked; });
    var label   = document.getElementById('cm-multiselect-label');
    if (!label) return;
    if (checked.length === 0) {
      label.textContent = 'Ningún proyecto';
    } else if (checked.length === items.length) {
      label.textContent = 'Todos los proyectos (' + items.length + ')';
    } else if (checked.length === 1) {
      var ns = checked[0].closest('.cm-multiselect-item-row').querySelector('.cm-multiselect-item-name');
      label.textContent = ns ? ns.textContent.trim() : '1 proyecto';
    } else {
      label.textContent = checked.length + ' proyectos seleccionados';
    }
  }

  function cmApplyFilter() {
    var hiddenDiv = document.getElementById('cm-hidden-project-ids');
    if (hiddenDiv) hiddenDiv.innerHTML = '';
    cmClosePanel();
    document.getElementById('cm-filters-form').submit();
  }

  function cmInit() {
    // Evitar doble inicialización en la misma carga de página
    var dashboard = document.getElementById('cm-dashboard');
    if (!dashboard) return;
    if (dashboard.dataset.cmReady === '1') return;
    dashboard.dataset.cmReady = '1';

    initBurndownChart();

    // ── Dropdown de proyectos ────────────────────────────────────────────

    var trigger = document.getElementById('cm-multiselect-trigger');
    if (trigger) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var panel = document.getElementById('cm-multiselect-panel');
        if (panel && panel.style.display !== 'none') { cmClosePanel(); } else { cmOpenPanel(); }
      });
    }

    document.addEventListener('click', function (e) {
      var panel = document.getElementById('cm-multiselect-panel');
      var btn   = document.getElementById('cm-multiselect-trigger');
      if (!panel || panel.style.display === 'none') return;
      if (!panel.contains(e.target) && btn && !btn.contains(e.target)) cmClosePanel();
    });

    window.addEventListener('scroll', function () {
      var panel = document.getElementById('cm-multiselect-panel');
      var btn   = document.getElementById('cm-multiselect-trigger');
      if (!panel || panel.style.display === 'none' || !btn) return;
      var rect = btn.getBoundingClientRect();
      panel.style.top  = (rect.bottom + 4) + 'px';
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
          var isAll   = document.getElementById('cm-tab-all').classList.contains('cm-ms-tab-active');
          cmFilterProjects(search2 ? search2.value : '', isAll ? 'all' : 'selected');
        }
      });
    }

    var includeSub = document.getElementById('cm-include-sub');
    if (includeSub) {
      includeSub.addEventListener('change', function () {
        document.querySelectorAll('#cm-ms-list input[data-is-child="true"]').forEach(function (cb) {
          cb.checked = includeSub.checked;
        });
        cmUpdateButtonLabel();
      });
    }

    var clearBtn = document.getElementById('cm-ms-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        document.querySelectorAll('#cm-ms-list input[name="project_ids[]"]').forEach(function (cb) {
          cb.checked = false;
        });
        if (includeSub) includeSub.checked = false;
        cmUpdateButtonLabel();
        cmSwitchTab('all');
      });
    }

    var applyBtn = document.getElementById('cm-ms-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', cmApplyFilter);

    // ── Selector de sprint ───────────────────────────────────────────────

    var sprintSelect = document.getElementById('cm-sprint-select');
    if (sprintSelect) {
      sprintSelect.addEventListener('change', function () {
        var items     = document.querySelectorAll('#cm-ms-list input[name="project_ids[]"]:checked');
        var hiddenDiv = document.getElementById('cm-hidden-project-ids');
        if (hiddenDiv) {
          hiddenDiv.innerHTML = '';
          items.forEach(function (cb) {
            var inp   = document.createElement('input');
            inp.type  = 'hidden';
            inp.name  = 'project_ids[]';
            inp.value = cb.value;
            hiddenDiv.appendChild(inp);
          });
          items.forEach(function (cb) { cb.disabled = true; });
        }
        document.getElementById('cm-filters-form').submit();
      });
    }

    // ── Configuración de capacidad ───────────────────────────────────────

    var capacityChanged = false;

    function markChanged() {
      capacityChanged = true;
      var btn = document.getElementById('cm-save-capacity-btn');
      if (btn) btn.disabled = false;
    }

    function updatePreview(input) {
      markChanged();
      var row        = input.closest('tr');
      if (!row) return;
      var hoursInput = row.querySelector('.cm-input-hours');
      var daysInput  = row.querySelector('.cm-input-days');
      var userId     = hoursInput ? hoursInput.dataset.userId : null;
      var preview    = userId ? document.querySelector('.cm-capacity-preview[data-user-id="' + userId + '"]') : null;
      if (!hoursInput || !daysInput || !preview) return;
      var h = parseFloat(hoursInput.value) || 0;
      var d = parseInt(daysInput.value)    || 0;
      preview.textContent = (Math.round(h * d * 10) / 10) + 'h';
    }

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
        var dashboard = document.getElementById('cm-dashboard');
        var sprintId  = dashboard ? dashboard.getAttribute('data-sprint-id') : null;
        var savePath  = dashboard ? dashboard.getAttribute('data-save-path') : null;
        if (!sprintId || !savePath) return;

        var rows    = document.querySelectorAll('.cm-capacity-table tbody tr');
        var configs = [];
        rows.forEach(function (row) {
          var hi = row.querySelector('.cm-input-hours');
          var di = row.querySelector('.cm-input-days');
          if (!hi) return;
          configs.push({
            user_id:        parseInt(hi.dataset.userId),
            hours_per_day:  parseFloat(hi.value) || 8.0,
            available_days: di ? (parseInt(di.value) || null) : null
          });
        });

        var csrfToken = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

        fetch(savePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ sprint_id: parseInt(sprintId), capacity_configs: configs })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            capacityChanged = false;
            saveBtn.disabled = true;
            location.reload();
          } else {
            alert('Error al guardar: ' + (data.error || 'Error desconocido'));
          }
        })
        .catch(function (err) { alert('Error de conexion: ' + err.message); });
      });
    }

  } // cmInit

  // Carga inicial (scripts al final del body: DOM ya disponible)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cmInit);
  } else {
    cmInit();
  }
  // Navegaciones de Turbo (OpenProject usa Turbo/Turbolinks)
  document.addEventListener('turbo:load',      cmInit);
  document.addEventListener('turbolinks:load', cmInit);

}());
