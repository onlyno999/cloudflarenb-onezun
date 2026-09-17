let 转码 = 'vl', 转码2 = 'ess', 符号 = '://';

// @ts-ignore
import { connect } from 'cloudflare:sockets';

let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';
let proxyIP = 'proxyip.zone.id'; 
let proxyPort = 443; 

// ==================== 智能分流名单规则配置 ====================
// 1. 强制走 IPv4 优先的域名关键字（AI 与高风控平台）
const IPV4_DOMAINS = [
	'openai.com',
	'chatgpt.com',
	'oaistatic.com',
	'oaiusercontent.com',
	'gemini.google.com',
	'generativelanguage.googleapis.com',
	'ai.google.dev',
	'anthropic.com',
	'claude.ai'
];

// 2. 强制/保持走 IPv6 的域名关键字（流媒体高吞吐平台，跳过 DoH 解析）
const IPV6_DOMAINS = [
	// YouTube 矩阵
	'youtube.com',
	'googlevideo.com',
	'ytimg.com',
	'youtu.be',

	// Twitch (老鼠台)
	'twitch.tv',
	'ttvnw.net',
	'jtvnw.net',

	// TikTok (TK)
	'tiktok.com',
	'tiktokv.com',
	'tiktokcdn.com',
	'byteoversea.com',
	'ibytedtos.com',

	// Netflix / Disney+ 等主流流媒体
	'netflix.com',
	'nflxvideo.net',
	'disneyplus.com',
	'dssott.com',
	'bamgrid.com',

	// 音频与常用社媒流媒体
	'spotify.com',
	'scdn.co',
	'instagram.com',
	'cdninstagram.com'
];

// 判定规则辅助函数
function shouldPreferIPv4(domain) {
	if (!domain || typeof domain !== 'string') return false;
	const lower = domain.toLowerCase();
	
	// 命中流媒体名单（YouTube、TK、老鼠台等），直接返回 false 拒绝转 IPv4，跳过 DoH
	if (IPV6_DOMAINS.some(k => lower.includes(k))) {
		return false;
	}
	
	// 命中 IPv4 名单（ChatGPT / Gemini 等），返回 true 强制解析 IPv4
	if (IPV4_DOMAINS.some(k => lower.includes(k))) {
		return true;
	}
	
	// 其他普通网站默认走系统原生调度（偏向 v6）
	return false;
}

// ==================== 优先 IPv4 解析函数 (DoH) ====================
async function resolveIPv4(domain) {
	if (!domain || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(domain) || domain.includes(':')) {
		return domain;
	}
	try {
		const res = await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
			headers: { 'accept': 'application/dns-json' },
			cf: { cacheTtl: 300 }
		});
		if (!res.ok) return domain;
		const data = await res.json();
		const records = data.Answer?.filter(a => a.type === 1);
		if (records && records.length > 0) {
			return records[Math.floor(Math.random() * records.length)].data;
		}
	} catch (e) {}
	return domain;
}
// =================================================================

