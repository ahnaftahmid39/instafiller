# 🚀 Deployment Guide

## Deploy to Vercel

### 1. Prepare for Deployment

1. **Install Vercel CLI** (if not already installed):
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. **Login to Vercel**:
   \`\`\`bash
   vercel login
   \`\`\`

### 2. Deploy the Server

1. **Deploy to Vercel**:
   \`\`\`bash
   vercel --prod
   \`\`\`

2. **Set Environment Variables** (if needed):
   \`\`\`bash
   vercel env add PORT
   # Enter: 3000
   \`\`\`

### 3. Update Extension Configuration

1. **Get your Vercel URL** from the deployment output (e.g., `https://your-app-name.vercel.app`)

2. **Update sidebar.js**:
   \`\`\`javascript
   // Replace this line in sidebar.js:
   return "https://your-app-name.vercel.app" // Replace with your actual Vercel URL
   \`\`\`

3. **Update manifest.json** to include your Vercel domain:
   \`\`\`json
   {
   "host_permissions": [
   "<all_urls>",
   "https://generativelanguage.googleapis.com/",
   "https://your-app-name.vercel.app/*"
   ]
   }
   \`\`\`

### 4. Test the Deployment

1. **Load the updated extension** in Chrome
2. **Click "Get Photos from Mobile"**
3. **Scan QR code** with your phone
4. **Test photo capture** and automatic processing

## Alternative Deployment Options

### Heroku

\`\`\`bash

# Install Heroku CLI and login

heroku create your-app-name
git push heroku main
\`\`\`

### Railway

\`\`\`bash

# Connect to Railway and deploy

railway login
railway new
railway up
\`\`\`

### Render

1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`

## Production Considerations

### 1. Database Storage

Replace in-memory storage with a database:
\`\`\`javascript
// Use Redis for sessions
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Use PostgreSQL/MongoDB for persistent storage
\`\`\`

### 2. File Storage

Use cloud storage for photos:
\`\`\`javascript
// AWS S3, Cloudinary, or similar
const cloudinary = require('cloudinary').v2;
\`\`\`

### 3. Security

- Add rate limiting
- Implement authentication
- Use HTTPS only
- Validate file types and sizes

### 4. Monitoring

- Add logging (Winston, Pino)
- Error tracking (Sentry)
- Performance monitoring

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your Vercel URL is added to CORS origins
2. **Function Timeout**: Increase maxDuration in vercel.json
3. **Memory Issues**: Optimize image processing and storage
4. **Session Loss**: Implement persistent storage for production

### Debug Mode:

Add this to your server for debugging:
\`\`\`javascript
app.use((req, res, next) => {
console.log(`${req.method} ${req.path}`, req.body);
next();
});
