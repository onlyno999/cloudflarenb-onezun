// 大王のヒミツのプロトコル (大王的秘密协议)
let プロトコル名 = 'vl', プロトコル種類 = 'ess', 接続記号 = '://'; 

// これは最新の版だぜ、2024年11月27日 09:26:02 UTCのやつな。
// @ts-ignore
import { connect } from 'cloudflare:sockets';

// お前らの「識別番号」を作る方法だ (如何生成你的UUID):
// [Windows] 「Win + R」を押してcmdを開け、Powershell -NoExit -Command "[guid]::NewGuid()"と入力して実行しろ！
let ユーザー識別番号 = 'd342d11e-d424-4583-b36e-524ab1f0afa4'; // これがお前らの「パスポート」だ！

let 回退プロキシIP = 'proxyip.zone.id'; // 万一の時の「隠し場所」のIPだ。
let 回退プロキシポート = 443; // 「隠し場所」の「裏口」の番号だ。

let NAT64通路有効 = false; // 「特殊通路」を使うか使わないか、スイッチだぜ。

// 「偽装ページ」の「見た目」と「動作」を決めるぜ。
let 偽装URL先 = 'https://cf-worker-dir-bke.pages.dev'; 

async function 偽装ページ出す() {
  try {
    const res = await fetch(偽装URL先, { cf: { cacheEverything: true } });
    return new Response(res.body, res);
  } catch {
    return new Response(
      `<!DOCTYPE html>
       <html>
         <head><title>ようこそ、兄弟たち！</title></head>
         <body><h1>大王様のCloudflare Workerは、もう「稼働中」だぜ！</h1>
         <p>これは「ダミー」のページだ。（本物は「隠れてる」ぞ）</p></body>
       </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

if (!isValidUUID(ユーザー識別番号)) {
	throw new Error('「パスポート」が無効だぜ！作り直せ！');
}

export default {
	/**
	 * @param {import("@cloudflare/workers-types").Request} リクエスト
	 * @param {{UUID: string, PROXYIP: string, HIDE_SUBSCRIPTION?: string, SARCASM_MESSAGE?: string, 隠す?: string, 皮肉なメッセージ?: string, NAT64?: string}} 環境変数 // 「NAT64」の設定も見てるぞ！
	 * @param {import("@cloudflare/workers-types").ExecutionContext} コンテキスト
	 * @returns {Promise<Response>}
	 */
	async fetch(リクエスト, 環境変数, コンテキスト) {
		try {
			ユーザー識別番号 = 環境変数.UUID || ユーザー識別番号; // 「パスポート」を設定するぜ。
			
			if (環境変数.PROXYIP) { // 「隠し場所」のIPとポートを解析するぜ。
				const parts = 環境変数.PROXYIP.split(':');
				回退プロキシIP = parts[0];
				回退プロキシポート = parts.length > 1 ? parseInt(parts[1], 10) : 443;
			}
			
            let 設定隠蔽 = false; // デフォルトは「見せる」だ。
            let 返答嘲諷語 = "ヘヘッ、見つけちまったか？でも見せてやらねぇよ、悔しいだろ？"; // 「隠す」時の「ジョーク」だ。

            if (環境変数.HIDE_SUBSCRIPTION !== undefined) {
                設定隠蔽 = 環境変数.HIDE_SUBSCRIPTION === 'true';
            } else if (環境変数.隠す !== undefined) { 
                設定隠蔽 = 環境変数.隠す === 'true';
            }

            if (環境変数.SARCASM_MESSAGE !== undefined) {
                返答嘲諷語 = 環境変数.SARCASM_MESSAGE;
            } else if (環境変数.皮肉なメッセージ !== undefined) {
                返答嘲諷語 = 環境変数.皮肉なメッセージ;
            }

            if (環境変数.NAT64 !== undefined) { // 「特殊通路」のスイッチも確認するぜ。
                NAT64通路有効 = 環境変数.NAT64 === 'true'; 
            }

            // 大王様の「秘密の記録」だ、よく見とけ！
            console.log(`環境変数 HIDE_SUBSCRIPTION (英語) の値: ${環境変数.HIDE_SUBSCRIPTION}`);
            console.log(`環境変数 隠す (日本語) の値: ${環境変数.隠す}`);
            console.log(`最終的に決まった隠蔽設定: ${設定隠蔽}`);
            console.log(`環境変数 SARCASM_MESSAGE (英語) の値: ${環境変数.SARCASM_MESSAGE}`);
            console.log(`環境変数 皮肉なメッセージ (日本語) の値: ${環境変数.皮肉なメッセージ}`);
            console.log(`最終的に決まった嘲諷語: ${返答嘲諷語}`);
            console.log(`環境変数 NAT64 の値: ${環境変数.NAT64}`);
            console.log(`最終的に決まったNAT64通路有効: ${NAT64通路有効}`);
			console.log(`環境変数 PROXYIP の値: ${環境変数.PROXYIP}`);
			console.log(`最終的に決まった 回退プロキシIP: ${回退プロキシIP}`);
			console.log(`最終的に決まった 回退プロキシポート: ${回退プロキシポート}`);

			const upgradeHeader = リクエスト.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				const url = new URL(リクエスト.url);
				switch (url.pathname) {
					case '/':
						return 偽装ページ出す(); // 「玄関」に来たら「画皮」を見せるぜ。
					case `/${ユーザー識別番号}`: { // 「パスポート」を見せたら「小紙条」をやるぜ。
						if (設定隠蔽) { // 「隠す」スイッチがオンなら…
							return new Response(返答嘲諷語, { // 「サプライズ」だ！
								status: 200,
								headers: {
									"Content-Type": "text/plain;charset=utf-8",
								}
							});
						} else { // 普段通りなら…
							const 配置情報 = getDynamicProtocolConfig(ユーザー識別番号, リクエスト.headers.get('Host'));
							return new Response(`${配置情報}`, { // 「小紙条」を渡すぜ。
								status: 200,
								headers: {
									"Content-Type": "text/plain;charset=utf-8",
								}
							});
						}
					}
					default:
						return new Response('ここには何もねぇぜ！', { status: 404 }); // 「迷子」か？
				}
			} else { // もし「秘密の通路」のリクエストなら…
				return await dynamicProtocolOverWSHandler(リクエスト, 回退プロキシIP, 回退プロキシポート); // 「隠し場所」と「裏口」の情報を渡すぜ。
			}
		} catch (err) {
			/** @type {Error} */ let e = err;
			return new Response(`大王様もビックリだぜ、エラーが出ちまった！：${e.toString()}`); // エラーは正直に報告だ。
		}
	},
};

/**
 * * @param {import("@cloudflare/workers-types").Request} リクエスト
 * @param {string} 予備プロキシIPアドレス // 「備え」のIPアドレスだ。
 * @param {number} 予備プロキシポート番号 // 「備え」のポート番号だ。
 */
async function dynamicProtocolOverWSHandler(リクエスト, 予備プロキシIPアドレス, 予備プロキシポート番号) {

	/** @type {import("@cloudflare/workers-types").WebSocket[]} */
	// @ts-ignore
	const webSocketペア = new WebSocketPair();
	const [クライアント側, サーバー側WS] = Object.values(webSocketペア);

	サーバー側WS.accept();

	let 行き先アドレス = '';
	let ポートと乱数ログ = '';
	const 大王ログ = (/** @type {string} */ 情報, /** @type {string | undefined} */ イベント) => {
		console.log(`[${行き先アドレス}:${ポートと乱数ログ}] ${情報}`, イベント || '');
	};
	const earlyDataHeader = リクエスト.headers.get('sec-websocket-protocol') || '';

	const 読み込み可能WSストリーム = makeReadableWebSocketStream(サーバー側WS, earlyDataHeader, 大王ログ);

	/** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
	let リモートソケット格納庫 = {
		value: null,
	};
	let DNS問い合わせか = false;

	// WSから遠隔地へ (データの流れ：お前らの端末から「遠い場所」へ)
	読み込み可能WSストリーム.pipeTo(new WritableStream({
		async write(チャンクデータ, コントローラー) {
			if (DNS問い合わせか) { // DNSの「問いかけ」なら、特別扱いだ。
				return await handleDNSQuery(チャンクデータ, サーバー側WS, null, 大王ログ);
			}
			if (リモートソケット格納庫.value) { // 「遠い場所」への接続が完了してたら、そのままデータを送るぜ。
				const ライター = リモートソケット格納庫.value.writable.getWriter()
				await ライター.write(チャンクデータ);
				ライター.releaseLock();
				return;
			}

			// プロトコルの「暗号」を解読するぜ、これが「合言葉」と「道案内」の要だ。
			const {
				hasError,
				message,
				addressType,
				portRemote = 443,
				addressRemote = '',
				rawDataIndex,
				dynamicProtocolVersion = new Uint8Array([0, 0]),
				isUDP,
			} = processDynamicProtocolHeader(チャンクデータ, ユーザー識別番号);
			行き先アドレス = addressRemote;
			ポートと乱数ログ = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '
				} `;
			if (hasError) { // 「暗号」が間違ってたら、即刻中止だ！
				大王ログ(`VLESSの「暗号」解析でエラーだぜ: ${message}`);
				safeCloseWebSocket(サーバー側WS);
				throw new Error(message); 
			}
			// UDPだけどDNSポートじゃないなら、断るぜ。
			if (isUDP) {
				if (portRemote === 53) {
					DNS問い合わせか = true;
				} else {
					大王ログ('UDPの代理はDNSポート53だけだぜ！');
					safeCloseWebSocket(サーバー側WS);
					throw new Error('UDPの代理はDNSポート53だけだぜ！'); 
				}
			}
			// 応答の「暗号」ヘッダーだ、バージョン情報が入ってるぜ。
			const dynamicProtocolResponseHeader = new Uint8Array([dynamicProtocolVersion[0], 0]);
			const rawClientData = チャンクデータ.slice(rawDataIndex);

			if (DNS問い合わせか) {
				return handleDNSQuery(rawClientData, サーバー側WS, dynamicProtocolResponseHeader, 大王ログ);
			}
			
			// TCPの「外向き」接続を処理するぜ、今は「三道保険」のロジックを使う。
			await handleTCPOutBound(
				リモートソケット格納庫,
				addressRemote,
				portRemote,
				rawClientData,
				サーバー側WS,
				dynamicProtocolResponseHeader,
				大王ログ,
				予備プロキシIPアドレス, // 「備え」のIPだ。
				予備プロキシポート番号, // 「備え」のポートだ。
                NAT64通路有効 // 「特殊通路」のスイッチだ。
			);
		},
		close() {
			大王ログ(`読み込み可能WSストリームが閉じられたぜ`);
		},
		abort(理由) {
			大王ログ(`読み込み可能WSストリームが中断されたぜ`, JSON.stringify(理由));
		},
	})).catch((err) => {
		大王ログ('読み込み可能WSストリームのパイプエラーだぜ', err);
	});

	return new Response(null, {
		status: 101,
		// @ts-ignore
		webSocket: クライアント側,
	});
}

