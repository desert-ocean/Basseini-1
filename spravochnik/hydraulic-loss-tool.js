(function () {
  'use strict';
  const root = document.getElementById('hydraulic-loss-calculator');
  const core = window.PoolHydraulicsCore;
  if (!root || !core) return;

  const $ = (id) => root.querySelector(`#${id}`);
  const series = $('loss-series');
  const diameter = $('loss-diameter');
  const mode = $('loss-diameter-mode');
  const customDiameter = $('loss-custom-diameter');
  const outputs = ['loss-equivalent-length', 'loss-straight', 'loss-fitting', 'loss-filter', 'loss-equipment', 'loss-total', 'loss-static', 'loss-head'];
  const fmt = (value, digits = 3) => Number.isFinite(value)
    ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)
    : '—';
  const parse = (input) => {
    const value = input.value.trim().replace(/\s+/g, '').replace(',', '.');
    if (!value) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  };
  const set = (id, value) => { $(id).textContent = value; };

  function fillDiameters(keep = diameter.value) {
    const options = core.catalogs[series.value] || [];
    diameter.replaceChildren(...options.map((item) => {
      const option = document.createElement('option');
      option.value = String(item.od);
      option.textContent = `${fmt(item.od, 1)} мм (внутренний ${fmt(item.id, 1)} мм)`;
      return option;
    }));
    diameter.value = options.some((item) => String(item.od) === keep) ? keep : String(options[0]?.od || '');
  }

  function renderReferenceTable() {
    const body = document.getElementById('loss-reference-body');
    const items = (core.catalogs.PN10 || []).slice(0, 5);
    const speeds = [0.5, 1, 1.5, 2];
    body.replaceChildren(...items.map((item) => {
      const row = document.createElement('tr');
      const cells = [
        `${fmt(item.od, 1)} / ${fmt(item.id, 1)}`,
        ...speeds.map((speed) => {
          const area = Math.PI * (item.id / 1000) ** 2 / 4;
          const flow = speed * area * 3600;
          const result = core.pipe({ flow, diameter: item.id, length: 100 });
          return `${fmt(result.hf100, 3)} м`;
        })
      ];
      cells.forEach((value, index) => {
        const cell = document.createElement(index ? 'td' : 'th');
        if (!index) cell.scope = 'row';
        cell.textContent = value;
        row.append(cell);
      });
      return row;
    }));
  }

  function currentDiameter() {
    if (mode.value === 'custom') {
      const value = parse(customDiameter);
      return Number.isFinite(value) && value > 0 ? value : null;
    }
    const item = (core.catalogs[series.value] || []).find((row) => String(row.od) === diameter.value);
    return item?.id || null;
  }

  function update() {
    const speed = parse($('loss-speed'));
    const d = currentDiameter();
    const length = parse($('loss-length'));
    const filter = parse($('loss-filter-input'));
    const poolType = $('loss-pool-type').value;
    const overflow = poolType === 'overflow';
    $('loss-catalog-controls').hidden = mode.value === 'custom';
    $('loss-custom-control').hidden = mode.value !== 'custom';
    $('loss-overflow-controls').hidden = !overflow;

    const countInputs = [...root.querySelectorAll('[data-fitting-count]')];
    let fittingCount = 0;
    let validCounts = true;
    for (const input of countInputs) {
      const count = parse(input);
      if (count === null || !Number.isInteger(count) || count < 0 || count > 10000) validCounts = false;
      else fittingCount += count;
    }

    const selectedEquipment = [...root.querySelectorAll('[data-equipment]')].filter((checkbox) => checkbox.checked);
    const equipmentValues = [];
    const missingEquipment = [];
    let invalidEquipment = false;
    for (const checkbox of root.querySelectorAll('[data-equipment]')) {
      const row = root.querySelector(`[data-equipment-row="${checkbox.value}"]`);
      const input = row.querySelector('input[type="text"]');
      input.disabled = !checkbox.checked;
      row.classList.toggle('is-selected', checkbox.checked);
      if (checkbox.checked) {
        const value = parse(input);
        if (value === null) missingEquipment.push(checkbox.dataset.label);
        else if (Number.isNaN(value) || value < 0) invalidEquipment = true;
        else equipmentValues.push(value);
      }
    }
    const equipmentComplete = missingEquipment.length === 0 && !invalidEquipment;
    const equipmentTotal = equipmentComplete ? equipmentValues.reduce((sum, value) => sum + value, 0) : null;

    let staticValue = null;
    let staticIncluded = !overflow;
    if (overflow) {
      staticValue = parse($('loss-static-input'));
      staticIncluded = $('loss-static-confirm').checked && staticValue !== null && Number.isFinite(staticValue) && staticValue >= 0;
    }
    const staticMode = overflow ? $('loss-static-mode').value : 'none';
    const staticSigned = overflow && staticIncluded ? staticValue * (staticMode === 'minus' ? -1 : 1) : 0;
    const staticExplicit = overflow && staticIncluded && staticMode !== 'none';

    const baseValid = Number.isFinite(speed) && speed > 0 && speed <= 100 && Number.isFinite(d) && d > 0 && d <= 1000
      && Number.isFinite(length) && length >= 0 && length <= 100000;
    let pipe = null;
    if (baseValid && validCounts) {
      try {
        const area = Math.PI * (d / 1000) ** 2 / 4;
        const flow = speed * area * 3600;
        pipe = core.pipe({ flow, diameter: d, length });
      } catch (_) { pipe = null; }
    }

    const filterComplete = filter !== null && Number.isFinite(filter) && filter >= 0;
    const filterValid = filter === null || (Number.isFinite(filter) && filter >= 0);
    const dataWarnings = [];
    if (!pipe) dataWarnings.push('проверьте положительную скорость, диаметр и длину');
    if (!validCounts) dataWarnings.push('количество фитингов должно быть целым неотрицательным числом');
    if (!filterComplete) dataWarnings.push('не введены потери на фильтре');
    if (missingEquipment.length) dataWarnings.push(`не введены паспортные потери: ${missingEquipment.join(', ')}`);
    if (invalidEquipment) dataWarnings.push('потери выбранного оборудования должны быть неотрицательными числами');
    if (!filterValid) dataWarnings.push('потери на фильтре должны быть неотрицательным числом');
    if (overflow && !staticIncluded) dataWarnings.push('статический перепад уровней не подтверждён для расчётной схемы');
    if (overflow && staticIncluded && staticMode === 'none') dataWarnings.push('выберите знак статической составляющей');

    const dataComplete = !!pipe && validCounts && filterComplete && filterValid && equipmentComplete;
    const headComplete = dataComplete && (!overflow || (staticIncluded && staticMode !== 'none'));
    if (pipe) {
      const equivalentLength = length + fittingCount * 10;
      const fittingResult = core.pipe({ flow: pipe.flow, diameter: d, length: fittingCount * 10 });
      set('loss-speed-result', `${fmt(pipe.velocity, 3)} м/с`);
      set('loss-flow-result', `${fmt(pipe.flow, 3)} м³/ч`);
      set('loss-diameter-result', `${fmt(d, 1)} мм`);
      set('loss-equivalent-length', `${fmt(equivalentLength, 2)} м`);
      set('loss-straight', `${fmt(pipe.hf, 4)} м`);
      set('loss-fitting', `${fmt(fittingResult.hf, 4)} м`);
      set('loss-filter', filterComplete ? `${fmt(filter, 4)} м` : 'не задано');
      set('loss-equipment', equipmentComplete ? `${fmt(equipmentTotal, 4)} м` : 'неполно');
      set('loss-total', dataComplete ? `${fmt(pipe.hf + fittingResult.hf + filter + equipmentTotal, 4)} м` : '—');
      set('loss-static', overflow ? (staticValue !== null && Number.isFinite(staticValue) && staticValue >= 0 ? `${fmt(staticValue, 3)} м` : 'не задан') : 'не применяется для выбранного типа');
      const hydraulic = dataComplete ? pipe.hf + fittingResult.hf + filter + equipmentTotal : null;
      set('loss-head', headComplete ? `${fmt(hydraulic + staticSigned, 4)} м` : '—');
      $('loss-equivalent-length-note').textContent = `Прямые участки ${fmt(length, 2)} м + ${fittingCount} фитингов × 10 м условно.`;
      $('loss-warning').textContent = dataWarnings.length
        ? `Расчёт неполный: ${dataWarnings.join('; ')}.`
        : 'Составляющие рассчитаны по введённым данным. Предварительная оценка, не окончательный подбор насоса.';
      $('loss-warning').classList.toggle('is-incomplete', dataWarnings.length > 0);
      return;
    }

    for (const id of ['loss-speed-result', 'loss-flow-result', 'loss-diameter-result', ...outputs]) set(id, '—');
    $('loss-equivalent-length-note').textContent = 'Введите корректные параметры трубопровода.';
    $('loss-warning').textContent = dataWarnings.join('; ');
    $('loss-warning').classList.add('is-incomplete');
  }

  series.addEventListener('change', () => { fillDiameters(); renderReferenceTable(); update(); });
  diameter.addEventListener('change', update);
  root.querySelectorAll('input,select').forEach((input) => input.addEventListener(input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input', update));
  fillDiameters();
  renderReferenceTable();
  update();
})();
