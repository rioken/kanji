const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
ctx.lineWidth = 8;
ctx.strokeStyle = "red";
ctx.lineCap = "round";

// 状態管理
let drawing = false;
let currentStroke = [];
let drawnStrokes = [];
let svgStrokes = [];

/**
 * 座標を取得する（マウスまたはタッチイベントに対応）
 */
function getPos(event) {
  const rect = canvas.getBoundingClientRect();
  if (event.type.startsWith("touch")) {
    const touch = event.touches[0] || event.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  } else {
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}

/**
 * 描画開始
 */
function startDrawing(e) {
  e.preventDefault(); // デフォルトの動作（スクロールなど）を無効化
  drawing = true;
  currentStroke = [];

  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  currentStroke.push(pos);
}

/**
 * 描画処理（ドラッグまたはスワイプ中）
 */
function continueDrawing(e) {
  if (!drawing) return;

  e.preventDefault(); // デフォルトの動作（スクロールなど）を無効化
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  currentStroke.push(pos);
}

/**
 * 描画停止（マウスアップまたはタッチ終了）
 */
function stopDrawing() {
  if (drawing) {
    drawnStrokes.push(currentStroke);
    drawing = false;
  }
}

/**
 * イベントリスナーの追加
 */
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", continueDrawing);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("touchstart", startDrawing);
canvas.addEventListener("touchmove", continueDrawing);
canvas.addEventListener("touchend", stopDrawing);

// SVGファイル一覧
const svgList = [
  "kanji/06f22.svg", // 漢
  "kanji/065e5.svg",  // 日
  "kanji/0672c.svg",  // 本
  "kanji/05b66.svg",  // 学
  "kanji/0751f.svg"   // 生
];

/**
 * ランダムにSVGを読み込む
 */
function loadRandomKanji() {
  const svgPath = svgList[Math.floor(Math.random() * svgList.length)];
  fetch(svgPath)
    .then(res => res.text())
    .then(svgText => {
      const svgContainer = document.getElementById("svgContainer");
      svgContainer.innerHTML = svgText;

      const svg = svgContainer.querySelector("svg");
      svg.setAttribute("width", "300");
      svg.setAttribute("height", "300");

      // SVGパス情報（ストローク数取得用）
      const paths = svg.querySelectorAll("path[id^='kvg:']");
      svgStrokes = Array.from(paths).map(p => p.getAttribute("d"));
    });
}

/**
 * 書き順の簡易判定（本数と順序が合えばOK）
 */
function checkAnswer() {
  const message = document.getElementById("resultMessage");
  const icon = document.getElementById("resultIcon");
  icon.innerHTML = ""; // 前回の画像をクリア

  if (drawnStrokes.length !== svgStrokes.length) {
    message.textContent = `不正解 😢 本数が違います（あなた: ${drawnStrokes.length} / 正: ${svgStrokes.length}）`;
    message.style.color = "red";

    const img = document.createElement("img");
    img.src = "img/NO.png";
    img.alt = "不正解";
    icon.appendChild(img);

    const badbgm = new Audio("bgm/bad.mp3");
    badbgm.currentTime = 0;
    badbgm.play();
    return;
  }

  const svg = document.getElementById("svgContainer").querySelector("svg");
  const viewBox = svg.getAttribute("viewBox");
  let [vbX, vbY, vbWidth, vbHeight] = [0, 0, 109, 109]; // デフォルト
  if (viewBox) {
    [vbX, vbY, vbWidth, vbHeight] = viewBox.split(" ").map(parseFloat);
  }

  const scaleX = canvas.width / vbWidth;
  const scaleY = canvas.height / vbHeight;

  let valid = true;

  // 順序比較判定
  for (let i = 0; i < svgStrokes.length; i++) {
    const userStroke = drawnStrokes[i]; // ユーザーのストローク
    const svgD = svgStrokes[i]; // SVGの正しいストローク

    if (!userStroke || userStroke.length < 5) {
      valid = false; // ストロークが短すぎる場合
      break;
    }

    // SVGストロークの始点を取得
    const match = svgD.match(/M\s*([\d.]+),\s*([\d.]+)/i); // SVGの始点 (M x,y)
    if (!match) {
      valid = false; // 始点が取得できない場合
      break;
    }

    const svgX = parseFloat(match[1]) * scaleX;
    const svgY = parseFloat(match[2]) * scaleY;

    // ユーザーストロークの始点を取得
    const userStart = userStroke[0];

    // 始点が許容誤差内か確認
    const dx = userStart.x - svgX;
    const dy = userStart.y - svgY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 40) { // 始点の許容誤差（手書きに優しい）
      valid = false;
      break;
    }
  }

  // 判定結果表示
  if (valid) {
    message.textContent = "正解！🎉 書き順が正しいです。";
    message.style.color = "green";

    const img = document.createElement("img");
    img.src = "img/OK.png";
    img.alt = "正解";
    icon.appendChild(img);

    const goodbgm = new Audio("bgm/good.mp3");
    goodbgm.currentTime = 0;
    goodbgm.play();
  } else {
    message.textContent = "不正解 😢 書き順が違います。";
    message.style.color = "red";

    const img = document.createElement("img");
    img.src = "img/NO.png";
    img.alt = "不正解";
    icon.appendChild(img);

    const badbgm = new Audio("bgm/bad.mp3");
    badbgm.currentTime = 0;
    badbgm.play();
  }
}

/**
 * キャンバスリセット処理
 */
function resetCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawnStrokes = [];
  document.getElementById("resultMessage").textContent = "";
  document.getElementById("resultIcon").innerHTML = ""; // 画像も消す
}

/**
 * ボタンイベント
 */
document.getElementById("checkButton").addEventListener("click", checkAnswer);
document.getElementById("resetButton").addEventListener("click", resetCanvas);
document.getElementById("randomButton").addEventListener("click", () => {
  resetCanvas();
  loadRandomKanji();
});

/**
 * 最初の表示
 */
window.addEventListener("DOMContentLoaded", loadRandomKanji);