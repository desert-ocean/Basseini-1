(function () {
	'use strict';
	var root = document.querySelector('[data-filter-calculator]');
	if (!root || !window.FilterPumpCore) return;
	var $ = function (id) { return document.getElementById(id); };
	var fields = ['volume', 'turnover', 'rate'].map($);
	var optionsRoot = $('options');
	var standardSelect = $('standard-diameter');
	var customInput = $('custom-diameter');
	var nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
	var activeMode = 'auto';
	var currentResult = null;
	var autoChoice = null;
	var diameterChoice = null;
	var calculationError = '';
	var marker = 'Расчёт подбора фильтра и насоса:';

	window.FilterPumpCore.DIAMETERS_MM.forEach(function (d) {
		var option = document.createElement('option'); option.value = String(d); option.textContent = d + ' мм'; standardSelect.appendChild(option);
	});
	var customOption = document.createElement('option'); customOption.value = 'custom'; customOption.textContent = 'Произвольный диаметр'; standardSelect.appendChild(customOption);

	function parse(input) {
		var raw = input.value.trim();
		if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw)) return null;
		var value = Number(raw.replace(',', '.'));
		return Number.isFinite(value) && value > 0 ? value : null;
	}
	function collect() {
		var values = fields.map(parse);
		if (values.some(function (v) { return v === null; })) return null;
		return { volumeM3: values[0], turnoverHours: values[1], filtrationRate: values[2], poolPurpose: $('purpose').value };
	}
	function fmt(value) { return nf.format(value); }
	function countLabel(n) { return n + ' ' + (n === 1 ? 'фильтр' : (n >= 2 && n <= 4 ? 'фильтра' : 'фильтров')); }
	function combo(v) { return countLabel(v.count) + ' Ø' + fmt(v.diameterMm) + ' мм'; }
	function flowAdvice(v) {
		var ratio=v.flowRatio;
		var text='Qпр/Qцир = '+fmt(ratio)+'; ΔQ = '+(v.flowDifferenceM3h>0?'+':'')+fmt(v.flowDifferenceM3h)+' м³/ч ('+(v.flowDifferencePct>0?'+':'')+fmt(v.flowDifferencePct)+'%). ';
		if(Math.abs(v.flowDifferenceM3h)<=Number.EPSILON*Math.max(v.backwashM3h,v.circulationM3h)) text+='Расходы совпадают с учётом точности вычислений. ';
		else if(ratio>1) text+='Расход промывки больше циркуляционного. ';
		else text+='Расход циркуляции больше промывочного. ';
		text+='При близких расходах можно рассмотреть общую насосную систему; если режимы различаются, оцените отдельный промывной насос. ';
		return text+'В любом случае подтвердите выбор по рабочей характеристике, напору и гидравлической схеме; совпадение расходов само по себе не доказывает совместимость.';
	}	function setText(id, value) { $(id).textContent = value; }
	function updateSummary(v) {
		if (!v) {
			['selected-system','selected-area','selected-rate','q-backwash','flow-difference','flow-percent'].forEach(function (id) { setText(id, '—'); });
			setText('pump-advice', activeMode === 'diameter' ? 'Выберите типовой или введите произвольный диаметр.' : 'Заполните исходные данные для подбора.');
			return;
		}
		setText('selected-system', combo(v));
		setText('selected-area', fmt(v.areaM2) + ' / ' + fmt(v.totalAreaM2));
		setText('selected-rate', fmt(v.actualRateMph));
		setText('q-backwash', fmt(v.backwashM3h));
		setText('flow-difference', (v.flowDifferenceM3h > 0 ? '+' : '') + fmt(v.flowDifferenceM3h) + ' м³/ч');
		setText('flow-percent', (v.flowDifferencePct > 0 ? '+' : '') + fmt(v.flowDifferencePct) + '% от циркуляции');
		setText('pump-advice', flowAdvice(v));
	}
	function renderOptions() {
		optionsRoot.replaceChildren();
		if (!currentResult) return;
		currentResult.options.forEach(function (v) {
			var card = document.createElement('article');
			card.className = 'filter-card' + (autoChoice && autoChoice.diameterMm === v.diameterMm && autoChoice.count === v.count ? ' is-selected' : '');
			var heading = document.createElement('h3'); heading.textContent = v.recommendationTitle; card.appendChild(heading);
			var lead = document.createElement('strong'); lead.className = 'filter-card__combo'; lead.textContent = combo(v); card.appendChild(lead);
			var list = document.createElement('dl'); list.className = 'filter-card__metrics';
			[['Циркуляция',fmt(v.circulationM3h)+' м³/ч'],['Площадь одного фильтра',fmt(v.areaM2)+' м²'],['Общая площадь',fmt(v.totalAreaM2)+' м²'],['Фактическая скорость',fmt(v.actualRateMph)+' м/ч'],['Промывка одного фильтра',fmt(v.backwashM3h)+' м³/ч'],['Разница расходов',((v.flowDifferenceM3h>0?'+':'')+fmt(v.flowDifferenceM3h)+' м³/ч · '+(v.flowDifferencePct>0?'+':'')+fmt(v.flowDifferencePct)+'%')]].forEach(function (item) {
				var dt=document.createElement('dt');dt.textContent=item[0];var dd=document.createElement('dd');dd.textContent=item[1];list.append(dt,dd);
			});
			card.appendChild(list);
			var reason=document.createElement('p');reason.className='filter-card__reason';reason.textContent=v.recommendationReason;card.appendChild(reason);
			if(v.count>=10){var warn=document.createElement('p');warn.className='filter-warning';warn.textContent='Большое количество фильтров: необходимы индивидуальная компоновка и проектная проверка.';card.appendChild(warn);}
			var button=document.createElement('button');button.type='button';button.className='button';button.textContent=autoChoice&&autoChoice.count===v.count&&autoChoice.diameterMm===v.diameterMm?'Выбрано':'Выбрать вариант';button.addEventListener('click',function(){autoChoice=v;updateSummary(v);renderOptions();});card.appendChild(button);optionsRoot.appendChild(card);
		});
	}
	function renderDiameter(v) {
		var box=$('diameter-result');box.replaceChildren();box.hidden=!v;$('custom-diameter-note').hidden=standardSelect.value!=='custom'&&customInput.value.trim()==='';
		if(!v)return;
		box.className='filter-card diameter-result is-selected';
		var title=document.createElement('h3');title.textContent=combo(v);box.appendChild(title);
		var items=[['Минимальное количество',countLabel(v.count)],['Расход циркуляции',fmt(v.circulationM3h)+' м³/ч'],['Площадь одного фильтра',fmt(v.areaM2)+' м²'],['Общая площадь',fmt(v.totalAreaM2)+' м²'],['Фактическая скорость',fmt(v.actualRateMph)+' м/ч'],['Промывка одного фильтра',fmt(v.backwashM3h)+' м³/ч'],['Qпр/Qцир',fmt(v.flowRatio)],['ΔQ / Δ%',fmt(v.flowDifferenceM3h)+' м³/ч / '+fmt(v.flowDifferencePct)+'%']];
		items.forEach(function(item){var p=document.createElement('p');p.textContent=item[0]+': '+item[1];box.appendChild(p);});
		var b=document.createElement('button');b.type='button';b.className='button';b.textContent='Выбрать вариант';b.addEventListener('click',function(){diameterChoice=v;updateSummary(v);});box.appendChild(b);
	}
	function calculate() {
		var input=collect(); calculationError='';
		if(!input){currentResult=null;autoChoice=diameterChoice=null;setText('q-circulation','—');setText('calc-error',fields.some(function(f){return f.value&&parse(f)===null;})?'Введите положительные конечные числа; десятичный разделитель — точка или запятая.':'');renderOptions();renderDiameter(null);updateSummary(null);return;}
		try {
			currentResult=window.FilterPumpCore.calculate(input);setText('q-circulation',fmt(currentResult.circulationM3h));
			if(!autoChoice||!currentResult.combinations.some(function(v){return v.count===autoChoice.count&&v.diameterMm===autoChoice.diameterMm;}))autoChoice=currentResult.options[0]||null;
			var rawCustom=customInput.value.trim();var diameter=parse(customInput);var wantsCustom=standardSelect.value==='custom'||rawCustom!=='';var diameterError='';
			if(wantsCustom){
				if(diameter===null){diameterChoice=null;diameterError='Введите положительный диаметр в миллиметрах.';}
				else {try{diameterChoice=window.FilterPumpCore.calculateForDiameter(input,diameter);}catch(e){diameterChoice=null;diameterError='Диаметр или требуемое количество фильтров выходит за поддерживаемый диапазон.';}}
			} else if(standardSelect.value){
				try{diameterChoice=window.FilterPumpCore.calculateForDiameter(input,Number(standardSelect.value));}catch(e){diameterChoice=null;diameterError='Для этого диаметра требуется слишком много фильтров.';}
			} else diameterChoice=null;
			if(activeMode==='diameter'&&diameterError)setText('calc-error',diameterError);else setText('calc-error','');
			if(activeMode==='diameter')updateSummary(diameterChoice);else updateSummary(autoChoice);
			renderOptions();renderDiameter(diameterChoice);
		} catch(error) { calculationError=error.message;setText('calc-error','Не удалось выполнить расчёт: проверьте исходные данные и количество фильтров.');currentResult=null;autoChoice=diameterChoice=null;renderOptions();renderDiameter(null);updateSummary(null); }
	}
	function setMode(mode) {
		activeMode=mode;
		root.querySelectorAll('[data-mode]').forEach(function(button){var active=button.dataset.mode===mode;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
		$('mode-auto').hidden=mode!=='auto';$('mode-diameter').hidden=mode!=='diameter';
		updateSummary(mode==='auto'?autoChoice:diameterChoice);
	}
	root.querySelectorAll('[data-mode]').forEach(function(button){button.addEventListener('click',function(){setMode(button.dataset.mode);});});
	fields.forEach(function(field){field.addEventListener('input',calculate);});
	$('purpose').addEventListener('change',calculate);
	standardSelect.addEventListener('change',function(){if(standardSelect.value!=='custom')customInput.value='';calculate();});
	customInput.addEventListener('input',calculate);
	var form=document.querySelector('#footer form');
	if(form)form.addEventListener('submit',function(){
		var userText=form.elements.message.value.split(marker)[0].trim();
		var chosen=activeMode==='auto'?autoChoice:diameterChoice;
		if(!currentResult||!chosen){form.elements.message.value=userText;return;}
		var input=collect();
		var lines=[marker,'Режим: '+(activeMode==='auto'?'автоматический подбор':'подбор по диаметру'),'Назначение: '+$('purpose').value,'Тип бассейна: '+$('basin-type').value,
			'Объём: '+fmt(input.volumeM3)+' м³; время водообмена: '+fmt(input.turnoverHours)+' ч; заданная скорость фильтрации: '+fmt(input.filtrationRate)+' м/ч',
			'Циркуляция: '+fmt(chosen.circulationM3h)+' м³/ч','Фильтры: '+chosen.count+' × Ø'+fmt(chosen.diameterMm)+' мм',
			'Площадь одного / общая: '+fmt(chosen.areaM2)+' / '+fmt(chosen.totalAreaM2)+' м²','Фактическая скорость: '+fmt(chosen.actualRateMph)+' м/ч',
			'Промывка одного фильтра при 50 м/ч: '+fmt(chosen.backwashM3h)+' м³/ч','Qпр/Qцир: '+fmt(chosen.flowRatio)+'; ΔQ: '+fmt(chosen.flowDifferenceM3h)+' м³/ч; Δ%: '+fmt(chosen.flowDifferencePct)+'%',
			'Вариант: '+(chosen.recommendationTitle||'диаметр выбран пользователем')];
		form.elements.message.value=(userText?userText+'\n\n':'')+lines.join('\n');
	});
	setMode('auto'); calculate();
}());