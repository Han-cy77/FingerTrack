// www/script.js

// 1. 全局变量与配置
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingMsg = document.getElementById('loading-msg');

// 创建离屏 Canvas (用于保存你的绘画笔迹，防止被视频帧刷新掉)
const paintCanvas = document.createElement('canvas');
paintCanvas.width = 1280;
paintCanvas.height = 720;
const paintCtx = paintCanvas.getContext('2d');

// 定义工具箱 (画笔和橡皮)
let tools = [
  // 注意看这里：originX 和 originY 必须都有，且数值与 x, y 一致
  { name: 'Red',    color: '#FF4444', x: 80,  y: 150, originX: 80,  originY: 150, r: 30, type: 'pen' },
  { name: 'Blue',   color: '#4444FF', x: 80,  y: 250, originX: 80,  originY: 250, r: 30, type: 'pen' },
  { name: 'Green',  color: '#44FF44', x: 80,  y: 350, originX: 80,  originY: 350, r: 30, type: 'pen' },
  { name: 'Eraser', color: '#FFFFFF', x: 80,  y: 500, originX: 80,  originY: 500, r: 40, type: 'eraser' }
];

let activeTool = null; // 当前手里拿的工具
let prevX = 0, prevY = 0; // 上一帧的手指坐标

// 2. 核心处理函数：每一帧都会运行
function onResults(results) {
  // 隐藏加载提示
  if(loadingMsg) loadingMsg.style.display = 'none';

  // --- A. 基础绘制 ---
  // 清空主画板
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  // 1. 画摄像头画面 (背景)
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  // 2. 画已经画好的笔迹 (离屏 Canvas)
  canvasCtx.drawImage(paintCanvas, 0, 0);

  // --- B. 手势识别逻辑 ---
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    // 获取关键点坐标 (MediaPipe 返回 0-1 的比例，需转为像素)
    // 8: 食指指尖, 4: 拇指指尖
    const indexX = landmarks[8].x * canvasElement.width;
    const indexY = landmarks[8].y * canvasElement.height;
    const thumbX = landmarks[4].x * canvasElement.width;
    const thumbY = landmarks[4].y * canvasElement.height;

    // 计算中心点 (手指捏合的中心)
    const centerX = (indexX + thumbX) / 2;
    const centerY = (indexY + thumbY) / 2;

    // 计算两指距离
    const distance = Math.hypot(indexX - thumbX, indexY - thumbY);
    const isPinching = distance < 60; // 阈值 60px 视为捏合

    if (isPinching) {
      // === 状态：捏合中 ===
      
      // 1. 如果手里没工具，判断是否抓到了工具
      if (!activeTool) {
        for (let tool of tools) {
          // 计算手心到工具的距离
          const distToTool = Math.hypot(centerX - tool.x, centerY - tool.y);
          if (distToTool < tool.r + 20) { // +20 是容错范围
            activeTool = tool;
            break; 
          }
        }
      }

      // 2. 如果手里有工具，移动工具并绘画
      if (activeTool) {
        // 工具跟随手指
        activeTool.x = centerX;
        activeTool.y = centerY;

        // 在 paintCanvas 上绘画
        paintCtx.beginPath();
        paintCtx.lineWidth = (activeTool.type === 'eraser') ? 50 : 12;
        paintCtx.lineCap = 'round';
        paintCtx.lineJoin = 'round';

        if (activeTool.type === 'eraser') {
          paintCtx.globalCompositeOperation = 'destination-out'; // 擦除模式
        } else {
          paintCtx.globalCompositeOperation = 'source-over'; // 覆盖模式
          paintCtx.strokeStyle = activeTool.color;
        }

        // 绘制线条 (从上一点连到当前点)
        if (prevX === 0 && prevY === 0) {
           paintCtx.moveTo(centerX, centerY);
        } else {
           paintCtx.moveTo(prevX, prevY);
        }
        paintCtx.lineTo(centerX, centerY);
        paintCtx.stroke();
        
        // 恢复混合模式
        paintCtx.globalCompositeOperation = 'source-over';
      }

      // 记录当前点作为下一次的起点
      prevX = centerX;
      prevY = centerY;

      // 在手指中间画个绿色提示点
      canvasCtx.beginPath();
      canvasCtx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
      canvasCtx.fillStyle = '#00FF00';
      canvasCtx.fill();

    } else {
      // === 状态：松开 ===
      
      if (activeTool) {
        // 放下工具：让它飞回原位
        activeTool.x = activeTool.originX; // 这里要注意，js对象是引用，修改属性即可
        activeTool.y = activeTool.originY; // 实际上 tools 数组里的数据也被改回去了
        activeTool = null;
      }
      
      // 重置绘图路径起点
      prevX = 0;
      prevY = 0;
    }
  }

  // --- C. 绘制 UI 工具图标 (画在最上层) ---
  for (let tool of tools) {
    canvasCtx.beginPath();
    canvasCtx.arc(tool.x, tool.y, tool.r, 0, 2 * Math.PI);
    
    // 填充颜色
    canvasCtx.fillStyle = tool.color;
    if (tool.type === 'eraser') {
      canvasCtx.fillStyle = '#EEE'; // 橡皮显示为灰白色
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#333';
      canvasCtx.stroke();
    }
    canvasCtx.fill();

    // 绘制文字标签
    canvasCtx.fillStyle = (tool.type === 'eraser') ? '#333' : 'white';
    canvasCtx.font = 'bold 12px Arial';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText(tool.name, tool.x, tool.y);
  }

  canvasCtx.restore();
}

// 3. 初始化 MediaPipe Hands
const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
  maxNumHands: 1,            // 只识别一只手
  modelComplexity: 1,        // 模型精度 (0:快, 1:中)
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// 4. 初始化摄像头
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: 1280,
  height: 720
});

// 启动！
camera.start();