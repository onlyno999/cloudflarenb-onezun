import { isValidUUID, getDynamicProtocolConfig, makeReadableWebSocketStream, processDynamicProtocolHeader, handleTCPOutBound, handleDNSQuery, safeCloseWebSocket } from './logic.js';

// version base on commit 58686d5d125194d34a1137913b3a64ddcf55872f, time is 2024-11-27 09:26:02 UTC.
// @ts-ignore

// How to generate your own UUID:
let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

let proxyIP = '\u0077\u006f\u006b\u002e\u0077\u006f\u0078\u0078\u0078\u0078\u0078\u0078\u002e\u006e\u0079\u0063\u002e\u006d\u006e'; // 确保这里有默认值或者通过环境变量设置。
// --- 原有变量 ---
let proxyPort = 443; // 默认端口为 443

// --- 新增：伪装页面相关的变量和函数 ---
const FAKE_WEBSITE = "\u0068\u0074\u0074\u0070\u0073\u003a\u002f\u002f\u0043\u0066\u002d\u0077\u006f\u0072\u006b\u0065\u0072\u002d\u0064\u0069\u0072\u002d\u0062\u006b\u0065\u002e\u0070\u0061\u0067\u0065\u0073\u002e\u0064\u0065\u0076"; // 伪装地址

// --- 新增：你的优选IP地址池直链 ---
const SUB_URL = "\u0068\u0074\u0074\u0070\u0073\u003a\u002f\u002f\u0067\u0069\u0074\u0068\u0075\u0062\u002e\u0078\u0078\u0078\u0078\u0078\u0078\u0078\u0078\u002e\u006e\u0079\u0063\u002e\u006d\u006e\u002f\u006f\u006e\u006c\u0079\u006e\u006f\u0039\u0039\u0039\u002f\u0078\u0078\u0078\u0078\u0078\u0078\u0078\u0078\u0078\u0078\u002f\u006d\u0061\u0069\u006e\u002f\u0064\u0069\u006e\u0067\u0079\u0075\u0065\u002e\u0074\u0078\u0074";


async function serveDisguisePage(request) {
	const url = new URL(request.url);
	const fakeUrl = new URL(FAKE_WEBSITE);
	fakeUrl.pathname = url.pathname;
	fakeUrl.search = url.search;

	const fakeReq = new Request(fakeUrl, {
		method: request.method,
		headers: request.headers,
		body: request.body,
		redirect: "follow"
	});

	try {
		const response = await fetch(fakeReq);
		const newResponse = new Response(response.body, response);
		// 清除安全头部，防止伪装网页无法加载
		newResponse.headers.delete("x-frame-options");
		newResponse.headers.delete("content-security-policy");
		return newResponse;
	} catch (e) {
		return new Response("Website is currently unavailable.", { status: 502 });
	}
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
						return serveDisguisePage(request);
					case `/${userID}`: {
						if (isHidden) {
							return new Response(sarcasmMessage, {
								status: 200,
								headers: { "Content-Type": "text/plain;charset=utf-8" }
							});
						} else {
							// 1. 获取自带的默认节点配置
							const host = request.headers.get('Host');
							const dynamicProtocolConfig = getDynamicProtocolConfig(userID, host);
							let finalSubNodes = [dynamicProtocolConfig.trim()];

							// 2. 参考知识库：自动拉取并解析优选 IP，生成链接
							const ipList = [];
							try {
								// 第一步：拉取订阅列表获取源地址
								const listResponse = await fetch(SUB_URL);
								if (listResponse.ok) {
									const listText = await listResponse.text();
									// 过滤出有效的网址源
									const urls = listText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'));

									// 第二步：并发抓取这些网址里的真实 IP 数据
									const fetchPromises = urls.map(async (targetUrl) => {
										try {
											const res = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, cf: { cacheTtl: 600 } });
											if (res.ok) {
												const text = await res.text();
												const lines = text.split(/\r?\n/);
												for (const line of lines) {
													const trimmed = line.trim();
													if (!trimmed || trimmed.startsWith('#')) continue;

													// 匹配格式: "IP:Port#备注" 或纯 "IP"
													const parts = trimmed.split('#');
													const addrPart = parts[0].trim();
													const tag = parts[1] ? parts[1].trim() : '优选节点';

													let ip = addrPart;
													let port = 443;
													if (addrPart.includes(':')) {
														const [pIp, pPort] = addrPart.split(':');
														ip = pIp;
														port = parseInt(pPort) || 443;
													}

													if (ip) {
														ipList.push({ ip, port, tag });
													}
												}
											}
										} catch (e) {
											// 忽略单次抓取错误
										}
									});

									await Promise.all(fetchPromises);
								}
							} catch (error) {
								console.log("拉取订阅地址池失败", error);
							}

							// 3. 去重并组装链接
							const seen = new Set();
							for (const item of ipList) {
								const key = `${item.ip}:${item.port}`;
								if (!seen.has(key)) {
									seen.add(key);
									const remark = encodeURIComponent(`${item.tag}-${item.ip}`);
									// 使用你的 Worker 域名作为 host/sni，优选 IP 作为地址
									const \u0076\u006c\u0065\u0073\u0073Url = `\u0076\u006c\u0065\u0073\u0073\u003a//${userID}\u0040${item.ip}:${item.port}?encryption=none&security=tls&sni=${host}&fp=randomized&type=ws&host=${host}&path=%2F%3Fed%3D2048#${remark}`;
									finalSubNodes.push(\u0076\u006c\u0065\u0073\u0073Url);
								}
							}

							// 4. 合并并进行 Base64 编码
							const subContent = finalSubNodes.join('\n');
							const b64Sub = btoa(unescape(encodeURIComponent(subContent)));

							// 返回 Base64 订阅内容
							return new Response(b64Sub, {
								status: 200,
								headers: {
									"Content-Type": "text/plain;charset=utf-8",
									"Cache-Control": "no-cache"
								}
							});
						}
					}
					default:
						// 融合知识库：支持通过 HTTP 请求路径直接动态切换临时 ProxyIP
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
						// 陌生路径不再报404，一律返回伪装页面
						return serveDisguisePage(request);
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
 * 接收经过高级解析整合后的 runtimeProxy 配置字符串
 */
async function dynamicProtocolOverWSHandler(request, runtimeProxy) {
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
				log(`Error parsing \u0056\u004c\u0045\u0053\u0053 header\u003a ${message}`);
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

