// www/script.js

const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingMsg = document.getElementById('loading-msg');

// --- 离屏 Canvas (存储画好的内容) ---
const paintCanvas = document.createElement('canvas');
paintCanvas.width = 1280;
paintCanvas.height = 720;
const paintCtx = paintCanvas.getContext('2d');

// --- 1. 定义调色盘 (双列布局) ---
// r: 半径, x/y: 坐标
const palette = [
  // 左侧列
  { name: '红',   color: '#FF3B30', x: 50, y: 80,  r: 25, type: 'pen' },
  { name: '橙',   color: '#FF9500', x: 50, y: 150, r: 25, type: 'pen' },
  { name: '黄',   color: '#FFCC00', x: 50, y: 220, r: 25, type: 'pen' },
  { name: '绿',   color: '#34C759', x: 50, y: 290, r: 25, type: 'pen' },
  { name: '青',   color: '#5AC8FA', x: 50, y: 360, r: 25, type: 'pen' },
  
  // 右侧列
  { name: '蓝',   color: '#007AFF', x: 110, y: 80,  r: 25, type: 'pen' },
  { name: '紫',   color: '#AF52DE', x: 110, y: 150, r: 25, type: 'pen' },
  { name: '粉',   color: '#FF2D55', x: 110, y: 220, r: 25, type: 'pen' },
  { name: '棕',   color: '#A2845E', x: 110, y: 290, r: 25, type: 'pen' },
  { name: '黑',   color: '#000000', x: 110, y: 360, r: 25, type: 'pen' },

  // 功能区 (下方)
  { name: '橡皮', color: '#FFFFFF', x: 80,  y: 600, r: 35, type: 'eraser' },
  { name: '清空', color: '#888888', x: 80,  y: 680, r: 30, type: 'clear' }
];

// --- 2. 定义粗细滑动条区域 ---
const slider = {
  x: 160,        // 滑动条中心 X 坐标
  yStart: 100,   // 顶部 Y
  yEnd: 400,     // 底部 Y
  width: 20,     // 宽度
  minSize: 2,    // 最小笔触
  maxSize: 40,   // 最大笔触
  currentY: 150  // 当前滑块的位置 (初始值)
};

// --- 3. 当前画笔状态 ---
let brush = {
  color: '#FF3B30', 
  width: 8,         
  mode: 'source-over'
};

let prevX = 0, prevY = 0; 

// 根据滑块 Y 坐标计算笔刷大小
function updateBrushSize(y) {
  // 限制 Y 范围
  let clampedY = Math.max(slider.yStart, Math.min(y, slider.yEnd));
  slider.currentY = clampedY;
  
  // 计算比例 (0.0 - 1.0)
  let ratio = (clampedY - slider.yStart) / (slider.yEnd - slider.yStart);
  
  // 映射到笔刷大小
  brush.width = slider.minSize + ratio * (slider.maxSize - slider.minSize);
}

// 初始计算一次大小
updateBrushSize(slider.currentY);


// --- 4. 核心循环函数 ---
function onResults(results) {
  if(loadingMsg) loadingMsg.style.display = 'none';

  // A. 基础渲染
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(paintCanvas, 0, 0);

  // B. 绘制 UI
  drawInterface(canvasCtx);

  // C. 手势识别
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    const indexX = landmarks[8].x * canvasElement.width;
    const indexY = landmarks[8].y * canvasElement.height;
    const thumbX = landmarks[4].x * canvasElement.width;
    const thumbY = landmarks[4].y * canvasElement.height;

    const centerX = (indexX + thumbX) / 2;
    const centerY = (indexY + thumbY) / 2;

    const distance = Math.hypot(indexX - thumbX, indexY - thumbY);
    const isPinching = distance < 60; 

    // 绘制虚拟光标
    drawCursor(canvasCtx, centerX, centerY, brush.color, isPinching);

    if (isPinching) {
      // === 捏合状态 ===

      // 1. 检查是否在 滑动条 区域内
      // 判定范围稍微给宽一点 (X ± 30)，方便操作
      if (Math.abs(centerX - slider.x) < 30 && centerY > slider.yStart - 20 && centerY < slider.yEnd + 20) {
        updateBrushSize(centerY); // 更新粗细
        prevX = 0; prevY = 0; // 不画画
      }
      // 2. 检查是否按了 按钮
      else {
        let touchedButton = null;
        for (let btn of palette) {
          if (Math.hypot(centerX - btn.x, centerY - btn.y) < btn.r) {
            touchedButton = btn;
            break;
          }
        }

        if (touchedButton) {
          activateButton(touchedButton);
          prevX = 0; prevY = 0;
        } else {
          // 3. 既没碰滑条也没碰按钮 -> 画画
          // 只有在右侧区域才画 (x > 200)，防止误触 UI
          if (centerX > 200) {
             drawOnCanvas(centerX, centerY);
          }
        }
      }
      
    } else {
      // === 松开状态 ===
      prevX = 0; prevY = 0;
    }
  }
  canvasCtx.restore();
}

