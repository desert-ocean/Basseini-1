(function () {
	'use strict';
	var root = document.querySelector('[data-heat-engineering]');
	var core = window.ALPOOLPoolHeatingEngineering;
	if (!root || !core) return;
	var nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
	var lastOutput = null;
	var get = function (id) { return document.getElementById(id); };
	var text = function (id, value) { var el = get(id); if (el) el.textContent = value; };
	var fmt = function (value, unit) { return value == null || !Number.isFinite(value) ? 'не определено' : nf.format(value) + (unit ? ' ' + unit : ''); };

	function number(id, options) {
		var el = get(id);
		if (!el) return options && options.fallback != null ? options.fallback : null;
		if (el.disabled && options && options.fallback != null) return options.fallback;
		var raw = el.value.trim();
		if (!raw && options && options.optional) return null;
		if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) throw new RangeError('Поле «' + (el.labels[0] ? el.labels[0].textContent.trim() : id) + '» заполнено некорректно. Введите число, используя точку или запятую.');
		var value = Number(raw.replace(',', '.'));
		if (!Number.isFinite(value)) throw new RangeError('Введите конечное число.');
		return value;
	}
	function select(id) { return get(id).value; }
	function checked(id) { return get(id).checked; }
	function setVisible(id, visible) { var el = get(id); if (el) el.hidden = !visible; }
	function svgEl(parent, name, attrs, value) {
		var el = document.createElementNS('http://www.w3.org/2000/svg', name);
		Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
		if (value != null) el.textContent = value;
		parent.appendChild(el);
		return el;
	}
	function clearSvg(id, title, viewBox) {
		var svg = get(id);
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		svg.setAttribute('viewBox', viewBox);
		svg.setAttribute('role', 'img');
		svgEl(svg, 'title', { id: id + '-title' }, title);
		svg.setAttribute('aria-labelledby', id + '-title');
		return svg;
	}
	function drawBarChart(id, items) {
		var container = get(id).parentNode;
		container.classList.add('hx-chart--bars');
		var list = container.querySelector('.hx-chart-mobile-data') || document.createElement('div');
		list.className = 'hx-chart-mobile-data hx-bar-data';
		list.setAttribute('aria-label', 'Составляющие теплопотерь и теплопоступлений');
		list.replaceChildren();
		var max = Math.max(1, ...items.map(function (item) { return Number.isFinite(item.value) ? Math.abs(item.value) : 0; }));
		items.forEach(function (item) {
			var row = document.createElement('div'); row.className = 'hx-bar-row';
			var head = document.createElement('div'); head.className = 'hx-bar-head';
			var label = document.createElement('span'); label.textContent = item.label;
			var displayValue = Number.isFinite(item.value) && Math.abs(item.value) < 1e-10 ? 0 : item.value;
			var value = document.createElement('strong'); value.textContent = fmt(displayValue, 'кВт');
			head.append(label, value);
			var track = document.createElement('div'); track.className = 'hx-bar-track'; track.setAttribute('aria-hidden', 'true');
			if (Number.isFinite(item.value)) {
				var bar = document.createElement('span'); bar.className = 'hx-bar-fill' + (displayValue < 0 ? ' is-gain' : '');
				bar.style.width = (Math.abs(displayValue) / max * 50) + '%'; bar.style.backgroundColor = item.color; track.appendChild(bar);
			}
			row.append(head, track); list.appendChild(row);
		});
		if (!list.parentNode) container.insertBefore(list, get(id).nextSibling);
	}
	function drawLine(id, title, points, xMin, xMax, yMin, yMax, xLabel, yLabel) {
		var svg = clearSvg(id, title, '0 0 620 270');
		var container = svg.parentNode;
		var list = container.querySelector('.hx-chart-mobile-data') || document.createElement('div');
		list.className = 'hx-chart-mobile-data hx-line-data';
		list.setAttribute('aria-label', title + ': табличное представление точек графика');
		list.replaceChildren();
		var magnitude = Math.max(1e-9, Math.abs(yMin), Math.abs(yMax));
		points.forEach(function (point) {
			var row = document.createElement('div'); row.className = 'hx-line-row';
			var label = document.createElement('span'); label.textContent = nf.format(point.x) + (xLabel.indexOf('°C') >= 0 ? ' °C' : ' ч');
			var track = document.createElement('div'); track.className = 'hx-line-track'; track.setAttribute('aria-hidden', 'true');
			var bar = document.createElement('span'); bar.className = 'hx-line-point' + (point.y < 0 ? ' is-gain' : '');
			bar.style.width = (Math.abs(point.y) / magnitude * 100) + '%'; track.appendChild(bar);
			var value = document.createElement('strong'); value.textContent = fmt(point.y, yLabel === 'кВт' ? 'кВт' : '°C');
			row.append(label, track, value); list.appendChild(row);
		});
		if (!list.parentNode) container.insertBefore(list, svg.nextSibling);
		var left = 55, right = 600, top = 20, bottom = 220;
		for (var i = 0; i <= 4; i += 1) {
			var val = yMin + (yMax - yMin) * i / 4;
			var y = bottom - (bottom - top) * i / 4;
			svgEl(svg, 'line', { x1: left, y1: y, x2: right, y2: y, stroke: '#e2e9ec', 'stroke-width': 1 });
			svgEl(svg, 'text', { x: 3, y: y + 4 }, nf.format(val));
		}
		var path = points.map(function (p, i) {
			var x = left + (p.x - xMin) / (xMax - xMin) * (right - left);
			var y = bottom - (p.y - yMin) / (yMax - yMin || 1) * (bottom - top);
			return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
		}).join(' ');
		svgEl(svg, 'path', { d: path, fill: 'none', stroke: '#087a9b', 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
		points.forEach(function (p) {
			var x = left + (p.x - xMin) / (xMax - xMin) * (right - left);
			var y = bottom - (p.y - yMin) / (yMax - yMin || 1) * (bottom - top);
			svgEl(svg, 'circle', { cx: x, cy: y, r: 3.5, fill: '#bd742d' });
		});
		svgEl(svg, 'line', { x1: left, y1: bottom, x2: right, y2: bottom, stroke: '#546a75', 'stroke-width': 1.5 });
		svgEl(svg, 'text', { x: right - 62, y: 255 }, xLabel);
		svgEl(svg, 'text', { x: left, y: 13 }, yLabel);
	}
	function getInput(tempC) {
		var shape = select('hx-shape');
		var scenario = select('hx-protection');
		var wind = scenario === 'manual' ? number('hx-wind') : core.SAUNUS_WIND[scenario];
		var alpha = scenario === 'manual' ? number('hx-alpha') : core.SAUNUS_ALPHA[scenario];
		var actual = number('hx-volume', { optional: true });
		var coverOn = checked('hx-cover-on');
		return {
			shape: shape,
			lengthM: shape === 'rectangle' ? number('hx-length') : undefined,
			widthM: shape === 'rectangle' ? number('hx-width') : undefined,
			areaM2: shape === 'freeform' ? number('hx-area') : undefined,
			averageDepthM: number('hx-depth'), actualVolumeM3: actual,
			extraWaterVolumeM3: number('hx-extra-volume'),
			waterTempC: tempC == null ? number('hx-target') : tempC,
			airTempC: number('hx-air'), relativeHumidityPercent: number('hx-rh'),
			pressureKpa: number('hx-pressure'), windMs: wind, alphaWm2K: alpha,
			locationScenario: scenario, effectiveRadiantTempC: number('hx-radiant-temp'), emissivity: number('hx-emissivity'), radiationModel: 'stefan',
			solarGainWm2: number('hx-solar'), coverFraction: coverOn ? number('hx-cover-percent') / 100 : 0,
			coverEvaporationFraction: coverOn ? number('hx-cover-evap-fraction', { optional: true }) : null,
			coverU_Wm2K: coverOn ? number('hx-cover-u', { optional: true }) : null,
			coverHoursPerDay: coverOn ? number('hx-cover-hours') : 0, coverStartHour: number('hx-cover-start'),
			structureLossKw: number('hx-structure-loss'), makeupM3Day: number('hx-makeup-volume'),
			makeupTempC: number('hx-makeup-temp'), batherCarryoutM3Day: number('hx-carryout-volume'),
			occupants: number('hx-occupants'), occupantGainW: number('hx-person-gain')
		};
	}
	function warnings(list) {
		var box = get('hx-warnings');
		box.replaceChildren();
		if (!list.length) { box.hidden = true; return; }
		box.hidden = false;
		list.forEach(function (message) { var p = document.createElement('p'); p.className = 'hx-warning'; p.textContent = message; box.appendChild(p); });
	}
	function setResults(id, value) { text(id, value); }
	function update() {
		try {
			var input = getInput();
			var geometry = core.poolGeometry(input);
			input.geometry = geometry;
			var initial = number('hx-initial');
			var target = number('hx-target');
			var idealEnergy = core.heatingEnergy(geometry.volumeM3, initial, target);
			var current = core.surfaceComponents(Object.assign({}, input, { coverFraction: 0 }));
			var daily = core.calculateDailyBalance(input);
			setResults('hx-area-result', fmt(geometry.areaM2, 'м²'));
			setResults('hx-volume-result', fmt(geometry.volumeM3, 'м³'));
			setResults('hx-energy-ideal', fmt(idealEnergy, 'кВт·ч'));
			setResults('hx-current-loss', current.lossKw == null ? 'не определены для покрытой части' : fmt(current.maintenancePowerKw, 'кВт'));
			setResults('hx-daily-energy', daily.dailyHeatingEnergyKWh == null ? 'не определена: нет характеристик покрытия' : fmt(daily.dailyHeatingEnergyKWh, 'кВт·ч/сут'));
			setResults('hx-open-day-energy', fmt(daily.openDailyHeatingEnergyKWh, 'кВт·ч/сут'));
			setResults('hx-covered-day-energy', fmt(daily.coveredDailyHeatingEnergyKWh, 'кВт·ч/сут'));
			setResults('hx-scheduled-savings', daily.scheduledSavingsKWh == null ? 'не определена' : fmt(daily.scheduledSavingsKWh, 'кВт·ч/сут') + (daily.scheduledSavingsPercent == null ? '' : ' (' + fmt(daily.scheduledSavingsPercent, '%') + ')') + '; сравнение при неизменных погодных условиях');
			setResults('hx-cover-savings', daily.fullDaySavingsKWh == null ? 'не определена' : fmt(daily.fullDaySavingsKWh, 'кВт·ч/сут') + (daily.fullDaySavingsPercent == null ? '' : ' (' + fmt(daily.fullDaySavingsPercent, '%') + ')'));
			setResults('hx-peak-power', daily.peakRequiredPowerKw == null ? 'не определена: нет характеристик покрытия' : fmt(daily.peakRequiredPowerKw, 'кВт'));
			var mode = root.getAttribute('data-mode') || 'power';
			var heatResult;
			var heatWarnings = current.warnings.slice();
			if (daily.unknownCoveredLoss) heatWarnings = heatWarnings.concat(daily.covered.warnings);
			if (mode === 'power') {
				heatResult = core.requiredHeatingPower(Object.assign({}, input, { initialTempC: initial, targetTempC: target }), number('hx-heat-time'));
				setResults('hx-heat-result', heatResult.requiredPowerKw == null ? 'не рассчитано' : fmt(heatResult.requiredPowerKw, 'кВт'));
				setResults('hx-heat-caption', 'Полезная мощность в воду для выбранного времени, с интегрированием переменных потерь');
				setResults('hx-heat-input-energy', heatResult.requiredPowerKw == null ? 'не рассчитана' : fmt(heatResult.requiredPowerKw * number('hx-heat-time'), 'кВт·ч за период'));
			} else {
				var availablePower = number('hx-available-power');
				var simulationLimit = number('hx-sim-hours');
				heatResult = core.simulateHeating(Object.assign({}, input, { initialTempC: initial, targetTempC: target }), availablePower, simulationLimit);
				setResults('hx-heat-result', heatResult.reached ? fmt(heatResult.hours, 'ч') : 'цель не достигнута в заданный период');
				setResults('hx-heat-caption', 'Расчётное время при введённой полезной мощности; это не паспортный номинал теплообменника');
				setResults('hx-heat-input-energy', fmt(availablePower * (heatResult.reached ? heatResult.hours : simulationLimit), 'кВт·ч за период'));
				if (!heatResult.reached && heatResult.reason !== 'cover-data-missing') heatWarnings.push('Доступной мощности недостаточно для достижения цели за выбранный расчётный период; сравните её с нагрузкой поддержания температуры.');
			}
			if (heatResult.reason === 'cover-data-missing') heatWarnings.push('Нагрев с покрытием не рассчитан: введите подтверждённые параметры покрытия или выберите расчёт без него.');
			if (heatResult.simulation && heatResult.simulation.condensationPossible && !heatWarnings.some(function (message) { return message === core.CONDENSATION_WARNING; })) heatWarnings.push(core.CONDENSATION_WARNING);
			setResults('hx-evap', fmt(current.componentsKw.evaporation, 'кВт'));
			setResults('hx-conv', fmt(current.componentsKw.convection, 'кВт'));
			setResults('hx-rad', fmt(current.componentsKw.radiation, 'кВт'));
			setResults('hx-cover-transfer', daily.covered.componentsKw.coverTransfer == null ? (input.coverFraction > 0 ? 'неизвестно' : '0 кВт') : fmt(daily.covered.componentsKw.coverTransfer, 'кВт'));
			setResults('hx-solar', fmt(current.componentsKw.solarGain, 'кВт теплопоступления'));
			setResults('hx-humidity', fmt(current.humidity.xAirKgKg * 1000, 'г/кг'));
			setResults('hx-sat-humidity', fmt(current.humidity.xSatKgKg * 1000, 'г/кг'));
			setResults('hx-dewpoint', fmt(current.humidity.dewPointC, '°C'));
			setResults('hx-moisture-mode', current.condensationPossible ? 'Возможна конденсация; скрытое теплопоступление не учитывается' : 'Расчёт испарения');
			var exchangerIds = ['hx-primary-supply', 'hx-primary-return', 'hx-pool-inlet', 'hx-pool-outlet'];
			var exchangerValues = exchangerIds.map(function (id) { return number(id, { optional: true }); });
			var exchanger = null;
			if (exchangerValues.every(function (value) { return value != null; })) {
				exchanger = core.checkExchangerTemperatures({
					primarySupplyC: exchangerValues[0], primaryReturnC: exchangerValues[1], poolInletC: exchangerValues[2], poolOutletC: exchangerValues[3],
					primaryFlowM3h: number('hx-primary-flow', { optional: true }), poolFlowM3h: number('hx-pool-flow', { optional: true }),
					requestedPowerKw: mode === 'power' ? heatResult.requiredPowerKw : number('hx-available-power')
				});
			} else if (exchangerValues.some(function (value) { return value != null; })) {
				heatWarnings.push('Для проверки температурного режима заполните все четыре температуры теплообменника.');
			}
			setResults('hx-approaches', exchanger ? (exchanger.deltaT1K == null ? 'недопустимый режим' : fmt(exchanger.deltaT1K, 'K / ') + fmt(exchanger.deltaT2K, 'K')) : 'введите четыре температуры');
			setResults('hx-lmtd', exchanger && exchanger.valid ? fmt(exchanger.lmtdK, 'K') : exchanger ? 'не рассчитан' : '—');
			var primaryFlow = number('hx-primary-flow', { optional: true });
			var poolFlow = number('hx-pool-flow', { optional: true });
			setResults('hx-flow-powers', exchanger && exchanger.valid && primaryFlow != null && poolFlow != null ? fmt(exchanger.primaryPowerKw, 'кВт первичный') + ' / ' + fmt(exchanger.poolPowerKw, 'кВт бассейновый') : primaryFlow != null || poolFlow != null ? 'Укажите расходы обоих контуров' : 'Расходы теплоносителей не заданы. Для проверки мощности контуров укажите расходы и температурные перепады.');
			if (exchanger) {
				setResults('hx-temperature-check', exchanger.valid ? (exchanger.energyConsistent === false ? 'Напоры допустимы, но балансы контуров расходятся на ' + fmt(exchanger.mismatchPercent, '%') : exchanger.requestedPowerConsistent === false ? 'Передача по заданным расходам ниже требуемой нагрузки' : 'Оба концевых напора положительны; паспортная мощность не подтверждена') : exchanger.reason);
				if (!exchanger.valid) heatWarnings.push(exchanger.reason);
				else heatWarnings.push(exchanger.warning);
				if (exchanger.valid && exchanger.energyConsistent === false) heatWarnings.push('Мощности по расходам и температурным перепадам контуров не согласованы в пределах 5%; проверьте измерения и режимы потоков.');
				if (exchanger.valid && exchanger.requestedPowerConsistent === false) heatWarnings.push('Расчётная тепловая мощность по заданным расходам ниже требуемой для выбранного режима нагрева.');
			} else setResults('hx-temperature-check', exchangerValues.some(function (value) { return value != null; }) ? 'нужны все четыре температуры' : 'не задано');
			var makeupDailyKWh = core.makeupEnergyKWh(number('hx-makeup-volume'), target, number('hx-makeup-temp'));
			setResults('hx-makeup-energy', fmt(makeupDailyKWh, 'кВт·ч/сут'));
			setResults('hx-model-note', input.locationScenario === 'manual' ? 'Ветер задан вручную; α введён отдельно и не пересчитывается по скорости.' : 'Скорость ветра и α взяты из одного сценария Saunus.');
			var normative = get('hx-purpose');
			var range = normative.options[normative.selectedIndex].dataset.range;
			var minimum = normative.options[normative.selectedIndex].dataset.min;
			var maximum = normative.options[normative.selectedIndex].dataset.max;
			if (range) {
				var limits = range.split(',').map(Number);
				if (target < limits[0] || target > limits[1]) heatWarnings.push('Целевая температура выходит за выбранный нормативный/справочный диапазон; калькулятор продолжает расчёт.');
			}
			if (minimum && target < Number(minimum)) heatWarnings.push('Целевая температура ниже указанного нормативного минимального значения; расчёт продолжается для справки.');
			if (maximum && target > Number(maximum)) heatWarnings.push('Целевая температура выше указанного предельного значения для охлаждающей/контрастной ванны; расчёт продолжается для справки.');
			warnings(heatWarnings);
			drawBarChart('hx-chart-losses', [
				{ label: 'Испарение', value: current.componentsKw.evaporation, color: '#087a9b' },
				{ label: 'Конвекция', value: current.componentsKw.convection, color: '#358eae' },
				{ label: 'Излучение', value: current.componentsKw.radiation, color: '#6ab2c9' },
				{ label: 'Покрытие', value: current.componentsKw.coverTransfer, color: '#bd742d' },
				{ label: 'Чаша и подпитка', value: current.componentsKw.structure + current.componentsKw.makeup + current.componentsKw.batherCarryout, color: '#8a78a8' },
				{ label: 'Солнце и люди', value: -current.componentsKw.solarGain - current.componentsKw.occupantsGain, color: '#4d9b75' }
			]);
			var airPoints = [];
			for (var air = -20; air <= 35; air += 5) {
				var test = Object.assign({}, input, { airTempC: air, effectiveRadiantTempC: air, coverFraction: 0 });
				var load = core.surfaceComponents(test).lossKw;
				airPoints.push({ x: air, y: load == null ? 0 : load });
			}
			var yMin = Math.min(0, ...airPoints.map(function (p) { return p.y; }));
			var yMax = Math.max(1, ...airPoints.map(function (p) { return p.y; }));
			drawLine('hx-chart-air', 'Расчётная нагрузка при разных температурах воздуха', airPoints, -20, 35, yMin, yMax, 'Воздух, °C', 'кВт');
			drawLine('hx-chart-heat', 'Расчётная температура воды при выбранной мощности', (heatResult.simulation && heatResult.simulation.series.length > 1 ? heatResult.simulation.series : [{ hours: 0, temperatureC: initial }, { hours: 1, temperatureC: initial }]).map(function (p) { return { x: p.hours, y: p.temperatureC }; }), 0, Math.max(1, (heatResult.simulation && heatResult.simulation.series.slice(-1)[0].hours) || 1), Math.min(initial, target), Math.max(initial + 0.1, target), 'Время, ч', 'Вода, °C');
			text('hx-error', '');
			lastOutput = { geometry: geometry, input: input, initial: initial, target: target, energy: idealEnergy, current: current, daily: daily, heat: heatResult };
			renderCopyText(lastOutput);
		} catch (error) {
			text('hx-error', error.message || 'Проверьте введённые параметры.');
			warnings([]);
			['hx-area-result','hx-volume-result','hx-energy-ideal','hx-current-loss','hx-daily-energy','hx-open-day-energy','hx-covered-day-energy','hx-scheduled-savings','hx-cover-savings','hx-peak-power','hx-heat-result','hx-heat-input-energy','hx-evap','hx-conv','hx-rad','hx-cover-transfer','hx-solar','hx-humidity','hx-sat-humidity','hx-dewpoint','hx-moisture-mode','hx-makeup-energy','hx-approaches','hx-lmtd','hx-flow-powers','hx-temperature-check'].forEach(function (id) { text(id, '—'); });
			lastOutput = null;
		}
	}
	function renderCopyText(data) {
		var c = data.current;
		var lines = [
			'Предварительный расчёт подогрева бассейна ALPOOL',
			'Площадь зеркала: ' + fmt(data.geometry.areaM2, 'м²'),
			'Объём воды: ' + fmt(data.geometry.volumeM3, 'м³'),
			'Температура воды: ' + fmt(data.initial, '°C') + ' → ' + fmt(data.target, '°C'),
			'Энергия идеального нагрева: ' + fmt(data.energy, 'кВт·ч'),
			'Расчётные потери/теплопоступления при выбранных условиях: ' + fmt(c.lossKw, 'кВт'),
			'Испарение / конвекция / излучение: ' + fmt(c.componentsKw.evaporation, 'кВт') + ' / ' + fmt(c.componentsKw.convection, 'кВт') + ' / ' + fmt(c.componentsKw.radiation, 'кВт'),
			'Энергия суточного баланса: ' + fmt(data.daily.dailyHeatingEnergyKWh, 'кВт·ч/сут'),
			'Точка росы: ' + fmt(c.humidity.dewPointC, '°C') + (c.condensationPossible ? '; возможная конденсация не зачтена как теплопоступление' : ''),
			'Экономия при выбранном расписании покрытия: ' + fmt(data.daily.scheduledSavingsKWh, 'кВт·ч/сут') + '; сравнение при неизменных погодных условиях.',
			'Экономия при постоянном покрытии 24 ч: ' + fmt(data.daily.fullDaySavingsKWh, 'кВт·ч/сут'),
			'Метод: испарение Saunus по psychrometric влагосодержанию; конвекция с введённым α; излучение по закону Стефана—Больцмана. Покрытие требует подтверждённых U и остаточной доли испарения.',
			'Предварительный расчёт, не заменяет проектный тепловой баланс и характеристику изготовителя теплообменника.'
		];
		get('hx-copy-text').value = lines.join('\n');
	}
	function updateGeometry() {
		var rectangle = select('hx-shape') === 'rectangle';
		setVisible('hx-rect-fields', rectangle);
		setVisible('hx-freeform-fields', !rectangle);
	}
	function updateCover() {
		var visible = checked('hx-cover-on');
		['hx-cover-fields','hx-cover-percent-field','hx-cover-evap-field','hx-cover-u-field','hx-cover-hours-field','hx-cover-start-field'].forEach(function (id) { setVisible(id, visible); });
	}
	function updateEnvironment() {
		var indoor = select('hx-environment') === 'indoor';
		setVisible('hx-wind-field', !indoor);
		setVisible('hx-alpha-field', true);
		get('hx-protection').disabled = indoor;
		if (indoor) {
			get('hx-protection').value = 'manual';
			get('hx-wind').value = '0.2';
			get('hx-alpha').value = '4.1';
			get('hx-wind').disabled = true;
		} else {
			get('hx-wind').disabled = false;
			if (select('hx-protection') !== 'manual') {
				get('hx-wind').value = String(core.SAUNUS_WIND[select('hx-protection')]);
				get('hx-alpha').value = String(core.SAUNUS_ALPHA[select('hx-protection')]);
			}
		}
	}
	function updateProtection() {
		var scenario = select('hx-protection');
		setVisible('hx-manual-wind', scenario === 'manual' && select('hx-environment') === 'outdoor');
		setVisible('hx-manual-alpha', scenario === 'manual');
		setVisible('hx-wind-field', scenario !== 'manual' && select('hx-environment') === 'outdoor');
		if (scenario !== 'manual') get('hx-wind-display').value = String(core.SAUNUS_WIND[scenario]);
		if (scenario !== 'manual') {
			get('hx-wind').value = String(core.SAUNUS_WIND[scenario]);
			get('hx-alpha').value = String(core.SAUNUS_ALPHA[scenario]);
		}
	}
	function updateMode(mode) {
		root.setAttribute('data-mode', mode);
		root.querySelectorAll('[data-mode-button]').forEach(function (button) { button.setAttribute('aria-selected', String(button.dataset.modeButton === mode)); });
		setVisible('hx-power-fields', mode === 'power');
		setVisible('hx-time-fields', mode === 'time');
		update();
	}
	root.querySelectorAll('input,select').forEach(function (el) { el.addEventListener('input', update); el.addEventListener('change', update); });
	get('hx-shape').addEventListener('change', function () { updateGeometry(); update(); });
	get('hx-cover-on').addEventListener('change', function () { updateCover(); update(); });
	get('hx-environment').addEventListener('change', function () { updateEnvironment(); updateProtection(); update(); });
	get('hx-protection').addEventListener('change', function () { updateProtection(); update(); });
	root.querySelectorAll('[data-mode-button]').forEach(function (button) { button.addEventListener('click', function () { updateMode(button.dataset.modeButton); }); });
	get('hx-purpose').addEventListener('change', function () { var option = this.options[this.selectedIndex]; if (option.dataset.suggested) get('hx-target').value = option.dataset.suggested; update(); });
	get('hx-copy').addEventListener('click', function () {
		var area = get('hx-copy-text'); area.hidden = false; area.select();
		if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(area.value).then(function () { text('hx-copy-status', 'Результаты скопированы.'); }).catch(function () { document.execCommand('copy'); text('hx-copy-status', 'Результаты выделены для копирования.'); });
		else { document.execCommand('copy'); text('hx-copy-status', 'Результаты скопированы или выделены для копирования.'); }
		area.hidden = true;
	});
	updateGeometry(); updateCover(); updateEnvironment(); updateProtection(); update();
}());
