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

    // Create file type icon wrapper
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "file-icon-wrapper";

    // Add file type icon
    const fileIcon = document.createElement("span");
    fileIcon.className = "file-icon";
    fileIcon.textContent = getFileIcon(image.mimeType);
    iconWrapper.appendChild(fileIcon);

    // Create name container
    const nameContainer = document.createElement("div");
    nameContainer.className = "name-container";

    // Add file name
    const nameElement = document.createElement("div");
    nameElement.className = "image-name";
    nameElement.textContent = image.name;

    // Add source badge (Mobile/Computer)
    const sourceBadge = document.createElement("span");
    sourceBadge.className = `source-badge ${
      image.fromMobile ? "mobile" : "computer"
    }`;
    sourceBadge.textContent = image.fromMobile ? "📱 Mobile" : "💻 Computer";

    nameContainer.appendChild(nameElement);
    nameContainer.appendChild(sourceBadge);

    // Create remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = "×";
    removeBtn.title = "Remove image";
    removeBtn.onclick = () => removeSelectedImage(image.id);

    // Assemble container
    container.appendChild(iconWrapper);
    container.appendChild(nameContainer);
    container.appendChild(removeBtn);

    if (image.fromMobile) {
      container.classList.add("mobile-image");
    }

    uiElements.imageThumbnails.appendChild(container);
  });
}

// Helper function to determine file icon
function getFileIcon(mimeType) {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return "📸";
    case "image/png":
      return "🖼️";
    case "image/gif":
      return "🎯";
    default:
      return "📄";
  }
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
