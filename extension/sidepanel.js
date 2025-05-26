document.getElementById("filterBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  }
});
document.getElementById("autoFill").addEventListener("click", async() => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        document.getElementById("")
      }
    })
  }
})
