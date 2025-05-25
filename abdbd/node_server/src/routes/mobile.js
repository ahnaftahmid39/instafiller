const express = require("express");
const { sessions } = require("../services/sessionService");

const router = express.Router();

router.get("/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    return res.status(404).send("Session not found");
  }

  // The HTML content is quite large, consider moving it to a separate .html file
  // and serving it using res.sendFile or a templating engine like EJS or Pug.
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Scanner</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            color: white;
        }
        
        .header {
            padding: 20px;
            text-align: center;
            background: rgba(0,0,0,0.2);
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .session-id {
            font-size: 12px;
            opacity: 0.8;
            font-family: monospace;
        }
        
        .camera-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
            width: 100%;
        }
        
        .camera-preview {
            position: relative;
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 20px;
            aspect-ratio: 4/3;
        }
        
        #video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        #canvas {
            display: none;
        }
        
        .capture-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.5);
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .capture-overlay.show {
            opacity: 1;
        }
        
        .preview-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 12px;
        }
        
        .controls {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .button-row {
            display: flex;
            gap: 12px;
        }
        
        button {
            flex: 1;
            padding: 16px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            min-height: 56px;
        }
        
        .btn-primary {
            background: #4CAF50;
            color: white;
        }
        
        .btn-secondary {
            background: #2196F3;
            color: white;
        }
        
        .btn-warning {
            background: #FF9800;
            color: white;
        }
        
        .btn-success {
            background: #8BC34A;
            color: white;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .photo-count {
            text-align: center;
            padding: 12px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            margin-bottom: 12px;
        }
        
        .status {
            text-align: center;
            padding: 8px;
            font-size: 14px;
            opacity: 0.8;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📱 Document Scanner</h1>
        <div class="session-id">Session: ${sessionId}</div>
    </div>
    
    <div class="camera-container">
        <div class="photo-count">
            <span id="photoCount">0</span> photos captured
        </div>
        
        <div class="camera-preview">
            <video id="video" autoplay playsinline></video>
            <canvas id="canvas"></canvas>
            <div class="capture-overlay" id="captureOverlay">
                <div style="color: white; font-size: 18px;">📸 Capturing...</div>
            </div>
        </div>
        
        <div class="controls">
            <button id="captureBtn" class="btn-primary">📷 Take Photo</button>
            
            <div class="button-row">
                <button id="retakeBtn" class="btn-warning" style="display: none;">🔄 Retake</button>
                <button id="nextPageBtn" class="btn-secondary" style="display: none;">📄 Next Page</button>
            </div>
            
            <button id="finalizeBtn" class="btn-success" style="display: none;">✅ Finalize & Submit</button>
        </div>
        
        <div class="status" id="status">Position document in frame and tap capture</div>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <div>Processing photo...</div>
        </div>
    </div>

    <script>
        const sessionId = '${sessionId}';
        let stream = null;
        let photoCount = 0;
        let currentPhotoData = null;
        
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const captureBtn = document.getElementById('captureBtn');
        const retakeBtn = document.getElementById('retakeBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const finalizeBtn = document.getElementById('finalizeBtn');
        const captureOverlay = document.getElementById('captureOverlay');
        const status = document.getElementById('status');
        const loading = document.getElementById('loading');
        const photoCountEl = document.getElementById('photoCount');
        
        // Initialize camera
        async function initCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                });
                video.srcObject = stream;
                status.textContent = 'Camera ready! Position document and tap capture';
            } catch (err) {
                console.error('Camera error:', err);
                status.textContent = 'Camera access denied. Please enable camera permissions.';
            }
        }
        
        // Capture photo
        function capturePhoto() {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Show capture effect
            captureOverlay.classList.add('show');
            setTimeout(() => captureOverlay.classList.remove('show'), 300);
            
            context.drawImage(video, 0, 0);
            currentPhotoData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Show preview
            video.style.display = 'none';
            const img = document.createElement('img');
            img.src = currentPhotoData;
            img.className = 'preview-image';
            video.parentNode.appendChild(img);
            
            // Update UI
            captureBtn.style.display = 'none';
            retakeBtn.style.display = 'block';
            nextPageBtn.style.display = 'block';
            finalizeBtn.style.display = 'block';
            status.textContent = 'Photo captured! Choose your next action.';
        }
        
        // Retake photo
        function retakePhoto() {
            const img = document.querySelector('.preview-image');
            if (img) img.remove();
            
            video.style.display = 'block';
            captureBtn.style.display = 'block';
            retakeBtn.style.display = 'none';
            nextPageBtn.style.display = 'none';
            finalizeBtn.style.display = 'none';
            currentPhotoData = null;
            status.textContent = 'Position document and tap capture';
        }
        
        // Send photo to server
        async function sendPhoto(isNextPage = false) {
            if (!currentPhotoData) return;
            
            loading.style.display = 'block';
            status.textContent = isNextPage ? 'Sending photo and preparing for next...' : 'Finalizing submission...';
            
            try {
                const response = await fetch('/api/upload-photo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        photoData: currentPhotoData,
                        isNextPage
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    photoCount++;
                    photoCountEl.textContent = photoCount;
                    
                    if (isNextPage) {
                        // Reset for next photo
                        retakePhoto();
                        status.textContent = 'Photo sent! Ready for next page.';
                    } else {
                        // Finalize
                        status.textContent = 'All photos submitted successfully!';
                        captureBtn.disabled = true;
                        retakeBtn.disabled = true;
                        nextPageBtn.disabled = true;
                        finalizeBtn.disabled = true;
                    }
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (error) {
                console.error('Upload error:', error);
                status.textContent = 'Upload failed. Please try again.';
            } finally {
                loading.style.display = 'none';
            }
        }
        
        // Event listeners
        captureBtn.addEventListener('click', capturePhoto);
        retakeBtn.addEventListener('click', retakePhoto);
        nextPageBtn.addEventListener('click', () => sendPhoto(true));
        finalizeBtn.addEventListener('click', () => sendPhoto(false));
        
        // Initialize
        initCamera();
        
        // Update photo count on load
        fetch('/api/session-status/' + sessionId)
            .then(r => r.json())
            .then(data => {
                if (data.session) {
                    photoCount = data.session.photos.length;
                    photoCountEl.textContent = photoCount;
                }
            })
            .catch(console.error);
    </script>
</body>
</html>`;

  res.send(html);
});

module.exports = router;
