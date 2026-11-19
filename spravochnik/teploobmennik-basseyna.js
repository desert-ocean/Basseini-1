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
	var fieldErrors = {
		lengthM: 'hx-length', widthM: 'hx-width', areaM2: 'hx-area', averageDepthM: 'hx-depth', actualVolumeM3: 'hx-volume', extraWaterVolumeM3: 'hx-extra-volume',
		waterTempC: 'hx-target', airTempC: 'hx-air', relativeHumidityPercent: 'hx-rh', pressureKpa: 'hx-pressure', windMs: 'hx-wind', alphaWm2K: 'hx-alpha', effectiveRadiantTempC: 'hx-radiant-temp', emissivity: 'hx-emissivity', solarGainWm2: 'hx-solar',
		coverFraction: 'hx-cover-percent', coverEvaporationFraction: 'hx-cover-evap-fraction', coverU_Wm2K: 'hx-cover-u', coverHoursPerDay: 'hx-cover-hours', structureLossKw: 'hx-structure-loss', makeupM3Day: 'hx-makeup-volume', makeupTempC: 'hx-makeup-temp', batherCarryoutM3Day: 'hx-carryout-volume', occupants: 'hx-occupants', occupantGainW: 'hx-person-gain',
		initialTempC: 'hx-initial', targetTempC: 'hx-target', desiredHours: 'hx-heat-time', availablePowerKw: 'hx-available-power', durationLimitHours: 'hx-sim-hours',
		primarySupplyC: 'hx-primary-supply', primaryReturnC: 'hx-primary-return', poolInletC: 'hx-pool-inlet', poolOutletC: 'hx-pool-outlet', primaryFlowM3h: 'hx-primary-flow', poolFlowM3h: 'hx-pool-flow'
	};
	function clearFieldErrors() {
		root.querySelectorAll('.hx-field-error').forEach(function (el) { el.remove(); });
		root.querySelectorAll('[aria-invalid="true"]').forEach(function (el) { el.removeAttribute('aria-invalid'); var described = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) { return id && id !== el.id + '-error'; }); if (described.length) el.setAttribute('aria-describedby', described.join(' ')); else el.removeAttribute('aria-describedby'); });
	}
	function setFieldError(id, message) {
		var input = get(id);
		if (!input) return;
		input.setAttribute('aria-invalid', 'true');
		var described = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
		if (described.indexOf(id + '-error') < 0) described.push(id + '-error');
		input.setAttribute('aria-describedby', described.join(' '));
		var field = input.closest('.hx-field') || input.parentElement;
		var error = document.createElement('span'); error.id = id + '-error'; error.className = 'hx-field-error'; error.setAttribute('role', 'alert'); error.textContent = message; field.appendChild(error);
	}
	function inputFailure(el, message) {
		var error = new Error(message); error.fieldId = el.id; error.userMessage = message; throw error;
	}
	function messageForField(id) {
		if (id === 'hx-available-power') return 'Мощность должна быть больше нуля и находиться в допустимом диапазоне.';
		if (id === 'hx-heat-time') return 'Время нагрева должно быть больше нуля.';
		if (id === 'hx-initial' || id === 'hx-target') return 'Проверьте начальную и требуемую температуру воды (от 0 до 50 °C).';
		var input = get(id), label = input && input.labels && input.labels[0];
		return label ? 'Проверьте значение поля «' + label.textContent.trim() + '».' : 'Проверьте введённые параметры.';
	}
	function translatedError(error) {
		if (error && error.userMessage) return { id: error.fieldId || null, message: error.userMessage };
		var source = error && typeof error.message === 'string' ? error.message : '';
		if (/targetTempC must be greater than or equal to initialTempC/.test(source)) return { id: 'hx-target', message: 'Требуемая температура не может быть ниже начальной температуры воды.' };
		var keyMatch = source.match(/\b([A-Za-z][A-Za-z0-9_]*) must be /);
		if (keyMatch && fieldErrors[keyMatch[1]]) return { id: fieldErrors[keyMatch[1]], message: messageForField(fieldErrors[keyMatch[1]]) };
		return { id: null, message: 'Не удалось выполнить расчёт. Проверьте введённые значения и единицы измерения.' };
	}
	function signedFlow(value, unit) {
		if (value == null || !Number.isFinite(value)) return 'Недостаточно данных';
		if (Math.abs(value) < 0.005) return '0 ' + unit;
		return (value > 0 ? '+' : '−') + nf.format(Math.abs(value)) + ' ' + unit + (value > 0 ? ' — теплопотери' : ' — теплопоступление');
	}

	function number(id, options) {
		var el = get(id);
		if (!el) return options && options.fallback != null ? options.fallback : null;
		if (el.disabled && options && options.fallback != null) return options.fallback;
		var raw = el.value.trim();
		if (!raw && options && options.optional) return null;
		if (!raw) inputFailure(el, id === 'hx-available-power' ? 'Укажите доступную мощность системы подогрева.' : 'Заполните это поле числом.');
		if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) inputFailure(el, 'Введите число, используя десятичную точку или запятую.');
		var value = Number(raw.replace(',', '.'));
		if (!Number.isFinite(value)) inputFailure(el, 'Проверьте числовое значение.');
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
		var titleId = id + '-svg-title';
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		svg.setAttribute('viewBox', viewBox);
		svg.setAttribute('role', 'img');
		svgEl(svg, 'title', { id: titleId }, title);
		svg.setAttribute('aria-labelledby', titleId);
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
	function drawLine(id, title, points, xMin, xMax, yMin, yMax, xLabel, yLabel, markers) {
		var svg = clearSvg(id, title, '0 0 620 290');
		var container = svg.parentNode;
		var list = container.querySelector('.hx-chart-mobile-data') || document.createElement('div');
		list.className = 'hx-chart-mobile-data hx-line-data';
		list.setAttribute('aria-label', title + ': табличное представление точек графика');
		list.replaceChildren();
		var axisCaption = document.createElement('p'); axisCaption.className = 'hx-mobile-chart-axis'; axisCaption.textContent = xLabel + ' · ' + yLabel; list.appendChild(axisCaption);
		var magnitude = Math.max(1e-9, Math.abs(yMin), Math.abs(yMax));
		var mobilePoints = points;
		if (points.length > 13) {
			mobilePoints = [];
			for (var sample = 0; sample <= 12; sample += 1) mobilePoints.push(points[Math.round(sample * (points.length - 1) / 12)]);
		}
		if (markers && Number.isFinite(markers.currentX) && Number.isFinite(markers.currentY) && markers.currentX >= xMin && markers.currentX <= xMax) {
			var currentPointIndex = mobilePoints.findIndex(function (point) { return Math.abs(point.x - markers.currentX) < 1e-8; });
			if (currentPointIndex >= 0) {
				mobilePoints[currentPointIndex] = Object.assign({}, mobilePoints[currentPointIndex], { isCurrent: true, y: markers.currentY });
			} else {
				mobilePoints = mobilePoints.concat([{ x: markers.currentX, y: markers.currentY, isCurrent: true }]).sort(function (a, b) { return a.x - b.x; });
			}
		}
		mobilePoints.forEach(function (point) {
			var row = document.createElement('div'); row.className = 'hx-line-row';
			if (point.isCurrent) row.classList.add('hx-line-row--current');
			var label = document.createElement('span');
			if (point.isCurrent && xLabel.indexOf('°C') >= 0) {
				var currentTempLabel = (point.x > 0 ? '+' : point.x < 0 ? '−' : '') + nf.format(Math.abs(point.x));
				label.textContent = 'Текущие условия: воздух ' + currentTempLabel + ' °C';
			} else label.textContent = nf.format(point.x) + (xLabel.indexOf('°C') >= 0 ? ' °C' : ' ч');
			var track = document.createElement('div'); track.className = 'hx-line-track'; track.setAttribute('aria-hidden', 'true');
			var bar = document.createElement('span'); bar.className = 'hx-line-point' + (point.y < 0 ? ' is-gain' : '');
			bar.style.width = (Math.abs(point.y) / magnitude * 100) + '%'; track.appendChild(bar);
			var value = document.createElement('strong'); value.textContent = point.isCurrent ? signedFlow(point.y, yLabel.indexOf('кВт') >= 0 ? 'кВт' : '°C') : fmt(point.y, yLabel.indexOf('кВт') >= 0 ? 'кВт' : '°C');
			row.append(label, track, value); list.appendChild(row);
		});
		if (!list.parentNode) container.insertBefore(list, svg.nextSibling);
		var left = 64, right = 600, top = 25, bottom = 220;
		for (var i = 0; i <= 4; i += 1) {
			var val = yMin + (yMax - yMin) * i / 4;
			var y = bottom - (bottom - top) * i / 4;
			svgEl(svg, 'line', { x1: left, y1: y, x2: right, y2: y, stroke: '#e2e9ec', 'stroke-width': 1 });
			svgEl(svg, 'text', { x: left - 7, y: y + 4, 'text-anchor': 'end' }, nf.format(val));
		}
		var xRange = Math.max(1e-9, xMax - xMin), targetStep = xRange / 4;
		var steps = [0.25, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 48, 60, 72, 120, 240, 480];
		var xStep = steps.find(function (step) { return step >= targetStep; }) || Math.ceil(targetStep);
		var ticks = [xMin, xMax];
		for (var tick = Math.ceil(xMin / xStep) * xStep; tick < xMax - 1e-8; tick += xStep) if (tick > xMin + 1e-8) ticks.push(tick);
		ticks.sort(function (a, b) { return a - b; });
		ticks.forEach(function (tickValue) {
			var x = left + (tickValue - xMin) / xRange * (right - left);
			svgEl(svg, 'line', { x1: x, y1: bottom, x2: x, y2: bottom + 5, stroke: '#546a75', 'stroke-width': 1 });
			svgEl(svg, 'text', { x: x, y: bottom + 20, 'text-anchor': 'middle' }, nf.format(tickValue));
		});
		if (markers && markers.targetY != null && markers.targetY >= yMin && markers.targetY <= yMax) {
			var targetY = bottom - (markers.targetY - yMin) / (yMax - yMin || 1) * (bottom - top);
			svgEl(svg, 'line', { x1: left, y1: targetY, x2: right, y2: targetY, stroke: '#bd742d', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
			svgEl(svg, 'text', { x: right - 3, y: Math.max(top + 12, targetY - 4), 'text-anchor': 'end', fill: '#8b4b16' }, 'цель ' + nf.format(markers.targetY));
		}
		[{ key: 'currentX', label: markers && markers.currentXLabel }, { key: 'reachedX', label: markers && markers.reachedXLabel }].forEach(function (marker) {
			if (!markers || markers[marker.key] == null || markers[marker.key] < xMin || markers[marker.key] > xMax) return;
			var markerX = left + (markers[marker.key] - xMin) / xRange * (right - left);
			svgEl(svg, 'line', { x1: markerX, y1: top, x2: markerX, y2: bottom, stroke: marker.key === 'currentX' ? '#bd742d' : '#176d8f', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
			var anchor = markerX > right - 105 ? 'end' : 'start';
			if (marker.label) svgEl(svg, 'text', { x: markerX + (anchor === 'end' ? -4 : 4), y: top + (marker.key === 'currentX' ? 12 : 26), 'text-anchor': anchor }, marker.label + ' ' + nf.format(markers[marker.key]));
		});
		var path = points.map(function (p, i) {
			var x = left + (p.x - xMin) / xRange * (right - left);
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
		svgEl(svg, 'text', { x: (left + right) / 2, y: 270, 'text-anchor': 'middle' }, xLabel);
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
			environment: select('hx-environment'),
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
	function update() {
		clearFieldErrors();
		updateCover();
		text('hx-error', '');
		try {
			var input = getInput();
			var geometry = core.poolGeometry(input);
			input.geometry = geometry;
			var initial = number('hx-initial');
			var target = number('hx-target');
			if (target < initial) inputFailure(get('hx-target'), 'Требуемая температура не может быть ниже начальной температуры воды.');
			input.waterTempC = target;
			var idealEnergy = core.heatingEnergy(geometry.volumeM3, initial, target);
			var current = core.surfaceComponents(input);
			var daily = core.calculateDailyBalance(input);
			var mode = root.getAttribute('data-mode') || 'power';
			var heatWarnings = current.warnings.slice();
			var heatResult, activeDuration, availablePower = null;
			if (daily.unknownCoveredLoss) heatWarnings = heatWarnings.concat(daily.covered.warnings);
			if (mode === 'power') {
				activeDuration = number('hx-heat-time');
				if (activeDuration <= 0) inputFailure(get('hx-heat-time'), 'Время нагрева должно быть больше нуля.');
				heatResult = core.requiredHeatingPower(Object.assign({}, input, { initialTempC: initial, targetTempC: target }), activeDuration);
				text('hx-duration-label', 'Заданное время нагрева');
				text('hx-duration-result', fmt(activeDuration, 'ч'));
				text('hx-primary-result-label', 'Мощность для нагрева');
				text('hx-primary-result-help', 'Полезная тепловая мощность, которую нужно передавать воде, чтобы достичь заданной температуры за выбранное время.');
				text('hx-heat-result', fmt(heatResult.requiredPowerKw, 'кВт'));
				if (activeDuration > 48) heatWarnings.push('Время нагрева превышает 48 часов. Для более быстрого выхода на заданную температуру увеличьте мощность или уменьшите теплопотери. 48 часов — ориентир, не нормативный предел.');
				if (heatResult.requiredPowerKw == null && heatResult.reason !== 'cover-data-missing') heatWarnings.push('Не удалось подобрать мощность в пределах расчётной модели. Проверьте исходные данные и параметры покрытия.');
			} else {
				availablePower = number('hx-available-power');
				if (availablePower <= 0) inputFailure(get('hx-available-power'), 'Мощность должна быть больше нуля.');
				if (availablePower > 100000) inputFailure(get('hx-available-power'), 'Проверьте введённую мощность подогрева.');
				var limit = number('hx-sim-hours');
				if (limit <= 0) inputFailure(get('hx-sim-hours'), 'Период проверки должен быть больше нуля.');
				heatResult = core.simulateHeating(Object.assign({}, input, { initialTempC: initial, targetTempC: target }), availablePower, limit);
				activeDuration = heatResult.reached ? heatResult.hours : limit;
				text('hx-duration-label', heatResult.reached ? 'Расчётное время достижения температуры' : 'Период моделирования без достижения цели');
				text('hx-duration-result', heatResult.reached ? fmt(heatResult.hours, 'ч') : 'Цель не достигнута за ' + fmt(limit, 'ч'));
				text('hx-primary-result-label', 'Доступная мощность системы');
				text('hx-primary-result-help', 'Мощность, фактически передаваемая воде; она не равна автоматически потреблению источника или паспортной мощности теплообменника.');
				text('hx-heat-result', fmt(availablePower, 'кВт'));
				if (!heatResult.reached && heatResult.reason !== 'cover-data-missing') heatWarnings.push('При указанной мощности бассейн не достигает заданной температуры. Возможно, мощность ниже нагрузки поддержания или период моделирования недостаточен.');
			}
			if (mode === 'time' && heatResult.reached && heatResult.hours > 48) heatWarnings.push('Время нагрева превышает 48 часов. Для более быстрого выхода на заданную температуру потребуется увеличить доступную тепловую мощность или уменьшить теплопотери.');
			if (heatResult.reason === 'cover-data-missing') heatWarnings.push('Для расчёта нагрева с покрытием укажите подтверждённые U и остаточную долю испарения либо отключите покрытие.');
			if (((heatResult.simulation && heatResult.simulation.condensationPossible) || heatResult.condensationPossible) && !heatWarnings.some(function (message) { return message === core.CONDENSATION_WARNING; })) heatWarnings.push(core.CONDENSATION_WARNING);
			var simulation = heatResult.simulation || heatResult;
			var targetReached = mode === 'power' ? !!simulation.reached : !!heatResult.reached;
			var targetReachedHours = mode === 'power' ? simulation.hours : heatResult.hours;
			var sourceEnergy = simulation.sourceEnergyKWh;
			var netEnergy = simulation.netLossEnergyKWh;
			text('hx-area-result', fmt(geometry.areaM2, 'м²'));
			text('hx-volume-result', fmt(geometry.volumeM3, 'м³'));
			text('hx-initial-result', fmt(initial, '°C'));
			text('hx-target-result', fmt(target, '°C'));
			text('hx-energy-ideal', fmt(idealEnergy, 'кВт·ч'));
			text('hx-source-energy-label', mode === 'time' && !heatResult.reached ? 'Тепло от системы за период проверки' : 'Всего тепла от системы');
			text('hx-net-energy-label', Number.isFinite(netEnergy) && netEnergy < 0 ? 'Теплопоступления за время нагрева' : 'Потери за время нагрева');
			if (mode === 'time' && !heatResult.reached && netEnergy >= 0) text('hx-net-energy-label', 'Потери за период проверки');
			if (mode === 'time' && !heatResult.reached && netEnergy < 0) text('hx-net-energy-label', 'Теплопоступления за период проверки');
			text('hx-net-energy', fmt(netEnergy, 'кВт·ч'));
			text('hx-source-energy', fmt(sourceEnergy, 'кВт·ч'));
			var maintenance = daily.peakRequiredPowerKw == null ? Math.max(0, daily.openPowerKw || 0) : daily.peakRequiredPowerKw;
			text('hx-current-loss', fmt(maintenance, 'кВт'));
			text('hx-evap', signedFlow(current.componentsKw.evaporation, 'кВт'));
			text('hx-conv', signedFlow(current.componentsKw.convection, 'кВт'));
			text('hx-rad', signedFlow(current.componentsKw.radiation, 'кВт'));
			var additional = current.componentsKw.structure + current.componentsKw.makeup + current.componentsKw.batherCarryout + (current.componentsKw.coverTransfer || 0);
			var gains = current.componentsKw.solarGain + current.componentsKw.occupantsGain;
			text('hx-additional-losses', signedFlow(additional, 'кВт'));
			text('hx-gains', signedFlow(-gains, 'кВт'));
			text('hx-total-load', signedFlow(current.lossKw, 'кВт'));
			var mirrorLoad = current.componentsKw.evaporation + current.componentsKw.convection + current.componentsKw.radiation + (current.componentsKw.coverTransfer || 0);
			text('hx-specific-load', signedFlow(mirrorLoad * 1000 / geometry.areaM2, 'Вт/м²') + ' по площади зеркала');
			text('hx-loss-state', input.coverFraction > 0 ? 'Учтены открытая и покрытая части по введённым характеристикам.' : 'Показаны потоки открытого зеркала при заданных условиях.');
			text('hx-humidity', fmt(current.humidity.xAirKgKg * 1000, 'г/кг'));
			text('hx-sat-humidity', fmt(current.humidity.xSatKgKg * 1000, 'г/кг'));
			text('hx-dewpoint', fmt(current.humidity.dewPointC, '°C'));
			text('hx-engineering-wind', fmt(input.windMs, 'м/с'));
			text('hx-engineering-alpha', fmt(input.alphaWm2K, 'Вт/(м²·К)'));
			text('hx-engineering-radiant', fmt(input.effectiveRadiantTempC, '°C'));
			text('hx-engineering-limits', current.warnings.length ? current.warnings.join(' ') : 'Для выбранных условий ограничивающих предупреждений нет.');
			text('hx-main-explanation', mode === 'time' && !targetReached ? 'Энергия нагрева воды показывает тепло для повышения её температуры до цели; фактически переданное тепло и тепловой обмен рассчитаны только за период проверки. Мощность системы — заданная полезная мощность в воду, а мощность поддержания компенсирует текущую нагрузку при целевой температуре. Цель не достигнута: проверьте мощность или исходные условия.' : netEnergy < 0 ? 'Энергия нагрева воды нужна для повышения температуры; теплопоступления из окружающей среды уменьшают нагрузку. Мощность для нагрева — полезная мощность, передаваемая воде за выбранное время. Мощность поддержания компенсирует текущую чистую нагрузку после достижения цели.' : 'Энергия нагрева воды нужна для повышения температуры; потери за время нагрева — интегральный тепловой обмен с окружающей средой за весь период. Всего тепла от системы складывается из изменения энергии воды и этого теплообмена. Мощность для нагрева нужна для достижения цели за выбранное время, а мощность поддержания компенсирует текущую нагрузку после нагрева.');
			get('hx-cover-results').hidden = !checked('hx-cover-on');
			get('hx-cover-results-table').hidden = !checked('hx-cover-on') || !daily.covered.valid;
			get('hx-cover-results-message').hidden = !checked('hx-cover-on') || daily.covered.valid;
			if (checked('hx-cover-on')) {
				text('hx-open-loss', fmt(daily.openPowerKw, 'кВт'));
				text('hx-covered-loss', fmt(daily.coveredPowerKw, 'кВт'));
				text('hx-covered-hours', fmt(daily.coveredHours, 'ч/сут'));
				text('hx-open-day-energy', fmt(daily.openDailyHeatingEnergyKWh, 'кВт·ч/сут'));
				text('hx-daily-energy', fmt(daily.dailyHeatingEnergyKWh, 'кВт·ч/сут'));
				text('hx-scheduled-savings', fmt(daily.scheduledSavingsKWh, 'кВт·ч/сут'));
				text('hx-scheduled-savings-percent', fmt(daily.scheduledSavingsPercent, '%'));
				text('hx-peak-power', fmt(daily.peakRequiredPowerKw, 'кВт'));
				text('hx-cover-full-day', fmt(daily.fullDaySavingsKWh, 'кВт·ч/сут при покрытии 24 ч'));
				text('hx-cover-results-message', 'Укажите подтверждённые U и остаточную долю испарения. Тип изделия сам по себе не задаёт расчётную эффективность.');
			}
			var exchangeTemps = ['hx-primary-supply','hx-primary-return','hx-pool-inlet','hx-pool-outlet'].map(function (id) { return number(id, { optional: true }); });
			var primaryFlow = number('hx-primary-flow', { optional: true });
			var poolFlow = number('hx-pool-flow', { optional: true });
			var exchangeAny = exchangeTemps.some(function (value) { return value != null; }) || primaryFlow != null || poolFlow != null;
			var exchangeWrap = get('hx-exchanger-results');
			var exchangeTable = get('hx-exchanger-results-table');
			var exchangeMessage = get('hx-exchanger-results-message');
			exchangeWrap.hidden = !exchangeAny;
			exchangeTable.hidden = true;
			exchangeMessage.hidden = false;
			text('hx-exchanger-results-message', 'Для проверки возможности передачи рассчитанной мощности укажите температуры и расходы теплоносителей.');
			if (exchangeTemps.every(function (value) { return value != null; })) {
				var exchanger = core.checkExchangerTemperatures({ primarySupplyC: exchangeTemps[0], primaryReturnC: exchangeTemps[1], poolInletC: exchangeTemps[2], poolOutletC: exchangeTemps[3], primaryFlowM3h: primaryFlow, poolFlowM3h: poolFlow, requestedPowerKw: mode === 'power' ? heatResult.requiredPowerKw : availablePower });
				exchangeTable.hidden = false;
				exchangeMessage.hidden = true;
				text('hx-exchanger-primary-temps', fmt(exchangeTemps[0], '°C') + ' / ' + fmt(exchangeTemps[1], '°C'));
				text('hx-exchanger-pool-temps', fmt(exchangeTemps[2], '°C') + ' / ' + fmt(exchangeTemps[3], '°C'));
				text('hx-exchanger-flows', (primaryFlow == null ? 'не задан' : fmt(primaryFlow, 'м³/ч')) + ' / ' + (poolFlow == null ? 'не задан' : fmt(poolFlow, 'м³/ч')));
				text('hx-approaches', exchanger.deltaT1K == null ? '—' : fmt(exchanger.deltaT1K, 'K / ') + fmt(exchanger.deltaT2K, 'K'));
				text('hx-lmtd', exchanger.valid ? fmt(exchanger.lmtdK, 'K') : 'не рассчитан');
				text('hx-flow-powers', exchanger.valid && primaryFlow != null && poolFlow != null ? fmt(exchanger.primaryPowerKw, 'кВт / ') + fmt(exchanger.poolPowerKw, 'кВт') : 'Для расчёта мощности укажите расходы обоих контуров.');
				text('hx-temperature-check', exchanger.valid ? exchanger.warning : exchanger.reason);
				if (exchanger.warning) heatWarnings.push(exchanger.warning);
				if (exchanger.valid && exchanger.energyConsistent === false) heatWarnings.push('Мощности по расходам и температурным перепадам контуров не согласованы в пределах 5%; проверьте исходные данные.');
			}
			if (simulation.finalTempC < 0) heatWarnings.push('Моделируемая температура опустилась ниже 0 °C. Модель не учитывает замерзание воды и вне этого диапазона неприменима.');
			warnings(heatWarnings);
			var chartComponents = [
				{ label: 'Испарение', value: current.componentsKw.evaporation, color: '#087a9b' },
				{ label: 'Конвекция', value: current.componentsKw.convection, color: '#358eae' },
				{ label: 'Излучение', value: current.componentsKw.radiation, color: '#6ab2c9' },
				{ label: 'Дополнительные потери', value: additional, color: '#8a78a8' },
				{ label: 'Теплопоступления', value: -gains, color: '#4d9b75' }
			];
			drawBarChart('hx-chart-losses', chartComponents);
			var airPoints = [];
			for (var air = -20; air <= 35; air += 5) {
				var test = Object.assign({}, input, { waterTempC: target, airTempC: air, effectiveRadiantTempC: air, coverFraction: 0, structureLossKw: 0, makeupM3Day: 0, batherCarryoutM3Day: 0, occupants: 0, occupantGainW: 0 });
				var airLoad = core.surfaceComponents(test).lossKw;
				airPoints.push({ x: air, y: airLoad == null ? 0 : airLoad });
			}
			var currentAirInput = Object.assign({}, input, { waterTempC: target, airTempC: input.airTempC, effectiveRadiantTempC: input.airTempC, coverFraction: 0, structureLossKw: 0, makeupM3Day: 0, batherCarryoutM3Day: 0, occupants: 0, occupantGainW: 0 });
			var currentAirLoad = core.surfaceComponents(currentAirInput).lossKw;
			var yMin = Math.min(0, ...airPoints.map(function (point) { return point.y; }));
			var yMax = Math.max(1, ...airPoints.map(function (point) { return point.y; }));
			text('hx-chart-air-title', input.environment === 'indoor' ? 'Нагрузка с зеркала воды при разной температуре воздуха' : 'Теплопотери с зеркала воды при разной температуре воздуха');
			text('hx-chart-air-note', 'Вода ' + fmt(target, '°C') + '; RH, скорость воздуха и α постоянны. Эффективная радиационная температура меняется вместе с воздухом. Ось Y — мощность зеркала бассейна, кВт.');
			drawLine('hx-chart-air', 'Поверхностная нагрузка в зависимости от воздуха', airPoints, -20, 35, yMin, yMax, 'Температура воздуха, °C', 'Мощность с зеркала, кВт', { currentX: input.airTempC, currentY: currentAirLoad, currentXLabel: 'сейчас' });
			var series = simulation.series && simulation.series.length > 1 ? simulation.series : [{ hours: 0, temperatureC: initial }, { hours: Math.max(1, activeDuration || 1), temperatureC: initial }];
			var endTime = Math.max(1, series[series.length - 1].hours);
			var seriesTemperatures = series.map(function (point) { return point.temperatureC; });
			var temperatureMin = Math.min.apply(Math, [initial, target].concat(seriesTemperatures)) - 1;
			var temperatureMax = Math.max.apply(Math, [initial, target].concat(seriesTemperatures)) + 1;
			text('hx-chart-heat-note', 'Вода: ' + fmt(initial, '°C') + ' → ' + fmt(target, '°C') + (targetReached ? '; цель достигнута через ' + fmt(targetReachedHours, 'ч') : '; цель не достигнута в показанный период. Линия рассчитана численным моделированием.'));
			drawLine('hx-chart-heat', 'Изменение температуры воды во время нагрева', series.map(function (point) { return { x: point.hours, y: point.temperatureC }; }), 0, endTime, temperatureMin, temperatureMax, 'Время нагрева, ч', 'Температура воды, °C', { targetY: target, reachedX: targetReached ? targetReachedHours : null, reachedXLabel: null });
			lastOutput = { geometry: geometry, input: input, initial: initial, target: target, energy: idealEnergy, current: current, daily: daily, heat: heatResult, mode: mode, duration: activeDuration, requiredPower: mode === 'power' ? heatResult.requiredPowerKw : availablePower, sourceEnergy: sourceEnergy, netEnergy: netEnergy };
			renderCopyText(lastOutput);
		} catch (error) {
			var userError = translatedError(error);
			if (userError.id) setFieldError(userError.id, userError.message);
			text('hx-error', userError.message);
			warnings([]);
			['hx-area-result','hx-volume-result','hx-initial-result','hx-target-result','hx-duration-result','hx-energy-ideal','hx-net-energy','hx-source-energy','hx-current-loss','hx-heat-result','hx-evap','hx-conv','hx-rad','hx-additional-losses','hx-gains','hx-total-load','hx-specific-load','hx-humidity','hx-sat-humidity','hx-dewpoint','hx-engineering-wind','hx-engineering-alpha','hx-engineering-radiant','hx-engineering-limits','hx-open-loss','hx-covered-loss','hx-covered-hours','hx-open-day-energy','hx-daily-energy','hx-scheduled-savings','hx-scheduled-savings-percent','hx-peak-power','hx-cover-full-day','hx-approaches','hx-lmtd','hx-exchanger-flows','hx-exchanger-primary-temps','hx-exchanger-pool-temps','hx-flow-powers','hx-temperature-check'].forEach(function (id) { text(id, '—'); });
			get('hx-cover-results').hidden = true;
			get('hx-exchanger-results').hidden = true;
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
			(data.mode === 'power' ? 'Желаемое время нагрева: ' : 'Проверяемое время: ') + fmt(data.duration, 'ч'),
			'Интегральный теплообмен за расчётный период: ' + signedFlow(data.netEnergy, 'кВт·ч'),
			'Полезная энергия, переданная воде: ' + fmt(data.sourceEnergy, 'кВт·ч'),
			(data.mode === 'power' ? 'Необходимая полезная мощность: ' : 'Доступная полезная мощность: ') + fmt(data.requiredPower, 'кВт'),
			'Мощность поддержания целевой температуры: ' + fmt(data.daily.peakRequiredPowerKw == null ? Math.max(0, c.lossKw || 0) : data.daily.peakRequiredPowerKw, 'кВт'),
			'Суммарная нагрузка при выбранных условиях: ' + signedFlow(c.lossKw, 'кВт'),
			'Испарение / конвекция / излучение: ' + fmt(c.componentsKw.evaporation, 'кВт') + ' / ' + fmt(c.componentsKw.convection, 'кВт') + ' / ' + fmt(c.componentsKw.radiation, 'кВт'),
			'Точка росы: ' + fmt(c.humidity.dewPointC, '°C') + (c.condensationPossible ? '; возможная конденсация не зачтена как теплопоступление' : ''),
			'Метод: испарение Saunus по психрометрическому влагосодержанию; конвекция по введённому α; излучение по закону Стефана—Больцмана.'
		];
		if (data.input.coverFraction > 0 && data.daily.covered.valid) {
			lines.push('Экономия при расписании покрытия: ' + fmt(data.daily.scheduledSavingsKWh, 'кВт·ч/сут') + '; сравнение при неизменных погодных условиях.');
			lines.push('Экономия при покрытии 24 ч: ' + fmt(data.daily.fullDaySavingsKWh, 'кВт·ч/сут'));
		}
		lines.push(
			'Предварительный расчёт, не заменяет проектный тепловой баланс и характеристику изготовителя теплообменника.'
		);
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
		text('hx-cover-summary-status', visible ? 'Используется, ' + (get('hx-cover-hours').value || '—') + ' ч/сут' : 'Не используется');
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