function activateButton(btn) {
  if (btn.type === 'pen') {
    brush.color = btn.color;
    brush.mode = 'source-over';
    // 切换回笔的时候，恢复滑动条设定的大小
    let ratio = (slider.currentY - slider.yStart) / (slider.yEnd - slider.yStart);
    brush.width = slider.minSize + ratio * (slider.maxSize - slider.minSize);
  } else if (btn.type === 'eraser') {
    brush.mode = 'destination-out';
    brush.width = 60; // 橡皮默认大一点，不随滑条变
  } else if (btn.type === 'clear') {
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  }
}

function drawOnCanvas(x, y) {
  paintCtx.beginPath();
  paintCtx.lineWidth = brush.width;
  paintCtx.lineCap = 'round';
  paintCtx.lineJoin = 'round';
  paintCtx.globalCompositeOperation = brush.mode;
  paintCtx.strokeStyle = brush.color;

  if (prevX === 0 && prevY === 0) {
    paintCtx.moveTo(x, y);
  } else {
    paintCtx.moveTo(prevX, prevY);
  }
  paintCtx.lineTo(x, y);
  paintCtx.stroke();
  paintCtx.globalCompositeOperation = 'source-over';
  prevX = x; prevY = y;
}

// --- 绘制 UI 界面 (含滑条) ---
function drawInterface(ctx) {
  // 背景遮罩扩大一点
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, 200, 720); // 覆盖滑条和按钮区域

  // 1. 绘制按钮
  for (let btn of palette) {
    ctx.beginPath();
    ctx.arc(btn.x, btn.y, btn.r, 0, 2 * Math.PI);
    
    if (btn.type === 'clear') ctx.fillStyle = '#666';
    else if (btn.type === 'eraser') ctx.fillStyle = '#EEE';
    else ctx.fillStyle = btn.color;
    ctx.fill();

    // 选中高亮
    let isSelected = false;
    if (brush.mode === 'destination-out' && btn.type === 'eraser') isSelected = true;
    else if (brush.mode === 'source-over' && btn.color === brush.color && btn.type === 'pen') isSelected = true;

    if (isSelected) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'white';
      ctx.stroke();
    }
    
    // 文字 (镜像反转)
    ctx.save();
    ctx.translate(btn.x, btn.y);
    ctx.scale(-1, 1); 
    ctx.fillStyle = (btn.type === 'eraser' || btn.name === '黄' || btn.name === '青' || btn.name === '粉') ? '#333' : 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.name, 0, 0);
    ctx.restore();
  }

  // 2. 绘制滑动条 (Slider)
  // 轨道
  ctx.beginPath();
  ctx.moveTo(slider.x, slider.yStart);
  ctx.lineTo(slider.x, slider.yEnd);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#888';
  ctx.lineCap = 'round';
  ctx.stroke();

  // 滑块 (Handle)
  ctx.beginPath();
  ctx.arc(slider.x, slider.currentY, 15, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();
  
  // 在滑块中间显示当前大小的圆点预览
  ctx.beginPath();
  // 这里的预览圆点大小稍微缩小一点，不然太大了挡住滑块
  let previewSize = Math.min(12, brush.width / 2);
  ctx.arc(slider.x, slider.currentY, previewSize, 0, 2 * Math.PI);
  ctx.fillStyle = brush.mode === 'destination-out' ? '#333' : brush.color;
  ctx.fill();

  // 文字标签 "粗细"
  ctx.save();
  ctx.translate(slider.x, slider.yStart - 20);
  ctx.scale(-1, 1);
  ctx.fillStyle = '#DDD';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText("粗细", 0, 0);
  ctx.restore();
}

function drawCursor(ctx, x, y, color, isPinching) {
  ctx.beginPath();
  let r = isPinching ? (brush.width / 2) : 10; // 捏合时显示实际画笔大小
  if (r < 5) r = 5; // 最小显示尺寸
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  
  if (brush.mode === 'destination-out') {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// MediaPipe 初始化代码保持不变
const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: 1280,
  height: 720
});
camera.start();