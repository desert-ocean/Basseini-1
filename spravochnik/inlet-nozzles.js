(function () {
  'use strict';
  const C = window.PoolInletNozzleCore;
  if (!C) return;
  const $ = (id) => document.getElementById(id);
  const fmt = (n, digits = 2) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: digits });
  const value = (id) => $(id).value;
  function baseInput(prefix) {
    return {
      lengthM: value(prefix + '-length'), widthM: value(prefix + '-width'), averageDepthM: value(prefix + '-depth'),
      turnoverHours: value(prefix + '-turnover'), poolType: value(prefix + '-pool-type'), overflowType: value(prefix + '-overflow')
    };
  }
  function makeSvg(container, kind, r, input) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 720 380'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', kind === 'floor' ? 'Предварительная схема регулярного расположения донных форсунок' : 'Предварительная схема расположения стеновых форсунок');
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', '60'); rect.setAttribute('y', '54'); rect.setAttribute('width', '600'); rect.setAttribute('height', '270');
    rect.setAttribute('rx', '12'); rect.setAttribute('fill', '#eaf5f8'); rect.setAttribute('stroke', '#447f94'); rect.setAttribute('stroke-width', '4'); svg.append(rect);
    if (kind === 'floor') {
      for (let x = 0; x < r.layout.columns; x += 1) for (let y = 0; y < r.layout.rows; y += 1) {
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', String(60 + 600 * (x + 0.5) / r.layout.columns)); c.setAttribute('cy', String(54 + 270 * (y + 0.5) / r.layout.rows));
        c.setAttribute('r', '9'); c.setAttribute('fill', '#0780a0'); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', '3'); svg.append(c);
      }
    } else {
      const sides = input.wallPlacement.startsWith('opposite') ? 2 : 1;
      const longAxis = input.wallPlacement.toLowerCase().includes('long');
      const count = r.countPerWall;
      for (let side = 0; side < sides; side += 1) for (let i = 0; i < count; i += 1) {
        const along = r.staggered && side === 1 ? (i + 1) / (count + 1) : (i + 0.5) / count;
        const c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', String(longAxis ? 60 + 600 * along : (side ? 660 : 60)));
        c.setAttribute('cy', String(longAxis ? (side ? 324 : 54) : 54 + 270 * along));
        c.setAttribute('r', '9'); c.setAttribute('fill', '#0780a0'); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', '3'); svg.append(c);
      }
    }
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', '360'); label.setAttribute('y', '354'); label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', '18'); label.setAttribute('fill', '#193e52');
    label.textContent = fmt(r.lengthM) + ' × ' + fmt(r.widthM) + ' м · ' + r.recommendedCount + ' точек подачи'; svg.append(label);
    container.replaceChildren(svg);
  }
  function renderWarnings(node, warnings) {
    node.replaceChildren(...warnings.map((message) => { const li = document.createElement('li'); li.textContent = message; return li; }));
  }
  function setError(root, error) {
    const box = $(root + '-error'); box.textContent = error ? error.message : '';
    $(root + '-results').hidden = Boolean(error);
    if (error && error.field) $(error.field).setAttribute('aria-invalid', 'true');
  }
  function renderFloor() {
    const root = 'floor';
    try {
      const input = Object.assign(baseInput(root), { method: document.querySelector('[name="floor-method"]:checked').value,
        maxSpacingM: value(root + '-spacing'), areaPerNozzleM2: value(root + '-area'), maxFlowPerNozzleM3h: value(root + '-capacity') });
      const r = C.calculateFloor(input); setError(root, null);
      $('floor-method-note').textContent = input.method === 'geometry'
        ? 'Основной способ: геометрическая сетка. Количество по расходу показывается рядом и учитывается в предварительной оценке.'
        : 'Основной способ: пропускная способность. Сетка сохраняет заданный максимальный шаг и не допускает превышения расхода на форсунку.';
      $('floor-area-result').textContent = fmt(r.areaM2); $('floor-volume-result').textContent = fmt(r.volumeM3);
      $('floor-turnover-result').textContent = fmt(r.turnoverHours); $('floor-flow-result').textContent = fmt(r.flowM3h);
      $('floor-geometry-result').textContent = String(r.geometryCount); $('floor-capacity-result').textContent = r.flowCount == null ? 'Не задано' : String(r.flowCount);
      $('floor-count-result').textContent = String(r.recommendedCount); $('floor-grid-result').textContent = r.layout.columns + ' × ' + r.layout.rows;
      $('floor-spacing-result').textContent = fmt(r.layout.spacingLengthM) + ' × ' + fmt(r.layout.spacingWidthM) + ' м';
      $('floor-margin-result').textContent = fmt(r.layout.marginLengthM) + ' × ' + fmt(r.layout.marginWidthM) + ' м';
      $('floor-per-result').textContent = fmt(r.flowPerNozzleM3h) + ' м³/ч'; renderWarnings($('floor-warnings'), r.warnings); makeSvg($('floor-plan'), 'floor', r, input);
    } catch (error) { setError(root, error); }
  }
  function renderWall() {
    const root = 'wall';
    try {
      const input = Object.assign(baseInput(root), { method: document.querySelector('[name="wall-method"]:checked').value,
        maxSpacingM: value(root + '-spacing'), maxFlowPerNozzleM3h: value(root + '-capacity'), installDepthM: Number(value(root + '-depth-cm').replace(',', '.')) / 100,
        wallPlacement: value(root + '-placement'), staggered: $('wall-staggered').checked });
      const r = C.calculateWall(input); setError(root, null);
      $('wall-staggered').disabled = !r.wallPlacement.startsWith('opposite');
      $('wall-method-note').textContent = input.method === 'geometry'
        ? 'Основной способ: шаг вдоль выбранных стен. Отдельно показана проверка по допустимому расходу.'
        : 'Основной способ: пропускная способность выбранной модели; точки равномерно распределяются по выбранным стенам.';
      $('wall-area-result').textContent = fmt(r.areaM2); $('wall-volume-result').textContent = fmt(r.volumeM3);
      $('wall-flow-result').textContent = fmt(r.flowM3h); $('wall-geometry-result').textContent = String(r.geometryCount);
      $('wall-capacity-result').textContent = r.flowCount == null ? 'Не задано' : String(r.flowCount); $('wall-count-result').textContent = String(r.recommendedCount);
      $('wall-layout-result').textContent = r.wallLabel + (r.staggered ? ' · шахматно' : '') + ' · ' + r.countPerWall + ' на стену'; $('wall-spacing-result').textContent = fmt(r.actualSpacingM) + ' м';
      $('wall-offset-result').textContent = fmt(r.endOffsetM) + ' м'; $('wall-depth-result').textContent = fmt(r.installDepthM * 100, 1) + ' см ниже уровня воды';
      $('wall-per-result').textContent = fmt(r.flowPerNozzleM3h) + ' м³/ч'; renderWarnings($('wall-warnings'), r.warnings); makeSvg($('wall-plan'), 'wall', r, input);
    } catch (error) { setError(root, error); }
  }
  function bindCalculator(root, render) {
    const block = $(root + '-calculator');
    block.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', render));
    block.querySelectorAll('input[type="radio"]').forEach((el) => el.addEventListener('change', render));
    render();
  }
  bindCalculator('floor', renderFloor); bindCalculator('wall', renderWall);
})();
