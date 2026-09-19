/*
	Massively by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body'),
		$wrapper = $('#wrapper'),
		$header = $('#header'),
		$nav = $('#nav'),
		$main = $('#main'),
		$navPanelToggle, $navPanel, $navPanelInner;

	// Breakpoints.
		breakpoints({
			default:   ['1681px',   null       ],
			xlarge:    ['1281px',   '1680px'   ],
			large:     ['981px',    '1280px'   ],
			medium:    ['737px',    '980px'    ],
			small:     ['481px',    '736px'    ],
			xsmall:    ['361px',    '480px'    ],
			xxsmall:   [null,       '360px'    ]
		});

	/**
	 * Applies parallax scrolling to an element's background image.
	 * @return {jQuery} jQuery object.
	 */
	$.fn._parallax = function(intensity) {

		var	$window = $(window),
			$this = $(this);

		if (this.length == 0 || intensity === 0)
			return $this;

		if (this.length > 1) {

			for (var i=0; i < this.length; i++)
				$(this[i])._parallax(intensity);

			return $this;

		}

		if (!intensity)
			intensity = 0.25;

		$this.each(function() {

			var $t = $(this),
				$bg = $('<div class="bg"></div>').appendTo($t),
				on, off;

			on = function() {

				$bg
					.removeClass('fixed')
					.css('transform', 'matrix(1,0,0,1,0,0)');

				$window
					.on('scroll._parallax', function() {

						var pos = parseInt($window.scrollTop()) - parseInt($t.position().top);

						$bg.css('transform', 'matrix(1,0,0,1,0,' + (pos * intensity) + ')');

					});

			};

			off = function() {

				$bg
					.addClass('fixed')
					.css('transform', 'none');

				$window
					.off('scroll._parallax');

			};

			// Disable parallax on ..
				if (browser.name == 'ie'			// IE
				||	browser.name == 'edge'			// Edge
				||	window.devicePixelRatio > 1		// Retina/HiDPI (= poor performance)
				||	browser.mobile)					// Mobile devices
					off();

			// Enable everywhere else.
				else {

					breakpoints.on('>large', on);
					breakpoints.on('<=large', off);

				}

		});

		$window
			.off('load._parallax resize._parallax')
			.on('load._parallax resize._parallax', function() {
				$window.trigger('scroll');
			});

		return $(this);

	};

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Scrolly.
		$('.scrolly').scrolly();

	// Background.
		$wrapper._parallax(0.925);

	// Nav Panel.

		// Toggle.
			$navPanelToggle = $(
				'<a href="#navPanel" id="navPanelToggle">Menu</a>'
			)
				.appendTo($wrapper);

			// Change toggle styling once we've scrolled past the header.
				$header.scrollex({
					bottom: '5vh',
					enter: function() {
						$navPanelToggle.removeClass('alt');
					},
					leave: function() {
						$navPanelToggle.addClass('alt');
					}
				});

		// Panel.
			$navPanel = $(
				'<div id="navPanel">' +
					'<nav>' +
					'</nav>' +
					'<a href="#navPanel" class="close"></a>' +
				'</div>'
			)
				.appendTo($body)
				.panel({
					delay: 500,
					hideOnClick: true,
					hideOnSwipe: true,
					resetScroll: true,
					resetForms: true,
					side: 'right',
					target: $body,
					visibleClass: 'is-navPanel-visible'
				});

			// Get inner.
				$navPanelInner = $navPanel.children('nav');

			// Move nav content on breakpoint change.
				var $navContent = $nav.children();

				breakpoints.on('>medium', function() {

					// NavPanel -> Nav.
						$navContent.appendTo($nav);

					// Flip icon classes.
						$nav.find('.icons, .icon')
							.removeClass('alt');

				});

				breakpoints.on('<=medium', function() {

					// Nav -> NavPanel.
						$navContent.appendTo($navPanelInner);

					// Flip icon classes.
						$navPanelInner.find('.icons, .icon')
							.addClass('alt');

				});

			// Hack: Disable transitions on WP.
				if (browser.os == 'wp'
				&&	browser.osVersion < 10)
					$navPanel
						.css('transition', 'none');

	// Intro.
		var $intro = $('#intro');

		if ($intro.length > 0) {

			// Hack: Fix flex min-height on IE.
				if (browser.name == 'ie') {
					$window.on('resize.ie-intro-fix', function() {

						var h = $intro.height();

						if (h > $window.height())
							$intro.css('height', 'auto');
						else
							$intro.css('height', h);

					}).trigger('resize.ie-intro-fix');
				}

			// Hide intro on scroll (> small).
				breakpoints.on('>small', function() {

					$main.unscrollex();

					$main.scrollex({
						mode: 'bottom',
						top: '25vh',
						bottom: '-50vh',
						enter: function() {
							$intro.addClass('hidden');
						},
						leave: function() {
							$intro.removeClass('hidden');
						}
					});

				});

			// Hide intro on scroll (<= small).
				breakpoints.on('<=small', function() {

					$main.unscrollex();

					$main.scrollex({
						mode: 'middle',
						top: '15vh',
						bottom: '-15vh',
						enter: function() {
							$intro.addClass('hidden');
						},
						leave: function() {
							$intro.removeClass('hidden');
						}
					});

			});

		}

})(jQuery);

