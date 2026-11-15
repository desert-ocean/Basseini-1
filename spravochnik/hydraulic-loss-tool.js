(function () {
  'use strict';
  const root = document.getElementById('hydraulic-loss-calculator');
  const core = window.PoolHydraulicsCore;
  if (!root || !core) return;

  const $ = (id) => root.querySelector(`#${id}`);
  const diameter = $('loss-diameter');
  const outputs = ['loss-equivalent-length', 'loss-straight', 'loss-fitting', 'loss-filter', 'loss-equipment', 'loss-total', 'loss-static', 'loss-head'];
  const fmt = (value, digits = 3) => Number.isFinite(value)
    ? new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)
    : '—';
  const fmtSpeed = (value) => Number.isFinite(value)
    ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    : '—';
  const parse = (input) => {
    const value = input.value.trim().replace(/\s+/g, '').replace(',', '.');
    if (!value) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  };
  const set = (id, value) => { $(id).textContent = value; };

  function fillDiameters(keep = diameter.value) {
    const options = Object.entries(core.catalogs).flatMap(([series, rows]) => rows.map((item) => ({ series, ...item })));
    diameter.replaceChildren(...options.map((item) => {
      const option = document.createElement('option');
      option.value = `${item.series}:${item.od}`;
      option.textContent = `${item.series} — наружный ${fmt(item.od, 1)} мм, внутренний ${fmt(item.id, 1)} мм`;
      return option;
    }));
    if (options.some((item) => `${item.series}:${item.od}` === keep)) diameter.value = keep;
    else diameter.value = options.length ? `${options[0].series}:${options[0].od}` : '';
  }

  function selectedPipe() {
    const [series, rawOd] = diameter.value.split(':');
    const od = Number(rawOd);
    return (core.catalogs[series] || []).find((item) => item.od === od) || null;
  }

  function update() {
    const flow = parse($('loss-flow'));
    const selected = selectedPipe();
    const d = selected?.id || null;
    const length = parse($('loss-length'));
    const filter = parse($('loss-filter-input'));
    const overflow = $('loss-pool-type').value === 'overflow';
    $('loss-overflow-controls').hidden = !overflow;

    const countInputs = [...root.querySelectorAll('[data-fitting-count]')];
    let fittingCount = 0;
    let validCounts = true;
    for (const input of countInputs) {
      const count = parse(input);
      if (count === null || !Number.isInteger(count) || count < 0 || count > 10000) validCounts = false;
      else fittingCount += count;
    }

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

    const baseValid = Number.isFinite(flow) && flow > 0 && Number.isFinite(d) && d > 0
      && Number.isFinite(length) && length >= 0 && length <= 100000;
    let pipe = null;
    if (baseValid && validCounts) {
      try {
        const calculated = core.pipe({ flow, diameter: d, length });
        if ([calculated.velocity, calculated.hf, calculated.hf100].every(Number.isFinite)) pipe = calculated;
      } catch (_) { pipe = null; }
    }

    const filterComplete = filter !== null && Number.isFinite(filter) && filter >= 0;
    const filterValid = filter === null || (Number.isFinite(filter) && filter >= 0);
    const dataWarnings = [];
    if (!pipe) dataWarnings.push('проверьте положительный расход, типоразмер трубы и длину');
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
      const fittingResult = core.pipe({ flow, diameter: d, length: fittingCount * 10 });
      set('loss-speed-result', fmtSpeed(pipe.velocity));
      set('loss-diameter-result', `${selected.series}, наружный ${fmt(selected.od, 1)} мм / внутренний ${fmt(d, 1)} мм`);
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

    set('loss-speed-result', '—');
    for (const id of ['loss-diameter-result', ...outputs]) set(id, '—');
    $('loss-equivalent-length-note').textContent = 'Введите корректные параметры трубопровода.';
    $('loss-warning').textContent = dataWarnings.join('; ');
    $('loss-warning').classList.add('is-incomplete');
  }

  root.querySelectorAll('input,select').forEach((input) => input.addEventListener(input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input', update));
  fillDiameters();
  update();
})();
