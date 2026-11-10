(function () {
	'use strict';

	var root = document.querySelector('[data-volume-calculator]');
	var core = window.ALPOOLVolumeCalculations;

	if (!root || !core) {
		return;
	}

	var shapeSelect = root.querySelector('#pool-shape');
	var fieldsets = Array.prototype.slice.call(root.querySelectorAll('[data-shape-fields]'));
	var balanceCheckbox = root.querySelector('#include-balance-tank');
	var errorMessage = root.querySelector('#volume-error');
	var formula = root.querySelector('#volume-formula');
	var basinValue = root.querySelector('#basin-volume');
	var basinLiters = root.querySelector('#basin-liters');
	var balanceRow = root.querySelector('[data-balance-result]');
	var balanceValue = root.querySelector('#balance-volume');
	var totalLabel = root.querySelector('#total-volume-label');
	var totalValue = root.querySelector('#total-volume');
	var totalLiters = root.querySelector('#total-liters');
	var heatingLinkRow = root.querySelector('[data-heating-link-row]');
	var heatingLink = root.querySelector('#heating-calculator-link');
	var irregularNote = root.querySelector('[data-irregular-note]');
	var balanceExplanation = root.querySelector('#balance-explanation');
	var resetButton = root.querySelector('#reset-volume-calculator');
	var diagrams = Array.prototype.slice.call(root.querySelectorAll('[data-diagram]'));
	var results = root.querySelector('.calculator-results');
	var consultationForm = document.querySelector('#pool-volume-consultation-form');
	var consultationMessage = consultationForm && consultationForm.querySelector('[name="message"]');
	var numberFormat = new Intl.NumberFormat('ru-RU', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	});
	var literFormat = new Intl.NumberFormat('ru-RU', {
		maximumFractionDigits: 0
	});
	var hasInteracted = false;
	var latestCalculation = null;

	var formulas = {
		rectangular: 'V = L × W × H',
		'rectangular-slope': 'V = L × W × (H₁ + H₂) / 2',
		circular: 'V = π × D² × H / 4',
		irregular: 'V = S × Hср'
	};
	var shapeLabels = {
		rectangular: 'Прямоугольная, постоянная глубина',
		'rectangular-slope': 'Прямоугольная, равномерный уклон дна',
		circular: 'Круглая, постоянная глубина',
		irregular: 'Неправильная форма'
	};

	function clearValues() {
		basinValue.textContent = '—';
		basinLiters.textContent = '—';
		balanceValue.textContent = '—';
		totalValue.textContent = '—';
		totalLiters.textContent = '—';
		if (heatingLinkRow) heatingLinkRow.hidden = true;
	}

	function updateShapeFields() {
		var selectedShape = shapeSelect.value;

		fieldsets.forEach(function (fieldset) {
			var active = fieldset.getAttribute('data-shape-fields') === selectedShape;
			fieldset.hidden = !active;
			fieldset.disabled = !active;
		});

		formula.textContent = formulas[selectedShape];
		irregularNote.hidden = selectedShape !== 'irregular';
		diagrams.forEach(function (diagram) {
			diagram.hidden = diagram.getAttribute('data-diagram') !== selectedShape;
		});
		calculate();
	}

	function parseDimension(input) {
		var raw = input.value.trim();

		if (!raw) {
			return { valid: false, empty: true };
		}

		if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) {
			return { valid: false, empty: false };
		}

		var value = Number(raw.replace(',', '.'));

		return {
			valid: Number.isFinite(value) && value > 0,
			empty: false,
			value: value
		};
	}

	function collectDimensions() {
		var fieldset = fieldsets.find(function (item) {
			return item.getAttribute('data-shape-fields') === shapeSelect.value;
		});
		var dimensions = {};
		var missing = [];
		var invalid = [];

		fieldset.querySelectorAll('[data-dimension]').forEach(function (input) {
			var parsed = parseDimension(input);

			if (!parsed.valid) {
				input.setAttribute('aria-invalid', 'true');
				(parsed.empty ? missing : invalid).push(input.labels[0].textContent.trim());
				return;
			}

			input.removeAttribute('aria-invalid');
			dimensions[input.getAttribute('data-dimension')] = parsed.value;
		});

		return { dimensions: dimensions, missing: missing, invalid: invalid };
	}

	function describeInputError(collected) {
		if (collected.invalid.length) {
			return 'Проверьте значения: ' + collected.invalid.join(', ') + '. Используйте положительные числа; для десятичных можно ставить запятую.';
		}

		return 'Введите положительные значения: ' + collected.missing.join(', ') + '.';
	}

	function calculate() {
		var collected = collectDimensions();
		balanceRow.hidden = !balanceCheckbox.checked;
		balanceExplanation.hidden = !balanceCheckbox.checked;
		totalLabel.textContent = balanceCheckbox.checked
			? 'Суммарный предварительный объём'
			: 'Предварительный объём воды';

		if (collected.missing.length || collected.invalid.length) {
			latestCalculation = null;
			clearValues();
			if (!hasInteracted && !collected.invalid.length) {
				fieldsets.forEach(function (fieldset) {
					fieldset.querySelectorAll('[aria-invalid]').forEach(function (input) {
						input.removeAttribute('aria-invalid');
					});
				});
				errorMessage.classList.add('is-hint');
				errorMessage.textContent = 'Введите размеры чаши, чтобы увидеть предварительный объём.';
				return;
			}
			errorMessage.classList.remove('is-hint');
			errorMessage.textContent = describeInputError(collected);
			return;
		}

		try {
			var result = core.calculatePoolVolume(
				shapeSelect.value,
				collected.dimensions,
				balanceCheckbox.checked
			);
			latestCalculation = {
				shape: shapeSelect.value,
				dimensions: Object.assign({}, collected.dimensions),
				result: result
			};

			basinValue.textContent = numberFormat.format(result.basinM3);
			basinLiters.textContent = literFormat.format(result.basinLiters) + ' л';
			balanceValue.textContent = numberFormat.format(result.balanceTankM3);
			totalValue.textContent = numberFormat.format(result.totalM3);
			totalLiters.textContent = literFormat.format(result.totalLiters) + ' л';
			if (heatingLink && heatingLinkRow) {
				var usableHeatingVolume = result.basinM3 >= 0.000001 && result.basinM3 <= 1000000;
				if (usableHeatingVolume) {
					var heatingUrl = new URL('/kalkulyatori/raschet-nagreva-vody-basseyna.html', window.location.origin);
					heatingUrl.searchParams.set('volume', String(result.basinM3));
					heatingLink.href = heatingUrl.pathname + heatingUrl.search;
					heatingLinkRow.hidden = false;
				} else heatingLinkRow.hidden = true;
			}
			errorMessage.classList.remove('is-hint');
			errorMessage.textContent = '';
			results.classList.remove('is-updating');
			void results.offsetWidth;
			results.classList.add('is-updating');
		} catch (error) {
			latestCalculation = null;
			clearValues();
			errorMessage.classList.remove('is-hint');
			errorMessage.textContent = 'Не удалось выполнить расчёт. Проверьте введённые значения.';
		}
	}

	root.addEventListener('input', function (event) {
		if (event.target.matches('[data-dimension]')) {
			hasInteracted = true;
			calculate();
		}
	});

	shapeSelect.addEventListener('change', function () {
		hasInteracted = true;
		updateShapeFields();
	});
	balanceCheckbox.addEventListener('change', function () {
		hasInteracted = true;
		calculate();
	});
	resetButton.addEventListener('click', function () {
		shapeSelect.value = 'rectangular';
		fieldsets.forEach(function (fieldset) {
			fieldset.querySelectorAll('[data-dimension]').forEach(function (input) {
				input.value = '';
				input.removeAttribute('aria-invalid');
			});
		});
		balanceCheckbox.checked = false;
		hasInteracted = false;
		latestCalculation = null;
		updateShapeFields();
		shapeSelect.focus();
	});

	if (consultationForm && consultationMessage) {
		consultationForm.addEventListener('submit', function () {
			var marker = 'Параметры расчёта калькулятора объёма';
			var userMessage = consultationMessage.value.split(marker)[0].trim();

			if (!latestCalculation) {
				consultationMessage.value = userMessage;
				return;
			}

			var unitByDimension = {
				length: 'м',
				width: 'м',
				depth: 'м',
				shallowDepth: 'м',
				deepDepth: 'м',
				diameter: 'м',
				waterArea: 'м²',
				averageDepth: 'м'
			};
			var labelByDimension = {
				length: 'Длина L',
				width: 'Ширина W',
				depth: 'Глубина H',
				shallowDepth: 'Глубина у мелкого края H₁',
				deepDepth: 'Глубина у глубокого края H₂',
				diameter: 'Диаметр D',
				waterArea: 'Площадь зеркала воды S',
				averageDepth: 'Средняя глубина Hср'
			};
			var dimensionLines = Object.keys(latestCalculation.dimensions).map(function (key) {
				return labelByDimension[key] + ': ' + numberFormat.format(latestCalculation.dimensions[key]) + ' ' + unitByDimension[key];
			});
			var result = latestCalculation.result;
			var calculationLines = [
				marker + ':',
				'Форма: ' + shapeLabels[latestCalculation.shape],
				dimensionLines.join('; '),
				'Объём чаши: ' + numberFormat.format(result.basinM3) + ' м³',
				'Балансная ёмкость (+10%): ' + (balanceCheckbox.checked ? 'учитывается' : 'не учитывается'),
				'Условный объём балансной ёмкости: ' + numberFormat.format(result.balanceTankM3) + ' м³',
				'Суммарный предварительный объём: ' + numberFormat.format(result.totalM3) + ' м³ (' + literFormat.format(result.totalLiters) + ' л)'
			];

			consultationMessage.value = (userMessage ? userMessage + '\n\n' : '') + calculationLines.join('\n');
		});
	}
	updateShapeFields();
}());
