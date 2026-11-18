(function () {
  'use strict';

  const calculator = document.getElementById('coagulation-calculator');
  const core = window.PoolCoagulationCore;
  if (!calculator || !core) return;

  const buttons = [...calculator.querySelectorAll('[data-coag-mode-button]')];
  const panels = [...calculator.querySelectorAll('[data-coag-mode-panel]')];

  function read(panel, name) {
    const field = panel.querySelector('[name="' + name + '"]');
    if (!field || field.value.trim() === '') return NaN;
    return Number(field.value.trim().replace(',', '.'));
  }

  function format(value, digits = 2) {
    return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: digits });
  }

  function status(panel, message, isError = false) {
    const output = panel.querySelector('[data-coag-status]');
    output.textContent = message;
    output.classList.toggle('is-error', isError);
  }

  function updateContinuous(panel) {
    try {
      const result = core.calculateContinuous({
        poolVolumeM3: read(panel, 'poolVolume'),
        circulationFlowM3H: read(panel, 'flow'),
        doseMlPerM3: read(panel, 'dose'),
        runtimeHoursPerDay: read(panel, 'runtime')
      });
      panel.querySelector('[data-pump-mlh]').textContent = format(result.pumpRateMlH, 3) + ' мл/ч';
      panel.querySelector('[data-pump-lh]').textContent = format(result.pumpRateLh, 6) + ' л/ч';
      panel.querySelector('[data-daily-ml]').textContent = format(result.dailyConsumptionMl, 2) + ' мл/сут';
      panel.querySelector('[data-daily-l]').textContent = format(result.dailyConsumptionL, 4) + ' л/сут';
      panel.querySelector('[data-turnover]').textContent = format(result.turnoverPeriodHours, 2) + ' ч';
      status(panel, 'Расчёт выполнен по введённой дозировке. Сверьте результат с инструкцией конкретного препарата.');
    } catch (error) {
      status(panel, error instanceof RangeError ? error.message : 'Проверьте заполненные поля.', true);
    }
  }

  function updateSingle(panel) {
    try {
      const result = core.calculateSingleDose({
        poolVolumeM3: read(panel, 'poolVolume'),
        doseMlPerM3: read(panel, 'dose')
      });
      panel.querySelector('[data-single-ml]').textContent = format(result.productMl, 2) + ' мл';
      panel.querySelector('[data-single-l]').textContent = format(result.productL, 4) + ' л';
      status(panel, 'Это расчёт по введённой паспортной дозировке; проверьте режим обработки и инструкцию препарата.');
    } catch (error) {
      status(panel, error instanceof RangeError ? error.message : 'Проверьте заполненные поля.', true);
    }
  }

  function update(panel) {
    if (panel.dataset.coagModePanel === 'continuous') updateContinuous(panel);
    if (panel.dataset.coagModePanel === 'single') updateSingle(panel);
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.coagModeButton;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    panels.forEach(panel => {
      panel.hidden = panel.dataset.coagModePanel !== selected;
      if (!panel.hidden) update(panel);
    });
  }));

  calculator.addEventListener('input', event => {
    const panel = event.target.closest('[data-coag-mode-panel]');
    if (panel && !panel.hidden) update(panel);
  });
  calculator.addEventListener('change', event => {
    const panel = event.target.closest('[data-coag-mode-panel]');
    if (panel && !panel.hidden) update(panel);
  });
  calculator.addEventListener('click', event => {
    const example = event.target.closest('[data-coag-example]');
    if (!example) return;
    const panel = calculator.querySelector('[data-coag-mode-panel="' + example.dataset.coagExample + '"]');
    for (const [name, value] of Object.entries(JSON.parse(example.dataset.values))) {
      panel.querySelector('[name="' + name + '"]').value = value;
    }
    update(panel);
  });

  panels.forEach(panel => { if (!panel.hidden) update(panel); });
})();
