(function () {
  'use strict';

  const core = window.PoolAlkalinityCore;
  const root = document.getElementById('alkalinity-calculator');
  if (!core || !root) return;

  const modes = [...root.querySelectorAll('[data-mode-panel]')];
  const buttons = [...root.querySelectorAll('[data-mode-button]')];
  const value = (panel, name) => {
    const input = panel.querySelector('[name="' + name + '"]');
    if (!input || input.value.trim() === '') return NaN;
    return Number(input.value.trim().replace(',', '.'));
  };
  const format = (number, digits = 2) => Number(number).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  });
  const setStatus = (panel, text, error = false) => {
    const output = panel.querySelector('[data-result]');
    output.textContent = text;
    output.classList.toggle('is-error', error);
  };
  const readBase = panel => ({
    volumeM3: value(panel, 'volume'),
    currentTa: value(panel, 'current'),
    targetTa: value(panel, 'target')
  });
  const explainError = error => error instanceof RangeError ? error.message : 'Проверьте заполненные поля и единицы измерения.';

  function renderRise(panel) {
    try {
      const result = core.increaseWithBicarbonate({
        ...readBase(panel),
        purityPercent: value(panel, 'purity')
      });
      setStatus(panel, result.reagentMassKg === 0
        ? 'Изменение не требуется: текущая щёлочность уже равна целевой.'
        : 'Теоретически требуется около ' + format(result.reagentMassKg, 3) + ' кг NaHCO₃ с учётом чистоты ' + format(result.purityPercent, 1) + '%.');
    } catch (error) {
      setStatus(panel, explainError(error), true);
    }
  }

  function renderReduction(panel) {
    try {
      const result = core.reduceWithAcid({
        ...readBase(panel),
        reagent: panel.querySelector('[name="reagent"]').value,
        concentrationPercent: value(panel, 'strength'),
        densityKgL: value(panel, 'density')
      });
      if (result.deltaTa === 0) {
        setStatus(panel, 'Изменение не требуется: текущая щёлочность уже равна целевой.');
        return;
      }
      const mass = 'около ' + format(result.reagentMassKg, 3) + ' кг товарного реагента';
      const volume = result.reagentVolumeL == null ? '' : ' (примерно ' + format(result.reagentVolumeL, 2) + ' л по введённой плотности)';
      setStatus(panel, 'Теоретическая потребность: ' + mass + volume + '. Это не безопасная разовая доза.');
    } catch (error) {
      setStatus(panel, explainError(error), true);
    }
  }

  function renderReplacement(panel) {
    try {
      const result = core.calculateReplacement({
        ...readBase(panel),
        makeupTa: value(panel, 'makeup')
      });
      setStatus(panel, result.replacementM3 === 0
        ? 'Замена для изменения щёлочности не требуется.'
        : 'При идеальном смешении потребуется заменить около ' + format(result.replacementM3, 2) + ' м³ (' + format(result.replacementPercent, 1) + '% объёма).');
    } catch (error) {
      setStatus(panel, explainError(error), true);
    }
  }

  function renderCost(panel) {
    try {
      const result = core.compareCosts({
        ...readBase(panel),
        makeupTa: value(panel, 'makeup'),
        reagent: panel.querySelector('[name="reagent"]').value,
        concentrationPercent: value(panel, 'strength'),
        densityKgL: value(panel, 'density'),
        waterTariff: value(panel, 'water'),
        sewerTariff: value(panel, 'sewer'),
        chemicalTariff: value(panel, 'chemical'),
        sourceTemperature: value(panel, 'source-temperature'),
        poolTemperature: value(panel, 'pool-temperature'),
        energyTariff: value(panel, 'energy'),
        heatingEfficiencyPercent: value(panel, 'efficiency')
      });
      const verdict = result.cheaper === 'equal'
        ? 'Расчётные прямые затраты одинаковы.'
        : (result.cheaper === 'chemical' ? 'По введённым тарифам дешевле коррекция реагентом.' : 'По введённым тарифам дешевле частичная замена воды.');
      const rows = [
        ['Водозамена, вода и водоотведение', result.replacementWaterCost],
        ['Повторный нагрев', result.replacementHeatingCost],
        ['Итого: водозамена', result.replacementTotal],
        ['Химическая обработка, реагент', result.chemicalCost]
      ];
      const table = panel.querySelector('[data-cost-table]');
      table.replaceChildren(...rows.map(([label, amount]) => {
        const row = document.createElement('tr');
        const heading = document.createElement('th');
        const output = document.createElement('td');
        heading.scope = 'row';
        heading.textContent = label;
        output.textContent = format(amount, 2) + ' руб.';
        row.append(heading, output);
        return row;
      }));
      setStatus(panel, verdict + ' Разница: около ' + format(result.difference, 2) + ' руб.');
    } catch (error) {
      panel.querySelector('[data-cost-table]').replaceChildren();
      setStatus(panel, explainError(error), true);
    }
  }

  function update(panel) {
    const id = panel.dataset.modePanel;
    if (id === 'raise') renderRise(panel);
    if (id === 'lower') renderReduction(panel);
    if (id === 'replace') renderReplacement(panel);
    if (id === 'compare') renderCost(panel);
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.modeButton;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    modes.forEach(panel => {
      panel.hidden = panel.dataset.modePanel !== selected;
      if (!panel.hidden) update(panel);
    });
  }));

  root.addEventListener('input', event => {
    const panel = event.target.closest('[data-mode-panel]');
    if (panel && !panel.hidden) update(panel);
  });
  root.addEventListener('change', event => {
    const panel = event.target.closest('[data-mode-panel]');
    if (panel && !panel.hidden) update(panel);
    if (event.target.name === 'reagent') {
      const holder = event.target.closest('[data-mode-panel]');
      holder.querySelectorAll('[data-liquid-parameter]').forEach(item => {
        item.hidden = event.target.value === 'NaHSO4';
      });
      if (!holder.hidden) update(holder);
    }
  });

  modes.forEach(update);
})();
