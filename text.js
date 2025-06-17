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

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  currentStroke = [];
  const pos = getMousePos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  currentStroke.push(pos);
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const pos = getMousePos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  currentStroke.push(pos);
});

canvas.addEventListener("mouseup", () => {
  if (drawing) {
    drawnStrokes.push(currentStroke);
    drawing = false;
  }
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
  //関数設定
  const message = document.getElementById("resultMessage");
  const icon = document.getElementById("resultIcon");
  icon.innerHTML = ""; // 前回の画像をクリア

  if (drawnStrokes.length !== svgStrokes.length) {
    message.textContent = `不正解 😢 本数が違います（あなた: ${drawnStrokes.length} / 正: ${svgStrokes.length}）`;
    message.style.color = "red";
    // ×画像
    const img = document.createElement("img");
    img.src = "img/NO.png"; // ← ご自身の×画像のパスに合わせて変更
    img.alt = "不正解";
    //img.width = 48;
    icon.appendChild(img);

    const badbgm = new Audio("bgm/bad.mp3");
    badbgm.currentTime = 0;
    badbgm.play();
    return;
  }


  // 書き順の厳密判定（始点の順序を比較）
  let valid = true;
  for (let i = 0; i < svgStrokes.length; i++) {
    const userStroke = drawnStrokes[i];
    if (!userStroke || userStroke.length < 5) {
      valid = false;
      break;
    }

    const userStart = userStroke[0]; // ユーザーのストロークの始点

    const svgD = svgStrokes[i]; // SVGの正しいストローク
    const match = svgD.match(/M\s*([\d.]+),\s*([\d.]+)/i); // SVGの始点 (M x,y)
    if (!match) {
      valid = false;
      break;
    }

    const svgX = parseFloat(match[1]);
    const svgY = parseFloat(match[2]);

    // キャンバスサイズに合わせて拡大縮小（300x300前提なら無視してOK）
    // 必要であれば倍率調整を入れてください

    const dx = userStart.x - svgX;
    const dy = userStart.y - svgY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 30) { // ←ここで許容誤差を設定（大きくするとゆるく、小さくすると厳密）
      valid = false;
      break;
    }
  }

  // 正解か不正解か判定
  if (valid) {
    message.textContent = "正解！🎉 書き順が正しいです。";
    message.style.color = "green";
    // 〇画像
    const img = document.createElement("img");
    img.src = "img/OK.png"; // ← ご自身の〇画像のパスに合わせて変更
    img.alt = "正解";
    //img.width = 48;
    icon.appendChild(img);

    const goodbgm = new Audio("bgm/good.mp3");
    goodbgm.currentTime = 0;
    goodbgm.play();

  } else {
    message.textContent = "不正解 😢 書き順が違います。";
    message.style.color = "red";

    // ×画像
    const img = document.createElement("img");
    img.src = "img/NO.png"; // ← ご自身の×画像のパスに合わせて変更
    img.alt = "不正解";
    //img.width = 48;
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
