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

	document.addEventListener('submit', function(event) {
		var form = event.target;

		if (!form || form.tagName !== 'FORM' || form.action !== leadEndpoint)
			return;

		event.preventDefault();

		if (form.dataset.leadSubmitting === 'true')
			return;

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
			var nameField = form.querySelector('[name="name"]');
			if (nameField)
				nameField.focus();
			return;
		}

		if (!phone) {
			setFormStatus(form, 'Пожалуйста, укажите телефон.', true);
			var phoneField = form.querySelector('[name="phone"]');
			if (phoneField)
				phoneField.focus();
			return;
		}

		var submitControls = Array.prototype.slice.call(
			form.querySelectorAll('button[type="submit"], input[type="submit"]')
		);

		submitControls.forEach(function(control) {
			control.dataset.leadWasDisabled = control.disabled ? 'true' : 'false';
			control.disabled = true;
		});
		form.dataset.leadSubmitting = 'true';
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
			.then(function(response) {
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
			})
			.then(function() {
				setFormStatus(form, 'Заявка отправлена. Мы свяжемся с вами.', false);
			})
			.catch(function(error) {
				setFormStatus(
					form,
					error && error.message
						? error.message
						: 'Не удалось связаться с сервером. Попробуйте еще раз.',
					true
				);
				delete form.dataset.leadSubmitting;
				submitControls.forEach(function(control) {
					control.disabled = control.dataset.leadWasDisabled === 'true';
					delete control.dataset.leadWasDisabled;
				});
			});
	});

})();
