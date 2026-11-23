const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const env = require('../config/env');

/**
 * Service to communicate with the standalone Python FastAPI OCR service
 */
class OcrService {
  /**
   * Send file to Python OCR service
   * @param {string} filePath Absolute or relative path to invoice file
   * @param {string} originalName Original filename
   * @param {string} mimeType File mime type
   */
  async extractInvoiceData(filePath, originalName, mimeType) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found on disk at: ${filePath}`);
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(filePath), {
        filename: originalName,
        contentType: mimeType,
      });

      console.log(`[OCR Service] Sending ${originalName} to Python service at ${env.ocrServiceUrl}/extract`);

      const response = await axios.post(`${env.ocrServiceUrl}/extract`, form, {
        headers: {
          ...form.getHeaders(),
        },
        timeout: 75000, // 75 seconds timeout to accommodate potential cold start on free hosting
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          rawOcr: response.data.raw_text || '',
          confidence: response.data.confidence || 0.85,
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'OCR processing failed to extract structure.',
          data: response.data?.data || null,
        };
      }
    } catch (error) {
      console.error(`[OCR Service Error] Calling ${env.ocrServiceUrl}/extract failed:`, error.message);
      if (error.response) {
        console.error(`[OCR Service Error] Status: ${error.response.status}, Data:`, error.response.data);
      }
      return {
        success: false,
        isServiceDown: true,
        error: `OCR service connection error: ${error.message}. You can still review and enter invoice fields manually.`,
        data: null,
      };
    }
  }
}

module.exports = new OcrService();
