(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PoolInletNozzleCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LIMITS = { dimension: 200, depth: 20, turnover: 1000, spacing: 50, flow: 100000, capacity: 100000, count: 10000 };
  function positive(value, name, max) {
    const n = typeof value === 'number' ? value : Number(String(value == null ? '' : value).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > max) throw new RangeError(name + ' должно быть больше 0 и не превышать ' + max + '.');
    return n;
  }
  function optionalPositive(value, name, max) {
    if (value == null || String(value).trim() === '') return null;
    return positive(value, name, max);
  }
  function integer(value, name, max) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > max) throw new RangeError(name + ' должно быть целым числом от 1 до ' + max + '.');
    return n;
  }
  function base(input) {
    if (!input || typeof input !== 'object') throw new TypeError('Передайте параметры бассейна.');
    const length = positive(input.lengthM, 'Длина', LIMITS.dimension);
    const width = positive(input.widthM, 'Ширина', LIMITS.dimension);
    const averageDepth = positive(input.averageDepthM, 'Средняя глубина', LIMITS.depth);
    const turnoverHours = positive(input.turnoverHours, 'Оборотность', LIMITS.turnover);
    const volumeM3 = length * width * averageDepth;
    if (!Number.isFinite(volumeM3) || volumeM3 > 1000000) throw new RangeError('Расчётный объём превышает 1 000 000 м³. Проверьте размеры чаши.');
    const flowM3h = volumeM3 / turnoverHours;
    if (!Number.isFinite(flowM3h) || flowM3h <= 0 || flowM3h > LIMITS.flow) throw new RangeError('Расчётный расход выходит за допустимый диапазон. Проверьте объём и оборотность.');
    return { lengthM: length, widthM: width, averageDepthM: averageDepth, turnoverHours, areaM2: length * width, volumeM3, flowM3h };
  }
  function capacityCount(flow, capacity) {
    return capacity == null ? null : Math.ceil(flow / capacity - Number.EPSILON * 8);
  }
  function balancedGrid(lengthM, widthM, maxSpacingM, requiredCount) {
    const minX = Math.max(1, Math.ceil(lengthM / maxSpacingM - 1e-12));
    const minY = Math.max(1, Math.ceil(widthM / maxSpacingM - 1e-12));
    const minCount = minX * minY;
    const target = Math.max(minCount, requiredCount || 1);
    let best = null;
    for (let nx = minX; nx <= Math.min(LIMITS.count, target); nx += 1) {
      const ny = Math.max(minY, Math.ceil(target / nx));
      const count = nx * ny;
      if (count > LIMITS.count) continue;
      const ratioPenalty = Math.abs(Math.log((lengthM / nx) / (widthM / ny)));
      const candidate = { nx, ny, count, ratioPenalty, maxStep: Math.max(lengthM / nx, widthM / ny) };
      if (!best || count < best.count || (count === best.count && ratioPenalty < best.ratioPenalty)) best = candidate;
    }
    if (!best) throw new RangeError('Расчётная сетка превышает 10 000 форсунок.');
    return { columns: best.nx, rows: best.ny, count: best.count, spacingLengthM: lengthM / best.nx, spacingWidthM: widthM / best.ny,
      marginLengthM: lengthM / (2 * best.nx), marginWidthM: widthM / (2 * best.ny), minColumns: minX, minRows: minY };
  }
  function floorLayout(input) {
    const p = base(input);
    const step = positive(input.maxSpacingM == null ? 2.5 : input.maxSpacingM, 'Шаг донных форсунок', LIMITS.spacing);
    const capacity = optionalPositive(input.maxFlowPerNozzleM3h, 'Допустимый расход одной форсунки', LIMITS.capacity);
    const areaPerNozzle = optionalPositive(input.areaPerNozzleM2, 'Площадь обслуживания одной форсунки', LIMITS.dimension * LIMITS.dimension);
    const geometry = balancedGrid(p.lengthM, p.widthM, step, 1);
    const areaCount = areaPerNozzle == null ? null : Math.ceil(p.areaM2 / areaPerNozzle - 1e-12);
    const flowCount = capacityCount(p.flowM3h, capacity);
    if ((areaCount && areaCount > LIMITS.count) || (flowCount && flowCount > LIMITS.count)) throw new RangeError('Расчётное количество превышает 10 000 форсунок. Проверьте исходные данные.');
    const requiredCount = Math.max(geometry.count, areaCount || 0, flowCount || 0);
    const layout = balancedGrid(p.lengthM, p.widthM, step, requiredCount);
    const warnings = [];
    if (input.poolType === 'public') warnings.push('Для общественного бассейна расход и водообмен необходимо определять по назначению, загрузке, действующим требованиям и проекту.');
    if (input.poolType === 'skimmer') warnings.push('Донная подача в скиммерной чаше требует согласования с расположением скиммеров и гидравлической схемой.');
    if (capacity == null) warnings.push(input.method === 'flow'
      ? 'Для выбранного расчёта по расходу введите допустимый расход модели. Пока показано только геометрическое количество.'
      : 'Введите предельный расход выбранной форсунки по её характеристике: количество по пропускной способности пока не проверено.');
    if (areaPerNozzle != null) warnings.push('Площадь обслуживания одной форсунки — проектное допущение, а не нормативное значение.');
    if (capacity && p.flowM3h / layout.count > capacity + 1e-9) warnings.push('Средний расход на форсунку превышает заданный предел; нужна другая раскладка или больше точек подачи.');
    warnings.push('Регулярная сетка — предварительная геометрическая оценка. Проверьте фактическое распределение потока и равномерность водообмена проектом.');
    return Object.assign({}, p, { method: input.method === 'flow' ? 'flow' : 'geometry', maxSpacingM: step, areaPerNozzleM2: areaPerNozzle,
      geometryCount: geometry.count, areaCount, flowCount, recommendedCount: layout.count, layout,
      flowPerNozzleM3h: p.flowM3h / layout.count, warnings });
  }
  const WALL_SPANS = {
    short: { walls: 1, axis: 'width', label: 'Одна торцевая стена' },
    long: { walls: 1, axis: 'length', label: 'Одна продольная стена' },
    oppositeShort: { walls: 2, axis: 'width', label: 'Две противоположные торцевые стены' },
    oppositeLong: { walls: 2, axis: 'length', label: 'Две противоположные продольные стены' }
  };
  function wallLayout(input) {
    const p = base(input);
    const step = positive(input.maxSpacingM == null ? 2.5 : input.maxSpacingM, 'Шаг стеновых форсунок', LIMITS.spacing);
    const depth = positive(input.installDepthM == null ? 0.3 : input.installDepthM, 'Глубина оси форсунки от уровня воды', LIMITS.depth);
    const capacity = optionalPositive(input.maxFlowPerNozzleM3h, 'Допустимый расход одной форсунки', LIMITS.capacity);
    const wall = WALL_SPANS[input.wallPlacement || 'short'];
    if (!wall) throw new RangeError('Выберите допустимую схему размещения стеновых форсунок.');
    const staggered = Boolean(input.staggered) && wall.walls === 2;
    const span = wall.axis === 'width' ? p.widthM : p.lengthM;
    const minPerWall = Math.max(1, Math.ceil(span / step - 1e-12));
    const flowCount = capacityCount(p.flowM3h, capacity);
    if (flowCount && flowCount > LIMITS.count) throw new RangeError('Расчётное количество превышает 10 000 форсунок. Проверьте исходные данные.');
    const perWall = Math.max(minPerWall, flowCount == null ? 0 : Math.ceil(flowCount / wall.walls));
    if (perWall * wall.walls > LIMITS.count) throw new RangeError('Расчётное количество превышает 10 000 форсунок.');
    const count = perWall * wall.walls;
    const spacingM = span / perWall;
    const warnings = [];
    if (input.poolType === 'public') warnings.push('Для общественного бассейна расход и водообмен необходимо определить по назначению, загрузке, действующим требованиям и проекту.');
    if (input.poolType === 'overflow' && input.overflowType && input.overflowType !== 'other') warnings.push('Сверьте стеновую подачу с фактическим расположением переливных лотков: эта схема не гарантирует равномерное движение к водосбору.');
    if (capacity == null) warnings.push(input.method === 'flow'
      ? 'Для выбранного расчёта по расходу введите допустимый расход модели. Пока показано только геометрическое количество.'
      : 'Введите предельный расход выбранной форсунки по её характеристике: количество по пропускной способности пока не проверено.');
    if (depth > p.averageDepthM * 0.5) warnings.push('Ось форсунки расположена глубоко относительно средней глубины чаши; перепроверьте высоту и направление потока.');
    if (input.staggered && wall.walls !== 2) warnings.push('Шахматная раскладка возможна только при выборе двух противоположных стен; рассчитана обычная схема.');
    if (staggered && perWall < 2) warnings.push('При одной форсунке на сторону шахматное смещение не меняет раскладку.');
    warnings.push('Шаг вдоль стен не подтверждает дальность струй через чашу и работу встречных потоков: проверьте циркуляцию и балансировку ветвей.');
    return Object.assign({}, p, { method: input.method === 'flow' ? 'flow' : 'geometry', wallPlacement: input.wallPlacement || 'short', wallLabel: wall.label, staggered,
      wallCount: wall.walls, spanM: span, maxSpacingM: step, installDepthM: depth, countPerWall: perWall, geometryCount: minPerWall * wall.walls,
      flowCount, recommendedCount: count, actualSpacingM: spacingM, endOffsetM: spacingM / 2, flowPerNozzleM3h: p.flowM3h / count, warnings });
  }
  return { limits: LIMITS, calculateBase: base, calculateCapacityCount: capacityCount, calculateFloor: floorLayout, calculateWall: wallLayout };
});
