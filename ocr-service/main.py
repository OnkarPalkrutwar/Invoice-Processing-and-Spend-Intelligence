import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.ocr_routes import router as ocr_router

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

# Include routes
app.include_router(ocr_router)

@app.get("/")
def root():
    return {
        "status": "operational",
        "service": "InvoScan Python OCR Service",
        "endpoints": {
            "health": "/health",
            "extract": "/extract",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
