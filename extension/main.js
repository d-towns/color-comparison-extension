async function main() {
  const imgInput = document.getElementById("imgInput");

  await loadSavedImage();

  imgInput.addEventListener("change", function () {
    const file = this.files[0];
    const reader = new FileReader();
    reader.onload = async function (e) {
      const imgSrc = e.target.result;
      setImagePreview(imgSrc);
      saveToChomeSync("img", imgSrc);
      handleImageUpload(file);
    };
    reader.readAsDataURL(file);
  });
}

async function handleImageUpload(file) {
  const imgBuffer = await file.arrayBuffer();
  fetch("http://localhost:3000/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: imgBuffer,
  })
    .then((response) => response.json())
    .then((data) => {
      setColorPreview(data.colors);
      saveToChomeSync("colors", data.colors);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function setImagePreview(imgSrc) {
  const imagePreview = document.getElementById("imgPreview");
  imagePreview.src = imgSrc;
}

async function loadSavedImage() {
  const savedImg = await getFromChromeSync("img");
  const savedColors = await getFromChromeSync("colors");

  if (savedImg) {
    const imagePreview = document.getElementById("imgPreview");
    imagePreview.src = savedImg;
  }

  if (savedColors) {
    setColorPreview(savedColors);
  }
}

function saveToChomeSync(key, value) {
  chrome.runtime.sendMessage({ action: "save", data: { key, value } });
}

async function getFromChromeSync(key) {
  return new Promise((resolve, reject) => {
    chrome.runtime
      .sendMessage({ action: "get", data: { key } })
      .then((response) => {
        resolve(response.value);
      });
  });
}

function setColorPreview(colorsArray) {
  for (let i = 0; i < colorsArray.length; i++) {
    const colorDiv = document.getElementById(`color${i + 1}`);
    if (colorDiv) {
      colorDiv.style.backgroundColor = colorsArray[i].hex;
    } else {
      const colorDiv = document.createElement("div");
      colorDiv.id = `color-${i + 1}`;
      colorDiv.style.backgroundColor = colorsArray[i];
    }
  }
}

main();
