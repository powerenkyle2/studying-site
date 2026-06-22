// ─── Game Stats ───────────────────────────────────────────────────────────────

window.__GAME_STATS__ = {};
window.__STATS_READY__ = fetch('/api/stats')
	.then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
	.then(d => { window.__GAME_STATS__ = d || {}; })
	.catch(e => console.error('[stats] failed to load:', e));

let _currentGameName = null;

function _fmtCount(n) {
	n = Math.max(0, n || 0);
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
	if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
	return String(n);
}

function _getLikedGames() {
	try { return JSON.parse(localStorage.getItem('likedGames') || '[]'); } catch { return []; }
}

function _isLiked(name) { return _getLikedGames().includes(name); }

function _getStatEls() {
	return {
		likeNum: document.getElementById('gameLikeNum'),
		likeBtn: document.getElementById('gameLikeBtn'),
	};
}

function _updateStatsDisplay() {
	const name = _currentGameName;
	if (!name) return;
	const { likeNum, likeBtn } = _getStatEls();
	if (!likeNum || !likeBtn) return;

	const s = window.__GAME_STATS__[name] || { views: 0, likes: 0 };
	const liked = _isLiked(name);

	likeNum.textContent = _fmtCount(s.likes);
	likeBtn.classList.toggle('stats-liked', liked);

	const icon = likeBtn.querySelector('.material-symbols-outlined');
	if (icon) icon.textContent = liked ? 'favorite' : 'favorite_border';
}

function _recordView(name) {
	const key = 'sv_' + name;
	// Ensure entry exists in local cache so display shows 0 immediately
	if (!window.__GAME_STATS__[name]) window.__GAME_STATS__[name] = { views: 0, likes: 0 };
	_updateStatsDisplay();
	if (sessionStorage.getItem(key)) return; // already counted this session
	sessionStorage.setItem(key, '1');
	fetch('/api/stats/view', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name })
	})
	.then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
	.then(s => { window.__GAME_STATS__[name] = s; _updateStatsDisplay(); })
	.catch(e => console.error('[stats] view failed:', e));
}

function _toggleLike(name) {
	const nowLiked = !_isLiked(name);

	// 1. Update localStorage immediately
	const list = _getLikedGames().filter(n => n !== name);
	if (nowLiked) list.push(name);
	localStorage.setItem('likedGames', JSON.stringify(list));

	// 2. Optimistically update the cached count so UI reflects change right away
	if (!window.__GAME_STATS__[name]) window.__GAME_STATS__[name] = { views: 0, likes: 0 };
	window.__GAME_STATS__[name].likes = Math.max(0, window.__GAME_STATS__[name].likes + (nowLiked ? 1 : -1));
	_updateStatsDisplay();

	// 3. Confirm with server and sync real count
	fetch('/api/stats/like', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, liked: nowLiked })
	})
	.then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
	.then(s => { window.__GAME_STATS__[name] = s; _updateStatsDisplay(); })
	.catch(e => {
		console.error('[stats] like failed:', e);
		// Revert on failure
		window.__GAME_STATS__[name].likes = Math.max(0, window.__GAME_STATS__[name].likes + (nowLiked ? -1 : 1));
		const revert = _getLikedGames().filter(n => n !== name);
		if (!nowLiked) revert.push(name);
		localStorage.setItem('likedGames', JSON.stringify(revert));
		_updateStatsDisplay();
	});
}

// ─── Shared proxy launch + in-page browser chrome ─────────────────────────────
// Both / (home) and /g (games) call launchInIframe() to load a URL in #intospace.
// A browser-style top bar (back / forward / refresh / URL / home / close) is
// injected on demand and shown only while the iframe is active.

async function registerSW() {
	if (!('serviceWorker' in navigator)) return;
	await setTransports();
	// Register the wrapper SW (/@/sw.js), NOT __uv$config.sw directly.
	// The wrapper importScripts() the UV bundle + config before loading
	// uv.sw.js, which is what gives the SW its `Ultraviolet` global.
	// Registering uv.sw.js directly leaves Ultraviolet undefined and the
	// SW dies on its first line ("Cannot read properties of undefined (reading 'EventEmitter')").
	const reg = await navigator.serviceWorker
		.register('/@/sw.js', { scope: __uv$config.prefix })
		.catch(error => {
			console.error('ServiceWorker registration failed:', error);
			return null;
		});
	// Wait for the SW to become active before any proxy request goes out.
	// On a first visit the SW goes through install→activate; without this
	// the iframe src fires before the SW controls the page → 404 on BYOD.
	// We wait on the specific registration (not navigator.serviceWorker.ready,
	// which waits for a SW matching the *page* scope — our SW scope is /@/
	// but the page lives at / or /g, so ready would hang forever).
	if (reg && !reg.active) {
		await new Promise(resolve => {
			const pending = reg.installing || reg.waiting;
			if (!pending) return resolve();
			pending.addEventListener('statechange', function h() {
				if (pending.state === 'activated' || pending.state === 'redundant') {
					pending.removeEventListener('statechange', h);
					resolve();
				}
			});
		});
	}
}