async function serveDisguisePage() {
  return new Response('Hello World!', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

if (!isValidUUID(userID)) {
	throw new Error('uuid is not valid');
}

export default {
	async fetch(request, env, ctx) {
		try {
			userID = env.UUID || userID;
			
			if (env.PROXYIP) {
				proxyIP = env.PROXYIP.trim();
			}

            let HIDE = false; 
            let 嘲讽语 = "哎呀你找到了我，但是我就是不给你看，气不气，嘿嘿嘿"; 

            if (env.HIDE !== undefined) {
                HIDE = env.HIDE === 'true';
            } else if (env.HIDE_SUBSCRIPTION !== undefined) {
                HIDE = env.HIDE_SUBSCRIPTION === 'true';
            } else if (env.隐藏 !== undefined) { 
                HIDE = env.隐藏 === 'true';
            }

            if (env.SARCASM_MESSAGE !== undefined) {
                嘲讽语 = env.SARCASM_MESSAGE;
            } else if (env.嘲讽语 !== undefined) { 
                嘲讽语 = env.嘲讽语;
            }

			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				const url = new URL(request.url);
				switch (url.pathname) {
					case '/': 
						return serveDisguisePage(); 
					case `/${userID}`: {
						if (HIDE) {
							return new Response(嘲讽语, {
								status: 200,
								headers: { "Content-Type": "text/plain;charset=utf-8" }
							});
						} else {
							const dynamicProtocolConfig = getDynamicProtocolConfig(userID, request.headers.get('Host'));
							return new Response(`${dynamicProtocolConfig}`, {
								status: 200,
								headers: { "Content-Type": "text/plain;charset=utf-8" }
							});
						}
					}
					default:
						if (url.pathname.startsWith('/proxyip=')) {
							try {
								const pathProxyIP = decodeURIComponent(url.pathname.substring(9)).trim();
								if (pathProxyIP) {
									proxyIP = pathProxyIP;
									return new Response(`临时成功切换全局出站代理为: ${proxyIP}\n`, {
										headers: { 'Content-Type': 'text/plain; charset=utf-8' }
									});
								}
							} catch (e) {}
						}
						return new Response('Not found', { status: 404 });
				}
			} else {
				const url = new URL(request.url);
				let wsPathProxyIP = null;
				if (url.pathname.startsWith('/proxyip=')) {
					try {
						wsPathProxyIP = decodeURIComponent(url.pathname.substring(9)).trim();
					} catch (e) {}
				}
				const finalRuntimeProxy = wsPathProxyIP || url.searchParams.get('proxyip') || proxyIP;

				return await dynamicProtocolOverWSHandler(request, finalRuntimeProxy);
			}
		} catch (err) {
			/** @type {Error} */ let e = err;
			return new Response(e.toString());
		}
	},
};

function parseProxyAddress(serverStr) {
    if (!serverStr) return null;
    serverStr = serverStr.trim();
    
    if (serverStr.startsWith('socks://') || serverStr.startsWith('socks5://')) {
        const urlStr = serverStr.replace(/^socks:\/\//, 'socks5://');
        try {
            const url = new URL(urlStr);
            return {
                type: 'socks5',
                host: url.hostname,
                port: parseInt(url.port) || 1080,
                username: url.username ? decodeURIComponent(url.username) : '',
                password: url.password ? decodeURIComponent(url.password) : ''
            };
        } catch (e) { return null; }
    }
    
    if (serverStr.startsWith('http://') || serverStr.startsWith('https://')) {
        try {
            const url = new URL(serverStr);
            return {
                type: 'http',
                host: url.hostname,
                port: parseInt(url.port) || (serverStr.startsWith('https://') ? 443 : 80),
                username: url.username ? decodeURIComponent(url.username) : '',
                password: url.password ? decodeURIComponent(url.password) : ''
            };
        } catch (e) { return null; }
    }
    
    if (serverStr.startsWith('[')) {
        const closeBracket = serverStr.indexOf(']');
        if (closeBracket > 0) {
            const host = serverStr.substring(1, closeBracket);
            const rest = serverStr.substring(closeBracket + 1);
            if (rest.startsWith(':')) {
                const port = parseInt(rest.substring(1), 10);
                if (!isNaN(port) && port > 0 && port <= 65535) {
                    return { type: 'direct', host, port };
                }
            }
            return { type: 'direct', host, port: 443 };
        }
    }

    const lastColonIndex = serverStr.lastIndexOf(':');
    if (lastColonIndex > 0) {
        const host = serverStr.substring(0, lastColonIndex);
        const portStr = serverStr.substring(lastColonIndex + 1);
        const port = parseInt(portStr, 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
            return { type: 'direct', host, port };
        }
    }
    
    return { type: 'direct', host: serverStr, port: 443 };
}

// SOCKS5 代理连接：保持原生 connect，不优先 v4
async function connectToSocks5(proxyConfig, targetHost, targetPort, initialData) {
    const { host, port, username, password } = proxyConfig;
    const socket = connect({ hostname: host, port: port });
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    
    try {
        const authMethods = username && password ? 
            new Uint8Array([0x05, 0x02, 0x00, 0x02]) : new Uint8Array([0x05, 0x01, 0x00]); 
        
        await writer.write(authMethods);
        const methodResponse = await reader.read();
        if (methodResponse.done || methodResponse.value.byteLength < 2) throw new Error('S5 method selection failed');
        
        const selectedMethod = new Uint8Array(methodResponse.value)[1];
        if (selectedMethod === 0x02) {
            if (!username || !password) throw new Error('S5 requires authentication');
            const userBytes = new TextEncoder().encode(username);
            const passBytes = new TextEncoder().encode(password);
            const authPacket = new Uint8Array(3 + userBytes.length + passBytes.length);
            authPacket[0] = 0x01; 
            authPacket[1] = userBytes.length;
            authPacket.set(userBytes, 2);
            authPacket[2 + userBytes.length] = passBytes.length;
            authPacket.set(passBytes, 3 + userBytes.length);
            await writer.write(authPacket);
            const authResponse = await reader.read();
            if (authResponse.done || new Uint8Array(authResponse.value)[1] !== 0x00) throw new Error('S5 auth failed');
        } else if (selectedMethod !== 0x00) {
            throw new Error(`S5 unsupported auth method: ${selectedMethod}`);
        }
        
        const hostBytes = new TextEncoder().encode(targetHost);
        const connectPacket = new Uint8Array(7 + hostBytes.length);
        connectPacket[0] = 0x05;
        connectPacket[1] = 0x01;
        connectPacket[2] = 0x00; 
        connectPacket[3] = 0x03; 
        connectPacket[4] = hostBytes.length;
        connectPacket.set(hostBytes, 5);
        new DataView(connectPacket.buffer).setUint16(5 + hostBytes.length, targetPort, false);
        await writer.write(connectPacket);
        
        const connectResponse = await reader.read();
        if (connectResponse.done || new Uint8Array(connectResponse.value)[1] !== 0x00) throw new Error('S5 connection failed');
        
        await writer.write(initialData);
        writer.releaseLock(); reader.releaseLock();
        return socket;
    } catch (error) {
        writer.releaseLock(); reader.releaseLock(); socket.close();
        throw error;
    }
}

// HTTP 代理连接：保持原生 connect，不优先 v4
async function connectToHttp(proxyConfig, targetHost, targetPort, initialData) {
    const { host, port, username, password } = proxyConfig;
    const socket = connect({ hostname: host, port: port });
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    try {
        let connectRequest = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n`;
        if (username && password) {
            connectRequest += `Proxy-Authorization: Basic ${btoa(`${username}:${password}`)}\r\n`;
        }
        connectRequest += `User-Agent: Mozilla/5.0\r\nConnection: keep-alive\r\n\r\n`;
        await writer.write(new TextEncoder().encode(connectRequest));
        
        let responseBuffer = new Uint8Array(0);
        let headerEndIndex = -1;
        while (headerEndIndex === -1 && responseBuffer.length < 8192) {
            const { done, value } = await reader.read();
            if (done) throw new Error('Connection closed before HTTP response');
            const newBuffer = new Uint8Array(responseBuffer.length + value.length);
            newBuffer.set(responseBuffer); newBuffer.set(value, responseBuffer.length);
            responseBuffer = newBuffer;
            for (let i = 0; i < responseBuffer.length - 3; i++) {
                if (responseBuffer[i] === 0x0d && responseBuffer[i + 1] === 0x0a && responseBuffer[i + 2] === 0x0d && responseBuffer[i + 3] === 0x0a) {
                    headerEndIndex = i + 4; break;
                }
            }
        }
        const statusLine = new TextDecoder().decode(responseBuffer.slice(0, headerEndIndex)).split('\r\n')[0];
        const statusCode = parseInt(statusLine.match(/HTTP\/\d\.\d\s+(\d+)/)?.[1] || '0');
        if (statusCode < 200 || statusCode >= 300) throw new Error(`HTTP proxy connect failed: ${statusLine}`);
        
        await writer.write(initialData);
        writer.releaseLock(); reader.releaseLock();
        return socket;
    } catch (error) {
        try { writer.releaseLock(); } catch(e){}
        try { reader.releaseLock(); } catch(e){}
        socket.close(); throw error;
    }
}

async function dynamicProtocolOverWSHandler(request, runtimeProxy) {
	// @ts-ignore
	const webSocketPair = new WebSocketPair();
	const [client, webSocket] = Object.values(webSocketPair);
	webSocket.accept();

	let address = '';
	let portWithRandomLog = '';
	const log = (info, event) => {
		console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
	};
	const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
	const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

	let remoteSocketWapper = { value: null };
	let isDns = false;

	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (isDns) {
				return await handleDNSQuery(chunk, webSocket, null, log);
			}
			if (remoteSocketWapper.value) {
				const writer = remoteSocketWapper.value.writable.getWriter();
				await writer.write(chunk);
				writer.releaseLock();
				return;
			}

			const {
				hasError,
				message,
				addressType,
				portRemote = 443,
				addressRemote = '',
				rawDataIndex,
				dynamicProtocolVersion = new Uint8Array([0, 0]),
				isUDP,
			} = processDynamicProtocolHeader(chunk, userID);
			address = addressRemote;
			portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '} `;
			if (hasError) {
				log(`Error parsing VLESS header: ${message}`);
				safeCloseWebSocket(webSocket);
				throw new Error(message); 
			}
			if (isUDP) {
				if (portRemote === 53) {
					isDns = true;
				} else {
					log('UDP proxy only enabled for DNS which is port 53');
					safeCloseWebSocket(webSocket);
					throw new Error('UDP proxy only enable for DNS which is port 53'); 
				}
			}
			const dynamicProtocolResponseHeader = new Uint8Array([dynamicProtocolVersion[0], 0]);
			const rawClientData = chunk.slice(rawDataIndex);

			if (isDns) {
				return handleDNSQuery(rawClientData, webSocket, dynamicProtocolResponseHeader, log);
			}
			
			await handleTCPOutBound(
				remoteSocketWapper, 
				addressType, 
				addressRemote, 
				portRemote, 
				rawClientData, 
				webSocket, 
				dynamicProtocolResponseHeader, 
				log, 
				runtimeProxy
			);
		},
		close() { log(`readableWebSocketStream is close`); },
		abort(reason) { log(`readableWebSocketStream is abort`, JSON.stringify(reason)); },
	})).catch((err) => {
		log('readableWebSocketStream pipeTo error', err);
	});

	return new Response(null, {
		status: 101,
		// @ts-ignore
		webSocket: client,
	});
}

