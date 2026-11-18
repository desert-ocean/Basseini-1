(function () {
  'use strict';

  const root = document.querySelector('[data-balance-calculator]');
  const core = window.PoolBalanceTankCore;
  if (!root || !core) return;

  const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const format = value => numberFormat.format(value);
  const valueOf = (scope, name) => {
    const field = scope.querySelector(`[data-field="${name}"]`);
    if (!field) return undefined;
    if (field.type === 'checkbox') return field.checked;
    if (field.tagName === 'SELECT') return field.value;
    const raw = field.value.trim();
    return raw === '' ? undefined : Number(raw.replace(',', '.'));
  };
  const setResult = (scope, name, value, unit = 'м³') => {
    const output = scope.querySelector(`[data-result="${name}"]`);
    if (output) output.textContent = `${format(value)} ${unit}`;
  };
  const clearResults = scope => scope.querySelectorAll('[data-result]').forEach(output => { output.textContent = '—'; });

  function renderSimple() {
    const panel = root.querySelector('[data-balance-panel="simple"]');
    try {
      const result = core.calculateSimple({
        lengthM: valueOf(panel, 'lengthM'),
        widthM: valueOf(panel, 'widthM'),
        averageDepthM: valueOf(panel, 'averageDepthM'),
        batherCount: valueOf(panel, 'batherCount'),
        backwashFromTank: valueOf(panel, 'simpleBackwashFromTank'),
        backwashM3: valueOf(panel, 'simpleBackwashM3')
      });
      const error = panel.querySelector('[data-simple-error]');
      if (error) error.hidden = true;
      setResult(panel, 'simpleArea', result.areaM2, 'м²');
      setResult(panel, 'simplePoolVolume', result.volumeM3);
      setResult(panel, 'simpleDisplacement', result.displacementM3);
      setResult(panel, 'simpleWaves', result.waveM3);
      setResult(panel, 'simpleBackwash', result.backwashM3);
      setResult(panel, 'simpleTotal', result.referenceUsefulVolumeM3);
    } catch (error) {
      clearResults(panel);
      const target = panel.querySelector('[data-simple-error]');
      if (target) {
        target.textContent = error.message || 'Проверьте введённые параметры.';
        target.hidden = false;
      }
    }
  }

  function drawDiagram(result) {
    const svg = root.querySelector('[data-tank-diagram]');
    if (!svg) return;
    const height = result.levelsM.tankHeightM;
    const innerTop = 39;
    const innerBottom = 311;
    const pixelHeight = innerBottom - innerTop;
    const y = levelM => innerBottom - (levelM / height) * pixelHeight;
    const setLine = (name, level) => {
      const line = svg.querySelector(`[data-diagram-level="${name}"]`);
      if (line) line.setAttribute('y1', y(level));
      if (line) line.setAttribute('y2', y(level));
    };
    setLine('minimum', result.levelsM.minimumSafeM);
    setLine('normal', result.levelsM.normalM);
    setLine('maximum', result.levelsM.maximumWorkingM);
    setLine('overflow', result.levelsM.emergencyM);
    const water = svg.querySelector('[data-water]');
    water.setAttribute('y', y(result.levelsM.normalM));
    water.setAttribute('height', Math.max(0, innerBottom - y(result.levelsM.normalM)));
    const lower = svg.querySelector('[data-zone="lower"]');
    lower.setAttribute('y', y(result.levelsM.bottomZoneM));
    lower.setAttribute('height', Math.max(0, innerBottom - y(result.levelsM.bottomZoneM)));
    const upper = svg.querySelector('[data-zone="upper"]');
    upper.setAttribute('y', innerTop);
    upper.setAttribute('height', Math.max(0, y(height - result.levelsM.topZoneM) - innerTop));
    svg.querySelector('[data-diagram-upper-zone]').textContent = `Верхняя зона: ${format(result.levelsM.topZoneM * 1000)} мм`;
    svg.querySelector('[data-diagram-lower-zone]').textContent = `Нижняя зона: ${format(result.levelsM.bottomZoneM * 1000)} мм`;
    svg.querySelector('[data-diagram-water]').textContent = `Вода: ${format(result.normalWaterVolumeM3)} м³`;
    svg.querySelector('[data-diagram-free]').textContent = `Свободно до max: ${format(result.freeToWorkingLevelM3)} м³`;
    root.querySelector('[data-diagram-summary]').textContent = `При нормальном уровне ${format(result.levelsM.normalM * 1000)} мм в баке ${format(result.normalWaterVolumeM3)} м³ воды; до максимального рабочего уровня остаётся ${format(result.freeToWorkingLevelM3)} м³. Нижняя конструктивная зона — ${format(result.levelsM.bottomZoneM * 1000)} мм, верхняя свободная зона — ${format(result.levelsM.topZoneM * 1000)} мм.`;
    const desc = svg.querySelector('#tank-diagram-desc');
    desc.textContent = `Внутренняя высота ${format(height * 1000)} миллиметров. Минимальный безопасный уровень ${format(result.levelsM.minimumSafeM * 1000)}, нормальный ${format(result.levelsM.normalM * 1000)}, максимальный рабочий ${format(result.levelsM.maximumWorkingM * 1000)}, аварийный перелив ${format(result.levelsM.emergencyM * 1000)} миллиметров. Воды при нормальном уровне ${format(result.normalWaterVolumeM3)} кубических метров; свободная вместимость до максимального рабочего уровня ${format(result.freeToWorkingLevelM3)} кубических метров.`;
  }

  function renderEngineering() {
    const panel = root.querySelector('[data-balance-panel="engineering"]');
    const error = panel.querySelector('[data-error]');
    const status = panel.querySelector('[data-status]');
    const diagram = panel.querySelector('[data-tank-diagram]');
    try {
      const result = core.calculateEngineering({
        lengthM: valueOf(panel, 'lengthM'),
        widthM: valueOf(panel, 'widthM'),
        averageDepthM: valueOf(panel, 'averageDepthM'),
        batherCount: valueOf(panel, 'batherCount'),
        tankLengthM: valueOf(panel, 'tankLengthM'),
        tankWidthM: valueOf(panel, 'tankWidthM'),
        tankHeightM: valueOf(panel, 'tankHeightM'),
        bottomZoneMm: valueOf(panel, 'bottomZoneMm'),
        topZoneMm: valueOf(panel, 'topZoneMm'),
        minimumSafeLevelMm: valueOf(panel, 'minimumSafeLevelMm'),
        normalLevelMm: valueOf(panel, 'normalLevelMm'),
        maximumWorkingLevelMm: valueOf(panel, 'maximumWorkingLevelMm'),
        emergencyOverflowLevelMm: valueOf(panel, 'emergencyOverflowLevelMm'),
        backwashFromTank: valueOf(panel, 'backwashFromTank'),
        filterCount: valueOf(panel, 'filterCount'),
        filtersToWash: valueOf(panel, 'filtersToWash'),
        filterAreaMode: valueOf(panel, 'filterAreaMode'),
        filterDiameterMm: valueOf(panel, 'filterDiameterMm'),
        filterAreaPerFilterM2: valueOf(panel, 'filterAreaPerFilterM2'),
        backwashIntensityLsM2: valueOf(panel, 'backwashIntensityLsM2'),
        backwashDurationMinutes: valueOf(panel, 'backwashDurationMinutes'),
        backwashPattern: valueOf(panel, 'backwashPattern'),
        rinseM3: valueOf(panel, 'rinseM3'),
        troughDrainM3: valueOf(panel, 'troughDrainM3'),
        gravityPipeDrainM3: valueOf(panel, 'gravityPipeDrainM3'),
        attractionReturnM3: valueOf(panel, 'attractionReturnM3'),
        otherReturnM3: valueOf(panel, 'otherReturnM3'),
        circulationFlowM3h: valueOf(panel, 'circulationFlowM3h'),
        returnDelayMinutes: valueOf(panel, 'returnDelayMinutes'),
        additionalReserveM3: valueOf(panel, 'additionalReserveM3'),
        stopWithBathing: valueOf(panel, 'stopWithBathing')
      });
      error.hidden = true;
      diagram.removeAttribute('hidden');
      setResult(panel, 'poolVolume', result.poolVolumeM3);
      setResult(panel, 'poolArea', result.poolAreaM2, 'м²');
      setResult(panel, 'displacement', result.batherDisplacementM3);
      setResult(panel, 'waves', result.waveVolumeM3);
      setResult(panel, 'backwash', result.backwash.totalM3);
      setResult(panel, 'backwashFlow', result.backwash.peakFlowM3h, 'м³/ч');
      setResult(panel, 'shutdown', result.stopReturnM3);
      setResult(panel, 'geometric', result.geometricVolumeM3);
      setResult(panel, 'bottomZone', result.lowerZoneM3);
      setResult(panel, 'topZone', result.upperZoneM3);
      setResult(panel, 'normalWater', result.normalWaterVolumeM3);
      setResult(panel, 'pumpReserve', result.pumpReserveM3);
      setResult(panel, 'freeCapacity', result.freeToWorkingLevelM3);
      setResult(panel, 'operatingRange', result.availableOperatingRangeM3);
      setResult(panel, 'standardReference', result.standardReferenceM3);
      setResult(panel, 'scenarioRange', result.requiredRangeM3);
      setResult(panel, 'minimumHeight', result.minimumInternalHeightAtFootprintM, 'м');
      setResult(panel, 'minimumGeometry', result.minimumGeometricVolumeM3);
      const checkText = check => check.passed ? `Достаточно: ${format(check.availableM3)} / ${format(check.requiredM3)} м³` : `Недостаточно: ${format(check.availableM3)} / ${format(check.requiredM3)} м³`;
      panel.querySelector('[data-result="checkUpper"]').textContent = checkText(result.checks.upper);
      panel.querySelector('[data-result="checkLower"]').textContent = checkText(result.checks.lower);
      panel.querySelector('[data-result="checkStandard"]').textContent = checkText(result.checks.standardReference);
      panel.querySelector('[data-result="checkRange"]').textContent = checkText(result.checks.totalRange);
      status.dataset.state = result.checks.allPassed ? 'ok' : 'warning';
      status.textContent = result.checks.allPassed
        ? 'Введённые уровни проходят заданные проверки. Это предварительный расчёт: подтвердите самотёк, конструкцию и характеристики насоса проектом.'
        : `Есть недостающий запас: ${[
          !result.checks.upper.passed && 'свободная вместимость сверху',
          !result.checks.lower.passed && 'запас воды до безопасного минимума',
          !result.checks.standardReference.passed && 'рабочий диапазон по справочной сумме ГОСТ',
          !result.checks.totalRange.passed && 'общий диапазон сценариев'
        ].filter(Boolean).join('; ')}. Измените габариты или уровни и проверьте проектную схему.`;
      drawDiagram(result);
    } catch (exception) {
      clearResults(panel);
      error.textContent = exception.message || 'Проверьте введённые параметры.';
      error.hidden = false;
      status.textContent = '';
      diagram.setAttribute('hidden', '');
    }
  }

  function render() {
    renderSimple();
    renderEngineering();
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-balance-mode]');
    if (!button) return;
    const mode = button.dataset.balanceMode;
    root.querySelectorAll('[data-balance-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    root.querySelectorAll('[data-balance-panel]').forEach(panel => { panel.hidden = panel.dataset.balancePanel !== mode; });
    render();
  });

  root.addEventListener('input', render);
  root.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('[data-field="backwashFromTank"]')) {
      root.querySelector('[data-backwash-fields]').hidden = !target.checked;
    }
    if (target.matches('[data-field="filterAreaMode"]')) {
      const areaMode = target.value === 'area';
      root.querySelector('[data-filter-area]').hidden = !areaMode;
      root.querySelector('[data-filter-diameter]').hidden = areaMode;
    }
    render();
  });

  render();
})();
