(function (root) {
  'use strict';

  const CA_CO3_EQUIVALENT_G_PER_EQ = 50.04345;
  const FACTORS = Object.freeze({
    NaHCO3: 84.0066 / CA_CO3_EQUIVALENT_G_PER_EQ,
    HCl: 36.46094 / CA_CO3_EQUIVALENT_G_PER_EQ,
    H2SO4: (98.078 / 2) / CA_CO3_EQUIVALENT_G_PER_EQ,
    NaHSO4: 120.06 / CA_CO3_EQUIVALENT_G_PER_EQ
  });
  const REAGENTS = Object.freeze({
    HCl: Object.freeze({ title: 'Соляная кислота HCl', state: 'liquid', factor: FACTORS.HCl }),
    H2SO4: Object.freeze({ title: 'Серная кислота H₂SO₄', state: 'liquid', factor: FACTORS.H2SO4 }),
    NaHSO4: Object.freeze({ title: 'Гидросульфат натрия NaHSO₄', state: 'solid', factor: FACTORS.NaHSO4 })
  });

  function finite(name, value, min, max) {
    if (!Number.isFinite(value) || value < min || (max != null && value > max)) {
      throw new RangeError(name + ': проверьте введённое значение.');
    }
    return value;
  }

  function finiteResult(name, value) {
    if (!Number.isFinite(value)) throw new RangeError(name + ': результат выходит за пределы вычисляемого диапазона.');
    return value;
  }

  function baseInputs(input) {
    const volume = finite('Объём бассейна', input.volumeM3, Number.MIN_VALUE);
    const current = finite('Текущая общая щёлочность', input.currentTa, 0);
    const target = finite('Целевая общая щёлочность', input.targetTa, 0);
    return { volumeM3: volume, currentTa: current, targetTa: target };
  }

  function increaseWithBicarbonate(input) {
    const values = baseInputs(input);
    const delta = values.targetTa - values.currentTa;
    if (delta < 0) throw new RangeError('Целевое значение должно быть выше текущей щёлочности.');
    if (delta === 0) return { ...values, deltaTa: 0, activeMassKg: 0, reagentMassKg: 0, reagent: 'NaHCO₃' };
    const purity = finite('Чистота гидрокарбоната натрия', input.purityPercent, Number.MIN_VALUE, 100) / 100;
    const activeMassKg = finiteResult('Масса чистого NaHCO₃', delta * values.volumeM3 / 1000 * FACTORS.NaHCO3);
    const reagentMassKg = finiteResult('Масса товарного NaHCO₃', activeMassKg / purity);
    return {
      ...values,
      deltaTa: delta,
      activeMassKg,
      purityPercent: purity * 100,
      reagentMassKg,
      reagent: 'NaHCO₃'
    };
  }

  function reduceWithAcid(input) {
    const values = baseInputs(input);
    const reagent = REAGENTS[input.reagent];
    if (!reagent) throw new RangeError('Выберите реагент для снижения щёлочности.');
    const delta = values.currentTa - values.targetTa;
    if (delta < 0) throw new RangeError('Целевое значение должно быть ниже текущей щёлочности.');
    if (delta === 0) return { ...values, deltaTa: 0, activeMassKg: 0, reagentMassKg: 0, reagentVolumeL: reagent.state === 'liquid' ? null : undefined, reagent: input.reagent };

    const concentration = finite('Массовая концентрация реагента', input.concentrationPercent, Number.MIN_VALUE, 100) / 100;
    const activeMassKg = finiteResult('Масса чистого реагента', delta * values.volumeM3 / 1000 * reagent.factor);
    const reagentMassKg = finiteResult('Масса товарного реагента', activeMassKg / concentration);
    let reagentVolumeL;
    if (reagent.state === 'liquid') {
      const density = finite('Плотность жидкого реагента', input.densityKgL, Number.MIN_VALUE);
      reagentVolumeL = finiteResult('Объём жидкого реагента', reagentMassKg / density);
    }
    return {
      ...values,
      deltaTa: delta,
      activeMassKg,
      reagentMassKg,
      reagentVolumeL,
      reagent: input.reagent
    };
  }

  function calculateReplacement(input) {
    const values = baseInputs(input);
    const makeupTa = finite('Щёлочность подпиточной воды', input.makeupTa, 0);
    if (values.targetTa === values.currentTa) {
      return { ...values, makeupTa, replacementFraction: 0, replacementM3: 0, replacementPercent: 0 };
    }
    const span = values.currentTa - makeupTa;
    if (span === 0) throw new RangeError('Подпиточная вода имеет ту же щёлочность: замена не изменит результат.');
    const fraction = (values.currentTa - values.targetTa) / span;
    if (fraction < 0 || fraction > 1) {
      throw new RangeError('Целевую щёлочность нельзя получить этой подпиточной водой за одну идеальную замену.');
    }
    const replacementM3 = finiteResult('Объём водозамены', values.volumeM3 * fraction);
    return {
      ...values,
      makeupTa,
      replacementFraction: fraction,
      replacementM3,
      replacementPercent: finiteResult('Доля водозамены', fraction * 100)
    };
  }

  function compareCosts(input) {
    const replacement = calculateReplacement(input);
    const chemical = reduceWithAcid(input);
    const waterTariff = finite('Тариф на воду', input.waterTariff, 0);
    const sewerTariff = finite('Тариф на водоотведение', input.sewerTariff, 0);
    const chemicalTariff = finite('Стоимость реагента', input.chemicalTariff, 0);
    const sourceTemperature = finite('Температура подпиточной воды', input.sourceTemperature, 0, 60);
    const poolTemperature = finite('Температура воды в бассейне', input.poolTemperature, 0, 60);
    const energyTariff = finite('Стоимость тепловой энергии', input.energyTariff, 0);
    const efficiency = finite('КПД нагрева', input.heatingEfficiencyPercent, Number.MIN_VALUE, 100) / 100;
    const heatRise = Math.max(0, poolTemperature - sourceTemperature);
    const heatingKwh = finiteResult('Энергия повторного нагрева', replacement.replacementM3 * 1.163 * heatRise / efficiency);
    const replacementWaterCost = finiteResult('Стоимость водоснабжения и водоотведения', replacement.replacementM3 * (waterTariff + sewerTariff));
    const replacementHeatingCost = finiteResult('Стоимость повторного нагрева', heatingKwh * energyTariff);
    const replacementTotal = finiteResult('Общие прямые затраты водозамены', replacementWaterCost + replacementHeatingCost);
    const chemicalCost = finiteResult('Стоимость реагента', chemical.reagentMassKg * chemicalTariff);
    return {
      replacement,
      chemical,
      replacementWaterCost,
      replacementHeatingCost,
      replacementHeatingKwh: heatingKwh,
      replacementTotal,
      chemicalCost,
      cheaper: chemicalCost < replacementTotal ? 'chemical' : replacementTotal < chemicalCost ? 'replacement' : 'equal',
      difference: Math.abs(chemicalCost - replacementTotal)
    };
  }

  function meqLToMgLAsCaCO3(value) {
    return finiteResult('Щёлочность, мг/л CaCO₃', finite('Щёлочность, мг-экв/л', value, 0) * CA_CO3_EQUIVALENT_G_PER_EQ);
  }

  function mgLAsCaCO3ToMeqL(value) {
    return finite('Щёлочность, мг/л CaCO₃', value, 0) / CA_CO3_EQUIVALENT_G_PER_EQ;
  }

  root.PoolAlkalinityCore = Object.freeze({
    CA_CO3_EQUIVALENT_G_PER_EQ,
    FACTORS,
    REAGENTS,
    increaseWithBicarbonate,
    reduceWithAcid,
    calculateReplacement,
    compareCosts,
    meqLToMgLAsCaCO3,
    mgLAsCaCO3ToMeqL
  });
})(typeof window !== 'undefined' ? window : globalThis);