async function handleTCPOutBound(remoteSocketWapper, addressType, addressRemote, portRemote, rawClientData, webSocket, dynamicProtocolResponseHeader, log, runtimeProxy) {
	
	async function connectDirect(address, port, data) {
		let targetHost = address;
		
		// 命中 IPv4 名单（如 ChatGPT / Gemini）才走 DoH 强制解析 IPv4，流媒体与普通域名均直出原生网络
		if (shouldPreferIPv4(address)) {
			targetHost = await resolveIPv4(address);
			log(`[Route: IPv4-Forced] Direct connect to ${targetHost}:${port} (origin: ${address})`);
		} else {
			log(`[Route: Default/IPv6] Direct connect to ${address}:${port}`);
		}

		const tcpSocket = connect({ hostname: targetHost, port: port });
		remoteSocketWapper.value = tcpSocket;
		const writer = tcpSocket.writable.getWriter();
		await writer.write(data); 
		writer.releaseLock();
		return tcpSocket;
	}

	async function connectViaProxy(proxyConfig, data) {
		let tcpSocket;
		if (proxyConfig.type === 'socks5') {
			tcpSocket = await connectToSocks5(proxyConfig, addressRemote, portRemote, data);
		} else if (proxyConfig.type === 'http' || proxyConfig.type === 'https') {
			tcpSocket = await connectToHttp(proxyConfig, addressRemote, portRemote, data);
		} else {
			tcpSocket = await connectDirect(proxyConfig.host, proxyConfig.port, data);
		}
		remoteSocketWapper.value = tcpSocket;
		log(`Proxy chain connected via [${proxyConfig.type}] to ${addressRemote}:${portRemote}`);
		return tcpSocket;
	}

	const parsedProxy = parseProxyAddress(runtimeProxy);
	const isForceProxy = parsedProxy && (parsedProxy.type === 'socks5' || parsedProxy.type === 'http');

	async function retryFallback() {
		try {
			if (isForceProxy) {
				log(`Proxy chain failed. Falling back to direct connection: ${addressRemote}:${portRemote}`);
				const fallbackSocket = await connectDirect(addressRemote, portRemote, rawClientData);
				setupSocketLifecycle(fallbackSocket);
			} else if (parsedProxy) {
				log(`Direct connection failed. Retrying through proxy chain: ${runtimeProxy}`);
				const fallbackSocket = await connectViaProxy(parsedProxy, rawClientData);
				setupSocketLifecycle(fallbackSocket);
			}
		} catch (err) {
			log(`Fallback mechanism also failed: ${err.message}`);
			safeCloseWebSocket(webSocket);
		}
	}

	function setupSocketLifecycle(socket) {
		socket.closed.catch(error => {
			console.log('tcpSocket closed error', error);
		}).finally(() => {
			safeCloseWebSocket(webSocket);
		});
		remoteSocketToWS(socket, webSocket, dynamicProtocolResponseHeader, null, log);
	}

	try {
		if (isForceProxy) {
			let tcpSocket = await connectViaProxy(parsedProxy, rawClientData);
			remoteSocketToWS(tcpSocket, webSocket, dynamicProtocolResponseHeader, retryFallback, log);
		} else {
			let tcpSocket = await connectDirect(addressRemote, portRemote, rawClientData);
			remoteSocketToWS(tcpSocket, webSocket, dynamicProtocolResponseHeader, retryFallback, log);
		}
	} catch (err) {
		log(`Initial direct routing attempt error: ${err.message}. Triggering backup chain...`);
		await retryFallback();
	}
}

