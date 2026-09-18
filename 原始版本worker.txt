let 转码 = 'vl', 转码2 = 'ess', 符号 = '://';

// version base on commit 58686d5d125194d34a1137913b3a64ddcf55872f, time is 2024-11-27 09:26:02 UTC.
// @ts-ignore
import { connect } from 'cloudflare:sockets';

// How to generate your own UUID:
// [Windows] Press "Win + R", input cmd and run:  Powershell -NoExit -Command "[guid]::NewGuid()"
let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

let proxyIP = 'proxyip.zone.id'; // 确保这里有默认值或者通过环境变量设置。
// --- 原有变量 ---
let proxyPort = 443; // 默认端口为 443

// --- 新增：伪装页面相关的变量和函数 ---
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
	/**
	 * @param {import("@cloudflare/workers-types").Request} request
	 * @param {{UUID: string, PROXYIP: string, HIDE?: string, HIDE_SUBSCRIPTION?: string, SARCASM_MESSAGE?: string, 隐藏?: string, 嘲讽语?: string}} env
	 * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		try {
			userID = env.UUID || userID;
			
			// --- 核心修改：优先从环境变量 PROXYIP 中解析 SOCKS5 / HTTP 或常规 IP:PORT ---
			if (env.PROXYIP) {
				proxyIP = env.PROXYIP.trim();
			}
			// --- 结束修改 ---

			// --- 环境变量映射（支持英文字段 HIDE 与 SARCASM_MESSAGE，兼容向下回退） ---
			let isHidden = false; 
			let sarcasmMessage = "哎呀你找到了我，但是我就是不给你看，气不气，嘿嘿嘿"; 

			if (env.HIDE !== undefined) {
				isHidden = env.HIDE === 'true';
			} else if (env.HIDE_SUBSCRIPTION !== undefined) {
				isHidden = env.HIDE_SUBSCRIPTION === 'true';
			} else if (env.隐藏 !== undefined) { 
				isHidden = env.隐藏 === 'true';
			}

			if (env.SARCASM_MESSAGE !== undefined) {
				sarcasmMessage = env.SARCASM_MESSAGE;
			} else if (env.嘲讽语 !== undefined) { 
				sarcasmMessage = env.嘲讽语;
			}

			console.log(`最终解析的布尔值 隐藏: ${isHidden}, 最终代理出站配置: ${proxyIP}`);

			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				const url = new URL(request.url);
				switch (url.pathname) {
					case '/': 
						return serveDisguisePage(); 
					case `/${userID}`: {
						if (isHidden) {
							return new Response(sarcasmMessage, {
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
						// 融合知识库：支持通过 HTTP 请求路径直接动态切换临时 ProxyIP（例如访问：/proxyip=socks://user:pass@host:port）
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
				// 融合知识库：WebSocket 请求时，支持从路径参数或 URL 参数中提取动态代理
				const url = new URL(request.url);
				let wsPathProxyIP = null;
				if (url.pathname.startsWith('/proxyip=')) {
					try {
						wsPathProxyIP = decodeURIComponent(url.pathname.substring(9)).trim();
					} catch (e) {}
				}
				// 优先级：路径参数 > URL参数（?proxyip=） > 环境变量默认配置
				const finalRuntimeProxy = wsPathProxyIP || url.searchParams.get('proxyip') || proxyIP;

				return await dynamicProtocolOverWSHandler(request, finalRuntimeProxy);
			}
		} catch (err) {
			/** @type {Error} */ let e = err;
			return new Response(e.toString());
		}
	},
};

/**
 * 融合自知识库：高级代理链解析器 (支持 socks5://, socks://, http://, https://, ip:port)
 * @param {string} serverStr 
 */
