import os
import re
import pymupdf as fitz  # PyMuPDF
from PIL import Image
import pytesseract

# Auto-detect Tesseract binary path on Windows if not already in system PATH
COMMON_TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
]

for p in COMMON_TESSERACT_PATHS:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break

# Regular Expressions for Invoice Entities
GSTIN_REGEX = r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b"
EMAIL_REGEX = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
PHONE_REGEX = r"(?:\+91[-\s]?)?[6789]\d{9}\b|\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b"
DATE_PATTERNS = [
    r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
    r"\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b",
    r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4}\b",
]

def clean_amount(val_str):
    if not val_str:
        return 0.0
    cleaned = re.sub(r"[^\d.]", "", val_str)
    try:
        return float(cleaned)
    except Exception:
        return 0.0

class InvoiceExtractor:
    def extract_text_from_file(self, file_path: str, filename: str) -> str:
        """
        Extract raw text using PyMuPDF for PDFs and Tesseract for images/scans
        """
        ext = os.path.splitext(filename)[1].lower()
        extracted_text = ""

        if ext == ".pdf":
            try:
                doc = fitz.open(file_path)
                for page in doc:
                    text = page.get_text()
                    if text and len(text.strip()) > 30:
                        extracted_text += text + "\n"
                    else:
                        # Page might be scanned; attempt OCR on rendered pixmap if pytesseract is available
                        try:
                            pix = page.get_pixmap(dpi=150)
                            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                            ocr_text = pytesseract.image_to_string(img)
                            extracted_text += ocr_text + "\n"
                        except Exception as e:
                            print(f"[OCR Scanned Page Notice]: {e}")
                doc.close()
            except Exception as e:
                print(f"[PyMuPDF Error]: {e}")

        elif ext in [".png", ".jpg", ".jpeg"]:
            try:
                img = Image.open(file_path)
                extracted_text = pytesseract.image_to_string(img)
            except Exception as e:
                print(f"[Image OCR Error]: {e}")
                extracted_text = ""

        return extracted_text

    def parse_invoice_text(self, text: str, original_filename: str = "") -> dict:
        """
        Structured regex and heuristic parsing of invoice text
        """
        data = {
            "vendorName": "",
            "vendorEmail": "",
            "vendorPhone": "",
            "vendorAddress": "",
            "gstin": "",
            "invoiceNumber": "",
            "invoiceDate": "",
            "dueDate": "",
            "poNumber": "",
            "subtotal": 0.0,
            "discount": 0.0,
            "taxPercentage": 18.0,
            "taxAmount": 0.0,
            "cgst": 0.0,
            "sgst": 0.0,
            "igst": 0.0,
            "totalAmount": 0.0,
            "currency": "INR",
            "lineItems": [],
        }

        if not text or len(text.strip()) < 10:
            # Fallback to file name heuristics
            base = os.path.splitext(original_filename)[0]
            data["vendorName"] = base.replace("_", " ").title()
            data["invoiceNumber"] = f"INV-{base[:8].upper()}"
            return data

        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # 1. GSTIN Extraction
        gstin_match = re.search(GSTIN_REGEX, text, re.IGNORECASE)
        if gstin_match:
            data["gstin"] = gstin_match.group(0).upper()

        # 2. Email and Phone
        email_match = re.search(EMAIL_REGEX, text)
        if email_match:
            data["vendorEmail"] = email_match.group(0).lower()

        phone_match = re.search(PHONE_REGEX, text)
        if phone_match:
            data["vendorPhone"] = phone_match.group(0)

        # 3. Invoice Number
        inv_no_patterns = [
            r"(?:Invoice\s*(?:No|Number|#)|Bill\s*No|Inv\s*#)[:.\s]*([A-Za-z0-9\-_/]+)",
            r"\b(INV-[0-9A-Za-z\-_]+)\b",
            r"(?:Invoice|Bill)\s*[:.\s]+([A-Za-z0-9\-_/]+)",
        ]
        for pat in inv_no_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                inv_candidate = m.group(1).strip()
                if len(inv_candidate) >= 3 and not re.match(r"^(date|total|bill|due|page)$", inv_candidate, re.I):
                    data["invoiceNumber"] = inv_candidate.upper()
                    break

        if not data["invoiceNumber"]:
            data["invoiceNumber"] = f"INV-{int(abs(hash(text)) % 900000 + 100000)}"

        # 4. Dates
        date_candidates = []
        for pat in DATE_PATTERNS:
            for match in re.finditer(pat, text, re.IGNORECASE):
                date_candidates.append(match.group(0))

        if len(date_candidates) >= 1:
            data["invoiceDate"] = date_candidates[0]
        if len(date_candidates) >= 2:
            data["dueDate"] = date_candidates[1]

        # 5. PO Number
        po_match = re.search(r"(?:PO\s*(?:No|Number|#)|Purchase\s*Order)[:.\s]*([A-Za-z0-9\-_/]+)", text, re.IGNORECASE)
        if po_match:
            data["poNumber"] = po_match.group(1).strip()

        # 6. Amounts & Taxes
        # Total Amount - check Grand Total first
        total_patterns = [
            r"(?:Grand\s*Total|Invoice\s*Total|Total\s*Amount|Net\s*Amount|Amount\s*Payable)[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)",
            r"(?:^|\n)\s*Total[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)",
        ]
        for pat in total_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                val = clean_amount(m.group(1))
                if val > 0:
                    data["totalAmount"] = val
                    break

        # Subtotal
        subtotal_match = re.search(r"(?:Subtotal|Taxable\s*Value|Sub-total)[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if subtotal_match:
            data["subtotal"] = clean_amount(subtotal_match.group(1))

        # Tax Amount / GST
        tax_match = re.search(r"(?:Total\s*Tax|GST\s*Amount|Tax\s*Amount)[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if tax_match:
            data["taxAmount"] = clean_amount(tax_match.group(1))

        # CGST / SGST / IGST (handles with or without percentage brackets like CGST (9%): INR 4,500)
        cgst_match = re.search(r"CGST(?:\s*\([^)]*\))?[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if cgst_match:
            data["cgst"] = clean_amount(cgst_match.group(1))

        sgst_match = re.search(r"SGST(?:\s*\([^)]*\))?[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if sgst_match:
            data["sgst"] = clean_amount(sgst_match.group(1))

        igst_match = re.search(r"IGST(?:\s*\([^)]*\))?[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if igst_match:
            data["igst"] = clean_amount(igst_match.group(1))

        # Reconcile tax amounts
        if data["taxAmount"] == 0 and (data["cgst"] > 0 or data["sgst"] > 0 or data["igst"] > 0):
            data["taxAmount"] = round(data["cgst"] + data["sgst"] + data["igst"], 2)

        if data["subtotal"] == 0 and data["totalAmount"] > 0 and data["taxAmount"] > 0:
            data["subtotal"] = round(data["totalAmount"] - data["taxAmount"], 2)
        elif data["totalAmount"] == 0 and data["subtotal"] > 0:
            data["totalAmount"] = round(data["subtotal"] + data["taxAmount"], 2)

        # 7. Vendor Name Heuristic (usually top line before Invoice/Bill)
        for line in lines[:8]:
            if re.search(r"(tax\s*invoice|bill\s*of\s*supply|invoice|receipt|original\s*for\s*recipient)", line, re.IGNORECASE):
                continue
            if len(line) > 3 and not re.search(r"(date|phone|gstin|email|pvt|ltd|limited|services|technologies|solutions)", line, re.I):
                data["vendorName"] = line
                break
            elif re.search(r"(pvt|ltd|limited|solutions|technologies|enterprise|services|corporation)", line, re.I):
                data["vendorName"] = line
                break

        if not data["vendorName"] and len(lines) > 0:
            data["vendorName"] = lines[0]

        # 8. Line Items Extraction
        # Look for table-like rows with description and amounts
        line_item_pattern = r"([A-Za-z0-9\s\-_/]{4,40})\s+(\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)"
        found_items = []
        for line in lines:
            m = re.search(line_item_pattern, line)
            if m:
                desc = m.group(1).strip()
                qty = int(m.group(2))
                unit_price = clean_amount(m.group(3))
                total = clean_amount(m.group(4))
                if total > 0 and not re.search(r"(subtotal|tax|total|amount)", desc, re.I):
                    found_items.append({
                        "description": desc,
                        "quantity": qty,
                        "unitPrice": unit_price,
                        "total": total,
                        "taxRate": 18.0
                    })

        if not found_items and data["totalAmount"] > 0:
            found_items.append({
                "description": f"Services / Supplies as per {data['invoiceNumber']}",
                "quantity": 1,
                "unitPrice": data["subtotal"] or data["totalAmount"],
                "total": data["subtotal"] or data["totalAmount"],
                "taxRate": 18.0
            })

        data["lineItems"] = found_items
        return data

extractor = InvoiceExtractor()
