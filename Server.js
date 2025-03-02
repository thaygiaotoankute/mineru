const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình CORS - cho phép tất cả các nguồn
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware để xử lý JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Route chào mừng
app.get('/', (req, res) => {
  res.json({ message: 'PDF Convert API Proxy đang hoạt động' });
});

// API Endpoint: Lấy URL upload từ Mineru
app.post('/api/getBatchUploadUrl', async (req, res) => {
  try {
    const { mineruToken, fileName } = req.body;
    
    if (!mineruToken) {
      return res.status(400).json({ error: true, message: 'Thiếu Mineru Token' });
    }
    
    const requestBody = {
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
    };
    
    const response = await axios.post('https://mineru.net/api/v4/file-urls/batch', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mineruToken}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Lỗi getBatchUploadUrl:', error.message);
    res.status(error.response?.status || 500).json({
      error: true,
      message: error.response?.data?.msg || error.message
    });
  }
});

// API Endpoint: Kiểm tra kết quả xử lý
app.post('/api/pollResults', async (req, res) => {
  try {
    const { mineruToken, batchId } = req.body;
    
    if (!mineruToken || !batchId) {
      return res.status(400).json({ error: true, message: 'Thiếu Mineru Token hoặc Batch ID' });
    }
    
    const response = await axios.get(`https://mineru.net/api/v4/extract-results/batch/${batchId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mineruToken}`
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Lỗi pollResults:', error.message);
    res.status(error.response?.status || 500).json({
      error: true,
      message: error.response?.data?.msg || error.message
    });
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});

// Export app cho render.com
module.exports = app;
