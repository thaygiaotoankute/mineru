const express = require('express');
const fetch = require('node-fetch'); // Nếu bạn dùng Node.js 18+, có thể sử dụng global fetch thay vì node-fetch
const app = express();
const port = process.env.PORT || 3000;

// Middleware cho phép CORS cho mọi yêu cầu
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Cho phép truy cập từ mọi nguồn
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware để parse JSON body
app.use(express.json());

// Endpoint: Lấy URL upload từ Mineru API
app.post('/getBatchUploadUrl', async (req, res) => {
  const { mineruToken, fileName } = req.body;
  if (!mineruToken) {
    return res.status(400).json({ error: true, message: 'Missing mineruToken' });
  }
  try {
    const response = await fetch('https://mineru.net/api/v4/file-urls/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mineruToken}`
      },
      body: JSON.stringify({
        enable_formula: true,
        enable_table: true,
        layout_model: "doclayout_yolo",
        language: "vi",
        files: [
          {
            name: fileName || 'document.pdf',
            is_ocr: true,
            data_id: `web_upload_${Date.now()}`
          }
        ]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: true, message: error.toString() });
  }
});

// Endpoint: Poll kết quả từ Mineru API
app.get('/pollResults/:batchId', async (req, res) => {
  const { mineruToken } = req.query;
  const { batchId } = req.params;
  if (!mineruToken || !batchId) {
    return res.status(400).json({ error: true, message: 'Missing mineruToken or batchId' });
  }
  try {
    const response = await fetch(`https://mineru.net/api/v4/extract-results/batch/${batchId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mineruToken}`
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: true, message: error.toString() });
  }
});

// Khởi chạy server
app.listen(port, () => console.log(`Server running on port ${port}`));