/**
 * TCPの「外向き」接続を「三道保険」で処理するぜ：直接 -> NAT64 -> プロキシIP。
 *
 * @param {any} リモートソケット格納庫 // 「遠い場所」のソケットを包む箱だ。
 * @param {string} 行き先遠隔アドレス 接続したい「遠い場所」の住所だ。IPv4でもドメインでもいいぜ。
 * @param {number} 行き先遠隔ポート番号 接続したい「遠い場所」の「裏口」だ。
 * @param {Uint8Array} 初期クライアントデータ 送りたい最初のデータだ。
 * @param {import("@cloudflare/workers-types").WebSocket} サーバー側WS リモートソケットを渡すためのWebSocketだ。
 * @param {Uint8Array} プロトコル応答ヘッダー プロトコルの応答ヘッダーだ。
 * @param {function} 大王ログ 大王様のログ機能だ。
 * @param {string} 回退用プロキシIP NAT64がダメだった時に使う「備え」のIPだ。
 * @param {number} 回退用プロキシポート NAT64がダメだった時に使う「備え」のポートだ。
 * @param {boolean} NAT64有効スイッチ NAT64を使うかどうかのスイッチだ。
 * @returns {Promise<void>}
 */
async function handleTCPOutBound(リモートソケット格納庫, 行き先遠隔アドレス, 行き先遠隔ポート番号, 初期クライアントデータ, サーバー側WS, プロトコル応答ヘッダー, 大王ログ, 回退用プロキシIP, 回退用プロキシポート, NAT64有効スイッチ) {
	let TCP接続ソケット;
	
	// --- 1回目の試み: 直接「突っ込め」！ ---
	try {
		大王ログ(`[1/3 試行] 直接「突入」を試みてるぜ、${行き先遠隔アドレス}:${行き先遠隔ポート番号}へ！`);
		TCP接続ソケット = connect({
			hostname: 行き先遠隔アドレス, 
			port: 行き先遠隔ポート番号,
		});
		await TCP接続ソケット.opened; 
		大王ログ(`[1/3 成功] ${行き先遠隔アドレス}:${行き先遠隔ポート番号}への直接接続、成功だぜ！`);

	} catch (直接エラー) {
		console.error(`[1/3 エラー] ${行き先遠隔アドレス}:${行き先遠隔ポート番号}への直接接続に失敗したぜ！`, 直接エラー.stack || 直接エラー.message || 直接エラー);
		
		// --- 2回目の試み: NAT64「特殊通路」だ (スイッチがオンなら) ---
		if (NAT64有効スイッチ) { 
			try {
				大王ログ(`[2/3 試行] 直接はダメか… NAT64「特殊通路」を試すぜ、${行き先遠隔アドレス}:${行き先遠隔ポート番号}へ！`);
				const { tcpSocket: nat64ソケット } = await connectViaNAT64(行き先遠隔アドレス, 行き先遠隔ポート番号);
				TCP接続ソケット = nat64ソケット;
				大王ログ(`[2/3 成功] NAT64「特殊通路」経由で${行き先遠隔アドレス}:${行き先遠隔ポート番号}に接続、成功だぜ！`);

			} catch (nat64エラー) {
				console.error(`[2/3 エラー] ${行き先遠隔アドレス}:${行き先遠隔ポート番号}へのNAT64接続も失敗したぜ！`, nat64エラー.stack || nat64エラー.message || nat64エラー);
				
				// --- 3回目の試み: 「備え」のプロキシIPだ！ ---
				if (回退用プロキシIP) {
					大王ログ(`[3/3 試行] NAT64もダメか… 「備え」のプロキシIPを試すぜ: ${回退用プロキシIP}:${回退用プロキシポート}へ！`);
					try {
						TCP接続ソケット = connect({
							hostname: 回退用プロキシIP,
							port: 回退用プロキシポート, 
						});
						await TCP接続ソケット.opened;
						大王ログ(`[3/3 成功] 「備え」のプロキシIP経由で${回退用プロキシIP}:${回退用プロキシポート}に接続、成功だぜ！`);
					} catch (プロキシIPエラー) {
						console.error(`[3/3 エラー] 「備え」のプロキシIPへの回退も失敗したぜ！ ${回退用プロキシIP}:${回退用プロキシポート}:`, プロキシIPエラー.stack || プロキシIPエラー.message || プロキシIPエラー);
						safeCloseWebSocket(サーバー側WS); 
						return; 
					}
				} else {
					console.error(`[エラー] NAT64もダメで、「備え」のプロキシIPもねぇ！WSを閉じちまうぜ。`);
					safeCloseWebSocket(サーバー側WS); 
					return; 
				}
			}
		} else { // NAT64がオフなら、スキップしてプロキシIPへ直行だ！
			大王ログ(`[NAT64スキップ] NAT64はオフだ、試行をスキップするぜ。`);
			// --- 2回目の試み (実質2/2): 「備え」のプロキシIPだ！ ---
			if (回退用プロキシIP) {
				大王ログ(`[2/2 試行] 直接ダメ、NAT64もオフ… 「備え」のプロキシIPを試すぜ: ${回退用プロキシIP}:${回退用プロキシポート}へ！`);
				try {
					TCP接続ソケット = connect({
						hostname: 回退用プロキシIP,
						port: 回退用プロキシポート, 
					});
					await TCP接続ソケット.opened;
					大王ログ(`[2/2 成功] 「備え」のプロキシIP経由で${回退用プロキシIP}:${回退用プロキシポート}に接続、成功だぜ！`);
				} catch (プロキシIPエラー) {
					console.error(`[2/2 エラー] 「備え」のプロキシIPへの回退も失敗したぜ！ ${回退用プロキシIP}:${回退用プロキシポート}:`, プロキシIPエラー.stack || プロキシIPエラー.message || プロキシIPエラー);
					safeCloseWebSocket(サーバー側WS); 
					return; 
				}
			} else {
				console.error(`[エラー] 直接ダメ、NAT64もオフ、さらに「備え」もねぇ！WSを閉じちまうぜ。`);
				safeCloseWebSocket(サーバー側WS); 
				return; 
			}
		}
	}

    if (TCP接続ソケット) { // どの手を使ってもソケットが繋がったら…
        リモートソケット格納庫.value = TCP接続ソケット; 
        const ライター = TCP接続ソケット.writable.getWriter();
        await ライター.write(初期クライアントデータ); 
        ライター.releaseLock();

        // 「遠い場所」からのデータをWSに流すぜ。
        remoteSocketToWS(TCP接続ソケット, サーバー側WS, プロトコル応答ヘッダー, null, 大王ログ);
    } else {
        console.error("どの手を使ってもTCPソケットが繋がらねぇ！WSを閉じちまうぜ。");
        safeCloseWebSocket(サーバー側WS);
    }
}


