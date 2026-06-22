self.__scramjet$config = {
	prefix: '/scram/res/',
	files: {
		wasm: '/scram/scramjet.wasm.wasm',
		all: '/scram/scramjet.all.js',
		sync: '/scram/scramjet.sync.js'
	},
	siteFlags: {
		'https://discord.com/.*': {
			naiiveRewriter: true
		}
	},
	flags: {
		captureErrors: true,
		cleanErrors: true,
		naiiveRewriter: false,
		rewriterLogs: false,
		scramitize: false,
		serviceworkers: false,
		sourcemaps: true,
		strictRewrites: true,
		syncxhr: false
	},
	codec: {
		encode: (url) => {
			if (!url) return url;
			return encodeURIComponent(
				url
					.toString()
					.split('')
					.map((char, ind) =>
						ind % 2
							? String.fromCharCode(char.charCodeAt() ^ 2)
							: char
					)
					.join('')
			);
		},

		decode: (url) => {
			if (!url) return url;
			let [input, ...search] = url.split('?');

			return (
				decodeURIComponent(input)
					.split('')
					.map((char, ind) =>
						ind % 2
							? String.fromCharCode(char.charCodeAt(0) ^ 2)
							: char
					)
					.join('') + (search.length ? '?' + search.join('?') : '')
			);
		}
	}
};
