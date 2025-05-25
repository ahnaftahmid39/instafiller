// js/imageHandler.js
import { uiElements, updateButtonStates } from "./ui.js";
import { getExtensionEnabled, getSessionId, hasOcrData } from "./session.js";

let selectedImages = [];

export function getSelectedImages() {
  return selectedImages;
}

export function clearSelectedImages() {
  selectedImages = [];
  uiElements.imageInput.value = "";
  updateImageThumbnails();
  updateButtonStates(false, getExtensionEnabled(), hasOcrData(getSessionId()));
}

export function addImage(imageData) {
  selectedImages.push(imageData);
  updateImageThumbnails();
  updateButtonStates(true, getExtensionEnabled(), hasOcrData(getSessionId()));
}

export function removeSelectedImage(imageId) {
  selectedImages = selectedImages.filter((img) => img.id !== imageId);
  updateImageThumbnails();
  updateButtonStates(
    selectedImages.length > 0,
    getExtensionEnabled(),
    hasOcrData(getSessionId())
  );
}

export function updateImageThumbnails() {
  uiElements.imageThumbnails.innerHTML = "";
  selectedImages.forEach((image) => {
    const container = document.createElement("div");
    container.className = "image-container";

    const img = document.createElement("img");
    img.src = image.dataUrl;
    img.className = "image-thumbnail";
    img.title = `${image.name} ${image.fromMobile ? "(Mobile)" : "(Computer)"}`;

    const removeBtn = document.createElement("div");
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = "×";
    removeBtn.onclick = () => removeSelectedImage(image.id);

    if (image.fromMobile) {
      img.style.border = "2px solid #8b5cf6";
    }

    container.appendChild(img);
    container.appendChild(removeBtn);
    uiElements.imageThumbnails.appendChild(container);
  });
}

// Event listener for image input
uiElements.imageInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);

  if (files.length === 0) return;

  files.forEach((file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          id: Date.now() + Math.random(),
          name: file.name,
          base64: e.target.result.split(",")[1],
          mimeType: file.type,
          dataUrl: e.target.result,
          fromMobile: false,
        };
        addImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  });
});