/**
 * * @param {import("@cloudflare/workers-types").WebSocket} webSocketサーバー
 * @param {string} earlyDataHeader 0-RTT用だ。
 * @param {(情報: string)=> void} 大王ログ 0-RTT用だ。
 */
function makeReadableWebSocketStream(webSocketサーバー, earlyDataHeader, 大王ログ) {
	let 読み込みストリームキャンセル済み = false;
	const ストリーム = new ReadableStream({
		start(コントローラー) {
			webSocketサーバー.addEventListener('message', (イベント) => {
				if (読み込みストリームキャンセル済み) {
					return;
				}
				const メッセージ = イベント.data;
				コントローラー.enqueue(メッセージ);
			});

			webSocketサーバー.addEventListener('close', () => {
				// クライアントが「閉める」と言ってきたら、こっちも「閉める」んだ。
				safeCloseWebSocket(webSocketサーバー);
				if (読み込みストリームキャンセル済み) {
					return;
				}
				コントローラー.close();
			});
			webSocketサーバー.addEventListener('error', (エラー) => {
				大王ログ('webSocketサーバーでエラーが出たぜ！');
				コントローラー.error(エラー);
			});
			// WebSocketの0-RTTの「先行データ」を処理するぜ。
			const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
			if (error) {
				コントローラー.error(error);
			} else if (earlyData) {
				コントローラー.enqueue(earlyData);
			}
		},

		pull(コントローラー) {
			// ここで「待機」するロジックを入れられるぜ。
		},
		cancel(理由) {
			// ストリームが「キャンセル」されたってことは、何かあったな！
			if (読み込みストリームキャンセル済み) {
					return;
				}
			大王ログ(`読み込みストリームがキャンセルされたぜ、理由は${理由}だ`)
			読み込みストリームキャンセル済み = true;
			safeCloseWebSocket(webSocketサーバー);
		}
	});

	return ストリーム;

}