const BBAR_HEIGHT = 44;
const BBAR_HEIGHT_MOBILE = 40;
let _bbarPollTimer = null;
let _bbarUserTyping = false;

function injectBrowserBar() {
	if (document.getElementById('catclassBrowserBar')) return;

	const style = document.createElement('style');
	style.id = 'catclassBrowserBarStyles';
	style.textContent = `
		#catclassBrowserBar,
		#catclassBrowserBar *,
		#catclassBrowserBar *::before,
		#catclassBrowserBar *::after {
			box-sizing: border-box;
		}
		#catclassBrowserBar {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			height: ${BBAR_HEIGHT}px;
			background: rgba(22, 22, 22, 0.96);
			backdrop-filter: blur(10px);
			-webkit-backdrop-filter: blur(10px);
			display: none;
			align-items: center;
			gap: 4px;
			padding: 0 10px;
			z-index: 99999999;
			border-bottom: 1px solid #2a2a2a;
			font-family: 'DM Sans', system-ui, sans-serif;
			overflow: hidden;
		}
		#catclassBrowserBar.visible { display: flex; }
		#catclassBrowserBar button {
			background: transparent;
			border: none;
			width: 34px;
			height: 34px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			color: #cfcfcf;
			cursor: pointer;
			border-radius: 8px;
			transition: background 0.15s, color 0.15s;
			padding: 0;
			flex: 0 0 auto;
		}
		#catclassBrowserBar button:hover { background: #2a2a2a; color: #fff; }
		#catclassBrowserBar button:active { background: #333; }
		#catclassBrowserBar button .material-symbols-outlined {
			font-size: 22px;
			line-height: 1;
		}
		#catclassBrowserBar .bb-form {
			flex: 1 1 0;
			min-width: 0;
			width: 0;
			display: flex;
			margin: 0;
			padding: 0;
		}
		#catclassBrowserBar input.bb-url {
			flex: 1 1 0;
			width: 100%;
			min-width: 0;
			background: #2a2a2a;
			border: 1px solid transparent;
			border-radius: 999px;
			padding: 7px 16px;
			color: #e2e2e2;
			font-size: 13px;
			outline: none;
			font-family: inherit;
			transition: background 0.15s, border-color 0.15s;
		}
		#catclassBrowserBar input.bb-url:focus {
			background: #333;
			border-color: #4a4a4a;
		}
		body.bbar-active #intospace {
			top: ${BBAR_HEIGHT}px !important;
			height: calc(100vh - ${BBAR_HEIGHT}px) !important;
		}
		@media (max-width: 640px) {
			#catclassBrowserBar {
				height: ${BBAR_HEIGHT_MOBILE}px;
				padding: 0 4px;
				gap: 3px;
				max-width: calc(100vw - 50px);
			}
			#catclassBrowserBar .bb-back,
			#catclassBrowserBar .bb-forward,
			#catclassBrowserBar .bb-refresh {
				display: none;
			}
			#catclassBrowserBar button { width: 30px; height: 30px; border-radius: 6px; }
			#catclassBrowserBar button .material-symbols-outlined { font-size: 19px; }
			#catclassBrowserBar input.bb-url { font-size: 12px; padding: 5px 12px; }
			body.bbar-active #intospace {
				top: ${BBAR_HEIGHT_MOBILE}px !important;
				height: calc(100vh - ${BBAR_HEIGHT_MOBILE}px) !important;
			}
		}
	`;
	document.head.appendChild(style);

	const bar = document.createElement('div');
	bar.id = 'catclassBrowserBar';
	bar.innerHTML = `
		<button class="bb-back" title="Back" aria-label="Back"><span class="material-symbols-outlined">arrow_back</span></button>
		<button class="bb-forward" title="Forward" aria-label="Forward"><span class="material-symbols-outlined">arrow_forward</span></button>
		<button class="bb-refresh" title="Refresh" aria-label="Refresh"><span class="material-symbols-outlined">refresh</span></button>
		<form class="bb-form" autocomplete="off">
			<input class="bb-url" type="text" placeholder="Enter URL or search..." spellcheck="false" />
		</form>
		<button class="bb-close" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
	`;
	document.body.appendChild(bar);

	const iframe = document.getElementById('intospace');
	const urlInput = bar.querySelector('.bb-url');

	urlInput?.addEventListener('focus', () => {
		_bbarUserTyping = true;
		urlInput.select();
	});
	urlInput?.addEventListener('blur', () => { _bbarUserTyping = false; });

	bar.querySelector('.bb-back')?.addEventListener('click', () => {
		try { iframe.contentWindow.history.back(); } catch (e) {}
	});

	bar.querySelector('.bb-forward')?.addEventListener('click', () => {
		try { iframe.contentWindow.history.forward(); } catch (e) {}
	});

	bar.querySelector('.bb-refresh')?.addEventListener('click', () => {
		try { iframe.contentWindow.location.reload(); }
		catch (e) { iframe.src = iframe.src; }
	});

	bar.querySelector('.bb-close')?.addEventListener('click', () => {
		hideBrowserBar();
		iframe.src = 'about:blank';
		iframe.style.display = 'none';
		const fsBtn = document.getElementById('gameFullscreenBtn');
		if (fsBtn) fsBtn.style.display = 'none';
		document.querySelectorAll('[data-bbar-hidden]').forEach(el => {
			el.style.display = '';
			el.removeAttribute('data-bbar-hidden');
		});
	});

	bar.querySelector('.bb-form')?.addEventListener('submit', (e) => {
		e.preventDefault();
		const val = urlInput.value.trim();
		if (!val) return;
		const resolved = typeof search === 'function' ? search(val) : val;
		iframe.src = __uv$config.prefix + __uv$config.encodeUrl(resolved);
		urlInput.blur();
	});
}

