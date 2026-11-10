(function () {
	'use strict';

	var root = document.querySelector('[data-heating-calculator]');
	if (!root || !window.ALPOOLPoolHeating) return;
	var core = window.ALPOOLPoolHeating;
	var numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
	var mode = 'power';
	var latest = null;
	var marker = 'Параметры расчёта нагрева бассейна:';
	var commonIds = ['water-volume', 'water-area', 'water-start-temp', 'water-target-temp', 'pool-location'];
	var ids = commonIds.concat(['operation-hours', 'extra-loss', 'cover-hours', 'cover-reduction', 'heating-hours', 'available-power', 'primary-supply', 'primary-return', 'heat-pump-cop']);

	function get(id) { return document.getElementById(id); }
	function setText(id, value) { get(id).textContent = value; }
	function fmt(value, unit) { return value == null || !Number.isFinite(value) ? 'Не определено' : numberFormat.format(value) + (unit ? ' ' + unit : ''); }
	function friendlyError(error) {
		var message = error && error.message ? error.message : '';
		if (/[\u0400-\u04FF]/.test(message)) return message;
		if (message.indexOf('Initial water temperature') >= 0) return 'Начальная температура должна быть от 0 до 50 °C.';
		if (message.indexOf('Target water temperature') >= 0) return 'Требуемая температура должна быть от 0 до 50 °C.';
		if (message.indexOf('target temperature must not be below') >= 0) return 'Для расчёта нагрева целевая температура должна быть не ниже начальной.';
		if (message.indexOf('volumeM3') >= 0) return 'Объём воды должен быть положительным конечным числом в допустимом диапазоне.';
		if (message.indexOf('surfaceM2') >= 0) return 'Площадь зеркала должна быть положительным конечным числом в допустимом диапазоне.';
		if (message.indexOf('pool location') >= 0) return 'Выберите расположение бассейна.';
		if (message.indexOf('heatingTimeHours') >= 0) return 'Время нагрева должно быть положительным и конечным.';
		if (message.indexOf('availablePowerKw') >= 0) return 'Доступная тепловая мощность должна быть положительной и конечной.';
		if (message.indexOf('cop') >= 0) return 'COP должен быть положительным конечным значением из паспорта оборудования.';
		if (message.indexOf('additionalLossWm2') >= 0) return 'Дополнительная поправка должна быть неотрицательной и конечной.';
		if (message.indexOf('coverReductionPercent') >= 0) return 'Снижение потерь покрытием должно быть от 0 до 100%.';
		if (message.indexOf('operationHours') >= 0 || message.indexOf('coverHours') >= 0 || message.indexOf('no more than 24 hours') >= 0) return 'Часы эксплуатации и простоя с покрытием должны быть неотрицательными, каждые — не более 24, а их сумма — не более 24 часов.';
		if (message.indexOf('Covered hours require') >= 0) return 'Укажите наличие покрытия, чтобы задать часы простоя с ним.';
		if (message.indexOf('heat-up operating condition') >= 0) return 'Выберите условия поверхности на время нагрева.';
		if (message.indexOf('Supply temperature') >= 0) return 'Температура подачи должна быть выше температуры обратки; проверьте диапазон 0–150 °C.';
		return 'Проверьте исходные данные и допустимые диапазоны значений.';
	}
	function fieldNumber(id) {
		var input = get(id);
		var raw = input.value.trim();
		input.removeAttribute('aria-invalid');
		if (!raw) return null;
		if (raw.indexOf(',') >= 0 && raw.indexOf('.') >= 0) {
			input.setAttribute('aria-invalid', 'true');
			return NaN;
		}
		var value = Number(raw.replace(',', '.'));
		if (!Number.isFinite(value)) input.setAttribute('aria-invalid', 'true');
		return Number.isFinite(value) ? value : NaN;
	}
	function fieldRequired(id, label) {
		var value = fieldNumber(id);
		if (value == null || Number.isNaN(value)) throw new Error('Заполните поле «' + label + '» числом.');
		return value;
	}
	function readCommon() {
		var values = {};
		var labels = { 'water-volume': 'Объём воды', 'water-area': 'Площадь зеркала', 'water-start-temp': 'Начальная температура', 'water-target-temp': 'Требуемая температура' };
		commonIds.slice(0, 4).forEach(function (id) { values[id] = fieldRequired(id, labels[id]); });
		values.location = get('pool-location').value;
		if (!values.location) throw new Error('Выберите расположение бассейна.');
		values.volumeM3 = values['water-volume'];
		values.surfaceM2 = values['water-area'];
		values.initialTempC = values['water-start-temp'];
		values.targetTempC = values['water-target-temp'];
		values.poolLocation = values.location;
		return values;
	}
	function optionalNonnegative(id, label, defaultValue) {
		var input = get(id);
		if (!input.value.trim() && defaultValue != null) return defaultValue;
		var value = fieldRequired(id, label);
		if (value < 0) { input.setAttribute('aria-invalid', 'true'); throw new Error('Поле «' + label + '» не может быть отрицательным.'); }
		return value;
	}
	function clearAllResults() {
		['power-energy','power-ideal','power-loss','power-with-loss','time-energy','time-ideal','time-loss','time-with-loss','maint-operation','maint-extra','maint-idle','maint-covered','maint-daily-energy','maint-average','maint-maximum','equipment-thermal-power','equipment-flow','equipment-electric-power'].forEach(function (id) { setText(id, '—'); });
		setText('power-explanation', 'Результаты появятся после ввода данных и времени нагрева.');
		setText('time-explanation', 'Результаты появятся после ввода данных и доступной мощности.');
		setText('maint-explanation', 'Введите длительность режимов и параметры покрытия для суточного баланса.');
		setText('equipment-explanation', 'По одной тепловой мощности нельзя выбрать конкретную модель оборудования.');
		get('equipment-heat-exchanger-row').hidden = get('heat-source').value !== 'exchanger';
		get('equipment-heat-pump-row').hidden = get('heat-source').value !== 'heat-pump';
		latest = null;
	}
	function selectedCondition(selectId) {
		var value = get(selectId).value;
		if (!value) throw new Error('Выберите условия поверхности на время нагрева.');
		var additional = optionalNonnegative('extra-loss', 'Дополнительная потеря при эксплуатации', 0);
		var coverUsed = get('cover-present').value === 'yes';
		var reduction = get('cover-reduction').value.trim() ? fieldRequired('cover-reduction', 'Снижение потерь покрытием') : null;
		if (reduction != null && (reduction < 0 || reduction > 100)) { get('cover-reduction').setAttribute('aria-invalid', 'true'); throw new Error('Снижение потерь покрытием должно быть от 0 до 100%.'); }
		if (value === 'covered' && !coverUsed) throw new Error('Режим с покрытием недоступен: укажите наличие покрытия.');
		return { mode: value, additionalLossWm2: additional, coverReductionPercent: reduction };
	}
	function equipmentPower(power) {
		var input = get('heat-source').value;
		setText('equipment-thermal-power', fmt(power, 'кВт'));
		get('equipment-heat-exchanger-row').hidden = input !== 'exchanger';
		get('equipment-heat-pump-row').hidden = input !== 'heat-pump';
		if (power == null) {
			setText('equipment-flow', 'Не определено');
			setText('equipment-electric-power', 'Не определено');
			return;
		}
		if (input === 'exchanger') {
			var fluid = get('primary-fluid').value;
			var supply = fieldNumber('primary-supply');
			var ret = fieldNumber('primary-return');
			if (supply == null || ret == null || Number.isNaN(supply) || Number.isNaN(ret)) {
				setText('equipment-flow', 'Введите температуры подачи и обратки');
				setText('equipment-explanation', 'Для теплообменника задайте температуры обоих контуров. Расход гликоля без его теплофизических свойств не вычисляется.');
			} else if (fluid === 'glycol') {
				try { core.heatExchangerFlow(power, supply, ret, 'glycol'); } catch (error) { setText('equipment-flow', 'Проверьте температуры'); setText('equipment-explanation', error.message); return; }
				setText('equipment-flow', 'Нужны свойства раствора');
				setText('equipment-explanation', 'Расход гликоля не рассчитан по водяному коэффициенту. Уточните теплоёмкость и плотность смеси при рабочей концентрации и температуре. Мощность теплообменника дополнительно проверяют по характеристике изготовителя.');
			} else {
				try {
					var result = core.heatExchangerFlow(power, supply, ret, 'water');
					setText('equipment-flow', fmt(result.flowM3h, 'м³/ч'));
					setText('equipment-explanation', 'Расход рассчитан для воды по заданному перепаду температуры. Подбор реального теплообменника зависит от температур, расходов обоих контуров, гидравлики и паспортной характеристики.');
				} catch (error) {
					setText('equipment-flow', 'Проверьте температуры');
					setText('equipment-explanation', friendlyError(error));
				}
			}
		} else if (input === 'heat-pump') {
			var cop = get('heat-pump-cop').value.trim() ? fieldRequired('heat-pump-cop', 'COP') : null;
			try {
				var electric = core.heatPumpElectricPower(power, cop);
				setText('equipment-electric-power', electric == null ? 'Введите COP из паспорта' : fmt(electric, 'кВт'));
				setText('equipment-explanation', 'Показана требуемая тепловая мощность. Электрическая оценка Pэл = Pтепл / COP дана только при введённом пользователем COP для ожидаемых условий; проверьте паспортную производительность.');
			} catch (error) {
				setText('equipment-electric-power', 'Проверьте COP');
				setText('equipment-explanation', friendlyError(error));
			}
		} else {
			setText('equipment-explanation', 'Показана требуемая тепловая мощность. Электрическая потребляемая мощность определяется паспортом нагревателя и электрической схемой.');
		}
	}
	function renderPower(common) {
		var time = fieldRequired('heating-hours', 'Желаемое время нагрева');
		var condition = selectedCondition('heating-condition-power');
		var result = core.powerForHeating(Object.assign({}, common, condition, { heatingTimeHours: time }));
		setText('power-energy', fmt(result.energyKWh, 'кВт·ч'));
		setText('power-ideal', fmt(result.idealPowerKw, 'кВт'));
		setText('power-loss', fmt(result.surfaceLossKw, 'кВт'));
		setText('power-with-loss', fmt(result.powerWithLossKw, 'кВт'));
		setText('power-explanation', result.coverEfficiencyRequired ? 'Для точного результата с покрытием введите коэффициент снижения потерь. Идеальная мощность показана отдельно.' : 'Мощность с потерями предполагает постоянный выбранный режим поверхности на всём интервале нагрева; влияние погоды и температуры на потери не моделируется.');
		latest = { mode: mode, common: common, result: result, condition: condition, equipmentPowerKw: result.powerWithLossKw };
	}
	function renderTime(common) {
		var power = fieldRequired('available-power', 'Доступная тепловая мощность');
		var condition = selectedCondition('heating-condition-time');
		var result = core.timeForHeating(Object.assign({}, common, condition, { availablePowerKw: power }));
		setText('time-energy', fmt(result.energyKWh, 'кВт·ч'));
		setText('time-ideal', fmt(result.idealTimeHours, 'ч'));
		setText('time-loss', fmt(result.surfaceLossKw, 'кВт'));
		setText('time-with-loss', fmt(result.timeWithLossHours, 'ч'));
		var explanation = result.coverEfficiencyRequired ? 'Для точного времени нагрева под покрытием введите коэффициент снижения потерь.' : result.insufficientPower ? 'При заданных условиях мощности недостаточно для нагрева воды: она не превышает текущие теплопотери.' : 'Модель считает теплопотери постоянными на протяжении нагрева и не учитывает их изменение вместе с температурой воды.';
		setText('time-explanation', explanation);
		latest = { mode: mode, common: common, result: result, condition: condition, equipmentPowerKw: power };
	}
	function renderMaintenance(common) {
		var operation = fieldRequired('operation-hours', 'Часы эксплуатации в сутки');
		var coverUsed = get('cover-present').value === 'yes';
		var coverHours = coverUsed ? fieldRequired('cover-hours', 'Часы простоя с покрытием') : 0;
		var reduction = coverUsed && get('cover-reduction').value.trim() ? fieldRequired('cover-reduction', 'Снижение потерь покрытием') : null;
		var additional = optionalNonnegative('extra-loss', 'Дополнительная потеря при эксплуатации', 0);
		var result = core.dailyBalance({ surfaceM2: common.surfaceM2, poolLocation: common.poolLocation, operationHours: operation, coverHours: coverHours, coverUsed: coverUsed, coverReductionPercent: reduction, additionalLossWm2: additional });
		setText('maint-operation', fmt(result.operationLossKw, 'кВт'));
		setText('maint-extra', fmt(result.additionalOperatingLossKw, 'кВт'));
		setText('maint-idle', fmt(result.baseSurfaceLossKw, 'кВт'));
		setText('maint-covered', !coverUsed || coverHours === 0 ? 'Не используется' : fmt(result.coveredLossKw, 'кВт'));
		setText('maint-daily-energy', fmt(result.dailyEnergyKWh, 'кВт·ч/сут'));
		setText('maint-average', fmt(result.averagePowerKw, 'кВт'));
		setText('maint-maximum', fmt(result.maximumLossKw, 'кВт'));
		setText('maint-explanation', result.hasUnknownCoveredLoss ? 'Коэффициент снижения покрытием не задан: полная суточная энергия и максимальная мощность не определены. Известные потери эксплуатации и простоя показаны отдельно.' : 'Для непрерывного поддержания температуры нагреватель должен покрывать текущую потерю активного режима. Средняя мощность за сутки не гарантирует поддержание температуры в каждый момент.');
		latest = { mode: mode, common: common, result: result, maintenance: { operationHours: operation, coverHours: coverHours, coverUsed: coverUsed, coverReductionPercent: reduction, additionalLossWm2: additional }, equipmentPowerKw: result.maximumLossKw };
	}
	function calculate() {
		clearAllResults();
		var errorBox = get('common-error');
		errorBox.textContent = '';
		try {
			var common = readCommon();
			if (mode === 'power') renderPower(common);
			else if (mode === 'time') renderTime(common);
			else renderMaintenance(common);
			equipmentPower(latest.equipmentPowerKw);
		} catch (error) {
				errorBox.textContent = friendlyError(error);
			latest = null;
		}
	}
	function setMode(next) {
		mode = next;
		root.querySelectorAll('[data-mode]').forEach(function (button) {
			var active = button.dataset.mode === next;
			button.classList.toggle('is-active', active);
			button.setAttribute('aria-selected', String(active));
			button.tabIndex = active ? 0 : -1;
		});
		['power', 'time', 'maintenance'].forEach(function (name) { get('pane-' + name).hidden = name !== next; });
		calculate();
	}
	function updateCoverControls() {
		var useCover = get('cover-present').value === 'yes';
		get('cover-hours').disabled = !useCover;
		get('cover-reduction').disabled = !useCover;
		['heating-condition-power', 'heating-condition-time'].forEach(function (id) {
			var option = get(id).querySelector('option[value="covered"]');
			option.disabled = !useCover;
			if (!useCover && get(id).value === 'covered') get(id).value = '';
		});
	}
	function updateSourceControls() {
		var source = get('heat-source').value;
		var exchanger = source === 'exchanger';
		get('fluid-field').hidden = !exchanger;
		get('supply-field').hidden = !exchanger;
		get('return-field').hidden = !exchanger;
		get('cop-field').hidden = source !== 'heat-pump';
		get('source-note').textContent = exchanger ? 'Расход первичного контура рассчитывается только для воды. Для гликоля без его свойств числовой результат не выводится.' : source === 'heat-pump' ? 'Введите COP из паспорта для условий, близких к расчётным. Значение не подставляется автоматически.' : 'Результат показывает тепловую мощность; электрическая мощность сверяется по паспорту оборудования.';
	}
	function applyVolumeFromURL() {
		var values = new URLSearchParams(window.location.search).getAll('volume');
		if (values.length !== 1) return false;
		var raw = values[0].trim();
		if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) return false;
		var value = Number(raw.replace(',', '.'));
		if (!Number.isFinite(value) || value < 0.000001 || value > 1000000) return false;
		get('water-volume').value = String(value);
		return true;
	}
	function formatInput(id) {
		var value = fieldNumber(id);
		return value == null || Number.isNaN(value) ? 'не задано' : numberFormat.format(value);
	}
	function formLines() {
		if (!latest) return [];
		var c = latest.common;
		var modeTitle = { power: 'Мощность нагрева', time: 'Время нагрева', maintenance: 'Теплопотери и поддержание' }[latest.mode];
		var lines = [marker, 'Режим: ' + modeTitle,
			'Объём: ' + numberFormat.format(c.volumeM3) + ' м³; площадь зеркала: ' + numberFormat.format(c.surfaceM2) + ' м²',
			'Температуры воды: ' + numberFormat.format(c.initialTempC) + ' → ' + numberFormat.format(c.targetTempC) + ' °C',
			'Расположение: ' + get('pool-location').selectedOptions[0].text,
			'Источник нагрева: ' + get('heat-source').selectedOptions[0].text];
		if (latest.mode === 'power') {
			lines.push('Время нагрева: ' + formatInput('heating-hours') + ' ч; условие поверхности: ' + get('heating-condition-power').selectedOptions[0].text,
				'Энергия: ' + fmt(latest.result.energyKWh, 'кВт·ч') + '; идеальная мощность: ' + fmt(latest.result.idealPowerKw, 'кВт') + '; мощность с потерями: ' + fmt(latest.result.powerWithLossKw, 'кВт'));
		} else if (latest.mode === 'time') {
			lines.push('Доступная тепловая мощность: ' + formatInput('available-power') + ' кВт; условие поверхности: ' + get('heating-condition-time').selectedOptions[0].text,
				'Идеальное время: ' + fmt(latest.result.idealTimeHours, 'ч') + '; время с потерями: ' + fmt(latest.result.timeWithLossHours, 'ч'));
		} else {
			lines.push('Эксплуатация: ' + numberFormat.format(latest.maintenance.operationHours) + ' ч/сут; дополнительная поправка: ' + numberFormat.format(latest.maintenance.additionalLossWm2) + ' Вт/м² (' + fmt(latest.result.additionalOperatingLossKw, 'кВт') + ')',
				'Покрытие: ' + (latest.maintenance.coverUsed ? 'используется ' + numberFormat.format(latest.maintenance.coverHours) + ' ч/сут; снижение ' + formatInput('cover-reduction') + '%' : 'нет'),
				'Энергия за сутки: ' + fmt(latest.result.dailyEnergyKWh, 'кВт·ч/сут'));
		}
		if (get('heat-source').value === 'exchanger') {
			lines.push('Первичный теплоноситель: ' + get('primary-fluid').selectedOptions[0].text + '; подача/обратка: ' + formatInput('primary-supply') + '/' + formatInput('primary-return') + ' °C',
				'Расход теплоносителя: ' + get('equipment-flow').textContent);
		} else if (get('heat-source').value === 'heat-pump') lines.push('COP: ' + formatInput('heat-pump-cop') + '; оценка электрической мощности: ' + get('equipment-electric-power').textContent);
		return lines;
	}

	root.querySelectorAll('[data-mode]').forEach(function (button) { button.addEventListener('click', function () { setMode(button.dataset.mode); }); });
	root.querySelectorAll('input,select').forEach(function (input) {
		input.addEventListener('input', function () { if (input.id === 'cover-present') updateCoverControls(); if (input.id === 'heat-source') updateSourceControls(); calculate(); });
		input.addEventListener('change', function () { if (input.id === 'cover-present') updateCoverControls(); if (input.id === 'heat-source') updateSourceControls(); calculate(); });
	});
	get('reset-heating').addEventListener('click', function () {
		ids.forEach(function (id) { get(id).value = ''; });
		get('extra-loss').value = '0';
		get('pool-location').value = '';
		get('cover-present').value = 'no';
		get('heat-source').value = 'exchanger';
		get('primary-fluid').value = 'water';
		get('heating-condition-power').value = '';
		get('heating-condition-time').value = '';
		updateCoverControls(); updateSourceControls(); calculate(); get('water-volume').focus();
	});
	var form = document.getElementById('pool-heating-consultation-form');
	if (form) form.addEventListener('submit', function () {
		var message = form.elements.message;
		var userText = message.value.split(marker)[0].trim();
		if (!latest) { message.value = userText; return; }
		message.value = (userText ? userText + '\n\n' : '') + formLines().join('\n');
	});

	updateCoverControls();
	updateSourceControls();
	applyVolumeFromURL();
	setMode('power');
}());
