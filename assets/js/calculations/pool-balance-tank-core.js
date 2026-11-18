(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PoolBalanceTankCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DISPLACEMENT_PER_PERSON_M3 = 0.075;
  const WAVE_DEPTH_SMALL_POOL_M = 0.06;
  const WAVE_DEPTH_LARGE_POOL_M = 0.04;
  const M3_PER_HOUR_PER_LPS = 3.6;

  function number(value, name, { min = -Infinity, max = Infinity, integer = false } = {}) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').trim().replace(',', '.'));
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw new RangeError(`${name}: проверьте введённое значение.`);
    }
    return n;
  }

  function nonnegative(value, name, options = {}) {
    return number(value, name, { ...options, min: 0 });
  }

  function positive(value, name, options = {}) {
    return number(value, name, { ...options, min: Number.EPSILON });
  }

  function poolGeometry({ lengthM, widthM, averageDepthM }) {
    const length = positive(lengthM, 'Длина бассейна');
    const width = positive(widthM, 'Ширина бассейна');
    const depth = positive(averageDepthM, 'Средняя глубина');
    const areaM2 = length * width;
    const volumeM3 = areaM2 * depth;
    if (!Number.isFinite(areaM2) || !Number.isFinite(volumeM3)) throw new RangeError('Размеры бассейна выходят за расчётный диапазон.');
    return { areaM2, volumeM3 };
  }

  function waveEquivalentDepthM(areaM2) {
    const area = positive(areaM2, 'Площадь зеркала');
    return area <= 100 ? WAVE_DEPTH_SMALL_POOL_M : WAVE_DEPTH_LARGE_POOL_M;
  }

  function batherAndWaveVolumes({ areaM2, batherCount }) {
    const area = positive(areaM2, 'Площадь зеркала');
    const people = nonnegative(batherCount, 'Количество купающихся', { integer: true });
    const waveDepthM = waveEquivalentDepthM(area);
    return {
      batherCount: people,
      displacementM3: DISPLACEMENT_PER_PERSON_M3 * people,
      waveDepthM,
      waveM3: area * waveDepthM
    };
  }

  function backwashVolumes({
    filterCount = 1,
    filtersToWash = filterCount,
    filterAreaM2,
    filterDiameterMm,
    intensityLsM2,
    durationMinutes,
    pattern = 'sequential',
    rinseM3 = 0
  }) {
    const count = number(filterCount, 'Количество фильтров', { min: 1, integer: true });
    const washing = number(filtersToWash, 'Количество промываемых фильтров', { min: 1, max: count, integer: true });
    if (!['sequential', 'simultaneous'].includes(pattern)) throw new RangeError('Неизвестный порядок промывки фильтров.');
    const area = filterAreaM2 !== undefined && filterAreaM2 !== null && String(filterAreaM2).trim() !== ''
      ? positive(filterAreaM2, 'Площадь фильтрации одного фильтра')
      : Math.PI * (positive(filterDiameterMm, 'Диаметр фильтра') / 1000) ** 2 / 4;
    const intensity = positive(intensityLsM2, 'Интенсивность промывки');
    const minutes = positive(durationMinutes, 'Продолжительность промывки');
    const rinse = nonnegative(rinseM3, 'Объём ополаскивания');
    const oneFilterFlowM3h = M3_PER_HOUR_PER_LPS * intensity * area;
    const numberOfCycles = pattern === 'sequential' ? washing : 1;
    const simultaneousCount = pattern === 'simultaneous' ? washing : 1;
    const backwashM3 = oneFilterFlowM3h * (minutes / 60) * washing;
    const totalM3 = backwashM3 + rinse;
    if (![oneFilterFlowM3h, backwashM3, totalM3].every(Number.isFinite)) throw new RangeError('Параметры промывки выходят за расчётный диапазон.');
    return {
      filterAreaM2: area,
      oneFilterFlowM3h,
      peakFlowM3h: oneFilterFlowM3h * simultaneousCount,
      backwashM3,
      rinseM3: rinse,
      totalM3,
      cycles: numberOfCycles,
      pattern
    };
  }

  function calculateSimple({
    lengthM,
    widthM,
    averageDepthM,
    batherCount,
    backwashFromTank = false,
    backwashM3 = 0
  }) {
    const pool = poolGeometry({ lengthM, widthM, averageDepthM });
    const occupancy = batherAndWaveVolumes({ areaM2: pool.areaM2, batherCount });
    const wash = backwashFromTank ? nonnegative(backwashM3, 'Объём промывки') : 0;
    const referenceUsefulVolumeM3 = occupancy.displacementM3 + occupancy.waveM3 + wash;
    return {
      ...pool,
      ...occupancy,
      backwashM3: wash,
      referenceUsefulVolumeM3,
      note: 'Предварительная оценка: не включает слив воды из труб и лотков, безопасный остаток для насоса, рабочие уровни и особенности автоматики.'
    };
  }

  function calculateEngineering(input) {
    const pool = poolGeometry(input);
    const occupancy = batherAndWaveVolumes({ areaM2: pool.areaM2, batherCount: input.batherCount });
    const tankLength = positive(input.tankLengthM, 'Внутренняя длина бака');
    const tankWidth = positive(input.tankWidthM, 'Внутренняя ширина бака');
    const tankHeight = positive(input.tankHeightM, 'Внутренняя высота бака');
    const bottomZoneM = nonnegative(input.bottomZoneMm, 'Нижняя зона') / 1000;
    const topZoneM = nonnegative(input.topZoneMm, 'Верхняя свободная зона') / 1000;
    const minSafeM = positive(input.minimumSafeLevelMm, 'Минимальный безопасный уровень') / 1000;
    const normalM = positive(input.normalLevelMm, 'Нормальный рабочий уровень') / 1000;
    const maxWorkingM = positive(input.maximumWorkingLevelMm, 'Максимальный рабочий уровень') / 1000;
    const emergencyM = positive(input.emergencyOverflowLevelMm, 'Отметка аварийного перелива') / 1000;
    if (bottomZoneM + topZoneM >= tankHeight) throw new RangeError('Нижняя и верхняя зоны занимают всю высоту резервуара.');
    if (minSafeM < bottomZoneM) throw new RangeError('Минимальный уровень насоса должен быть не ниже нижней конструктивной зоны.');
    if (!(minSafeM < normalM && normalM < maxWorkingM && maxWorkingM < emergencyM)) {
      throw new RangeError('Задайте уровни в порядке: минимальный безопасный < нормальный < максимальный рабочий < аварийный перелив.');
    }
    if (emergencyM > tankHeight - topZoneM) throw new RangeError('Аварийный перелив должен оставлять заданную верхнюю свободную зону.');

    const tankAreaM2 = tankLength * tankWidth;
    const geometricVolumeM3 = tankAreaM2 * tankHeight;
    const lowerZoneM3 = tankAreaM2 * bottomZoneM;
    const upperZoneM3 = tankAreaM2 * topZoneM;
    const clearBandVolumeM3 = tankAreaM2 * (tankHeight - bottomZoneM - topZoneM);
    const normalWaterVolumeM3 = tankAreaM2 * normalM;
    const pumpReserveM3 = tankAreaM2 * (normalM - minSafeM);
    const freeToWorkingLevelM3 = tankAreaM2 * (maxWorkingM - normalM);
    const availableOperatingRangeM3 = tankAreaM2 * (maxWorkingM - minSafeM);
    const freeToEmergencyOverflowM3 = tankAreaM2 * (emergencyM - normalM);

    const backwashEnabled = Boolean(input.backwashFromTank);
    let wash = { filterAreaM2: 0, oneFilterFlowM3h: 0, peakFlowM3h: 0, backwashM3: 0, rinseM3: 0, totalM3: 0, cycles: 0, pattern: input.backwashPattern || 'sequential' };
    if (backwashEnabled) {
      wash = backwashVolumes({
        filterCount: input.filterCount,
        filtersToWash: input.filtersToWash,
        filterAreaM2: input.filterAreaMode === 'area' ? input.filterAreaPerFilterM2 : undefined,
        filterDiameterMm: input.filterAreaMode === 'diameter' ? input.filterDiameterMm : undefined,
        intensityLsM2: input.backwashIntensityLsM2,
        durationMinutes: input.backwashDurationMinutes,
        pattern: input.backwashPattern,
        rinseM3: input.rinseM3
      });
    }
    const backwashReserveM3 = backwashEnabled ? wash.totalM3 : 0;
    const operatingReserveM3 = nonnegative(input.additionalReserveM3, 'Дополнительный обоснованный резерв');
    const circulationQ = input.circulationFlowM3h === undefined || String(input.circulationFlowM3h).trim() === ''
      ? 0 : nonnegative(input.circulationFlowM3h, 'Циркуляционный расход');
    const returnDelayMinutes = input.returnDelayMinutes === undefined || String(input.returnDelayMinutes).trim() === ''
      ? 0 : nonnegative(input.returnDelayMinutes, 'Задержка возврата воды');
    const startupReserveM3 = circulationQ * returnDelayMinutes / 60;
    const lowerRequiredM3 = backwashReserveM3 + operatingReserveM3 + startupReserveM3;

    const troughDrainM3 = nonnegative(input.troughDrainM3, 'Слив из лотков');
    const gravityPipeDrainM3 = nonnegative(input.gravityPipeDrainM3, 'Слив из самотечных труб');
    const attractionReturnM3 = nonnegative(input.attractionReturnM3, 'Возврат из аттракционов');
    const otherReturnM3 = nonnegative(input.otherReturnM3, 'Другой возвратный объём');
    const stopReturnM3 = troughDrainM3 + gravityPipeDrainM3 + attractionReturnM3 + otherReturnM3;
    const batherAndWaveM3 = occupancy.displacementM3 + occupancy.waveM3;
    const simultaneous = Boolean(input.stopWithBathing);
    const upperRequiredM3 = simultaneous ? batherAndWaveM3 + stopReturnM3 : Math.max(batherAndWaveM3, stopReturnM3);
    const standardReferenceM3 = batherAndWaveM3 + backwashReserveM3;
    const requiredRangeM3 = upperRequiredM3 + lowerRequiredM3;

    const upperPass = freeToWorkingLevelM3 + 1e-9 >= upperRequiredM3;
    const lowerPass = pumpReserveM3 + 1e-9 >= lowerRequiredM3;
    const standardPass = availableOperatingRangeM3 + 1e-9 >= standardReferenceM3;
    const rangePass = availableOperatingRangeM3 + 1e-9 >= requiredRangeM3;
    const allScenariosPass = upperPass && lowerPass && standardPass && rangePass;
    const minSafeBaseM = Math.max(minSafeM, bottomZoneM);
    const minimumInternalHeightAtFootprintM = minSafeBaseM + requiredRangeM3 / tankAreaM2 + topZoneM;
    const minimumGeometricVolumeM3 = tankAreaM2 * minimumInternalHeightAtFootprintM;
    const requiredVolumeBetweenSafeLevelsM3 = requiredRangeM3;

    const results = {
      poolAreaM2: pool.areaM2,
      poolVolumeM3: pool.volumeM3,
      batherCount: occupancy.batherCount,
      batherDisplacementM3: occupancy.displacementM3,
      waveDepthM: occupancy.waveDepthM,
      waveVolumeM3: occupancy.waveM3,
      standardReferenceM3,
      backwash: wash,
      tankAreaM2,
      geometricVolumeM3,
      lowerZoneM3,
      upperZoneM3,
      clearBandVolumeM3,
      normalWaterVolumeM3,
      pumpReserveM3,
      freeToWorkingLevelM3,
      freeToEmergencyOverflowM3,
      availableOperatingRangeM3,
      troughDrainM3,
      gravityPipeDrainM3,
      attractionReturnM3,
      otherReturnM3,
      stopReturnM3,
      stopWithBathing: simultaneous,
      upperRequiredM3,
      lowerRequiredM3,
      startupReserveM3,
      operatingReserveM3,
      requiredRangeM3,
      requiredVolumeBetweenSafeLevelsM3,
      minimumInternalHeightAtFootprintM,
      minimumGeometricVolumeM3,
      checks: {
        upper: { passed: upperPass, availableM3: freeToWorkingLevelM3, requiredM3: upperRequiredM3 },
        lower: { passed: lowerPass, availableM3: pumpReserveM3, requiredM3: lowerRequiredM3 },
        standardReference: { passed: standardPass, availableM3: availableOperatingRangeM3, requiredM3: standardReferenceM3 },
        totalRange: { passed: rangePass, availableM3: availableOperatingRangeM3, requiredM3: requiredRangeM3 },
        allPassed: allScenariosPass
      },
      levelsM: { bottomZoneM, topZoneM, minimumSafeM: minSafeM, normalM, maximumWorkingM: maxWorkingM, emergencyM, tankHeightM: tankHeight }
    };
    if (Object.values(results).some(value => typeof value === 'number' && !Number.isFinite(value))) {
      throw new RangeError('Расчёт вышел за допустимый диапазон. Проверьте исходные данные.');
    }
    return results;
  }

  return {
    DISPLACEMENT_PER_PERSON_M3,
    M3_PER_HOUR_PER_LPS,
    poolGeometry,
    waveEquivalentDepthM,
    batherAndWaveVolumes,
    backwashVolumes,
    calculateSimple,
    calculateEngineering
  };
});
