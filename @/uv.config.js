self.__uv$config = {
	prefix: '/@/',
	bare: '/',
	encodeUrl: Ultraviolet.codec.xor.encode,
	decodeUrl: Ultraviolet.codec.xor.decode,
	handler: 'https://cdn.jsdelivr.net/gh/powerenkyle2/studying-site@main/%40/uv.handler.js',
	client: 'https://cdn.jsdelivr.net/gh/powerenkyle2/studying-site@main/%40/uv.client.js',
	bundle: 'https://cdn.jsdelivr.net/gh/powerenkyle2/studying-site@main/%40/uv.bundle.js',
	config: 'https://cdn.jsdelivr.net/gh/powerenkyle2/studying-site@main/%40/uv.config.js',
	sw: 'https://cdn.jsdelivr.net/gh/powerenkyle2/studying-site@main/%40/uv.sw.js'
};
