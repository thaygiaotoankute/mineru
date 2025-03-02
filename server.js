const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const nodefetch = require('node-fetch@2');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình CORS - cho phép tất cả các nguồn
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT'],
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

// Endpoint để upload file PDF trực tiếp đến Mineru (một endpoint duy nhất)
app.post('/api/processPDF', upload.single('pdfFile'), async (req, res) => {
  try {
    const mineruToken = req.body.mineruToken;
    
    if (!mineruToken) {
      return res.status(400).json({ error: true, message: 'Thiếu Mineru Token' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: true, message: 'Không có file nào được tải lên' });
    }
    
    // BƯỚC 1: Lấy URL upload từ Mineru
    const requestBody = {
      enable_formula: true,
      enable_table: true,
      layout_model: "doclayout_yolo",
      language: "vi",
      files: [
        {
          name: req.file.originalname || 'document.pdf',
          is_ocr: true,
          data_id: `web_upload_${Date.now()}`
        }
      ]
    };
    
    const batchUrlResponse = await axios.post('https://mineru.net/api/v4/file-urls/batch', requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mineruToken}`
      }
    });
    
    const batchData = batchUrlResponse.data;
    
    if (batchData.code !== 0 && batchData.code !== 200) {
      return res.status(400).json({ error: true, message: batchData.msg || 'Mineru API error' });
    }
    
    const batchId = batchData.data.batch_id;
    const uploadUrl = batchData.data.file_urls[0];
    
    if (!uploadUrl) {
      return res.status(400).json({ error: true, message: 'Không có URL upload được trả về' });
    }
    
    try {
      // BƯỚC 2: Upload file - THAY ĐỔI TẠI ĐÂY
      // Sử dụng fetch API với các tùy chọn cơ bản nhất để tránh thay đổi headers
      const fetch = require('node-fetch');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: req.file.buffer,
        headers: {
          // Không đặt Content-Type hoặc các headers khác
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload thất bại: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
    } catch (uploadError) {
      console.error('Lỗi chi tiết khi upload:', uploadError);
      return res.status(500).json({ 
        error: true, 
        message: `Lỗi khi upload file: ${uploadError.message}`,
        details: uploadError.toString()
      });
    }
    
    // BƯỚC 3: Trả về batch ID để client có thể poll
    res.json({
      success: true,
      batchId: batchId
    });
    
  } catch (error) {
    console.error('Lỗi processPDF:', error.message);
    let errorMessage = error.message;
    let errorDetails = null;
    
    if (error.response) {
      errorDetails = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
      errorMessage = `${error.message} - Status: ${error.response.status}`;
    }
    
    res.status(error.response?.status || 500).json({
      error: true,
      message: errorMessage,
      details: errorDetails
    });
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});

// Export app cho render.com
module.exports = app;
