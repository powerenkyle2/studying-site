// c.js stands for config.js. These are global configs that should be loaded on every page

localforage.setItem('e', 'e');

// fancy animation
function setupObserver(selector) {
	const observer = new MutationObserver(function (mutationsList) {
		mutationsList.forEach(function (mutation) {
			if (mutation.type === 'childList') {
				const contentElements = document.querySelectorAll(selector);
				if (contentElements.length > 0) {
					contentElements.forEach((contentElement, index) => {
						let animationDelay;

						if (pathname.includes('settings')) {
							animationDelay = (index * 0.1).toFixed(2);
						} else if (pathname === '/g' || pathname === '/apps') {
							animationDelay = (index * 0.04).toFixed(2);
						} else if (pathname === '/p' || pathname === '/') {
							animationDelay = (index * 0.05).toFixed(2);
						} else {
							animationDelay = (index * 0.1).toFixed(2);
						}

						contentElement.style.animationDelay = `${animationDelay}s`;
						contentElement?.addEventListener('animationend', () => {
							contentElement.classList.add('no-animation2');
						});
					});
				}
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	function handleURLChange() {
		const contentElements = document.querySelectorAll(selector);
		contentElements.forEach(contentElement => {
			contentElement.classList.remove('no-animation2');
		});
	}

	window?.addEventListener('popstate', handleURLChange);
	window?.addEventListener('hashchange', handleURLChange);
	handleURLChange();
}

function initializeObservers() {
	setupObserver('.settingsection1');
	setupObserver('.settingsection2');
	setupObserver('.settingsection3');
	setupObserver('.settingsection4');
	setupObserver('.settingsection5');
	setupObserver('.settingsection6');
	setupObserver('.settingsection7');
	setupObserver('.settingsection8');
	setupObserver('.settingsection9');
	setupObserver('.settingsection10');
	setupObserver('.settingsection11');
}

const pathname = window.location.pathname;

if (pathname.includes('settings')) {
	const ul = document.querySelector('.sideSnav');
	if (ul) {
		const lis = ul.querySelectorAll('li');
		ul.style.opacity = '1';
		lis.forEach((li, index) => {
			li.style.transitionDelay = `${index * 0.1}s`;
			setTimeout(() => {
				li.style.transform = 'rotateX(0)';
			}, 0);
		});
		setTimeout(function () {
			lis.forEach((li, index) => {
				li.setAttribute('style', 'transform: rotateX(0)');
			});
		}, 1000);
	}

	initializeObservers();
} else if (pathname === '/g') {
	setupObserver('.gameImage');
} else if (pathname === '/p' || pathname === '/') {
	setupObserver('.shortcut');
	setupObserver('.shortcutBigimg');
}

function isInLocalStorage(key) {
	return localStorage.getItem(key) !== null;
}

const currentLocation = window.location.href;
document?.addEventListener('DOMContentLoaded', function () {
	// Cloaking
	if (
		currentLocation !== 'about:blank' ||
		window.parent.location.href !== 'about:blank' ||
		!currentLocation.includes('blob:')
	) {
		const launchType = localStorage.getItem('launchType');

		if (launchType === 'blob') {
			if (window === window.top) {
				const currentSiteUrl = currentLocation + '?redirect=true';

				const htmlContent = `
		<html>
		  <head>
			<title>Catclass</title>
			<style>
			  body, html {
				margin: 0;
				padding: 0;
				width: 100%;
				height: 100%;
				overflow: hidden;
			  }
			  iframe {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				border: none;
			  }
			</style>
		  </head>
		  <body>
			<iframe src="${currentSiteUrl}"></iframe>
</body>
		</html>
	  `;

				const blob = new Blob([htmlContent], {
					type: 'text/html'
				});

				const blobUrl = URL.createObjectURL(blob);

				let newWindow = window.open(blobUrl);
				if (newWindow) {
					newWindow.onload = () => {
						newWindow.document.title = 'Catclass';
					};

					const tabCloak = localStorage.getItem(
						'dropdown-selected-text-tabCloak'
					);

					switch (tabCloak) {
						case 'None (Default)':
							window.location.href = 'https://google.com';
							break;
						case 'Google Classroom':
							window.location.href =
								'https://classroom.google.com';
							break;
						case 'Desmos':
							window.location.href =
								'https://www.desmos.com/calculator';
							break;
						case 'Google Drive':
							window.location.href = 'https://drive.google.com';
							break;
						case 'Kahn Academy':
							window.location.href =
								'https://www.khanacademy.org/';
							break;
						case 'Quizlet':
							window.location.href = 'https://quizlet.com/';
							break;
						default:
							window.location.href = 'https://google.com';
							break;
					}
				}
			}
		} else if (launchType === 'aboutBlank') {
			if (window === window.top) {
				const win = window.open();
				const url = currentLocation;
				const iframe = win.document.createElement('iframe');
				iframe.style.position = 'absolute';
				iframe.style.left = '0';
				iframe.style.top = '0';
				iframe.style.width = '100vw';
				iframe.style.height = '100vh';
				iframe.style.border = 'none';
				iframe.style.margin = '0';
				iframe.style.padding = '0';
				iframe.src = url;
				win.document.body.appendChild(iframe);
				win.document.body.style.overflow = 'hidden';
				const selectedTab =
					localStorage.getItem('dropdown-selected-text-tabCloak') ||
					'None (Default)';

				const urlMap = {
					'None (Default)': 'https://google.com',
					'Google Classroom': 'https://classroom.google.com',
					'Desmos': 'https://www.desmos.com/calculator',
					'Google Drive': 'https://drive.google.com',
					'Kahn Academy': 'https://www.khanacademy.org/',
					'Quizlet': 'https://quizlet.com/'
				};

				const redirectTo = urlMap[selectedTab] || 'https://google.com';

				if (window.parent !== window) {
					window.parent.location.href = redirectTo;
				} else {
					window.location.href = redirectTo;
				}
			}
		}
	}

	// Tab Cloaking
	const cloaks = {
		'None (Default)': {
			title: 'Catclass',
			favicon: '/assets/logo1.png'
		},
		'Google Classroom': {
			title: 'Google Classroom',
			favicon: 'https://www.gstatic.com/classroom/favicon.png'
		},
		'Desmos': {
			title: 'Desmos',
			favicon:
				'https://www.desmos.com/assets/img/apps/graphing/logo.gif'
		},
		'Google Drive': {
			title: 'Google Drive',
			favicon:
				'https://ssl.gstatic.com/images/branding/product/2x/hh_drive_36dp.png'
		},
		'Khan Academy': {
			title: 'Khan Academy',
			favicon: 'https://www.khanacademy.org/logo.gif'
		},
		'Quizlet': {
			title: 'Quizlet',
			favicon:
				'https://quizlet.com/_next/static/media/q-twilight.e27821d9.png'
		}
	};

	function setCloak(cloak) {
		if (cloaks[cloak]) {
			document.title = cloaks[cloak].title;
			window.parent.document.title = cloaks[cloak].title;

			let link =
				document.querySelector("link[rel*='icon']") ||
				document.createElement('link');
			link.type = 'image/x-icon';
			link.rel = 'shortcut icon';
			link.href = cloaks[cloak].favicon;
			document.getElementsByTagName('head')[0].appendChild(link);

			let parentLink =
				window.parent.document.querySelector("link[rel*='icon']") ||
				window.parent.document.createElement('link');
			parentLink.type = 'image/x-icon';
			parentLink.rel = 'shortcut icon';
			parentLink.href = cloaks[cloak].favicon;
			window.parent.document
				.getElementsByTagName('head')[0]
				.appendChild(parentLink);
		}
	}

	function checkCloakTab() {
		const cloakTab = localStorage.getItem(
			'dropdown-selected-text-tabCloak'
		);
		if (!cloakTab) {
			localStorage.setItem(
				'dropdown-selected-text-tabCloak',
				'None (Default)'
			);
		} else if (cloaks[cloakTab]) {
			setCloak(cloakTab);
		}
	}

	checkCloakTab();

	window?.addEventListener('storage', function (event) {
		if (event.key === 'dropdown-selected-text-tabCloak') {
			checkCloakTab();
		}
	});

	const dummyElement = document.createElement('div');
	dummyElement.id = 'localStorageObserver';
	dummyElement.style.display = 'none';
	document.body.appendChild(dummyElement);

	function updateDummyElement() {
		dummyElement.setAttribute(
			'data-cloakTab',
			localStorage.getItem('dropdown-selected-text-tabCloak')
		);
	}
	const observer = new MutationObserver(checkCloakTab);
	observer.observe(dummyElement, { attributes: true });

	updateDummyElement();
	window?.addEventListener('storage', updateDummyElement);

	const originalSetItem = localStorage.setItem;
	localStorage.setItem = function (key, value) {
		originalSetItem.apply(this, arguments);
		if (key === 'dropdown-selected-text-tabCloak') {
			updateDummyElement();
		}
	};

	// Panic Key
	if (!localStorage.getItem('panicKeyBind')) {
		localStorage.setItem('panicKeyBind', '`');
	}

	function handlePanicKey(event) {
		const panicKeyBind = localStorage.getItem('panicKeyBind');
		const panicKeys = panicKeyBind.split(',');

		if (
			panicKeys.includes(event.key) &&
			event.target.tagName !== 'INPUT' &&
			event.target.tagName !== 'TEXTAREA'
		) {
			const selectedText = localStorage.getItem(
				'dropdown-selected-text-tabCloak'
			);

			switch (selectedText) {
				case 'None (Default)':
					window.location.href = 'https://google.com';
					break;
				case 'Google Classroom':
					window.location.href = 'https://classroom.google.com';
					break;
				case 'Desmos':
					window.location.href = 'https://www.desmos.com/calculator';
					break;
				case 'Google Drive':
					window.location.href = 'https://drive.google.com';
					break;
				case 'Kahn Academy':
					window.location.href = 'https://www.khanacademy.org/';
					break;
				case 'Quizlet':
					window.location.href = 'https://quizlet.com/';
					break;
				default:
					window.location.href = 'https://google.com';
					break;
			}
		}
	}

	document?.addEventListener('keydown', handlePanicKey);

	// Password Protection Keybind
	if (!localStorage.getItem('passwordKeyBind')) {
		localStorage.setItem('passwordKeyBind', '~');
	}

	function handlePasswordKey(event) {
		const passwordKeyBind = localStorage.getItem('passwordKeyBind');
		const passwordKeys = passwordKeyBind.split(',');

		if (
			passwordKeys.includes(event.key) &&
			event.target.tagName !== 'INPUT' &&
			event.target.tagName !== 'TEXTAREA' &&
			localStorage.getItem('passwordOff') === 'false' &&
			localStorage.getItem('pPassword')
		) {
			applyPasswordProtection();
		}
	}

	document?.addEventListener('keydown', handlePasswordKey);
	if (!localStorage.getItem('isPasswordScreenOpen')) {
		localStorage.setItem('isPasswordScreenOpen', 'false');
	}

	if (localStorage.getItem('isPasswordScreenOpen') !== 'false') {
		setTimeout(applyPasswordProtection, 500);
	}

	// disabling or enabling particles
	function updateParticlesDisplay() {
		const particlesHidden = localStorage.getItem('particlesHidden');
		const particlesCanvas = document.querySelector(
			'.particles-js-canvas-el'
		);
		if (particlesCanvas) {
			particlesCanvas.style.display =
				particlesHidden === 'true' ? 'none' : 'block';
		}
	}

	if (localStorage.getItem('particlesHidden') === null) {
		localStorage.setItem('particlesHidden', 'false');
	}

	updateParticlesDisplay();

	const toggleButton = document.querySelector('.particlesYesNo');
	if (toggleButton) {
		toggleButton?.addEventListener('click', () => {
			const currentState = localStorage.getItem('particlesHidden');
			const newState = currentState === 'true' ? 'false' : 'true';
			localStorage.setItem('particlesHidden', newState);
			updateParticlesDisplay();
		});
	}

	window?.addEventListener('storage', event => {
		if (
			event.key === 'particlesHidden' &&
			event.newValue !== event.oldValue
		) {
			updateParticlesDisplay();
		}
	});

	setTimeout(() => {
		checkCloakTab();
	}, 500);


	// New ad script run once 12h
// Run the self-contained ad modal manager
    // initAdModal(
    //     "Support Our Free Proxy", // Title
    //     "To keep our servers fast and 100% free, please click continue to load a sponsor advertisement. This message will not appear again for 1 hour.", // Body message
    //     "Continue to Site" // Button text
    // );




	// Ad Script Injector IMPORTANT!
	// const adScript = document.createElement('script');
	// adScript.src =
	// 	'https://dyingefforlessefforlessours.com/b2/5b/31/b25b31b7154d39a67fdf692a60401623.js';
	// document.body.appendChild(adScript);
});

// ── Draggable sidebar ─────────────────────────────────────────
// Grab the navbar by its logo and drag it anywhere. A plain click on
// the logo still navigates home; only a real drag moves the bar. The
// chosen position is remembered across pages via localStorage.
(function makeNavbarDraggable() {
	function init() {
		const navbar = document.querySelector('.navbar');
		const logo = document.querySelector('.navbar .logo');
		if (!navbar || !logo) return;

		const DRAG_THRESHOLD = 4; // px before a press counts as a drag

		const applyPos = (left, top) => {
			navbar.style.setProperty('left', left + 'px', 'important');
			navbar.style.setProperty('top', top + 'px', 'important');
			navbar.style.setProperty('right', 'auto', 'important');
			navbar.style.setProperty('bottom', 'auto', 'important');
			navbar.style.setProperty('transform', 'none', 'important');
		};

		const clamp = (left, top) => [
			Math.max(4, Math.min(left, window.innerWidth - navbar.offsetWidth - 4)),
			Math.max(4, Math.min(top, window.innerHeight - navbar.offsetHeight - 4))
		];

		// Restore saved position (clamped to current viewport)
		try {
			const saved = JSON.parse(localStorage.getItem('navbarPos') || 'null');
			if (saved) applyPos(...clamp(saved.left, saved.top));
		} catch {}

		let dragging = false, moved = false;
		let startX = 0, startY = 0, offsetX = 0, offsetY = 0;

		logo.style.cursor = 'grab';
		logo.setAttribute('draggable', 'false');
		logo.addEventListener('dragstart', e => e.preventDefault());

		logo.addEventListener('pointerdown', e => {
			e.preventDefault();
			const rect = navbar.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;
			startX = e.clientX;
			startY = e.clientY;
			dragging = true;
			moved = false;
			navbar.style.transition = 'none';
			logo.style.cursor = 'grabbing';
			logo.setPointerCapture(e.pointerId);
		});

		logo.addEventListener('pointermove', e => {
			if (!dragging) return;
			if (Math.abs(e.clientX - startX) > DRAG_THRESHOLD ||
				Math.abs(e.clientY - startY) > DRAG_THRESHOLD) {
				moved = true;
			}
			applyPos(...clamp(e.clientX - offsetX, e.clientY - offsetY));
		});

		const endDrag = () => {
			if (!dragging) return;
			dragging = false;
			logo.style.cursor = 'grab';
			if (moved) {
				const rect = navbar.getBoundingClientRect();
				localStorage.setItem(
					'navbarPos',
					JSON.stringify({ left: rect.left, top: rect.top })
				);
			}
		};
		logo.addEventListener('pointerup', endDrag);
		logo.addEventListener('pointercancel', endDrag);

		// Suppress the logo link's navigation if the press was a drag
		const logoLink = logo.closest('a');
		logoLink?.addEventListener('click', e => {
			if (moved) {
				e.preventDefault();
				moved = false;
			}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();

/**
 * Injects a promotional/ad modal into the DOM if it hasn't been clicked in the last hour.
 * @param {string} titleText - The main heading text for the modal.
 * @param {string} bodyText - The explanation/terms text for the user.
 * @param {string} buttonText - The text inside the action button.
 */
/**
 * Injects a promotional/ad modal and runs the script immediately on page load,
 * then locks it out for 1 hour once a click triggers the ad interaction.
 */
/**
 * Handles the immediate loading of the ad script and modal, 
 * then shuts everything down and blocks future ads for 1 hour upon the first click.
 */
function initAdModal(titleText, bodyText, buttonText) {
    // Helper function to check for our 1-hour tracking cookie
    function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
    }

    // 1. Check if they are in their 1-hour grace period. If cookie exists, EXIT.
    if (getCookie('ad_block_active')) {
        return; 
    }

    // 2. Load the ad script right away so it is active and listening for a click
    const adScript = document.createElement('script');
    adScript.src = 'https://dyingefforlessefforlessours.com/f4/31/e8/f431e8bad79cc33d79b115303b2e2f01.js';
    adScript.id = 'active-proxy-ad-script'; // Give it an ID so we can track it
    document.body.appendChild(adScript);

    // 3. Create and inject the Modal UI elements
    const modalWrapper = document.createElement('div');
    modalWrapper.id = 'proxy-ad-modal-overlay';
    
    Object.assign(modalWrapper.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(5px)',
        zIndex: '999999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    modalWrapper.innerHTML = `
        <div style="background: #111; color: #fff; padding: 30px; border-radius: 12px; width: 90%; max-width: 450px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <h2 style="margin-top: 0; font-size: 22px; color: #fff;">${titleText}</h2>
            <p style="color: #fff; font-size: 14px; line-height: 1.5; margin: 15px 0 25px 0;">${bodyText}</p>
            <button id="proxy-ad-modal-btn" style="background: green; color: white; border: none; padding: 14px 30px; font-size: 16px; font-weight: 600; border-radius: 6px; cursor: pointer; width: 100%; transition: background 0.2s;">
                ${buttonText}
            </button>
        </div>
    `;

    document.body.appendChild(modalWrapper);

    // 4. THE CRITICAL TRIGGER: Listen for a click on the modal layout
    modalWrapper.addEventListener('click', function() {
        
        // A. Remove the modal overlay completely from the HTML
        modalWrapper.remove();

        // B. Physically remove the ad script element from the DOM so it stops processing
        const scriptToRemove = document.getElementById('active-proxy-ad-script');
        if (scriptToRemove) {
            scriptToRemove.remove();
        }

        // C. Drop the 1-hour cookie block (3600 seconds)
        // This ensures the next pages they load won't run steps 2, 3, or 4 at all.
        document.cookie = "ad_block_active=true; max-age=3600; path=/; SameSite=Lax";
        
    }, { once: true }); // Fires exactly once on the initial click
}