// https://xtls.github.io/development/protocols/dynamicProtocol.html
// https://github.com/zizifn/excalidraw-backup/blob/main/v2ray-protocol.excalidraw

/**
 * * @param { ArrayBuffer} プロトコルバッファ 
 * @param {string} ユーザー識別番号 
 * @returns 
 */
function processDynamicProtocolHeader(
	プロトコルバッファ,
	ユーザー識別番号
) {
	// プロトコルヘッダーの「暗号解読」だ、これが「身分証明」と「行き先案内」の鍵だぜ。
	if (プロトコルバッファ.byteLength < 24) {
		return {
			hasError: true,
			message: '「無効なデータ」だぜ！',
		};
	}
	const バージョン = new Uint8Array(プロトコルバッファ.slice(0, 1));
	let 正しいユーザーか = false;
	let UDP通信か = false;
	// ユーザー識別番号を照合する、「身内」かどうかの確認だ。
	if (stringify(new Uint8Array(プロトコルバッファ.slice(1, 17))) === ユーザー識別番号) {
		正しいユーザーか = true;
	}
	if (!正しいユーザーか) {
		return {
			hasError: true,
			message: '「お前は誰だ？」無効なユーザーだぜ！',
		};
	}

	const オプション長 = new Uint8Array(プロトコルバッファ.slice(17, 18))[0];
	// オプションは今は無視だぜ。

	const コマンド = new Uint8Array(
		プロトコルバッファ.slice(18 + オプション長, 18 + オプション長 + 1)
	)[0];

	// 0x01 TCP (普通の通信)
	// 0x02 UDP (速い通信、主にDNS)
	// 0x03 MUX (多重化通信)
	if (コマンド === 1) {
	} else if (コマンド === 2) {
		UDP通信か = true;
	} else {
		return {
			hasError: true,
			message: `コマンド${コマンド}は「知らない」ぜ、01はTCP、02はUDP、03はMUXだ！`,
		};
	}
	const ポート位置 = 18 + オプション長 + 1;
	const ポートバッファ = プロトコルバッファ.slice(ポート位置, ポート位置 + 2);
	// ポート番号は「デカい方から数える」ぜ (ビッグエンディアン)。
	const リモートポート = new DataView(ポートバッファ).getUint16(0);

	let アドレス位置 = ポート位置 + 2;
	const アドレスバッファ = new Uint8Array(
		プロトコルバッファ.slice(アドレス位置, アドレス位置 + 1)
	);

	// 1--> ipv4  addressLength =4 (普通の数字の住所)
	// 2--> domain name (文字の住所)
	// 3--> ipv6  addressLength =16 (長い数字の住所)
	const アドレス種類 = アドレスバッファ[0];
	let アドレス長 = 0;
	let アドレス値位置 = アドレス位置 + 1;
	let アドレス値 = '';
	switch (アドレス種類) {
		case 1:
			アドレス長 = 4;
			アドレス値 = new Uint8Array(
				プロトコルバッファ.slice(アドレス値位置, アドレス値位置 + アドレス長)
			).join('.');
			break;
		case 2:
			アドレス長 = new Uint8Array(
				プロトコルバッファ.slice(アドレス値位置, アドレス値位置 + 1)
			)[0];
			アドレス値位置 += 1;
			アドレス値 = new TextDecoder().decode(
				プロトコルバッファ.slice(アドレス値位置, アドレス値位置 + アドレス長)
			);
			break;
		case 3:
			アドレス長 = 16;
			const データビュー = new DataView(
				プロトコルバッファ.slice(アドレス値位置, アドレス値位置 + アドレス長)
			);
			const IPv6アドレス部品 = [];
			for (let i = 0; i < 8; i++) {
				IPv6アドレス部品.push(データビュー.getUint16(i * 2).toString(16));
			}
			アドレス値 = IPv6アドレス部品.join(':');
			break;
		default:
			return {
				hasError: true,
				message: `「変な住所の種類」だぜ！ ${アドレス種類}は知らない！`,
			};
	}
	if (!アドレス値) {
		return {
			hasError: true,
			message: `住所が空っぽだぜ、種類は${アドレス種類}なのに！`,
		};
	}

	return {
		hasError: false,
		addressRemote: アドレス値,
		addressType: アドレス種類,
		portRemote: リモートポート,
		rawDataIndex: アドレス値位置 + アドレス長,
		dynamicProtocolVersion: バージョン,
		isUDP: UDP通信か,
	};
}


