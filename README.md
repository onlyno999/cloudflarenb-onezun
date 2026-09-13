### 环境变量配置表 (Variables and Secrets)

| 变量名称 (Variable Name) | 类型 (Type) | 示例值 (Value) | 说明 |
| :--- | :--- | :--- | :--- |
| **`HIDE`** | Plaintext | `true` 或 `false` | **核心开关**。填 `true` 隐藏节点配置；填 `false` 正常输出节点信息。 |
| **`UUID`** | Plaintext | `d342d11e-d324-4583-a36e-524ab1f0afa4` | **可选**。自定义客户端连接 UUID；留空则使用代码内置值。 |
| **`PROXYIP`** | Plaintext | `proxyip.zone.id:443` 或 全局`socks5://user:pass@host:port` | **可选**。出站回退代理；支持 `IP:端口`、`socks5://`、`http://` 等格式。 |
| **`SARCASM_MESSAGE`** | Plaintext | `哎呀你找到了我，但是我就是不给你看，气不气，嘿嘿嘿` | **可选**。当 `HIDE` 为 `true` 时，访问订阅路径返回的提示文本。 |

---

### 配置操作步骤

1. 打开 Cloudflare 控制台，进入 **Workers & Pages** -> 选择你的 Worker。
2. 切换至 **Settings** 标签页，在左侧选择 **Variables and Secrets**。
3. 点击 **Add variable** 按钮，分别输入对应的 `Variable Name` 与 `Value`。
4. 点击 **Deploy** 保存并生效。


### ws path socks5全局模式

在客户端的 **WebSocket 路径 (WS Path)** 中，通过 `/proxyip=` 直接指定出站 SOCKS5 代理。由于代理链接包含 `:`, `/`, `@` 等特殊字符，**必须使用 URL 编码 (URL Encode)**。

---

#### 1. 不带密码的全局

* **原始代理格式**：
  ```text
  socks5://IP:端口
  ```
* **原始示例**：
  ```text
  socks5://1.2.3.4:1080
  ```
* **客户端 WS Path 填写**：
  ```text
  /proxyip=socks5%3A%2F%2F1.2.3.4%3A1080
  ```

---

#### 2. 带密码的全局

* **原始代理格式**：
  ```text
  socks5://用户名:密码@IP:端口
  ```
* **原始示例**：
  ```text
  socks5://user:password123@1.2.3.4:1080
  ```
* **客户端 WS Path 填写**：
  ```text
  /proxyip=socks5%3A%2F%2Fuser%3Apassword123%401.2.3.4%3A1080
  ```

---

> **核心提示**：
> * 必须保留端口号（如 `:1080`），否则解析器无法正确定位端口。
> * 直接填到客户端配置的 **Path (路径)** 输入框即可。
