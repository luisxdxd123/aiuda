const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
};

const captureRegion = (callback) => {
  chrome.desktopCapture.chooseDesktopMedia(["screen", "window"], (streamId) => {
    if (!streamId) {
      console.error("No stream selected.");
      return;
    }

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: streamId,
        },
      },
    }).then((stream) => {
      const video = document.createElement("video");
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stream.getTracks().forEach((track) => track.stop());
        callback(canvas.toDataURL("image/png"));
      };
    }).catch((err) => console.error("Error capturing region:", err));
  });
};

// Botón para OCR
document.getElementById("captureText").addEventListener("click", () => {
  captureRegion((dataUrl) => {
    Tesseract.recognize(dataUrl, 'eng').then(({ data: { text } }) => {
      console.log("Texto detectado:", text);
      speak(text);
    });
  });
});

// Botón para descripción con IA
document.getElementById("describeImage").addEventListener("click", () => {
  captureRegion((dataUrl) => {
    fetch("http://localhost:5000/describe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl })
    })
    .then(res => res.json())
    .then(data => {
      console.log("Descripción:", data.description);
      speak(data.description);
    });
  });
});

// Listener para capturar texto seleccionado
document.getElementById("readText").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        func: () => window.getSelection().toString(),
      },
      (results) => {
        const text = results[0]?.result;
        if (text) {
          fetch("http://localhost:5000/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
          })
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
          });
        } else {
          console.error("No se seleccionó texto.");
        }
      }
    );
  });
});
