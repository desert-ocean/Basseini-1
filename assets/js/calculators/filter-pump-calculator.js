(function () {
	'use strict';
	var root = document.querySelector('[data-filter-calculator]');
	if (!root || !window.FilterPumpCore) return;
	var byId = function (id) { return document.getElementById(id); };
	var fields = ['volume', 'turnover', 'rate'].map(byId);
	var options = byId('options');
	var result = null;
	var selected = null;
	var nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
	function parse(input) {
		var raw = input.value.trim();
		if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) return null;
		var n = Number(raw.replace(',', '.'));
		return Number.isFinite(n) && n > 0 ? n : null;
	}
	function showOptions() {
		options.replaceChildren();
		result.options.forEach(function (variant, i) {
			var card = document.createElement('article');
			card.className = 'filter-card' + (selected && selected.diameterMm === variant.diameterMm ? ' is-selected' : '');
			var label = ['Компактный', 'Больше фильтров', 'Компромисс'][i] || 'Вариант';
			card.innerHTML = '<h3>' + label + '</h3><p>Диаметр: <b>' + variant.diameterMm + ' мм</b></p><p>Количество: <b>' + variant.count + ' шт.</b></p><p>Площадь одного: ' + nf.format(variant.areaM2) + ' м²</p><p>Общая площадь: ' + nf.format(variant.totalAreaM2) + ' м²</p><p>Циркуляция: ' + nf.format(variant.circulationM3h) + ' м³/ч</p><p>Фактическая скорость: ' + nf.format(variant.actualRateMph) + ' м/ч</p><p>Промывка одного фильтра: ' + nf.format(variant.backwashM3h) + ' м³/ч</p>';
			if (variant.count >= 10) { var warning = document.createElement('p'); warning.className = 'filter-warning'; warning.textContent = 'Большое количество фильтров: требуется индивидуальная компоновка и проектная проверка.'; card.appendChild(warning); }
			var button = document.createElement('button'); button.type = 'button'; button.className = 'button'; button.textContent = selected && selected.diameterMm === variant.diameterMm ? 'Выбран' : 'Выбрать';
			button.addEventListener('click', function () { selected = variant; updateSelection(); }); card.appendChild(button); options.appendChild(card);
		});
	}
	function updateSelection() {
		byId('q-backwash').textContent = nf.format(selected.backwashM3h);
		byId('pump-advice').textContent = 'Циркуляция ' + nf.format(result.circulationM3h) + ' м³/ч; промывка одного фильтра ' + nf.format(selected.backwashM3h) + ' м³/ч (разница ' + nf.format(Math.abs(selected.backwashM3h - result.circulationM3h)) + ' м³/ч). При различии режимов рассмотрите отдельный промывной насос. Общий насос возможен только после проверки рабочей характеристики при нужном напоре, потерь и схемы переключения. По одному расходу насос не подбирается.' + (selected.count >= 10 ? ' Выбрано много фильтров — требуется индивидуальная проектная компоновка.' : '');
		showOptions();
	}
	function calculate() {
		var values = fields.map(parse);
		if (values.some(function (v) { return v === null; })) {
			result = selected = null; byId('q-circulation').textContent = '—'; byId('q-backwash').textContent = '—'; options.replaceChildren();
			byId('pump-advice').textContent = 'Введите объём, время водообмена и скорость фильтрации.';
			byId('calc-error').textContent = fields.some(function (f) { return f.value && parse(f) === null; }) ? 'Укажите положительные числа; десятичный разделитель — точка или запятая.' : '';
			return;
		}
		try {
			result = window.FilterPumpCore.calculate({ volumeM3: values[0], turnoverHours: values[1], filtrationRate: values[2] });
			selected = selected && result.variants.find(function (v) { return v.diameterMm === selected.diameterMm; }) || result.options[0];
			byId('q-circulation').textContent = nf.format(result.circulationM3h);
			byId('calc-error').textContent = '';
			updateSelection();
		} catch (e) { byId('calc-error').textContent = 'Не удалось построить допустимые варианты. Проверьте значения.'; }
	}
	fields.forEach(function (field) { field.addEventListener('input', calculate); });
	var form = document.querySelector('#footer form');
	if (form) form.addEventListener('submit', function () {
		var marker = 'Расчёт подбора фильтра и насоса:';
		var userText = form.elements.message.value.split(marker)[0].trim();
		if (!result || !selected) return;
		var lines = ['Расчёт подбора фильтра и насоса:', 'Назначение: ' + byId('purpose').value, 'Тип: ' + byId('basin-type').value,
			'Объём: ' + fields[0].value + ' м³; время водообмена: ' + fields[1].value + ' ч; скорость фильтрации: ' + fields[2].value + ' м/ч',
			'Циркуляция: ' + nf.format(result.circulationM3h) + ' м³/ч', 'Фильтры: ' + selected.count + ' × ' + selected.diameterMm + ' мм; фактическая скорость ' + nf.format(selected.actualRateMph) + ' м/ч',
			'Промывка одного фильтра: ' + nf.format(selected.backwashM3h) + ' м³/ч при 50 м/ч; насосы требуют гидравлической проверки.'];
		form.elements.message.value = (userText ? userText + '\n\n' : '') + lines.join('\n');
	});
}());
