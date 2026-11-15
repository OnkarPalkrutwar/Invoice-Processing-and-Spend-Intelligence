import os
import tempfile
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from extractor import extractor

app = FastAPI(
    title="InvoScan Python OCR & Invoice Extraction Service",
    description="Extracts structured financial details from PDF, PNG, and JPEG invoices using PyMuPDF, OpenCV, and Tesseract.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "service": "InvoScan Python OCR Service",
        "version": "1.0.0",
        "capabilities": ["PDF (PyMuPDF)", "Tesseract OCR", "Indian GST Extraction"],
    }

@app.post("/extract")
async def extract_invoice(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    # Save to temp file
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        raw_text = extractor.extract_text_from_file(tmp_path, file.filename)
        structured_data = extractor.parse_invoice_text(raw_text, file.filename)

        # Estimate confidence score
        confidence = 0.92
        if not structured_data.get("gstin"):
            confidence -= 0.1
        if structured_data.get("totalAmount", 0) <= 0:
            confidence -= 0.2
        confidence = max(0.4, min(0.99, round(confidence, 2)))

        return {
            "success": True,
            "filename": file.filename,
            "data": structured_data,
            "confidence": confidence,
            "raw_text": raw_text[:2000] if raw_text else "",
        }
    except Exception as e:
        return {
            "success": False,
            "filename": file.filename,
            "message": str(e),
            "data": None,
        }
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

# Alias for express backend endpoint compatibility
@app.post("/api/ocr/extract")
async def extract_invoice_alias(file: UploadFile = File(...)):
    return await extract_invoice(file)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