function parseProxyAddress(serverStr) {
    if (!serverStr) return null;
    serverStr = serverStr.trim();
    
    // 解析 SOCKS5
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
    
    // 解析 HTTP
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
    
    // 处理 IPv6 [host]:port 格式
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

    // 普通 ip:port 或 域名:port 格式
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

/**
 * 融合自知识库：SOCKS5 握手与认证协议实现
 */
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

/**
 * 融合自知识库：HTTP CONNECT 隧道协议实现
 */
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

/**
 * 接收经过高级解析整合后的 runtimeProxy 配置字符串
 */
async function dynamicProtocolOverWSHandler(request, runtimeProxy) {

	/** @type {import("@cloudflare/workers-types").WebSocket[]} */
	// @ts-ignore
	const webSocketPair = new WebSocketPair();
	const [client, webSocket] = Object.values(webSocketPair);

	webSocket.accept();

	let address = '';
	let portWithRandomLog = '';
	const log = (/** @type {string} */ info, /** @type {string | undefined} */ event) => {
		console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
	};
	const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';

	const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

	/** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
	let remoteSocketWapper = {
		value: null,
	};
	let isDns = false;

	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (isDns) {
				return await handleDNSQuery(chunk, webSocket, null, log);
			}
			if (remoteSocketWapper.value) {
				const writer = remoteSocketWapper.value.writable.getWriter()
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
			
			// 处理 TCP 出站连接，传递提取到的高级代理字符串
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

/**
 * 底层出站逻辑：优先尝试直连，直连失败或显式配置协议时走代理链
 */
async function handleTCPOutBound(remoteSocketWapper, addressType, addressRemote, portRemote, rawClientData, webSocket, dynamicProtocolResponseHeader, log, runtimeProxy) {
	
	// 直连连接器
	async function connectDirect(address, port, data) {
		const tcpSocket = connect({ hostname: address, port: port });
		remoteSocketWapper.value = tcpSocket;
		log(`Direct connected to ${address}:${port}`);
		const writer = tcpSocket.writable.getWriter();
		await writer.write(data); 
		writer.releaseLock();
		return tcpSocket;
	}

	// 代理服务器链式连接器
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

	// 解析出当前运行时应当使用的出站规则
	const parsedProxy = parseProxyAddress(runtimeProxy);
	
	// 判断是否强制使用全局中转代理（配置为 socks5:// 或 http:// 协议头时）
	const isForceProxy = parsedProxy && (parsedProxy.type === 'socks5' || parsedProxy.type === 'http');

	// 触发重试/回退的安全边界机制
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

	// 建立首发数据流
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

/**
 * * @param {import("@cloudflare/workers-types").WebSocket} webSocketServer
 * @param {string} earlyDataHeader for ws 0rtt
 * @param {(info: string)=> void} log for ws 0rtt
 */
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
			log(`ReadableStream was canceled, due to ${reason}`)
			readableStreamCancel = true;
			safeCloseWebSocket(webSocketServer);
		}
	});
	return stream;
}

/**
 * * @param { ArrayBuffer} dynamicProtocolBuffer 
 * @param {string} userID 
 * @returns 
 */
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

/**
 * * @param {import("@cloudflare/workers-types").Socket} remoteSocket 
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket 
 * @param {ArrayBuffer} dynamicProtocolResponseHeader 
 * @param {(() => Promise<void>) | null} retry
 * @param {*} log 
 */
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
		log(`retry via fallback routing...`)
		retry();
	}
}

/**
 * * @param {string} base64Str 
 * @returns 
 */
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

/**
 * * @param {ArrayBuffer} udpChunk 
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket 
 * @param {ArrayBuffer} dynamicProtocolResponseHeader 
 * @param {(string)=> void} log 
 */
async function handleDNSQuery(udpChunk, webSocket, dynamicProtocolResponseHeader, log) {
	try {
		const dnsServer = '8.8.8.8'; 
		const dnsPort = 53;
		/** @type {ArrayBuffer | null} */
		let dynamicProtocolHeader = dynamicProtocolResponseHeader;
		/** @type {import("@cloudflare/workers-types").Socket} */
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

/**
 * * @param {string} userID 
 * * @param {string | null} hostName
 * @returns {string}
 */
function getDynamicProtocolConfig(userID, hostName) {
	const protocol = 转码 + 转码2; 
	const dynamicProtocolMain = `${protocol}${符号}${userID}@${hostName}:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;
	return `\nv2ray:\n${dynamicProtocolMain}\n`;
}
