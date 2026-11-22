'use strict';

(function exposeFilterAreaCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FilterAreaCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFilterAreaCore() {
  const LIMITS = Object.freeze({
    flow: { min: 0.01, max: 10000 },
    rate: { min: 0.1, max: 100 },
    diameter: { min: 50, max: 5000 },
    count: { min: 1, max: 100 }
  });

  function parseDecimal(value, name) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new RangeError(`${name}: введите конечное число`);
      return value;
    }

    if (typeof value !== 'string') throw new RangeError(`${name}: введите число`);
    const text = value.trim();
    if (!text || !/^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) {
      throw new RangeError(`${name}: введите число с одной десятичной точкой или запятой`);
    }
    return Number(text.replace(',', '.'));
  }

  function positiveNumber(value, name, limits) {
    const number = parseDecimal(value, name);
    if (!Number.isFinite(number) || number < limits.min || number > limits.max) {
      throw new RangeError(`${name}: допустимо от ${limits.min} до ${limits.max}`);
    }
    return number;
  }

  function filterCount(value) {
    if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
      throw new RangeError(`Количество фильтров: введите целое число от ${LIMITS.count.min} до ${LIMITS.count.max}`);
    }
    const count = Number(value);
    if (!Number.isInteger(count) || count < LIMITS.count.min || count > LIMITS.count.max) {
      throw new RangeError(`Количество фильтров: целое число от ${LIMITS.count.min} до ${LIMITS.count.max}`);
    }
    return count;
  }

  function areaOfFilter(diameterMm) {
    const diameterM = positiveNumber(diameterMm, 'Диаметр', LIMITS.diameter) / 1000;
    return Math.PI * diameterM * diameterM / 4;
  }

  function calculateRequiredArea({ flowM3h, filtrationRateMph }) {
    const flow = positiveNumber(flowM3h, 'Расход', LIMITS.flow);
    const rate = positiveNumber(filtrationRateMph, 'Скорость фильтрации', LIMITS.rate);
    return Object.freeze({ requiredAreaM2: flow / rate, flowM3h: flow, filtrationRateMph: rate });
  }

  function calculateFilterGroup({ diameterMm, count, flowM3h, filtrationRateMph }) {
    const singleAreaM2 = areaOfFilter(diameterMm);
    const numberOfFilters = filterCount(count);
    const flow = positiveNumber(flowM3h, 'Расход', LIMITS.flow);
    const groupAreaM2 = singleAreaM2 * numberOfFilters;
    const rate = filtrationRateMph == null
      ? null
      : positiveNumber(filtrationRateMph, 'Скорость фильтрации', LIMITS.rate);
    const requiredAreaM2 = rate == null ? null : flow / rate;
    const actualRateMph = flow / groupAreaM2;
    const rateWithOneUnavailableMph = numberOfFilters > 1
      ? flow / (singleAreaM2 * (numberOfFilters - 1))
      : null;

    return Object.freeze({
      singleAreaM2,
      groupAreaM2,
      count: numberOfFilters,
      flowM3h: flow,
      actualRateMph,
      rateWithOneUnavailableMph,
      requiredAreaM2,
      areaMarginPercent: requiredAreaM2 == null ? null : ((groupAreaM2 / requiredAreaM2) - 1) * 100,
      areaSufficient: requiredAreaM2 == null ? null : groupAreaM2 >= requiredAreaM2
    });
  }

  function calculateBackwash({ diameterMm, count, backwashRateMph }) {
    const singleAreaM2 = areaOfFilter(diameterMm);
    const numberOfFilters = filterCount(count);
    const rate = positiveNumber(backwashRateMph, 'Скорость промывки', LIMITS.rate);
    const singleFilterFlowM3h = singleAreaM2 * rate;
    return Object.freeze({
      singleAreaM2,
      singleFilterFlowM3h,
      allFiltersFlowM3h: singleFilterFlowM3h * numberOfFilters,
      count: numberOfFilters,
      backwashRateMph: rate
    });
  }

  return Object.freeze({ LIMITS, calculateRequiredArea, calculateFilterGroup, calculateBackwash });
});
