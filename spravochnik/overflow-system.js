(function () {
  'use strict';
  const core = window.PoolOverflowCore;
  const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  function text(root, name, value) {
    const node = root.querySelector('[data-result="' + name + '"]');
    if (node) node.textContent = value;
  }
  function read(root, name) {
    const el = root.querySelector('[data-field="' + name + '"]');
    if (!el) throw new RangeError('Не найдено поле «' + name + '».');
    el.removeAttribute('aria-invalid');
    return el.value;
  }
  function showError(root, error) {
    const node = root.querySelector('[data-error]');
    node.textContent = error ? error.message : '';
    node.hidden = !error;
    root.querySelectorAll('[data-field]').forEach(el => {
      if (error && (el.value.trim() === '' || (el.type === 'number' && (!Number.isFinite(Number(el.value)) || Number(el.value) <= 0)) || el.dataset.field === 'segmentLengths')) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    });
  }
  function renderTrough(root) {
    try {
      const result = core.calculateTroughSection({
        category: read(root, 'category'), flowM3h: read(root, 'flowM3h'), lengthM: read(root, 'lengthM'),
        outlets: read(root, 'outlets'), approach: read(root, 'approach'), swimmers: read(root, 'swimmers'),
        reservePct: read(root, 'reservePct'), widthMm: read(root, 'widthMm')
      });
      text(root, 'areaCm2', nf.format(result.areaCm2) + ' см²');
      text(root, 'areaM2', nf.format(result.areaM2) + ' м²');
      text(root, 'reservedAreaCm2', nf.format(result.reservedAreaCm2) + ' см² (' + nf.format(result.reservedAreaM2) + ' м²)');
      text(root, 'workingDepthMm', nf.format(result.workingDepthMm) + ' мм');
      showError(root, null);
    } catch (error) { showError(root, error); }
  }
  function renderOutlets(root) {
    try {
      const geometry = read(root, 'geometry');
      const input = {
        geometry, flowM3h: read(root, 'flowM3h'), maxSpacingM: read(root, 'maxSpacingM'),
        internalDiameterMm: read(root, 'internalDiameterMm'), velocityMps: read(root, 'velocityMps')
      };
      if (geometry === 'rectangle') {
        input.lengthM = read(root, 'lengthM'); input.widthM = read(root, 'widthM');
      } else if (geometry === 'loop') input.totalLengthM = read(root, 'totalLengthM');
      else {
        const raw = read(root, 'segmentLengths');
        input.segments = core.parseSegmentLengths(raw).map((lengthM, index) => ({ name: 'Участок ' + (index + 1), lengthM }));
      }
      const result = core.calculateOutlets(input);
      text(root, 'totalLengthM', nf.format(result.totalLengthM) + ' м');
      text(root, 'geometryCount', nf.format(result.geometryCount) + ' шт.');
      text(root, 'theoreticalFlowPerOutletM3h', nf.format(result.theoreticalFlowPerOutletM3h) + ' м³/ч');
      text(root, 'flowCount', nf.format(result.flowCount) + ' шт.');
      text(root, 'recommendedCount', nf.format(result.recommendedCount) + ' шт.');
      text(root, 'totalTheoreticalCapacityM3h', nf.format(result.totalTheoreticalCapacityM3h) + ' м³/ч');
      text(root, 'actualMaxSpacingM', nf.format(result.actualMaxSpacingM) + ' м');
      const target = root.querySelector('[data-segments]');
      target.replaceChildren();
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrap overflow-segment-table';
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Распределение выпусков по участкам лотка');
      const table = document.createElement('table');
      table.innerHTML = '<thead><tr><th scope="col">Участок</th><th scope="col">Длина</th><th scope="col">Выпуски</th><th scope="col">Шаг</th><th scope="col">Отступы от концов</th></tr></thead>';
      const body = document.createElement('tbody');
      result.segments.forEach(segment => {
        const tr = document.createElement('tr');
        [segment.name, nf.format(segment.lengthM) + ' м', nf.format(segment.outlets), nf.format(segment.spacingM) + ' м', segment.endOffsetM == null ? '—' : nf.format(segment.endOffsetM) + ' м'].forEach(value => {
          const td = document.createElement('td'); td.textContent = value; tr.append(td);
        });
        body.append(tr);
      });
      table.append(body); wrapper.append(table); target.append(wrapper);
      const warnings = root.querySelector('[data-warnings]'); warnings.replaceChildren();
      result.warnings.forEach(message => { const li = document.createElement('li'); li.textContent = message; warnings.append(li); });
      showError(root, null);
    } catch (error) {
      ['totalLengthM', 'geometryCount', 'theoreticalFlowPerOutletM3h', 'flowCount', 'recommendedCount', 'totalTheoreticalCapacityM3h', 'actualMaxSpacingM'].forEach(name => text(root, name, '—'));
      const target = root.querySelector('[data-segments]');
      if (target) target.replaceChildren();
      const warnings = root.querySelector('[data-warnings]');
      if (warnings) warnings.replaceChildren();
      showError(root, error);
    }
  }
  function bind(root, render) {
    root.addEventListener('input', () => render(root));
    root.addEventListener('change', () => {
      const selector = root.querySelector('[data-field="geometry"]');
      if (selector) root.querySelectorAll('[data-visible-for]').forEach(el => { el.hidden = el.dataset.visibleFor !== selector.value; });
      render(root);
    });
    render(root);
  }
  document.querySelectorAll('[data-trough-calculator]').forEach(root => bind(root, renderTrough));
  document.querySelectorAll('[data-outlet-calculator]').forEach(root => bind(root, renderOutlets));
})();
