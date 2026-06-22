// & is the name of the proxy page, so &.js is the js for the proxy page minus the actual proxy code, because thats long enough to cause readability issues

localStorage.removeItem('iframeCurrentUrl');

let encodedUrl = '';

function shouldBypassProxy(urlString) {
	try {
		const host = new URL(urlString).hostname.toLowerCase();
		return BYPASS_HOSTS.some(
			domain => host === domain || host.endsWith('.' + domain)
		);
	} catch {
		return false;
	}
}

async function executeSearch(query) {
	await launchInIframe(query);
	const iframe = document.getElementById('intospace');
	iframe?.addEventListener('load', function () {
		try {
			const iframeDocument =
				iframe.contentDocument || iframe.contentWindow.document;
			const errorList = iframeDocument.querySelectorAll('ul li');
			if (
				errorList &&
				Array.from(errorList).some(
					li =>
						li.textContent.trim() ===
						'Checking your internet connection'
				)
			) {
				iframe.src = 'about:blank';
				iframe.style.display = 'none';
			}
		} catch (e) {
			// cross-origin iframe access; ignore
		}
		startURLMonitoring();
	});
}


function startURLMonitoring() {
	const iframe = document.getElementById('intospace');
	let lastUrl = iframe.contentWindow.location.href;

	// const checkIframeURL = () => {
		try {
			const currentUrl = iframe.contentWindow.location.href;
			localStorage.setItem('iframeCurrentUrl', currentUrl);
			if (currentUrl !== lastUrl) {
				lastUrl = currentUrl;

				devToggle = false;
				erudaScriptLoaded = false;
				erudaScriptInjecting = false;
				console.log('Iframe navigation detected, Eruda toggle reset.');
			}
		} catch (e) {
			console.log('Error getting iframe url:', e);
		}
	// };

	// setInterval(checkIframeURL, 250);
}

// register event listeners for shit
const formintospace = document.getElementById('formintospace');
formintospace?.addEventListener('submit', function (event) {
	event.preventDefault();
	const query = address1?.value.trim();
	if (query) executeSearch(query);
});
// Make it so that if the user goes to /&?q= it searches it
document?.addEventListener('DOMContentLoaded', function () {
	const urlParams = new URLSearchParams(window.location.search);
	const queryParam = urlParams.get('q');
	if (queryParam) {
		Promise.all([
			fetch('/json/g.json').then(response => response.json()),
			fetch('/json/shortcuts-large.json').then(response => response.json())
		])
			.then(([gData, shortcutsData]) => {
				let item = gData.find(
					d => d.name.toLowerCase() === queryParam.toLowerCase()
				);
				let source = item ? 'g' : null;

				if (!item) {
					item = shortcutsData.find(
						d => d.name.toLowerCase() === queryParam.toLowerCase()
					);
					if (item) source = 'shortcuts';
				}

				if (item) {
					if (source === 'g') {
						document.querySelector('.gPage').id = 'navactive';
					} else {
						document.querySelector('.pPage').id = 'navactive';
					}
					executeSearch(item.url);
				} else {
					console.error('Param not found in json file :(');
				}
			})
			.catch(error => console.error('Error fetching json:', error));
		const iframeEl = document.getElementById('intospace');
		if (iframeEl) {
			iframeEl.style.height = '100vh';
			iframeEl.style.top = '0';
		}
	} else {
		const iframeEl = document.getElementById('intospace');
		const pPage = document.querySelector('.pPage');
		if (pPage) pPage.id = 'navactive';
	}
	startURLMonitoring();
	if (localStorage.getItem('smallIcons') === 'false') {
		switch (localStorage.getItem('dropdown-selected-text-searchEngine')) {
			case 'Duck Duck Go':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/ddg.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.35)';
				break;
			case 'Bing':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/bing.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.65)';
				break;
			case 'Google (default)':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/google.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.2)';
				break;
			case 'Yahoo!':
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/yahoo.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.5)';
				break;
			default:
				document.querySelector('.searchEngineIcon').src =
					'/assets/imgs/b/google.webp';
				document.querySelector('.searchEngineIcon').style.transform =
					'scale(1.2)';
		}
	}
});

// MutationObserver on iframe.src removed — it was unreliable on the ?q=
// initial-load path because src was set inside an async Promise.then() chain.
// launchInIframe() in shared.js now attaches the iframe `load` handler
// directly before changing src, which fires consistently for both flows.

let devToggle = false;
let erudaScriptLoaded = false;
let erudaScriptInjecting = false;

function injectErudaScript(iframeDocument) {
	debugger;
	return new Promise((resolve, reject) => {
		if (erudaScriptLoaded) {
			resolve();
			return;
		}

		if (erudaScriptInjecting) {
			console.warn('Eruda script is already being injected.');
			resolve();
			return;
		}

		erudaScriptInjecting = true;

		const script = iframeDocument.createElement('script');
		script.type = 'text/javascript';
		script.src = 'https://cdn.jsdelivr.net/npm/eruda';
		script.onload = () => {
			erudaScriptLoaded = true;
			erudaScriptInjecting = false;
			resolve();
		};
		script.onerror = event => {
			erudaScriptInjecting = false;
			reject(new Error('Failed to load Eruda script:', event));
		};
		iframeDocument.body.appendChild(script);
	});
}

function injectShowScript(iframeDocument) {
	debugger;
	return new Promise(resolve => {
		const script = iframeDocument.createElement('script');
		script.type = 'text/javascript';
		script.textContent = `
			eruda.init({
				defaults: {
					displaySize: 50,
					transparency: 0.9,
					theme: 'Material Palenight'
				}
			});
			eruda.show();
			document.currentScript.remove();
		`;
		iframeDocument.body.appendChild(script);
		resolve();
	});
}

function injectHideScript(iframeDocument) {
	debugger;
	return new Promise(resolve => {
		const script = iframeDocument.createElement('script');
		script.type = 'text/javascript';
		script.textContent = `
			eruda.hide();
			document.currentScript.remove();
		`;
		iframeDocument.body.appendChild(script);
		resolve();
	});
}

function inspectelement() {
	debugger;
	const iframe = document.getElementById('intospace');
	if (!iframe || !iframe.contentWindow) {
		console.error(
			"Iframe not found or inaccessible. \\(°□°)/ (This shouldn't happen btw)"
		);
		return;
	}

	const iframeDocument = iframe.contentWindow.document;

	const forbiddenSrcs = ['about:blank', null, 'a%60owt8bnalk', 'a`owt8bnalk'];
	if (iframe.contentWindow.location.href.includes(forbiddenSrcs)) {
		console.warn('Iframe src is forbidden, skipping.');
		return;
	}

	if (iframe.contentWindow.document.readyState == 'loading') {
		console.warn(
			'Iframe has not finished loading, skipping Eruda injection. Be patient, jesus fuck.'
		);
		return;
	}

	injectErudaScript(iframeDocument)
		.then(() => {
			if (!devToggle) {
				injectShowScript(iframeDocument);
			} else {
				injectHideScript(iframeDocument);
			}

			devToggle = !devToggle;
		})
		.catch(error => {
			console.error('Error injecting Eruda script:', error);
		});

	iframe.contentWindow?.addEventListener('unload', () => {
		devToggle = false;
		erudaScriptLoaded = false;
		erudaScriptInjecting = false;
		console.log('Iframe navigation detected, Eruda toggle reset.');
	});
}