/**
 * * @param {import("@cloudflare/workers-types").Socket} リモートソケット 
 * @param {import("@cloudflare/workers-types").WebSocket} サーバー側WS 
 * @param {ArrayBuffer} プロトコル応答ヘッダー 
 * @param {(() => Promise<void>) | null} リトライ // このパラメータはもう使わねぇぜ。
 * @param {*} 大王ログ 
 */
async function remoteSocketToWS(リモートソケット, サーバー側WS, プロトコル応答ヘッダー, リトライ, 大王ログ) {
	// 「遠い場所」からWSへ (データの流れ：遠い場所からお前らの端末へ)
	/** @type {ArrayBuffer | null} */
	let プロトコルヘッダー = プロトコル応答ヘッダー;
	let 受信データあり = false; 
	await リモートソケット.readable
		.pipeTo(
			new WritableStream({
				start() {
				},
				/**
				 * * @param {Uint8Array} チャンク 
				 * @param {*} コントローラー 
				 */
				async write(チャンク, コントローラー) {
					受信データあり = true;
					if (サーバー側WS.readyState !== WS_READY_STATE_OPEN) {
						コントローラー.error(
							'webSocketが「開いてねぇ」ぞ、たぶん閉じちまったな！'
						);
					}
					if (プロトコルヘッダー) { // 最初の送信はヘッダー付きでだ。
						サーバー側WS.send(await new Blob([プロトコルヘッダー, チャンク]).arrayBuffer());
						プロトコルヘッダー = null;
					} else { // その後はデータだけ送るぜ。
						サーバー側WS.send(チャンク);
					}
				},
				close() {
					大王ログ(`リモート接続が閉じられたぜ、受信データありは${受信データあり}だ`);
					safeCloseWebSocket(サーバー側WS); 
				},
				abort(理由) {
					console.error(`リモート接続が中断されたぜ`, 理由);
					safeCloseWebSocket(サーバー側WS); 
				},
			})
		)
		.catch((error) => {
			console.error(
				`remoteSocketToWSで「事件」が起きたぜ `,
				error.stack || error
			);
			safeCloseWebSocket(サーバー側WS); 
		});
}

