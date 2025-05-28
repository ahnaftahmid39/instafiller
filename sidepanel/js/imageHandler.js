// js/imageHandler.js
import { uiElements, updateButtonStates } from "./ui.js";
import { getExtensionEnabled, getSessionId, hasOcrData } from "./session.js";

let selectedImages = [];

export function getSelectedImages() {
  return selectedImages;
}

export async function clearSelectedImages() {
  selectedImages = [];
  // Make sure to reset the input
  if (uiElements.imageInput) {
    uiElements.imageInput.value = "";
  }
  updateImageThumbnails();
  updateButtonStates(
    false,
    getExtensionEnabled(),
    await hasOcrData(getSessionId())
  );
}

export async function addImage(imageData) {
  selectedImages.push(imageData);
  updateImageThumbnails();
  updateButtonStates(
    true,
    getExtensionEnabled(),
    await hasOcrData(getSessionId())
  );
}

export async function removeSelectedImage(imageId) {
  selectedImages = selectedImages.filter((img) => img.id !== imageId);
  updateImageThumbnails();
  updateButtonStates(
    selectedImages.length > 0,
    getExtensionEnabled(),
    await hasOcrData(getSessionId())
  );
}

export function updateImageThumbnails() {
  uiElements.imageThumbnails.innerHTML = "";
  selectedImages.forEach((image) => {
    const container = document.createElement("div");
    container.className = "image-container";

    const nameElement = document.createElement("div");
    nameElement.className = "image-name";
    nameElement.textContent = image.name;
    nameElement.title = `${image.name} ${
      image.fromMobile ? "(Mobile)" : "(Computer)"
    }`;

    const removeBtn = document.createElement("button"); // Changed to button
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = "×";
    removeBtn.title = "Remove image"; // Added tooltip
    removeBtn.onclick = () => removeSelectedImage(image.id);

    if (image.fromMobile) {
      container.classList.add("mobile-image"); // Using classList instead of style
    }

    container.appendChild(nameElement);
    container.appendChild(removeBtn);
    uiElements.imageThumbnails.appendChild(container);
  });
}

// Event listener for image input
uiElements.imageInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files);

  if (files.length === 0) {
    // Reset the input value so the same file can be selected again
    event.target.value = "";
    return;
  }

  for (const file of files) {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = {
          id: Date.now() + Math.random(),
          name: file.name,
          base64: e.target.result.split(",")[1],
          mimeType: file.type,
          dataUrl: e.target.result,
          fromMobile: false,
        };
        await addImage(imageData);
      };
      reader.onerror = () => {
        showMessage(`Failed to read file: ${file.name}`, "error");
      };
      reader.readAsDataURL(file);
    } else {
      showMessage(`Invalid file type: ${file.name}`, "error");
    }
  }
  // Reset the input value after processing
  event.target.value = "";
});
