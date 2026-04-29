const startBtn = document.getElementById("start-btn");
const statusBox = document.getElementById("status-box");

let scanner;
let isProcessing = false;

// 1. YOUR GOOGLE APPS SCRIPT URL
const API_URL = "https://script.google.com/macros/s/AKfycbyY4ZqmOUb0BRoqFOEmJzWMRmaILb6H6VQG0IokaFKagavQgx3cdXvSSJ5tCMC8Te5J/exec";

function updateStatus(msg, cls){
  statusBox.textContent = msg;
  statusBox.className = cls;
}

startBtn.addEventListener("click", startScanner);

function startScanner(){
  startBtn.style.display = "none";
  updateStatus("Requesting camera...", "processing");
  scanner = new Html5Qrcode("reader");

  Html5Qrcode.getCameras()
    .then(cameras => {
      if(!cameras || cameras.length === 0){
        updateStatus("No camera found", "error");
        startBtn.style.display = "block";
        return;
      }

      let cameraId = cameras[0].id;
      for(let cam of cameras){
        const label = cam.label.toLowerCase();
        if(label.includes("back") || label.includes("rear") || label.includes("environment")){
          cameraId = cam.id;
          break;
        }
      }

      scanner.start(
        cameraId,
        { fps:10, qrbox:{ width:250, height:250 } },
        onScanSuccess
      );

      updateStatus("Ready to scan...", "idle");
    })
    .catch(err => {
      console.error(err);
      updateStatus("Camera permission denied", "error");
      startBtn.style.display = "block";
    });
}

function onScanSuccess(decodedText){
  if(isProcessing) return;
  isProcessing = true;

  updateStatus("Verifying ID: " + decodedText, "processing");
  scanner.pause(true);

  fetch(API_URL,{
    method:"POST",
    headers:{
      "Content-Type":"text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      barcode: decodedText
    })
  })
  .then(res => res.json())
  .then(response => {
    if(response.success){
      const cls = response.status === "IN" ? "success-in" : "success-out";
      updateStatus(`[${response.status}] : ${response.name}`, cls);

      // --- THE ROUND TRIP REDIRECT ---
      // Wait 2.5 seconds so the user can see the "Welcome" message
      setTimeout(() => {
        // Redirects back to the main Google Apps Script UI
        window.location.href = API_URL + "?status=success";
      }, 2500);

    } else {
      updateStatus("Declined: " + response.message, "error");
      resetScanner();
    }
  })
  .catch(err => {
    console.error(err);
    updateStatus("Server error", "error");
    resetScanner();
  });
}

function resetScanner(){
  setTimeout(() => {
    isProcessing = false;
    updateStatus("Ready to scan...", "idle");
    if(scanner) scanner.resume();
  }, 2500);
}