// Codex 连接 Chrome CDP (纯 Node.js 原生，无需第三方依赖)
const PORT = process.argv[2] || 9222;
const URL = process.argv[3] || 'https://www.google.com';

async function main() {
  try {
    // 1. 检查 CDP 端口是否可用
    const resp = await fetch(`http://localhost:${PORT}/json`);
    const targets = await resp.json();

    // 找到可用的页面
    let pageTarget = targets.find(t => t.type === 'page' && t.url !== 'about:blank');
    
    if (!pageTarget) {
      // 创建新标签页
      const newResp = await fetch(`http://localhost:${PORT}/json/new?${encodeURIComponent(URL)}`);
      pageTarget = await newResp.json();
    }

    console.log(`✅ 已连接 CDP: ${pageTarget.title || pageTarget.url}`);

    // 2. 通过 WebSocket 发送命令 (使用原生 Node WebSocket)
    const wsUrl = pageTarget.webSocketDebuggerUrl;
    
    const ws = await connectWS(wsUrl);
    let id = 1;

    // 导航
    console.log(`🌐 导航到: ${URL}`);
    const navResult = await sendCommand(ws, id++, 'Page.navigate', { url: URL });
    console.log(`   结果: ${navResult.errorText || 'OK'}`);

    // 等待加载
    await sendCommand(ws, id++, 'Page.loadEventFired');
    await sleep(1000);

    // 获取标题
    const titleResult = await sendCommand(ws, id++, 'Runtime.evaluate', { 
      expression: 'document.title' 
    });
    console.log(`📄 页面标题: ${titleResult?.result?.value || 'N/A'}`);

    // 截图
    const screenshot = await sendCommand(ws, id++, 'Page.captureScreenshot', { 
      format: 'png' 
    });
    console.log(`📸 截图完成 (${screenshot?.data?.length || 0} chars base64)`);

    ws.close();
    console.log('✅ 完成!');
    process.exit(0);

  } catch (e) {
    console.log(`❌ 连接失败: ${e.message}`);
    console.log(`\n💡 请先在桌面终端运行:`);
    console.log(`   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222`);
    process.exit(1);
  }
}

// 原生 WebSocket 连接（Node.js 22+ 内置）
function connectWS(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error('WebSocket 连接失败'));
    ws.onmessage = () => {}; // 消费消息
  });
}

// 发送 CDP 命令
function sendCommand(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));

    // 超时
    setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error(`命令超时: ${method}`));
    }, 10000);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
