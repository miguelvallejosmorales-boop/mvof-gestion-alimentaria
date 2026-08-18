/* MVOF - Scanner con QuaggaJS */
let SCANNER_CALLBACK = null;
let QUAGGA_LOADED = false;
async function cargarQuagga(){
  if (QUAGGA_LOADED) return true;
  return new Promise(function(resolve){
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/dist/quagga.min.js";
    s.onload = function(){ QUAGGA_LOADED = true; resolve(true); };
    s.onerror = function(){ resolve(false); };
    document.head.appendChild(s);
  });
}
async function abrirScanner(callback){
  SCANNER_CALLBACK = callback;
  const ok = await cargarQuagga();
  if (!ok){ toast("No se pudo cargar el scanner","err"); return; }
  $("modalScanner").classList.add("show");
  await new Promise(r => setTimeout(r, 100));
  Quagga.init({
    inputStream: {
      type: "LiveStream",
      target: document.getElementById("scanner-viewport"),
      constraints: {
        facingMode: { ideal: "environment" },
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 480, ideal: 1080, max: 1080 },
        aspectRatio: { min: 1, max: 2 },
        focusMode: "continuous",
        advanced: [{ focusMode: "continuous", exposureMode: "continuous" }]
      }
    },
    locator: { patchSize: "medium", halfSample: true },
    numOfWorkers: navigator.hardwareConcurrency || 4,
    frequency: 10,
    decoder: { readers: ["ean_reader","ean_8_reader","upc_reader","upc_e_reader","code_128_reader","code_39_reader","code_93_reader"] },
    locate: true
  }, function(err){
    if (err){ console.error("Scanner error:", err); toast("Error abriendo cámara: " + err.message, "err"); return; }
    Quagga.start();
    setTimeout(function() {
      try {
        const track = Quagga.CameraAccess.getActiveTrack();
        if (track && typeof track.getCapabilities === "function") {
          const capabilities = track.getCapabilities();
          const constraints = {};
          if (capabilities.focusMode) constraints.focusMode = "continuous";
          if (capabilities.zoom) constraints.zoom = Math.min(1.5, capabilities.zoom.max);
          if (Object.keys(constraints).length > 0) track.applyConstraints({ advanced: [constraints] }).catch(function(){});
        }
      } catch(e) {}
    }, 500);
  });
  Quagga.onDetected(onCodeDetected);
  Quagga.onProcessed(onProcessed);
}
let LAST_CODES = [];
function onCodeDetected(result){
  const codigo = result.codeResult.code;
  if (!codigo) return;
  LAST_CODES.push(codigo);
  if (LAST_CODES.length > 3) LAST_CODES.shift();
  const iguales = LAST_CODES.filter(c => c === codigo).length;
  if (iguales >= 2) {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    detenerScanner();
    if (SCANNER_CALLBACK) SCANNER_CALLBACK(codigo);
    LAST_CODES = [];
  }
}
function onProcessed(result){
  if (!result || typeof Quagga==="undefined" || !Quagga.canvas) return;
  const drawingCtx = Quagga.canvas.ctx.overlay;
  const drawingCanvas = Quagga.canvas.dom.overlay;
  if (drawingCtx && drawingCanvas) {
    if (result.boxes) {
      drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
      result.boxes.filter(function(box){ return box !== result.box; }).forEach(function(box){
        Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "#5B7C6E", lineWidth: 2 });
      });
    }
    if (result.box) Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#5B7C6E", lineWidth: 3 });
    if (result.codeResult && result.codeResult.code) Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, drawingCtx, { color: "#3D5449", lineWidth: 4 });
  }
}
function detenerScanner(){
  LAST_CODES = [];
  if (typeof Quagga !== "undefined" && Quagga.stop){
    try{ Quagga.stop(); }catch(e){}
    try{ Quagga.offDetected(onCodeDetected); }catch(e){}
    try{ Quagga.offProcessed(onProcessed); }catch(e){}
  }
  $("modalScanner").classList.remove("show");
}
