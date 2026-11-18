(function (root) {
  'use strict';

  function input(name, value, min, max) {
    if (!Number.isFinite(value) || value < min || (max != null && value > max)) {
      throw new RangeError(name + ': проверьте введённое значение и единицы измерения.');
    }
    return value;
  }

  function result(name, value) {
    if (!Number.isFinite(value)) {
      throw new RangeError(name + ': результат выходит за пределы расчётного диапазона.');
    }
    return value;
  }

  function calculateContinuous(inputData) {
    const poolVolumeM3 = input('Объём бассейна', inputData.poolVolumeM3, Number.MIN_VALUE);
    const circulationFlowM3H = input('Циркуляционный расход', inputData.circulationFlowM3H, Number.MIN_VALUE);
    const doseMlPerM3 = input('Паспортная дозировка', inputData.doseMlPerM3, 0);
    const runtimeHoursPerDay = input('Время работы циркуляции', inputData.runtimeHoursPerDay, 0, 24);

    const pumpRateMlH = result('Подача дозирующего насоса', circulationFlowM3H * doseMlPerM3);
    const dailyConsumptionMl = result('Суточный расход препарата', pumpRateMlH * runtimeHoursPerDay);
    const turnoverPeriodHours = result('Период прохождения объёма чаши', poolVolumeM3 / circulationFlowM3H);

    return Object.freeze({
      poolVolumeM3,
      circulationFlowM3H,
      doseMlPerM3,
      runtimeHoursPerDay,
      pumpRateMlH,
      pumpRateLh: pumpRateMlH / 1000,
      dailyConsumptionMl,
      dailyConsumptionL: dailyConsumptionMl / 1000,
      turnoverPeriodHours
    });
  }

  function calculateSingleDose(inputData) {
    const poolVolumeM3 = input('Объём бассейна', inputData.poolVolumeM3, Number.MIN_VALUE);
    const doseMlPerM3 = input('Паспортная дозировка', inputData.doseMlPerM3, 0);
    const productMl = result('Количество препарата', poolVolumeM3 * doseMlPerM3);

    return Object.freeze({
      poolVolumeM3,
      doseMlPerM3,
      productMl,
      productL: productMl / 1000
    });
  }

  root.PoolCoagulationCore = Object.freeze({ calculateContinuous, calculateSingleDose });
})(typeof window !== 'undefined' ? window : globalThis);
