const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
ctx.lineWidth = 8;
ctx.strokeStyle = "red";
ctx.lineCap = "round";
//関数//
let drawing = false;
let currentStroke = [];
let drawnStrokes = [];
let svgStrokes = [];

function getMouseTouchPos(event) {
  const rect = canvas.getBoundingClientRect();
  let e = event.type.startsWith("touch") ? event.touches[0] : event; // タッチイベントの場合は touches[0] を使用
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function startDrawing(e) {
  drawing = true;
  currentStroke = [];
  const pos = getMouseTouchPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  currentStroke.push(pos);
}

function continueDrawing(e) {
  if (!drawing) return;
  const pos = getMouseTouchPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  currentStroke.push(pos);
}

function stopDrawing() {
  if (drawing) {
    drawnStrokes.push(currentStroke);
    drawing = false;
  }
}

// イベントリスナーの追加：対応するマウス＆タッチイベントを統一的に管理
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", continueDrawing);
canvas.addEventListener("mouseup", stopDrawing);

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault(); // スクロールなどのデフォルト動作を防ぐ
  startDrawing(e);
});
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault(); // スクロールなどのデフォルト動作を防ぐ
  continueDrawing(e);
});
canvas.addEventListener("touchend", (e) => {
  e.preventDefault(); // デフォルト動作を防ぐ
  stopDrawing();
});

// SVGファイル一覧
const svgList = [
  "kanji/06f22.svg", // 漢
  "kanji/065e5.svg",  // 日
  "kanji/0672c.svg",  // 本
  "kanji/05b66.svg",  // 学
  "kanji/0751f.svg"   // 生
];

// ランダムにSVGを読み込む
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

      // SVGパス情報（ざっくりストローク数取得用）
      const paths = svg.querySelectorAll("path[id^='kvg:']");
      svgStrokes = Array.from(paths).map(p => p.getAttribute("d"));
    });
}

// 書き順の簡易判定（本数と順序が合えばOK）
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

  // 順序を比較しながらストロークを判定
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

  // 判定結果を表示
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

// リセット処理
function resetCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawnStrokes = [];
  document.getElementById("resultMessage").textContent = "";
  document.getElementById("resultIcon").innerHTML = ""; // 画像も消す
}

// ボタンイベント
document.getElementById("checkButton").addEventListener("click", checkAnswer);
document.getElementById("resetButton").addEventListener("click", resetCanvas);
document.getElementById("randomButton").addEventListener("click", () => {
  resetCanvas();
  loadRandomKanji();
});

// 最初の表示
window.addEventListener("DOMContentLoaded", loadRandomKanji);