/**
 * * @param {string} base64文字列 
 * @returns 
 */
function base64ToArrayBuffer(base64文字列) {
	if (!base64文字列) {
		return { error: null };
	}
	try {
		// Base64を解読するぜ、URLの「変な文字」も直す。
		base64文字列 = base64文字列.replace(/-/g, '+').replace(/_/g, '/');
		const デコード済み = atob(base64文字列);
		const 配列バッファ = Uint8Array.from(デコード済み, (c) => c.charCodeAt(0));
		return { earlyData: 配列バッファ.buffer, error: null };
	} catch (error) {
		return { error };
	}
}

/**
 * これは「ホンモノの」UUID検証じゃないぜ。
 * @param {string} uuid 
 */
function isValidUUID(uuid) {
	// UUIDの形式をチェックする、「本物」かどうかの確認だ。
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

const WS_状態_オープン = 1;
const WS_状態_クローズ中 = 2;
/**
 * 通常、WebSocketはクローズ時に例外を出さないはずだ。
 * @param {import("@cloudflare/workers-types").WebSocket} ソケット
 */
function safeCloseWebSocket(ソケット) {
	try {
		// WebSocketを「安全に」閉じる、変なことにならないようにだ。
		if (ソケット.readyState === WS_状態_オープン || ソケット.readyState === WS_状態_クローズ中) {
			ソケット.close();
		}
	} catch (error) {
		console.error('safeCloseWebSocketでエラーだぜ', error);
	}
}

const バイトをHEXへ = [];
for (let i = 0; i < 256; ++i) {
	バイトをHEXへ.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, オフセット = 0) {
	return (バイトをHEXへ[arr[オフセット + 0]] + バイトをHEXへ[arr[オフセット + 1]] + バイトをHEXへ[arr[オフセット + 2]] + バイトをHEXへ[arr[オフセット + 3]] + "-" + バイトをHEXへ[arr[オフセット + 4]] + バイトをHEXへ[arr[オフセット + 5]] + "-" + バイトをHEXへ[arr[オフセット + 6]] + バイトをHEXへ[arr[オフセット + 7]] + "-" + バイトをHEXへ[arr[オフセット + 8]] + バイトをHEXへ[arr[オフセット + 9]] + "-" + バイトをHEXへ[arr[オフセット + 10]] + バイトをHEXへ[arr[オフセット + 11]] + バイトをHEXへ[arr[オフセット + 12]] + バイトをHEXへ[arr[オフセット + 13]] + バイトをHEXへ[arr[オフセット + 14]] + バイトをHEXへ[arr[オフセット + 15]]).toLowerCase();
}
function stringify(arr, オフセット = 0) {
	const uuid = unsafeStringify(arr, オフセット);
	if (!isValidUUID(uuid)) {
		throw TypeError("文字列化されたUUIDは「偽物」だぜ！");
	}
	return uuid;
}

/**
 * * @param {ArrayBuffer} UDPチャンク 
 * @param {import("@cloudflare/workers-types").WebSocket} サーバー側WS 
 * @param {ArrayBuffer} プロトコル応答ヘッダー 
 * @param {(string)=> void} 大王ログ 
 */
async function handleDNSQuery(UDPチャンク, サーバー側WS, プロトコル応答ヘッダー, 大王ログ) {
	// DNSの「問いかけ」を処理するぜ、これはいつでも「決まった場所」に送るんだ。
	try {
		const DNSサーバーアドレス = '8.8.8.8'; 
		const DNSポート番号 = 53;
		/** @type {ArrayBuffer | null} */
		let プロトコルヘッダー = プロトコル応答ヘッダー;
		/** @type {import("@cloudflare/workers-types").Socket} */
		const TCPソケット = connect({
			hostname: DNSサーバーアドレス,
			port: DNSポート番号,
		});

		大王ログ(`${DNSサーバーアドレス}:${DNSポート番号}に繋がったぜ！`);
		const ライター = TCPソケット.writable.getWriter();
		await ライター.write(UDPチャンク);
		ライター.releaseLock();
		await TCPソケット.readable.pipeTo(new WritableStream({
			async write(チャンク) {
				if (サーバー側WS.readyState === WS_状態_オープン) {
					if (プロトコルヘッダー) {
						サーバー側WS.send(await new Blob([プロトコルヘッダー, チャンク]).arrayBuffer());
						プロトコルヘッダー = null;
					} else {
						サーバー側WS.send(チャンク);
					}
				}
			},
			close() {
				大王ログ(`DNSサーバー(${DNSサーバーアドレス})のTCP���閉じられたぜ`);
			},
			abort(理由) {
				console.error(`DNSサーバー(${DNSサーバーアドレス})のTCPが中断されたぜ`, 理由);
			},
		}));
	} catch (error) {
		console.error(
			`handleDNSQueryで「事件」が起きたぜ、エラー: ${error.message}`
		);
	}
}

/**
 * * @param {string} ユーザー識別番号 
 * * @param {string | null} ホスト名
 * @returns {string}
 */
function getDynamicProtocolConfig(ユーザー識別番号, ホスト名) {
	// V2RayとClash-Metaの「装備リスト」を作るぜ、これが「秘密の連絡網」だ。
	const 最終プロトコル = プロトコル名 + プロトコル種類; 
	const メイン設定 = 
	`${最終プロトコル}${接続記号}${ユーザー識別番号}@${ホスト名}:443`+
	`?encryption=none&security=tls&sni=${ホスト名}&fp=randomized&type=ws&host=${ホスト名}&path=%2F%3Fed%3D2048#${ホスト名}`;
	
	return `
################################################################
v2ray
---------------------------------------------------------------
${メイン設定}
---------------------------------------------------------------
################################################################
clash-meta
---------------------------------------------------------------
- type: ${最終プロトコル}
  name: ${ホスト名}
  server: ${ホスト名}
  port: 443
  uuid: ${ユーザー識別番号}
  network: ws
  tls: true
  udp: false
  sni: ${ホスト名}
  client-fingerprint: chrome
  ws-opts:
    path: "/?ed=2048"
    headers:
      host: ${ホスト名}
---------------------------------------------------------------
################################################################
`;
}

// --- NAT64の「小道具」 (これだけは残しとけよ) ---

// IPv4の住所をNAT64のIPv6住所に「変身」させるぜ。
function convertToNAT64IPv6(ipv4Address) {
    const parts = ipv4Address.split('.');
    if (parts.length !== 4) {
        throw new Error('NAT64変換には「ちゃんとした」IPv4住所が必要だぜ！');
    }
    
    const hex = parts.map(part => {
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) {
            throw new Error('NAT64変換のためのIPv4住所がおかしいぜ！');
        }
        return num.toString(16).padStart(2, '0');
    });
    
    return `2602:fc59:b0:64::${hex[0]}${hex[1]}:${hex[2]}${hex[3]}`;
}

