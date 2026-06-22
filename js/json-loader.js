// Handles loading and rendering resources from the json files, hence json-loader.js

localforage.setItem('e', 'e');

document?.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/g') {
        const INITIAL_COUNT = 250;
        const BG_BATCH_SIZE = 50;
        let allGames = [];
        let bgLoadToken = 0;

        function toKebab(str) {
            return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9]/g, '-');
        }

        function createGameEl(game) {
            const gameLink = document.createElement('a');
            gameLink.href = `/g?q=${encodeURIComponent(game.name)}`;
            gameLink.className = 'gameAnchor';

            gameLink?.addEventListener('click', (e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                if (typeof launchInIframe === 'function') {
                    launchInIframe(game.url, game.name);

                    // 🌟 Set a global flag on the container when a game runs in an iframe
                    const container = document.querySelector('.gameContain');
                    if (container) {
                        container.setAttribute('data-iframe-active', 'true');
                    }
                } else {
                    window.location.href = gameLink.href;
                }
            });

            if (game.categories && game.name) {
                game.categories.forEach(category => {
                    gameLink.id = (gameLink.id ? gameLink.id + ' ' : '') + category;
                });
                gameLink.className += ' ' + toKebab(game.name);
            }

            // Keep your base random layout for initial page loads
            if (Math.random() < 0.16) gameLink.dataset.big = '1';

            const thumb = document.createElement('div');
            thumb.className = 'gameThumb';

            const gameImage = document.createElement('img');
            gameImage.src = game.img || '/assets/default.png';
            gameImage.alt = game.name;
            gameImage.title = game.name;
            gameImage.className = 'gameImage';
            gameImage.loading = 'lazy';
            gameImage.onerror = () => { gameImage.src = '/assets/default.png'; };
            thumb.appendChild(gameImage);

            const title = document.createElement('span');
            title.className = 'gameTitle';
            title.textContent = game.name;

            gameLink.appendChild(thumb);
            gameLink.appendChild(title);
            return gameLink;
        }

		//IMPORTANT
        const AD_EVERY = 3; // insert 1 ad tile every N game tiles

        function appendGames(list, container) {
            const frag = document.createDocumentFragment();
            list.forEach((game, i) => {
                frag.appendChild(createGameEl(game));
                if ((i + 1) % AD_EVERY === 0 && typeof window.createAdTile === 'function') {
                    const tile = window.createAdTile();
                    if (tile) frag.appendChild(tile);
                }
            });
            container.appendChild(frag);
        }

        function loadInBackground(games, from, token) {
            if (token !== bgLoadToken || from >= games.length) return;
            const end = Math.min(from + BG_BATCH_SIZE, games.length);
            const batch = games.slice(from, end);
            const schedFn = window.requestIdleCallback || (cb => setTimeout(cb, 50));
            schedFn(() => {
                if (token !== bgLoadToken) return;
                appendGames(batch, document.querySelector('.gameContain'));
                loadInBackground(games, end, token);
            });
        }

        const gamesPromise = window.__GAMES__
            ? Promise.resolve(window.__GAMES__)
            : fetch('/json/g.json').then(response => response.json());

        // Wait for the game list, the ad-free check, AND the stats before rendering,
        // so ordering and ad visibility are both correct on first paint.
        Promise.all([
            gamesPromise,
            window.__ADS_READY__   || Promise.resolve(true),
            window.__STATS_READY__ || Promise.resolve(),
        ])
            .then(([data]) => {
                const alpha = (a, b) => a.name.localeCompare(b.name);
                const hasCategory = (game, cat) =>
                    Array.isArray(game.categories) &&
                    game.categories.some(c => c.toLowerCase() === cat.toLowerCase());

                // 1. Top 15 most-played (descending view count)
                const stats = window.__GAME_STATS__ || {};
                const topPlayed = data
                    .filter(g => stats[g.name] && stats[g.name].views > 0)
                    .sort((a, b) => (stats[b.name]?.views || 0) - (stats[a.name]?.views || 0))
                    .slice(0, 15);
                const topSet = new Set(topPlayed.map(g => g.name));

                // 2. Next 15 from New or Popular categories (not already in top played)
                const featured = data
                    .filter(g => !topSet.has(g.name) && (hasCategory(g, 'Popular') || hasCategory(g, 'New')))
                    .sort(alpha)
                    .slice(0, 15);
                const featuredSet = new Set(featured.map(g => g.name));

                // 3. Everything else alphabetically
                const rest = data
                    .filter(g => !topSet.has(g.name) && !featuredSet.has(g.name))
                    .sort(alpha);

                allGames = [...topPlayed, ...featured, ...rest];
                const container = document.querySelector('.gameContain');

                const initToken = ++bgLoadToken;
                appendGames(allGames.slice(0, INITIAL_COUNT), container);
                loadInBackground(allGames, INITIAL_COUNT, initToken);

                const urlParams = new URLSearchParams(window.location.search);
                const q = urlParams.get('q');
                if (q && typeof launchInIframe === 'function') {
                    const match = allGames.find(g => g.name.toLowerCase() === q.toLowerCase());
                    if (match) {
                        launchInIframe(match.url, match.name);
                        // 🌟 Set flag if loaded directly from a URL query parameter
                        container.setAttribute('data-iframe-active', 'true');
                    }
                }

                const gameSearchInput = document.querySelector('.gameSearchInput');
                if (gameSearchInput) {
                    gameSearchInput.placeholder = `Search in ${allGames.length} Catclass Games...`;
                }
                gameSearchInput?.addEventListener('input', () => {
                    const query = gameSearchInput.value.trim().toLowerCase();
                    const token = ++bgLoadToken;
                    container.innerHTML = '';
                    if (!query) {
                        appendGames(allGames.slice(0, INITIAL_COUNT), container);
                        loadInBackground(allGames, INITIAL_COUNT, token);
                        return;
                    }
                    const filtered = allGames.filter(g => g.name.toLowerCase().includes(query));
                    appendGames(filtered, container);
                });

                document.querySelector('.randomBtn')?.addEventListener('click', () => {
                    if (allGames.length > 0) {
                        const query = gameSearchInput.value.trim().toLowerCase();
                        const pool = query
                            ? allGames.filter(g => g.name.toLowerCase().includes(query))
                            : allGames;
                        if (pool.length > 0) {
                            const game = pool[Math.floor(Math.random() * pool.length)];
                            if (typeof launchInIframe === 'function') {
                                launchInIframe(game.url, game.name);
                                container.setAttribute('data-iframe-active', 'true');
                            } else {
                                window.location.href = `/g?q=${encodeURIComponent(game.name)}`;
                            }
                        }
                    }
                });
            })
            .catch(error => console.error('Error loading game :( ', error));

        const scrollToTopBtn = document.querySelector('.scrolltop');

        window?.addEventListener('scroll', function () {
            if (window.scrollY === 0) {
                scrollToTopBtn.style.opacity = '0';
            } else {
                scrollToTopBtn.style.opacity = '1';
            }
        });

        scrollToTopBtn?.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // [Shortcuts processing logic remains completely unchanged below...]
    if (
        ['/p', '/'].includes(window.location.pathname) &&
        localStorage.getItem('smallIcons') === 'true'
    ) {
        fetch('/json/shortcuts.json')
            .then(response => response.json())
            .then(data => {
                const shortcuts = document.querySelector('.shortcuts');

                data.forEach(shortcut => {
                    const shortcutLink = document.createElement('a');

                    if (shortcut.name.toLowerCase() === 'settings') {
                        shortcutLink.href = '/settings/#/proxy';
                    } else {
                        shortcutLink.href = `/?q=${encodeURIComponent(shortcut.name)}`;
                        shortcutLink.addEventListener('click', (e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                            e.preventDefault();
                            if (typeof launchInIframe === 'function') {
                                launchInIframe(shortcut.url);
                            } else {
                                window.location.href = shortcutLink.href;
                            }
                        });
                    }

                    const shortcutImage = document.createElement('img');
                    shortcutImage.src = shortcut.img;
                    shortcutImage.alt = shortcut.name;
                    shortcutImage.title = shortcut.name;
                    shortcutImage.classList.add('shortcut');

                    shortcutImage.style.width = '28px';
                    shortcutImage.style.height = '28px';
                    shortcutImage.style.padding = '11px';
                    shortcutImage.style.objectFit = 'cover';
                    shortcutImage.style.transition = '0.2s';

                    document.querySelector('.searchEngineIcon').style.display =
                        'none';
                    document.querySelector(
                        '.gointospaceSearchButton'
                    ).style.cssText =
                        'transform: translate(-11px, 3px); user-select: none; cursor: default;';
                    document.getElementById('formintospace').style.transform =
                        'translateY(150px)';

                    if (shortcut.style) {
                        shortcutImage.style.cssText += shortcut.style;
                    }

                    if (shortcut.bg) {
                        shortcutImage.style.backgroundColor = shortcut.bg;
                    }

                    shortcutImage.onerror = () => {
                        shortcutImage.src = '/assets/default.png';
                    };

                    shortcutLink.appendChild(shortcutImage);
                    shortcuts.appendChild(shortcutLink);
                });
            })
            .catch(error => console.error('Error loading shortcut :( ', error));
    } else if (
        ['/p', '/'].includes(window.location.pathname) &&
        (localStorage.getItem('smallIcons') === 'false' ||
            !localStorage.getItem('smallIcons'))
    ) {
        fetch('/json/shortcuts-large.json')
            .then(response => response.json())
            .then(data => {
                const shortcuts = document.querySelector('.shortcutsBig');

                data.forEach(shortcut => {
                    const shortcutLink = document.createElement('a');

                    if (shortcut.name.toLowerCase() === 'settings') {
                        shortcutLink.href = '/settings/#/proxy';
                    } else {
                        shortcutLink.href = `/?q=${encodeURIComponent(shortcut.name)}`;
                        shortcutLink.addEventListener('click', (e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                            e.preventDefault();
                            if (typeof launchInIframe === 'function') {
                                launchInIframe(shortcut.url);
                            } else {
                                window.location.href = shortcutLink.href;
                            }
                        });
                    }

                    const shortcutImage = document.createElement('img');
                    shortcutImage.src = shortcut.img;
                    shortcutImage.alt = shortcut.name;
                    shortcutImage.title = shortcut.name;
                    shortcutLink.classList.add('shortcutBig');
                    shortcutImage.classList.add('shortcutBigimg');

                    shortcutImage.onerror = () => {
                        shortcutImage.src = '/assets/default.png';
                    };

                    shortcutLink.appendChild(shortcutImage);
                    shortcuts.appendChild(shortcutLink);
                });
            })
            .catch(error => console.error('Error loading shortcut :( ', error));
    }
});
