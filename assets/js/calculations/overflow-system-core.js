(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PoolOverflowCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LIMIT = { flow: 100000, length: 10000, outlets: 10000, dimension: 10000 };
  function number(value, label, min, max) {
    const n = typeof value === 'number' ? value : Number(String(value == null ? '' : value).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(label + ': введите значение от ' + min + ' до ' + max + '.');
    return n;
  }
  function positive(value, label, max) { return number(value, label, Number.MIN_VALUE, max); }
  function whole(value, label, max) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > max) throw new RangeError(label + ': укажите целое число от 1 до ' + max + '.');
    return n;
  }
  function ceil(value) { return Math.ceil(value - Number.EPSILON * Math.max(8, Math.abs(value) * 8)); }

  function parseSegmentLengths(value) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new RangeError('Введите длины участков через точку с запятой, например: 7,5; 4,2; 3,3.');
    }
    const parts = value.split(';');
    if (parts.some(part => !part.trim())) {
      throw new RangeError('Проверьте список длин: разделяйте участки точкой с запятой и не оставляйте пустые значения.');
    }
    return parts.map((part, index) => {
      try {
        return positive(part.trim(), 'Длина участка ' + (index + 1) + ', м', LIMIT.length);
      } catch (error) {
        throw new RangeError('Длина участка ' + (index + 1) + ': введите положительное число не более ' + LIMIT.length + ' м, используя десятичную запятую или точку.');
      }
    });
  }

  function calculateTroughSection(input) {
    if (!input || typeof input !== 'object') throw new TypeError('Передайте исходные данные расчёта.');
    const flow = positive(input.flowM3h, 'Расход циркуляции, м³/ч', LIMIT.flow);
    const length = positive(input.lengthM, 'Длина желоба, м', LIMIT.length);
    const outlets = whole(input.outlets, 'Количество выпусков', LIMIT.outlets);
    const approach = input.approach;
    if (approach !== 'one' && approach !== 'two') throw new RangeError('Выберите односторонний или двусторонний подход воды.');
    const swimmers = positive(input.swimmers, 'Количество купающихся по расчёту', LIMIT.outlets);
    const reservePct = number(input.reservePct == null ? 0 : input.reservePct, 'Запас', 0, 50);
    const widthMm = positive(input.widthMm, 'Внутренняя ширина лотка, мм', 5000);
    const category = input.category;
    if (category !== 'general' && category !== 'teaching') throw new RangeError('Выберите расчётную категорию бассейна.');
    const k = approach === 'two' ? 2 : 1;
    const coeff = category === 'teaching' ? 0.035 : 0.063;
    const areaM2 = coeff * swimmers / length + 0.0003 * flow / (k * outlets);
    const reservedAreaM2 = areaM2 * (1 + reservePct / 100);
    const widthM = widthMm / 1000;
    return {
      areaM2,
      areaCm2: areaM2 * 10000,
      reservedAreaM2,
      reservedAreaCm2: reservedAreaM2 * 10000,
      workingDepthM: reservedAreaM2 / widthM,
      workingDepthMm: reservedAreaM2 / widthM * 1000,
      widthMm,
      reservePct,
      coefficient: coeff,
      k
    };
  }

  function openSegment(lengthM, maxSpacingM) {
    const outlets = Math.max(1, ceil(lengthM / maxSpacingM));
    if (outlets > LIMIT.outlets) throw new RangeError('Количество выпусков на участке превышает допустимый предел.');
    return { lengthM, outlets, spacingM: lengthM / outlets, endOffsetM: lengthM / (2 * outlets) };
  }
  function closedLoop(lengthM, maxSpacingM) {
    const outlets = Math.max(1, ceil(lengthM / maxSpacingM));
    if (outlets > LIMIT.outlets) throw new RangeError('Количество выпусков по контуру превышает допустимый предел.');
    return { lengthM, outlets, spacingM: lengthM / outlets, endOffsetM: null, isClosed: true };
  }
  function allocateSegments(segments, requiredCount) {
    const rows = segments.map(s => Object.assign({}, s));
    let count = rows.reduce((sum, row) => sum + row.outlets, 0);
    while (count < requiredCount) {
      let chosen = -1;
      for (let i = 0; i < rows.length; i += 1) {
        if (chosen < 0 || rows[i].spacingM > rows[chosen].spacingM) chosen = i;
      }
      if (chosen < 0 || count >= LIMIT.outlets) throw new RangeError('Количество выпусков превышает допустимый предел.');
      rows[chosen].outlets += 1;
      rows[chosen].spacingM = rows[chosen].lengthM / rows[chosen].outlets;
      rows[chosen].endOffsetM = rows[chosen].isClosed ? null : rows[chosen].spacingM / 2;
      count += 1;
    }
    return rows;
  }
  function calculateOutlets(input) {
    if (!input || typeof input !== 'object') throw new TypeError('Передайте исходные данные расчёта.');
    const flow = positive(input.flowM3h, 'Расход циркуляции, м³/ч', LIMIT.flow);
    const spacingLimit = positive(input.maxSpacingM == null ? 2 : input.maxSpacingM, 'Максимальный шаг, м', LIMIT.length);
    const diameterMm = positive(input.internalDiameterMm == null ? 50 : input.internalDiameterMm, 'Внутренний диаметр, мм', LIMIT.dimension);
    const velocity = positive(input.velocityMps == null ? 0.6 : input.velocityMps, 'Расчётная скорость, м/с', 20);
    let segmentList;
    let loop = false;
    if (input.geometry === 'rectangle') {
      const length = positive(input.lengthM, 'Длина чаши, м', LIMIT.length);
      const width = positive(input.widthM, 'Ширина чаши, м', LIMIT.length);
      segmentList = [
        { name: 'Длинная сторона 1', lengthM: length }, { name: 'Длинная сторона 2', lengthM: length },
        { name: 'Короткая сторона 1', lengthM: width }, { name: 'Короткая сторона 2', lengthM: width }
      ].map(s => Object.assign(s, openSegment(s.lengthM, spacingLimit)));
      loop = true;
    } else if (input.geometry === 'loop') {
      const length = positive(input.totalLengthM, 'Длина замкнутого лотка, м', LIMIT.length);
      segmentList = [Object.assign({ name: 'Замкнутый лоток' }, closedLoop(length, spacingLimit))];
      loop = true;
    } else if (input.geometry === 'segments') {
      if (!Array.isArray(input.segments) || !input.segments.length || input.segments.length > 100) throw new RangeError('Добавьте от одного до 100 отдельных участков лотка.');
      segmentList = input.segments.map((item, index) => {
        const lengthM = positive(item.lengthM, 'Длина участка ' + (index + 1) + ', м', LIMIT.length);
        return Object.assign({ name: item.name || 'Участок ' + (index + 1) }, openSegment(lengthM, spacingLimit));
      });
    } else throw new RangeError('Выберите геометрию лотка.');
    const totalLengthM = segmentList.reduce((sum, segment) => sum + segment.lengthM, 0);
    if (totalLengthM > LIMIT.length) throw new RangeError('Суммарная длина лотка превышает допустимый предел.');
    const areaM2 = Math.PI * Math.pow(diameterMm / 1000, 2) / 4;
    const theoreticalFlowPerOutletM3h = areaM2 * velocity * 3600;
    if (!Number.isFinite(theoreticalFlowPerOutletM3h) || theoreticalFlowPerOutletM3h <= 0) throw new RangeError('Не удалось определить теоретический расход выпуска. Проверьте диаметр и скорость.');
    const flowCount = Math.max(1, ceil(flow / theoreticalFlowPerOutletM3h));
    if (!Number.isSafeInteger(flowCount) || flowCount > LIMIT.outlets) throw new RangeError('Требуемое по расходу количество выпусков превышает допустимый предел.');
    const geometryCount = segmentList.reduce((sum, segment) => sum + segment.outlets, 0);
    const recommendedCount = Math.max(geometryCount, flowCount);
    if (recommendedCount > LIMIT.outlets) throw new RangeError('Общее количество выпусков превышает допустимый предел.');
    const distributed = allocateSegments(segmentList, recommendedCount);
    const actualMaxSpacingM = Math.max(...distributed.map(segment => segment.spacingM));
    const warnings = [
      'Максимальный шаг 2 м — заданное предварительное проектное ограничение ALPOOL, а не универсальная нормативная норма.',
      'Теоретический расход рассчитан по полному внутреннему сечению трубы и скорости; он не подтверждает пропускную способность самотечного выпуска.',
      'Нужно проверить фактический ID вместо DN, свободную площадь решётки, частичное заполнение, отметки, уклоны, длины и местные сопротивления.',
      'Для соответствующих выпусков с решётками СП 31-113-2004 указывает скорость входа 0,4–0,5 м/с; введённое значение 0,6 м/с является только идеализированным примером и не подтверждает выполнение этого положения.'
    ];
    if (recommendedCount > geometryCount) warnings.push('Расчёт по пропускной способности увеличил число выпусков; проверьте распределение по участкам и гидравлическую балансировку.');
    return {
      geometry: input.geometry, loop, totalLengthM, maxSpacingM: spacingLimit,
      geometryCount, flowCount, recommendedCount, theoreticalFlowPerOutletM3h,
      totalTheoreticalCapacityM3h: recommendedCount * theoreticalFlowPerOutletM3h,
      actualMaxSpacingM, segments: distributed, warnings
    };
  }
  return { calculateTroughSection, calculateOutlets, openSegment, closedLoop, parseSegmentLengths };
});
