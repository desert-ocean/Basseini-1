(function (root, factory) {
  const convert = factory();
  if (typeof module === 'object' && module.exports) module.exports = convert;
  if (!root.document) return;

  const fields = [...root.document.querySelectorAll('[data-flow-unit]')];
  if (!fields.length) return;
  const error = root.document.getElementById('flow-convert-error');
  const units = fields.map((field) => field.dataset.flowUnit);
  const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });

  function parse(field) {
    const text = field.value.trim().replace(/\s+/g, '').replace(',', '.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  }

  function render(source) {
    const value = parse(source);
    if (value === null) {
      for (const field of fields) if (field !== source) field.value = '';
      source.setAttribute('aria-invalid', 'true');
      error.textContent = 'Введите конечное неотрицательное число.';
      return;
    }

    try {
      const converted = new Map(units.filter((unit) => unit !== source.dataset.flowUnit)
        .map((unit) => [unit, convert(value, source.dataset.flowUnit, unit)]));
      for (const field of fields) {
        if (field === source) continue;
        field.value = format.format(converted.get(field.dataset.flowUnit));
        field.setAttribute('aria-invalid', 'false');
      }
      source.setAttribute('aria-invalid', 'false');
      error.textContent = '';
    } catch (_) {
      for (const field of fields) if (field !== source) field.value = '';
      source.setAttribute('aria-invalid', 'true');
      error.textContent = 'Значение слишком велико для перевода во все указанные единицы.';
    }
  }

  for (const field of fields) field.addEventListener('input', () => render(field));
  const initial = fields.find((field) => field.value.trim() !== '') || fields[0];
  render(initial);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const ratios = {
    m3h: { lmin: 50 / 3, ls: 5 / 18 },
    lmin: { m3h: 3 / 50, ls: 1 / 60 },
    ls: { m3h: 18 / 5, lmin: 60 }
  };
  return function convert(value, from, to) {
    if (!Number.isFinite(value) || value < 0 || !Object.hasOwn(ratios, from) || !Object.hasOwn(ratios, to)) {
      throw new RangeError('Invalid flow');
    }
    if (from === to) return value;
    const result = value * ratios[from][to];
    if (!Number.isFinite(result)) throw new RangeError('Flow conversion overflow');
    return result;
  };
});
