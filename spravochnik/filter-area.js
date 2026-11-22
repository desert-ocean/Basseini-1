'use strict';

(function initFilterAreaCalculator() {
  const core = window.FilterAreaCore;
  if (!core) return;

  const form = document.querySelector('#filter-tools');
  if (!form) return;
  const byId = (id) => document.getElementById(id);
  const fields = ['required-flow', 'required-rate', 'group-diameter', 'group-count', 'group-flow', 'wash-diameter', 'wash-count', 'wash-rate'];
  const number = (id) => byId(id).value;
  const fmt = (value, digits = 2) => Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });

  function showError(element, error) {
    element.textContent = error ? error.message : '';
  }

  function calculateRequired() {
    const error = byId('required-error');
    try {
      const result = core.calculateRequiredArea({
        flowM3h: number('required-flow'),
        filtrationRateMph: number('required-rate')
      });
      byId('required-area-result').textContent = fmt(result.requiredAreaM2, 3);
      byId('required-summary').textContent = `Минимальная расчётная площадь при Q = ${fmt(result.flowM3h, 1)} м³/ч и v = ${fmt(result.filtrationRateMph, 1)} м/ч. Это не готовый подбор модели фильтра.`;
      byId('calc1-live').textContent = `Требуется не менее ${fmt(result.requiredAreaM2, 3)} м² фильтрующей площади.`;
      showError(error, null);
      return result;
    } catch (exception) {
      byId('required-area-result').textContent = '—';
      byId('required-summary').textContent = 'Проверьте введённые данные.';
      byId('calc1-live').textContent = 'Расчёт площади недоступен: проверьте расход и скорость.';
      showError(error, exception);
      return null;
    }
  }

  function calculateGroup() {
    const error = byId('group-error');
    const required = calculateRequired();
    try {
      const rate = required ? number('required-rate') : null;
      const group = core.calculateFilterGroup({
        diameterMm: number('group-diameter'),
        count: number('group-count'),
        flowM3h: number('group-flow'),
        filtrationRateMph: rate
      });
      byId('group-single-area').textContent = fmt(group.singleAreaM2, 3);
      byId('group-total-area').textContent = fmt(group.groupAreaM2, 3);
      byId('group-actual-rate').textContent = fmt(group.actualRateMph, 1);
      byId('group-one-out-rate').textContent = group.rateWithOneUnavailableMph == null
        ? '—'
        : `${fmt(group.rateWithOneUnavailableMph, 1)} м/ч`;
      byId('group-required-area').textContent = fmt(group.requiredAreaM2 ?? group.groupAreaM2, 3);
      byId('group-area-status').textContent = group.areaSufficient == null
        ? 'Чтобы сравнить площадь, сначала задайте корректные расход и скорость в калькуляторе № 1.'
        : `${group.areaSufficient ? 'Площади хватает' : 'Площади не хватает'} при расчётной скорости ${fmt(rate, 1)} м/ч. Запас/дефицит: ${group.areaMarginPercent >= 0 ? '+' : ''}${fmt(group.areaMarginPercent, 1)}%.`;
      byId('group-one-out-note').hidden = group.rateWithOneUnavailableMph == null;
      showError(error, null);
    } catch (exception) {
      byId('group-single-area').textContent = '—';
      byId('group-total-area').textContent = '—';
      byId('group-actual-rate').textContent = '—';
      byId('group-one-out-rate').textContent = '—';
      byId('group-required-area').textContent = '—';
      byId('group-area-status').textContent = 'Расчёт недоступен: проверьте введённые данные.';
      byId('group-one-out-note').hidden = true;
      showError(error, exception);
    }
  }

  function calculateBackwash() {
    const error = byId('wash-error');
    try {
      const wash = core.calculateBackwash({
        diameterMm: number('wash-diameter'),
        count: number('wash-count'),
        backwashRateMph: number('wash-rate')
      });
      byId('wash-single-area').textContent = fmt(wash.singleAreaM2, 3);
      byId('wash-one-flow').textContent = fmt(wash.singleFilterFlowM3h, 2);
      byId('wash-all-flow').textContent = fmt(wash.allFiltersFlowM3h, 2);
      showError(error, null);
    } catch (exception) {
      byId('wash-single-area').textContent = '—';
      byId('wash-one-flow').textContent = '—';
      byId('wash-all-flow').textContent = '—';
      showError(error, exception);
    }
  }

  function update() {
    calculateGroup();
    calculateBackwash();
  }

  fields.forEach((id) => byId(id).addEventListener('input', update));
  form.addEventListener('submit', (event) => event.preventDefault());
  update();
})();