// ALPOOL lead forms.
(function() {

	var leadEndpoint = 'https://api.alpool.ru/api/leads';
	var leadUtmKeys = [
		'utm_source',
		'utm_medium',
		'utm_campaign',
		'utm_term',
		'utm_content'
	];

	function getUtmParams() {
		var params = new URLSearchParams(window.location.search);
		var utm = {};

		leadUtmKeys.forEach(function(key) {
			utm[key] = params.get(key) || null;
		});

		return utm;
	}

	function getFormStatus(form) {
		var status = form.querySelector('.lead-status');

		if (!status) {
			status = document.createElement('p');
			status.className = 'lead-status';
			status.setAttribute('aria-live', 'polite');
			form.appendChild(status);
		}

		return status;
	}

	function setFormStatus(form, message, isError) {
		var status = getFormStatus(form);

		status.textContent = message;
		status.setAttribute('role', isError ? 'alert' : 'status');
		status.classList.toggle('lead-status--error', !!isError);
		status.classList.toggle('lead-status--success', !isError);
	}

	function getErrorMessage(response, result) {
		if (result && typeof result.detail === 'string')
			return result.detail;

		if (result && Array.isArray(result.detail))
			return result.detail.map(function(item) {
				return item && item.msg ? item.msg : String(item);
			}).join('; ');

		if (result && typeof result.error === 'string')
			return result.error;

		return 'Не удалось отправить заявку (код ' + response.status + ').';
	}

	var attachmentsEndpoint = 'https://api.alpool.ru/api/leads/';
	var maxAttachments = 10;
	var maxFileSize = 25 * 1024 * 1024;
	var allowedExtensions = {
		jpg: true,
		jpeg: true,
		png: true,
		webp: true,
		pdf: true,
		doc: true,
		docx: true,
		xls: true,
		xlsx: true,
		dwg: true,
		dxf: true
	};

	function getLeadState(form) {
		if (!form._alpoolLeadState) {
			form._alpoolLeadState = {
				leadId: null,
				files: [],
				submitting: false
			};
		}

		return form._alpoolLeadState;
	}

	function getFileInput(form) {
		return form.querySelector('input[type="file"][name="files"]');
	}

	function getSelectedFiles(form) {
		var fileInput = getFileInput(form);
		return fileInput && fileInput.files
			? Array.prototype.slice.call(fileInput.files)
			: [];
	}

	function getFileValidationError(files) {
		if (files.length > maxAttachments)
			return 'Можно прикрепить не более 10 файлов.';

		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			var name = file && file.name ? file.name : '';
			var extensionMatch = name.match(/\.([^.]+)$/);
			var extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';

			if (!allowedExtensions[extension])
				return 'Файл «' + name + '» имеет недопустимое расширение.';

			if (file.size > maxFileSize)
				return 'Файл «' + name + '» больше 25 МБ.';
		}

		return '';
	}

	function renderSelectedFiles(form, files) {
		var list = form.querySelector('.lead-file-list');

		if (!list)
			return;

		list.textContent = files.length
			? 'Выбраны файлы: ' + files.map(function(file) { return file.name; }).join(', ')
			: '';
		list.hidden = !files.length;
	}

	function setFormControlsDisabled(form, disabled) {
		var controls = Array.prototype.slice.call(
			form.querySelectorAll('button[type="submit"], input[type="submit"], input[type="file"]')
		);

		controls.forEach(function(control) {
			if (disabled) {
				control._alpoolWasDisabled = control.disabled;
				control.disabled = true;
			} else if (typeof control._alpoolWasDisabled !== 'undefined') {
				control.disabled = control._alpoolWasDisabled;
				delete control._alpoolWasDisabled;
			}
		});
	}

	function readResponse(response) {
		return response.text().then(function(raw) {
			var result = {};

			try {
				result = raw ? JSON.parse(raw) : {};
			} catch (error) {
				result = {};
			}

			if (!response.ok)
				throw new Error(getErrorMessage(response, result));

			return result;
		});
	}

	function uploadAttachments(form) {
		var state = getLeadState(form);

		if (!state.files.length)
			return Promise.reject(new Error('Выберите хотя бы один файл для загрузки.'));

		var formData = new FormData();
		state.files.forEach(function(file) {
			formData.append('files', file);
		});
		setFormStatus(form, 'Загружаем файлы…', false);

		return fetch(attachmentsEndpoint + encodeURIComponent(state.leadId) + '/attachments', {
			method: 'POST',
			body: formData
		}).then(readResponse);
	}

	function clearPendingState(form) {
		var state = getLeadState(form);
		var fileInput = getFileInput(form);

		state.leadId = null;
		state.files = [];
		renderSelectedFiles(form, state.files);
		if (fileInput)
			fileInput.value = '';
	}

	document.addEventListener('change', function(event) {
		var fileInput = event.target;
		var form = fileInput && fileInput.form;

		if (!fileInput || fileInput.type !== 'file' || !form || form.action !== leadEndpoint)
			return;

		var state = getLeadState(form);
		state.files = getSelectedFiles(form);
		renderSelectedFiles(form, state.files);

		var validationError = getFileValidationError(state.files);
		if (validationError)
			setFormStatus(form, validationError, true);
	});

	document.addEventListener('submit', function(event) {
		var form = event.target;

		if (!form || form.tagName !== 'FORM' || form.action !== leadEndpoint)
			return;

		event.preventDefault();

		var state = getLeadState(form);
		if (state.submitting || form.dataset.leadSubmitting === 'true')
			return;

		state.files = getSelectedFiles(form);
		renderSelectedFiles(form, state.files);

		var fileValidationError = getFileValidationError(state.files);
		if (fileValidationError) {
			setFormStatus(form, fileValidationError, true);
			var fileInput = getFileInput(form);
			if (fileInput)
				fileInput.focus();
			return;
		}

		state.submitting = true;
		form.dataset.leadSubmitting = 'true';
		setFormControlsDisabled(form, true);

		if (state.leadId !== null) {
			uploadAttachments(form)
				.then(function() {
					clearPendingState(form);
					setFormStatus(form, 'Заявка отправлена. Мы свяжемся с вами.', false);
				})
				.catch(function() {
					setFormStatus(form, 'Заявка отправлена, но файлы загрузить не удалось. Попробуйте загрузить файлы ещё раз.', true);
				})
				.then(function() {
					state.submitting = false;
					delete form.dataset.leadSubmitting;
					setFormControlsDisabled(form, false);
				});
			return;
		}

		var formData = new FormData(form);
		var utm = getUtmParams();
		var getValue = function(name) {
			var value = formData.get(name);
			return value == null ? '' : String(value).trim();
		};
		var name = getValue('name');
		var phone = getValue('phone');

		if (!name) {
			setFormStatus(form, 'Пожалуйста, укажите имя.', true);
			state.submitting = false;
			delete form.dataset.leadSubmitting;
			setFormControlsDisabled(form, false);
			var nameField = form.querySelector('[name="name"]');
			if (nameField)
				nameField.focus();
			return;
		}

		if (!phone) {
			setFormStatus(form, 'Пожалуйста, укажите телефон.', true);
			state.submitting = false;
			delete form.dataset.leadSubmitting;
			setFormControlsDisabled(form, false);
			var phoneField = form.querySelector('[name="phone"]');
			if (phoneField)
				phoneField.focus();
			return;
		}

		setFormStatus(form, 'Отправляем заявку…', false);

		var payload = {
			name: name,
			phone: phone,
			email: getValue('email') || null,
			message: getValue('message') || null,
			form_type: form.dataset.formType || 'contact',
			source: window.location.hostname || null,
			page_url: window.location.href,
			utm_source: utm.utm_source,
			utm_medium: utm.utm_medium,
			utm_campaign: utm.utm_campaign,
			utm_term: utm.utm_term,
			utm_content: utm.utm_content
		};

		fetch(leadEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		})
			.then(readResponse)
			.then(function(result) {
				if (result.id == null)
					throw new Error('Сервер не вернул идентификатор заявки.');

				state.leadId = result.id;

				if (!state.files.length) {
					clearPendingState(form);
					setFormStatus(form, 'Заявка отправлена. Мы свяжемся с вами.', false);
					return null;
				}

				return uploadAttachments(form).then(function() {
					clearPendingState(form);
					setFormStatus(form, 'Заявка отправлена. Мы свяжемся с вами.', false);
				});
			})
			.catch(function(error) {
				if (state.leadId !== null && state.files.length) {
					setFormStatus(form, 'Заявка отправлена, но файлы загрузить не удалось. Попробуйте загрузить файлы ещё раз.', true);
				} else {
					setFormStatus(
						form,
						error && error.message
							? error.message
							: 'Не удалось связаться с сервером. Попробуйте еще раз.',
						true
					);
				}
			})
			.then(function() {
				state.submitting = false;
				delete form.dataset.leadSubmitting;
				setFormControlsDisabled(form, false);
			});
	});

})();
