(() => {
  'use strict';

  const core = window.FilterPumpCore;
  const volumeInput = document.getElementById('turnover-volume');
  const timeInput = document.getElementById('turnover-time');
  const result = document.getElementById('circulation-flow-result');
  const recommendation = document.getElementById('turnover-recommendation');
  const error = document.getElementById('turnover-error');
  if (!core?.circulationFlow || !volumeInput || !timeInput || !result || !recommendation || !error) return;

  const parse = value => {
    const normalized = String(value ?? '').trim().replace(',', '.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return NaN;
    return Number(normalized);
  };
  const format = value => new Intl.NumberFormat('ru-RU', { maximumSignificantDigits: 7 }).format(value);

  function update() {
    try {
      const flow = core.circulationFlow(parse(volumeInput.value), parse(timeInput.value));
      const displayedFlow = format(flow);
      result.textContent = displayedFlow;
      recommendation.textContent = `Для обеспечения заданного времени водообмена система циркуляции должна обеспечивать расход не менее ${displayedFlow} м³/ч.`;
      error.textContent = '';
    } catch {
      result.textContent = '—';
      recommendation.textContent = '';
      error.textContent = 'Введите положительный конечный объём бассейна и положительное время водообмена.';
    }
  }

  volumeInput.addEventListener('input', update);
  timeInput.addEventListener('input', update);
  update();
})();