function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
	let readableStreamCancel = false;
	const stream = new ReadableStream({
		start(controller) {
			webSocketServer.addEventListener('message', (event) => {
				if (readableStreamCancel) return;
				const message = event.data;
				controller.enqueue(message);
			});

			webSocketServer.addEventListener('close', () => {
				safeCloseWebSocket(webSocketServer);
				if (readableStreamCancel) return;
				controller.close();
			});
			webSocketServer.addEventListener('error', (err) => {
				log('webSocketServer has error');
				controller.error(err);
			});
			const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
			if (error) {
				controller.error(error);
			} else if (earlyData) {
				controller.enqueue(earlyData);
			}
		},
		pull(controller) {},
		cancel(reason) {
			if (readableStreamCancel) return;
			log(`ReadableStream was canceled, due to ${reason}`);
			readableStreamCancel = true;
			safeCloseWebSocket(webSocketServer);
		}
	});
	return stream;
}

function processDynamicProtocolHeader(dynamicProtocolBuffer, userID) {
	if (dynamicProtocolBuffer.byteLength < 24) {
		return { hasError: true, message: 'invalid data' };
	}
	const version = new Uint8Array(dynamicProtocolBuffer.slice(0, 1));
	let isValidUser = false;
	let isUDP = false;
	if (stringify(new Uint8Array(dynamicProtocolBuffer.slice(1, 17))) === userID) {
		isValidUser = true;
	}
	if (!isValidUser) {
		return { hasError: true, message: 'invalid user' };
	}

	const optLength = new Uint8Array(dynamicProtocolBuffer.slice(17, 18))[0];
	const command = new Uint8Array(dynamicProtocolBuffer.slice(18 + optLength, 18 + optLength + 1))[0];

	if (command === 1) {
	} else if (command === 2) {
		isUDP = true;
	} else {
		return { hasError: true, message: `command ${command} is not support` };
	}
	const portIndex = 18 + optLength + 1;
	const portBuffer = dynamicProtocolBuffer.slice(portIndex, portIndex + 2);
	const portRemote = new DataView(portBuffer).getUint16(0);

	let addressIndex = portIndex + 2;
	const addressBuffer = new Uint8Array(dynamicProtocolBuffer.slice(addressIndex, addressIndex + 1));

	const addressType = addressBuffer[0];
	let addressLength = 0;
	let addressValueIndex = addressIndex + 1;
	let addressValue = '';
	switch (addressType) {
		case 1:
			addressLength = 4;
			addressValue = new Uint8Array(dynamicProtocolBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
			break;
		case 2:
			addressLength = new Uint8Array(dynamicProtocolBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
			addressValueIndex += 1;
			addressValue = new TextDecoder().decode(dynamicProtocolBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
			break;
		case 3:
			addressLength = 16;
			const dataView = new DataView(dynamicProtocolBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
			const ipv6 = [];
			for (let i = 0; i < 8; i++) {
				ipv6.push(dataView.getUint16(i * 2).toString(16));
			}
			addressValue = ipv6.join(':');
			break;
		default:
			return { hasError: true, message: `invild addressType is ${addressType}` };
	}
	if (!addressValue) {
		return { hasError: true, message: `addressValue is empty` };
	}

	return {
		hasError: false,
		addressRemote: addressValue,
		addressType,
		portRemote,
		rawDataIndex: addressValueIndex + addressLength,
		dynamicProtocolVersion: version,
		isUDP,
	};
}

async function remoteSocketToWS(remoteSocket, webSocket, dynamicProtocolResponseHeader, retry, log) {
	let dynamicProtocolHeader = dynamicProtocolResponseHeader;
	let hasIncomingData = false; 
	await remoteSocket.readable
		.pipeTo(
			new WritableStream({
				async write(chunk, controller) {
					hasIncomingData = true;
					if (webSocket.readyState !== WS_READY_STATE_OPEN) {
						controller.error('webSocket.readyState is not open');
					}
					if (dynamicProtocolHeader) {
						webSocket.send(await new Blob([dynamicProtocolHeader, chunk]).arrayBuffer());
						dynamicProtocolHeader = null;
					} else {
						webSocket.send(chunk);
					}
				},
				close() { log(`remoteConnection!.readable close. hasIncomingData: ${hasIncomingData}`); },
				abort(reason) { console.error(`remoteConnection!.readable abort`, reason); },
			})
		)
		.catch((error) => {
			safeCloseWebSocket(webSocket);
		});

	if (hasIncomingData === false && retry) {
		log(`retry via fallback routing...`);
		retry();
	}
}

function base64ToArrayBuffer(base64Str) {
	if (!base64Str) return { error: null };
	try {
		base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');
		const decode = atob(base64Str);
		const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
		return { earlyData: arryBuffer.buffer, error: null };
	} catch (error) { return { error }; }
}

function isValidUUID(uuid) {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;
function safeCloseWebSocket(socket) {
	try {
		if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
			socket.close();
		}
	} catch (error) {
		console.error('safeCloseWebSocket error', error);
	}
}

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
	byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
	return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
function stringify(arr, offset = 0) {
	const uuid = unsafeStringify(arr, offset);
	if (!isValidUUID(uuid)) throw TypeError("Stringified UUID is invalid");
	return uuid;
}

async function handleDNSQuery(udpChunk, webSocket, dynamicProtocolResponseHeader, log) {
	try {
		const dnsServer = '8.8.8.8'; 
		const dnsPort = 53;
		let dynamicProtocolHeader = dynamicProtocolResponseHeader;
		const tcpSocket = connect({ hostname: dnsServer, port: dnsPort });

		log(`connected to ${dnsServer}:${dnsPort}`);
		const writer = tcpSocket.writable.getWriter();
		await writer.write(udpChunk);
		writer.releaseLock();
		await tcpSocket.readable.pipeTo(new WritableStream({
			async write(chunk) {
				if (webSocket.readyState !== WS_READY_STATE_OPEN) {
					if (dynamicProtocolHeader) {
						webSocket.send(await new Blob([dynamicProtocolHeader, chunk]).arrayBuffer());
						dynamicProtocolHeader = null;
					} else {
						webSocket.send(chunk);
					}
				}
			},
			close() { log(`dns server tcp is close`); },
			abort(reason) { console.error(`dns server tcp is abort`, reason); },
		}));
	} catch (error) {
		console.error(`handleDNSQuery have exception: ${error.message}`);
	}
}

function getDynamicProtocolConfig(userID, hostName) {
	const protocol = 转码 + 转码2; 
	const dynamicProtocolMain = `${protocol}${符号}${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;
	return `\nv2ray:\n${dynamicProtocolMain}\n`;
}