function showBrowserBar() {
	const bar = document.getElementById('catclassBrowserBar');
	if (bar) bar.classList.add('visible');
	document.body.classList.add('bbar-active');
	startBbarPolling();
}

function hideBrowserBar() {
	const bar = document.getElementById('catclassBrowserBar');
	if (bar) bar.classList.remove('visible');
	document.body.classList.remove('bbar-active');
	stopBbarPolling();
}

function startBbarPolling() {
	stopBbarPolling();
	_bbarPollTimer = setInterval(() => {
		const iframe = document.getElementById('intospace');
		const urlInput = document.querySelector('#catclassBrowserBar .bb-url');
		if (!iframe || !urlInput || iframe.style.display === 'none') return;
		if (_bbarUserTyping) return;

		let href;
		try { href = iframe.contentWindow.location.href; }
		catch (e) { return; } // cross-origin race during nav

		// Skip transient/non-proxy URLs. Decoding them through the XOR codec
		// produces garbage like `a`owt8bnalk` (from about:blank) or
		// `hvtr:-/noaanhmsv:1022...` (from error pages on localhost), which we
		// must never show in the bar.
		if (!href || href === 'about:blank' || !href.startsWith(location.protocol)) return;

		const prefixed = location.origin + __uv$config.prefix;
		if (!href.startsWith(prefixed)) return;

		const stripped = href.slice(prefixed.length);
		let displayUrl;
		try {
			displayUrl = __uv$config.decodeUrl(decodeURIComponent(stripped));
		} catch (e) { return; }

		// Final sanity: decoded URL must look like a real http(s) URL.
		if (!displayUrl || !/^https?:\/\//i.test(displayUrl)) return;

		if (urlInput.value !== displayUrl) urlInput.value = displayUrl;
	}, 300);
}

function stopBbarPolling() {
	if (_bbarPollTimer) {
		clearInterval(_bbarPollTimer);
		_bbarPollTimer = null;
	}
}

function shouldShowBrowserBar() {
	const path = window.location.pathname;
	return path === '/' || path === '/p';
}

// DuckMath/Poki-style game view: a contained 16:9 player with a footer bar
// (title + fullscreen + close) and a right rail of recommended game tiles.
// The #intospace iframe is moved into the player box on first build.
function buildGameStage(name) {
	let stage = document.getElementById('gameStage');
	if (!stage) {
		
								// <!-- <span id="gameStatViews" title="Views">
								// 	<span class="material-symbols-outlined">visibility</span>
								// 	<span id="gameViewNum">—</span>
								// </span> -->
		stage = document.createElement('div');
		stage.id = 'gameStage';
		stage.innerHTML = `
			<div id="gameLeft">
				<div id="gameTop">
					<div id="gameMain">
						<div id="gamePlayer"></div>
						<div id="gameBar">
							<span id="gameBarTitle"></span>
							<div id="gameBarStats">
								<button id="gameLikeBtn" title="Like this game" aria-label="Like">
									<span class="material-symbols-outlined">favorite_border</span>
									<span id="gameLikeNum">—</span>
								</button>
							</div>
							<div id="gameBarActions">
								<button id="gameFsBtn" title="Fullscreen" aria-label="Fullscreen"><span class="material-symbols-outlined">fullscreen</span></button>
								<button id="gameCloseBtn" title="Close" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
							</div>
						</div>
					</div>
					<div class="game-ad" id="gameSideAd"><span>Advertisement</span></div>
				</div>
				<div class="game-ad" id="gameBottomAd"><span>Advertisement</span></div>
			</div>
			<div id="gameRecs"></div>
			<div id="recSentinel"></div>
		`;
		document.body.appendChild(stage);

		const iframe = document.getElementById('intospace');
		if (iframe) document.getElementById('gamePlayer').appendChild(iframe);

		document
			.getElementById('gameFsBtn')
			?.addEventListener('click', toggleGamePlayerFs);
		document
			.getElementById('gameCloseBtn')
			?.addEventListener('click', () => {
				window.location.href = '/g';
			});
		document
			.getElementById('gameLikeBtn')
			?.addEventListener('click', () => {
				if (_currentGameName) _toggleLike(_currentGameName);
			});
		document.addEventListener('fullscreenchange', () => {
			const icon = document.querySelector(
				'#gameFsBtn .material-symbols-outlined'
			);
			if (icon)
				icon.textContent = document.fullscreenElement
					? 'fullscreen_exit'
					: 'fullscreen';
		});

		renderRecs();
	}
	stage.style.display = 'block';
	stage.scrollTop = 0;
	const title = document.getElementById('gameBarTitle');
	if (title) title.textContent = name || 'Now Playing';
}

function toggleGamePlayerFs() {
	const player = document.getElementById('gamePlayer');
	if (!player) return;
	if (!document.fullscreenElement) {
		(player.requestFullscreen ||
			player.webkitRequestFullscreen ||
			player.msRequestFullscreen)?.call(player);
	} else {
		(document.exitFullscreen ||
			document.webkitExitFullscreen ||
			document.msExitFullscreen)?.call(document);
	}
}

// Recommended games grid with INFINITE SCROLL. Pulls from the full games
// list (window.__GAMES__ or g.json), shuffles it, and appends batches as the
// user nears the bottom — looping the shuffled pool so it never runs out.
const REC_BATCH = 24;
let _recPool = [];
let _recIndex = 0;

function _shuffle(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

function makeRecEl(g) {
	const a = document.createElement('a');
	a.className = 'gameRec';
	a.href = `/g?q=${encodeURIComponent(g.name)}`;
	a.title = g.name;
	const img = document.createElement('img');
	img.src = g.img || '/assets/default.png';
	img.alt = g.name;
	img.loading = 'lazy';
	img.onerror = () => {
		img.src = '/assets/default.png';
	};
	a.appendChild(img);
	a.addEventListener('click', e => {
		e.preventDefault();
		launchInIframe(g.url, g.name);
	});
	return a;
}

const AD_IN_RECS = 8; // inject 1 ad tile every N game tiles in the recs rail

function appendRecBatch() {
	const recs = document.getElementById('gameRecs');
	if (!recs || !_recPool.length) return;
	const frag = document.createDocumentFragment();
	for (let n = 0; n < REC_BATCH; n++) {
		if (_recIndex >= _recPool.length) {
			_shuffle(_recPool); // loop the pool → truly infinite
			_recIndex = 0;
		}
		frag.appendChild(makeRecEl(_recPool[_recIndex++]));
		// Every AD_IN_RECS game tiles, slip in an ad tile (always small — no data-big in inline-block flow)
		if ((n + 1) % AD_IN_RECS === 0 && typeof window.createAdTile === 'function') {
			const tile = window.createAdTile();
			if (tile) {
				delete tile.dataset.big; // force small — big tiles cause gaps in inline-block layout
				frag.appendChild(tile);
			}
		}
	}
	recs.appendChild(frag);
}

async function renderRecs() {
	const recs = document.getElementById('gameRecs');
	const stage = document.getElementById('gameStage');
	if (!recs || !stage) return;

	let all = Array.isArray(window.__GAMES__) ? window.__GAMES__.slice() : [];
	if (!all.length) {
		try {
			all = await fetch('/json/g.json').then(r => r.json());
		} catch {
			all = [];
		}
	}
	if (!all.length) return;

	_recPool = _shuffle(all);
	_recIndex = 0;
	recs.innerHTML = '';
	appendRecBatch();

	// Make sure there's enough to scroll, then load more on scroll.
	let guard = 0;
	while (stage.scrollHeight <= stage.clientHeight + 300 && guard++ < 15) {
		appendRecBatch();
	}
	if (!stage._recScrollBound) {
		stage.addEventListener('scroll', () => {
			if (
				stage.scrollTop + stage.clientHeight >=
				stage.scrollHeight - 800
			) {
				appendRecBatch();
			}
		});
		stage._recScrollBound = true;
	}
}

// Floating fullscreen toggle shown while a game/site is open. Works on both
// /g and the home proxy, desktop and mobile.
function injectFullscreenBtn() {
	let btn = document.getElementById('gameFullscreenBtn');
	if (btn) {
		btn.style.display = 'flex';
		return;
	}
	btn = document.createElement('button');
	btn.id = 'gameFullscreenBtn';
	btn.title = 'Fullscreen';
	btn.setAttribute('aria-label', 'Fullscreen');
	btn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>';
	document.body.appendChild(btn);

	btn.addEventListener('click', () => {
		const iframe = document.getElementById('intospace');
		if (!iframe) return;
		if (!document.fullscreenElement) {
			(iframe.requestFullscreen ||
				iframe.webkitRequestFullscreen ||
				iframe.msRequestFullscreen)?.call(iframe);
		} else {
			(document.exitFullscreen ||
				document.webkitExitFullscreen ||
				document.msExitFullscreen)?.call(document);
		}
	});

	document.addEventListener('fullscreenchange', () => {
		const icon = btn.querySelector('.material-symbols-outlined');
		if (icon)
			icon.textContent = document.fullscreenElement
				? 'fullscreen_exit'
				: 'fullscreen';
	});
}

async function launchInIframe(input, name) {
	const resolved = typeof search === 'function' ? search(input) : input;

	const iframe = document.getElementById('intospace');
	if (!iframe) {
		console.error('No #intospace iframe on this page');
		return;
	}

	const withBar = shouldShowBrowserBar();
	if (withBar) injectBrowserBar();

	iframe?.addEventListener('load', function onProxyLoad() {
		if (typeof startURLMonitoring === 'function') startURLMonitoring();
	}, { once: true });

	// Service workers require a secure context (HTTPS or localhost).
	// On plain-HTTP BYOD load the URL directly — no UV encoding/proxy.
	let src;
	if (window.isSecureContext) {
		const encoded = __uv$config.prefix + __uv$config.encodeUrl(resolved);
		localStorage.setItem('input', input);
		localStorage.setItem('output', encoded);
		await registerSW();
		if (connection) {
			const activeTransport = await connection.getTransport().catch(() => null);
			if (activeTransport == null) await setTransports();
		}
		src = encoded;
	} else {
		src = resolved;
	}

	// Allow both our fullscreen button and the game's own fullscreen API.
	iframe.setAttribute('allowfullscreen', '');
	iframe.allow = 'fullscreen; autoplay; gamepad; clipboard-write; encrypted-media';

	if (window.location.pathname === '/g') {
		// DuckMath-style contained player + recommended games rail.
		buildGameStage(name);
		_currentGameName = name;
		_recordView(name);
		_updateStatsDisplay();
		iframe.style.cssText =
			'position:absolute;inset:0;width:100%;height:100%;border:none;display:block;background:#000;';
		iframe.src = src;
	} else {
		// Home proxy: fullscreen iframe (+ optional browser bar).
		iframe.src = src;
		iframe.style.display = 'block';
		iframe.style.position = 'fixed';
		iframe.style.left = '0';
		iframe.style.right = '0';
		iframe.style.bottom = '0';
		iframe.style.zIndex = '9999999';
		iframe.style.border = 'none';
		iframe.style.background = '#1b1b1b';
		if (withBar) {
			iframe.style.top = BBAR_HEIGHT + 'px';
			iframe.style.width = '100vw';
			iframe.style.height = `calc(100vh - ${BBAR_HEIGHT}px)`;
			showBrowserBar();
		} else {
			iframe.style.top = '0';
			iframe.style.width = '100vw';
			iframe.style.height = '100vh';
		}
	}

	[
		'.shortcuts', '.shortcutsBig', '#formintospace',
		'.gameContain', '.header', '.scrolltop', '.randomBtn', '.search-header',
		'.blob', '.blobbig', '.blobsmall', '.blobtop'
	].forEach(sel => {
		const el = document.querySelector(sel);
		if (el && el.style.display !== 'none') {
			el.setAttribute('data-bbar-hidden', 'true');
			el.style.display = 'none';
		}
	});

	document.querySelectorAll('input').forEach(i => i.blur());
}