// ドメインのIPv4住所を手に入れて、NAT64のIPv6住所に「変身」させるぜ。
async function getNAT64IPv6FromDomain(domain) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒待って、ダメなら「諦める」ぜ。

    try {
        const dnsQuery = await fetch(`https://1.1.1.1/dns-query?name=${domain}&type=A`, {
            headers: {
                'Accept': 'application/dns-json'
            },
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId); 

        if (!dnsQuery.ok) {
            throw new Error(`DNSの「問いかけ」が失敗したぜ！ステータス: ${dnsQuery.status}`);
        }

        const dnsResult = await dnsQuery.json();
        if (dnsResult.Answer && dnsResult.Answer.length > 0) {
            const aRecord = dnsResult.Answer.find(record => record.type === 1);
            if (aRecord) {
                const ipv4Address = aRecord.data;
                return convertToNAT64IPv6(ipv4Address);
            }
        }
        throw new Error('ドメインのAレコードが見つからねぇか、IPv4住所が解決できねぇぜ。');
    } catch (err) {
        clearTimeout(timeoutId); 
        if (err.name === 'AbortError') {
            throw new Error(`NAT64のDNS解決がタイムアウトしたぜ、ドメイン: ${domain}`);
        }
        throw new Error(`NAT64のDNS解決に失敗したぜ: ${err.message}`);
    }
}

// NAT64の「変身」と接続を組み合わせる関数だ。
async function connectViaNAT64(address, port) {
    let nat64Address;
    const ipv4Regex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

    if (ipv4Regex.test(address)) {
        nat64Address = convertToNAT64IPv6(address);
    } else {
        nat64Address = await getNAT64IPv6FromDomain(address);
    }

    const TCPソケット = connect({
        hostname: `[${nat64Address}]`, 
        port: port,
    });
    await TCPソケット.opened;
    return { tcpSocket: TCPソケット }; 
												  }
