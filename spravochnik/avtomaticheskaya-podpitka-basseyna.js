(function (root) {
	'use strict';

	var form = root.document && root.document.getElementById('makeup-calculator');
	var core = root.ALPOOLMakeupCalculations;
	if (!form || !core) return;

	var fields = {
		basinVolume: form.elements.basinVolume,
		mirrorArea: form.elements.mirrorArea,
		makeupVolume: form.elements.makeupVolume,
		flow: form.elements.flow
	};
	var outputs = {
		time: root.document.getElementById('makeup-time-result'),
		flow: root.document.getElementById('makeup-flow-result'),
		share: root.document.getElementById('makeup-share-result'),
		area: root.document.getElementById('makeup-area-result')
	};
	var numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
	var preciseFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 });
	var messages = {
		basinVolume: 'Укажите положительный объём бассейна, чтобы рассчитать долю подпитки.',
		mirrorArea: 'Введите положительную площадь зеркала или оставьте поле пустым.',
		makeupVolume: 'Укажите объём воды, который нужно восполнить. Можно ввести 0.',
		flow: 'Укажите доступный расход линии подпитки. Он должен быть больше нуля.'
	};

	function parseValue(input) {
		var value = input.value.trim().replace(/\s+/g, '').replace(',', '.');
		if (!value) return null;
		if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return NaN;
		var parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : NaN;
	}

	function fieldErrorKey(name, value, optional) {
		if (value === null) return optional ? '' : name;
		if (!Number.isFinite(value)) return name;
		if (name === 'makeupVolume' ? value < 0 : value <= 0) return name;
		return '';
	}

	function setFieldState(name, errorKey) {
		var input = fields[name];
		var error = root.document.getElementById(input.id + '-error');
		var invalid = errorKey !== '';
		input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
		error.textContent = invalid ? messages[errorKey] : '';
	}

	function setResults(result) {
		if (!result) {
			outputs.time.textContent = '—';
			outputs.flow.textContent = '—';
			outputs.share.textContent = '—';
			outputs.area.textContent = 'не указана';
			return;
		}

		if (result.timeHours === 0) {
			outputs.time.textContent = '0 ч';
		} else if (result.timeMinutes < 1) {
			outputs.time.textContent = 'менее 1 мин';
		} else if (result.timeHours < 1) {
			outputs.time.textContent = Math.round(result.timeMinutes) + ' мин';
		} else {
			outputs.time.textContent = preciseFormat.format(result.timeHours) + ' ч';
		}
		outputs.flow.textContent = numberFormat.format(result.flowLitersPerMinute) + ' л/мин';
		outputs.share.textContent = numberFormat.format(result.sharePercent) + ' %';
		outputs.area.textContent = result.mirrorAreaM2 === null ? 'не указана' : numberFormat.format(result.mirrorAreaM2) + ' м²';
	}

	function recalculate() {
		var values = {
			basinVolume: parseValue(fields.basinVolume),
			mirrorArea: parseValue(fields.mirrorArea),
			makeupVolume: parseValue(fields.makeupVolume),
			flow: parseValue(fields.flow)
		};
		var errors = {
			basinVolume: fieldErrorKey('basinVolume', values.basinVolume, false),
			mirrorArea: fieldErrorKey('mirrorArea', values.mirrorArea, true),
			makeupVolume: fieldErrorKey('makeupVolume', values.makeupVolume, false),
			flow: fieldErrorKey('flow', values.flow, false)
		};
		Object.keys(errors).forEach(function (name) { setFieldState(name, errors[name]); });
		var errorBox = root.document.getElementById('makeup-calculator-error');
		if (Object.keys(errors).some(function (name) { return errors[name] !== ''; })) {
			setResults(null);
			errorBox.hidden = true;
			errorBox.textContent = '';
			return;
		}

		try {
			var result = core.calculateMakeup({
				basinVolumeM3: values.basinVolume,
				mirrorAreaM2: values.mirrorArea,
				makeupVolumeM3: values.makeupVolume,
				flowM3h: values.flow
			});
			setResults(result);
			errorBox.hidden = true;
			errorBox.textContent = '';
		} catch (_) {
			setResults(null);
			errorBox.textContent = 'Не удалось выполнить расчёт. Проверьте введённые значения.';
			errorBox.hidden = false;
		}
	}

	form.addEventListener('submit', function (event) { event.preventDefault(); recalculate(); });
	Object.keys(fields).forEach(function (name) {
		fields[name].addEventListener('input', recalculate);
		fields[name].addEventListener('change', recalculate);
	});
	recalculate();
}(typeof window !== 'undefined' ? window : globalThis));
