(function () {
	'use strict';
	var form = document.getElementById('vent-calculator');
	if (!form || !window.ALPOOLPoolVentilation) return;
	var error = document.getElementById('vent-calculator-error');
	function value(name) { return Number(form.elements[name].value); }
	function update() {
		try {
			var result = window.ALPOOLPoolVentilation.calculate({
				volumeM3: value('volume'), airflowM3h: value('flow'), airTempC: value('airTemp'),
				relativeHumidityPercent: value('humidity'), surfaceTempC: value('surfaceTemp')
			});
			document.getElementById('vent-rate-result').textContent = result.airChangesPerHour.toFixed(2);
			document.getElementById('vent-dew-result').textContent = result.dewPointC.toFixed(1);
			document.getElementById('vent-margin-result').textContent = result.surfaceMarginC.toFixed(1);
			document.getElementById('vent-risk-result').textContent = result.condensationRisk
				? 'Поверхность не теплее точки росы: конденсация вероятна.'
				: 'Поверхность теплее точки росы. Это не исключает локальный риск из-за мостиков холода.';
			error.hidden = true;
		} catch (exception) {
			error.textContent = 'Проверьте введённые значения: ' + exception.message;
			error.hidden = false;
		}
	}
	form.addEventListener('input', update);
	form.addEventListener('submit', function (event) { event.preventDefault(); update(); });
	update();
}());
