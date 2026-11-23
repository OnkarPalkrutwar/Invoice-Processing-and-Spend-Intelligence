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
    cleaned = re.sub(r"[^\d.]", "", str(val_str))
    try:
        return float(cleaned)
    except Exception:
        return 0.0

class InvoiceExtractor:
    def __init__(self):
        self.last_extracted_tables = []

    def extract_text_from_file(self, file_path: str, filename: str) -> str:
        """
        Extract raw text using PyMuPDF for PDFs and Tesseract for images/scans.
        Also extracts structured tabular data from PDF files when available.
        """
        ext = os.path.splitext(filename)[1].lower()
        extracted_text = ""
        self.last_extracted_tables = []

        if ext == ".pdf":
            try:
                doc = fitz.open(file_path)
                for page in doc:
                    text = page.get_text()
                    if text and len(text.strip()) > 30:
                        extracted_text += text + "\n"
                    else:
                        try:
                            pix = page.get_pixmap(dpi=150)
                            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                            ocr_text = pytesseract.image_to_string(img)
                            extracted_text += ocr_text + "\n"
                        except Exception as e:
                            print(f"[OCR Scanned Page Notice]: {e}")
                    
                    # Extract structured table grids (e.g. payment/line-item matrices)
                    try:
                        tabs = page.find_tables()
                        for t in tabs:
                            df = t.extract()
                            if df and len(df) >= 2:
                                headers = [str(c).strip() if c else "" for c in df[0]]
                                for row in df[1:]:
                                    row_dict = {}
                                    for h, cell in zip(headers, row):
                                        if h and cell:
                                            row_dict[h.lower()] = str(cell).strip()
                                    if row_dict:
                                        self.last_extracted_tables.append(row_dict)
                    except Exception:
                        pass
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
        Structured regex and heuristic parsing of invoice text & extracted tables
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
            base = os.path.splitext(original_filename)[0]
            data["vendorName"] = base.replace("_", " ").title()
            data["invoiceNumber"] = f"INV-{base[:8].upper()}"
            return data

        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # 0. Tabular Data Pre-processing (from PyMuPDF find_tables)
        table_amount = 0.0
        table_desc = ""
        table_txn_ref = ""
        table_date = ""

        for row in getattr(self, "last_extracted_tables", []):
            for k, v in row.items():
                if any(w in k for w in ["amount", "fee", "total", "price", "payable"]) and table_amount == 0:
                    val = clean_amount(v)
                    if 0 < val < 100000000:
                        table_amount = val
                if any(w in k for w in ["payment for", "description", "service", "item", "fee type"]) and not table_desc:
                    table_desc = v.strip()
                if any(w in k for w in ["transaction ref", "ref. no", "ref no", "txn id", "reference"]) and not table_txn_ref:
                    cleaned_ref = re.sub(r"[^\w\-]", "", v.strip())
                    if len(cleaned_ref) >= 4:
                        table_txn_ref = cleaned_ref
                if any(w in k for w in ["transaction date", "txn date", "payment date"]) and not table_date:
                    table_date = v.strip()

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

        # 3. Invoice / Transaction Reference Number
        if table_txn_ref:
            data["invoiceNumber"] = table_txn_ref
        else:
            inv_no_patterns = [
                r"(?:Invoice\s*(?:No|Number|#)|Bill\s*No|Inv\s*#)[:.\s]*([A-Za-z0-9\-_/]+)",
                r"(?:Transaction\s*Ref(?:\.?\s*No)?|Txn\s*Ref|Ref(?:\.?\s*No)?|Receipt\s*No|Application\s*No)[:.\s]*([A-Za-z0-9\-_/]+)",
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

        # 4. Dates with DOB Filtering
        date_candidates = []
        for pat in DATE_PATTERNS:
            for match in re.finditer(pat, text, re.IGNORECASE):
                d_str = match.group(0)
                start_idx = match.start()
                context_before = text[max(0, start_idx - 35):start_idx].upper()
                # Exclude if it is candidate's Date of Birth
                if any(dob_kw in context_before for dob_kw in ["D.O.B", "DOB", "BIRTH", "BORN"]):
                    continue
                # Exclude dates from old historical years (e.g. DOB 2006)
                year_m = re.search(r"\b(19\d{2}|200\d|201[0-5])\b", d_str)
                if year_m:
                    continue
                date_candidates.append(d_str)

        if len(date_candidates) >= 1:
            data["invoiceDate"] = date_candidates[0]
        elif table_date:
            date_m = re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", table_date)
            if date_m:
                data["invoiceDate"] = date_m.group(0)

        if len(date_candidates) >= 2:
            data["dueDate"] = date_candidates[1]
        elif data["invoiceDate"]:
            data["dueDate"] = data["invoiceDate"]

        # 5. PO Number
        po_match = re.search(r"(?:PO\s*(?:No|Number|#)|Purchase\s*Order)[:.\s]*([A-Za-z0-9\-_/]+)", text, re.IGNORECASE)
        if po_match:
            data["poNumber"] = po_match.group(1).strip()

        # 6. Amounts & Taxes
        if table_amount > 0:
            data["totalAmount"] = table_amount

        # Check total amount patterns if not captured from table
        if data["totalAmount"] == 0:
            total_patterns = [
                r"(?:Grand\s*Total|Invoice\s*Total|Total\s*Amount|Net\s*Amount|Amount\s*Payable|Paid\s*Amount|Amount\s*Paid|Fee\s*Amount|Application\s*Fee|Exam\s*Fee|Total\s*Fee)[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)",
                r"(?:^|\n)\s*(?:Total|Amount|Fee)[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)",
            ]
            for pat in total_patterns:
                m = re.search(pat, text, re.IGNORECASE)
                if m:
                    val = clean_amount(m.group(1))
                    if 0 < val < 100000000:
                        data["totalAmount"] = val
                        break

        # Proximity tabular scan for Amount
        if data["totalAmount"] == 0:
            for i, line in enumerate(lines):
                if re.match(r"^(?:Amount|Fee|Application\s*Fee|Exam\s*Fee|Total\s*Amount|Amount\s*\(INR\))[:]?$", line, re.I):
                    for offset in range(1, 9):
                        if i + offset < len(lines):
                            cand = lines[i + offset].replace(",", "").strip()
                            m = re.match(r"^(?:INR|Rs\.?|₹)?\s*(\d{1,7}(?:\.\d{1,2})?)$", cand)
                            if m:
                                val = float(m.group(1))
                                if 0 < val < 10000000:
                                    data["totalAmount"] = val
                                    break
                    if data["totalAmount"] > 0:
                        break

        # Subtotal
        subtotal_match = re.search(r"(?:Subtotal|Taxable\s*Value|Sub-total)[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if subtotal_match:
            data["subtotal"] = clean_amount(subtotal_match.group(1))

        # Tax Amount / GST
        tax_match = re.search(r"(?:Total\s*Tax|GST\s*Amount|Tax\s*Amount)[:.\s]*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        if tax_match:
            data["taxAmount"] = clean_amount(tax_match.group(1))

        # CGST / SGST / IGST
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
        elif data["subtotal"] == 0 and data["totalAmount"] > 0:
            data["subtotal"] = data["totalAmount"]
        elif data["totalAmount"] == 0 and data["subtotal"] > 0:
            data["totalAmount"] = round(data["subtotal"] + data["taxAmount"], 2)

        # 7. Vendor / Organization Name
        org_patterns = [
            r"\b(Indian\s+Institute\s+of\s+Technology\s+[A-Za-z]+)",
            r"\b(GATE\s+Office[^\n,]*)",
            r"\b(Graduate\s+Aptitude\s+Test\s+in\s+Engineering)",
            r"\b([A-Z][A-Za-z0-9\s&.,'-]+(?:Pvt\.?\s*Ltd\.?|Private\s+Limited|Limited|Ltd\.?|Technologies|Solutions|Corporation|Enterprises|Services))\b",
        ]
        for org_pat in org_patterns:
            m = re.search(org_pat, text, re.I)
            if m:
                cand = m.group(1).strip()
                if len(cand) > 4:
                    data["vendorName"] = cand
                    break

        if not data["vendorName"]:
            for line in lines[:10]:
                if re.search(r"(tax\s*invoice|bill\s*of\s*supply|invoice|receipt|original\s*for\s*recipient|application\s*form|zone|scrutiny|enrollment)", line, re.IGNORECASE):
                    continue
                if line.startswith("(") and line.endswith(")"):
                    continue
                if len(line) > 3 and not re.search(r"(date|phone|gstin|email|pvt|ltd|limited|services|technologies|solutions|mobile|exam)", line, re.I):
                    data["vendorName"] = line
                    break

        if not data["vendorName"] and len(lines) > 0:
            data["vendorName"] = lines[0]

        # 8. Line Items Extraction
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
                        "taxRate": 18.0 if data["taxAmount"] > 0 else 0.0
                    })

        if not found_items and data["totalAmount"] > 0:
            item_desc = table_desc or f"Services / Supplies as per {data['invoiceNumber']}"
            found_items.append({
                "description": item_desc,
                "quantity": 1,
                "unitPrice": data["subtotal"] or data["totalAmount"],
                "total": data["subtotal"] or data["totalAmount"],
                "taxRate": 18.0 if data["taxAmount"] > 0 else 0.0
            })

        data["lineItems"] = found_items
        return data

extractor = InvoiceExtractor()
