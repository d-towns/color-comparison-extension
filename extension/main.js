function compareColors(control_color, test_color) {
  if (!control_color || !test_color) {
    return;
  }

  console.log("Control Color:", control_color);
  console.log("Test Color:", test_color);
  const closeness = {
    r: Math.abs(control_color.r - test_color.r),
    g: Math.abs(control_color.g - test_color.g),
    b: Math.abs(control_color.b - test_color.b),
  };

  const totalCloseness = (((765 - (closeness.r + closeness.g + closeness.b)) / 765) * 100).toFixed(2);
  return totalCloseness;
}

async function main() {
  const imgInput = document.getElementById("imgInput");

  await loadSavedImageAndColors();
  await loadProductImageAndColors();

  const uploadImagePreview = document.getElementById("uploadImgPreview");
  const productImagePreview = document.getElementById("productImgPreview");

  uploadImagePreview.addEventListener('load',handleImageLoad );
  productImagePreview.addEventListener('load',handleImageLoad );

  const uploadColorsContainer = document.getElementById("uploadColorsContainer");
  const productColorsContainer = document.getElementById("productColorsContainer");

  const uploadColorDivs = uploadColorsContainer.querySelectorAll("div");
  const productColorDivs = productColorsContainer.querySelectorAll("div");

  uploadColorDivs.forEach((colorDiv) => {
    colorDiv.addEventListener("click", function () {
      uploadColorDivs.forEach((div) => div.classList.remove("selected"));
      this.classList.add("selected");
      handleImageLoad();
    });
  });

  productColorDivs.forEach((colorDiv) => {
    colorDiv.addEventListener("click", function () {
      productColorDivs.forEach((div) => div.classList.remove("selected"));
      this.classList.add("selected");
      handleImageLoad();
    });
  });

  imgInput.addEventListener("change", function () {
    const file = this.files[0];
    console.log("File:", file);
    const reader = new FileReader();
    reader.onload = async function (e) {
      const imgSrc = e.target.result;
      saveToChomeSync("img", imgSrc);
      const colorData = await handleImageUpload(file);
      console.log("Color Data from upload:", colorData);
      saveToChomeSync("upload_colors", colorData.colors);
      setColorPreview("upload", colorData.colors);
      setImagePreview(imgSrc);
    };
    reader.readAsDataURL(file);
  });

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "startImageSelection",
    });

    document.addEventListener("DOMContentLoaded", function () {
      // This prevents the popup from closing when clicking inside iframes
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "startImageSelection",
      });
    });
    // Optionally close the popup
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "imageClicked") {
      console.log("Image clicked event data:", message.data);

      const { url } = message.data;
      console.log("Image clicked:", url);
      fetch(url)
        .then((response) => {
          console.log("Response:", response);
          return response.blob();
        })
        .then((blob) => {
          handleImageUpload(blob).then((colorData) => {
          console.log("Color Data from click:", colorData);
          // before the image clicked event is sent, the image url has already been saved to chrome storage
          // now that we have the colors data, we need to save it in chrome storage as well
          saveToChomeSync("product_colors", colorData.colors);
          setColorPreview("product", colorData.colors);
          setProductImagePreview(url);
          });
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  });
}

async function handleImageLoad() {
    // get the colors from chrome storage
    const uploadColors = await getFromChromeSync("upload_colors")
    const productColors = await getFromChromeSync("product_colors")
    if(!uploadColors || !productColors){
      return;
    }

    console.log("Upload Colors:", uploadColors);
    console.log("Product Colors:", productColors);

    const uploadColorDivs = document.getElementById("uploadColorsContainer")
    const selectedUploadColorDiv = uploadColorDivs.querySelector('.selected')
    console.log("Selected Upload Color Div:", selectedUploadColorDiv)
    const selectedUploadColor = uploadColors[selectedUploadColorDiv.dataset.index]
    const productColorDivs = document.getElementById("productColorsContainer")
    const selectedProductColorDiv = productColorDivs.querySelector('.selected')
    console.log("Selected Product Color Div:", selectedProductColorDiv)
    const selectedProductColor = productColors[selectedProductColorDiv.dataset.index]

    console.log("Selected Upload Colors:", selectedUploadColor)
    console.log("Selected Product Colors:", selectedProductColor)
    if(!selectedUploadColor || !selectedProductColor){
      console.error("Cannot find selected colors")
      return;
    }

    const closeness = compareColors(selectedUploadColor.rgb, selectedProductColor.rgb);
    setColorComparisonResult(closeness);
}

async function handleImageUpload(file) {
  // if the file is a Blob, convert it to an ArrayBuffer
  const formData = new FormData();
  formData.append("image", file);
  // console.log("Image Buffer:", imgBuffer);
  const response = await fetch("http://localhost:3000/upload", {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  return data;
}

function setColorComparisonResult(result) {
  const resultP = document.getElementById("colorComparisonResult");
  const resultProgress = document.getElementById("colorComparisonProgress");
  resultP.innerText = result + "%";
  resultProgress.style = `width: ${result}%`;
}

function setImagePreview(imgSrc) {
  const imagePreview = document.getElementById("uploadImgPreview");
  imagePreview.src = imgSrc;
}

function setProductImagePreview(imgSrc) {
  const imagePreview = document.getElementById("productImgPreview");
  imagePreview.src = imgSrc;
}

async function loadSavedImageAndColors() {
  const savedImg = await getFromChromeSync("img");
  const savedColors = await getFromChromeSync("upload_colors");

  if (savedImg) {
    const imagePreview = document.getElementById("uploadImgPreview");
    imagePreview.src = savedImg;
  }

  if (savedColors) {
    setColorPreview("upload", savedColors);
  }
}

async function loadProductImageAndColors() {
  const productImages = await getFromChromeSync("selectedImage");
  const savedColors = await getFromChromeSync("product_colors");

  console.log("Product Images:", productImages);
  if (productImages) {
    const productImage = document.getElementById("productImgPreview");
    productImage.src = productImages.url;
    setColorPreview("product", savedColors);
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

function setColorPreview(imgType, colorsArray) {
  if (!colorsArray) {
    return;
  }
  for (let i = 0; i < colorsArray.length; i++) {
    const colorDiv = document.getElementById(`${imgType}_color${i + 1}`);
    if (colorDiv) {
      if(i==0){colorDiv.classList.add("selected");}
      colorDiv.style.backgroundColor = colorsArray[i].hex;
      colorDiv.dataset.index = i;
    } else {
      const colorDiv = document.createElement("div");
      colorDiv.style.backgroundColor = colorsArray[i];
    }
  }


}

main();
