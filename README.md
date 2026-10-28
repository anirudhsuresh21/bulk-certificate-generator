# CertiCraft — Certificate Template Editor & PDF Generator (Phase 1)

A professional, web-based Certificate Template Editor and precision PDF Generator. Import existing certificate designs as PDFs or images (PNG/JPG), visually add and position dynamic overlays (names, dates, authority designations, signatures), cover legacy text with precision background patches, save designs as reusable templates, and generate personalized, publication-quality PDF certificates.

---

## 1. System Architecture

- **Frontend**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, Lucide Icons, and PDF.js vector rendering.
- **Backend**: Node.js with Express.js, TypeScript, Mongoose, Multer, pdf-lib, Sharp, and Zod.
- **Database**: MongoDB (with automated `mongodb-memory-server` fallback in development/testing if an external MongoDB daemon is not running).
- **PDF Engine**: `pdf-lib` coordinate transform engine with auto font-shrinking, alpha-transparent signature overlays, and multi-page preservation.

```
bulk-certi/
├── backend/
│   ├── src/
│   │   ├── config/             # MongoDB connection (with in-memory fallback)
│   │   ├── controllers/        # Template & Generation API controllers
│   │   ├── middleware/         # Multer & magic-byte file signature validators
│   │   ├── models/             # Mongoose Template schema & interfaces
│   │   ├── routes/             # REST endpoint routers
│   │   ├── services/           # pdf-lib coordinate engine & PDF generator
│   │   ├── utils/              # Path safety & dimension extractors
│   │   ├── validators/         # Zod schemas for templates & generation
│   │   ├── app.ts              # Express configuration & security middleware
│   │   └── index.ts            # Entrypoint
│   ├── tests/                  # Automated Jest test suite
│   └── uploads/                # Dedicated storage layer (outside public web root)
│       ├── templates/
│       ├── signatures/
│       └── generated/
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router (Dashboard, Editor, Generator)
│   │   ├── components/         # Visual Canvas, Properties Panel, Layers, Toolbar
│   │   ├── lib/                # Typed API Client & utilities
│   │   └── types/              # Frontend TypeScript definitions
└── sample-assets/              # Ready-to-use sample certificate PDF & signature PNG
```

---

## 2. Quickstart & Setup

### Prerequisites
- Node.js `v18+` (Tested on `v22.17.1`)
- npm `v9+` (Tested on `10.9.2`)
- MongoDB (Optional: The application automatically starts an in-memory MongoDB instance if local MongoDB is not running!)

### Installation
Install dependencies across root, backend, and frontend with a single command:
```bash
npm run install:all
```
*(Or install individually: `npm install && npm --prefix backend install && npm --prefix frontend install`)*

### Build (Single Command)
Build both the Express backend and the Next.js frontend with one command from the project root:
```bash
npm run build
```

### Run (Single Command)
Run both the backend (Port 5000) and frontend (Port 3000) concurrently in one terminal:

**Development Mode (Live Reloading)**:
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

*(You can still run them independently if desired via `npm run dev:backend` and `npm run dev:frontend`)*

Open your browser at **`http://localhost:3000`**.

---

## 3. Environment Variables (Single Root `.env`)

Both the backend and frontend automatically load from a single common **`.env`** file at the project root:

| Variable | Default / Example | Purpose |
|---|---|---|
| `PORT` | `5000` | HTTP port for the Express backend |
| `NODE_ENV` | `development` | Runtime environment (`development` / `production`) |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB connection string (falls back to in-memory if unreachable) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | API endpoint URL consumed by the Next.js frontend |

A template is provided in [`.env.example`](file:///c:/Users/aniru/Desktop/portfolio/bulk-certi/.env.example). You only need to edit the root `.env`!

---

## 4. REST API Documentation

### Templates API
- `POST /api/templates/upload` — Upload certificate PDF, PNG, JPG. Inspects magic bytes and extracts page dimensions, orientation, and total page count.
- `POST /api/templates/signatures/upload` — Upload transparent signature or logo images (PNG, JPG).
- `POST /api/templates` — Create a new certificate template with configured fields and patches (Zod validated).
- `GET /api/templates` — List all saved templates with summary metrics.
- `GET /api/templates/:id` — Retrieve template metadata, layout, patches, and field styling.
- `PATCH /api/templates/:id` — Update template layout, fields, patches, or title.
- `POST /api/templates/:id/duplicate` — Duplicate template and clone source file independently.
- `DELETE /api/templates/:id` — Delete template and safely remove unshared storage assets.
- `GET /api/templates/files/:fileKey` — Securely stream template background file.
- `GET /api/templates/signatures/:assetKey` — Securely stream uploaded signature asset.

### Generation & Email API
- `POST /api/templates/:id/preview` — Generates a live, non-destructive PDF preview stream populated with current values.
- `POST /api/templates/:id/generate` — Compiles the final PDF certificate, saves it to storage, and returns download URL.
- `POST /api/templates/:id/bulk-parse` — Uploads an Excel (`.xlsx`, `.xls`) or CSV file, parses rows and columns, and returns auto-detected column mappings and data preview.
- `POST /api/templates/:id/bulk-generate` — Generates certificates for all recipients in the spreadsheet. Supports `exportFormat: 'combined_pdf'` (all certificates in 1 master PDF) or `'zip_archive'` (ZIP of individual PDFs).
- `POST /api/email/test-connection` — Verifies SMTP connection credentials using Nodemailer.
- `POST /api/templates/:id/bulk-email` — Generates and emails personalized certificates directly to each recipient in the spreadsheet with customized subject, HTML body, and attached certificate PDF.
- `GET /api/certificates/:id/download` — Securely downloads the generated certificate (PDF or ZIP) with custom filename headers.

---

## 5. Visual Editor, Bulk Generation & Email Delivery Features

1. **Nodemailer Bulk Email Delivery**:
   - Send certificates directly to recipients using any spreadsheet with an email column.
   - Automatically detects email columns (e.g., `Email`, `E-mail`, `Recipient Email`, `Email Address`).
   - Generates each recipient's personalized certificate PDF and sends it as an attachment (`Certificate_<Recipient_Name>.pdf`).
   - Dynamic subject and body templating with placeholders (e.g., `{{recipient_name}}`, `{{event_name}}`, `{{issue_date}}`).
   - Supports system SMTP credentials via `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) or custom in-app credentials.
   - Built-in "Test SMTP Connection" button for instant connection verification before launching campaigns.
   - Comprehensive live Delivery Report table with delivery status per recipient (`Sent` / `Failed`), error diagnostics, and test email preview links.

2. **Rich Multi-Font Typography Engine**:
   - Supports 10 fonts across 4 categories:
     - **Calligraphy & Script**: Great Vibes, Alex Brush, Dancing Script, Pinyon Script (ideal for recipient names and honorifics).
     - **Serif**: Playfair Display, Cinzel, Times New Roman (ideal for certificate titles and institutions).
     - **Sans-Serif**: Montserrat, Helvetica (modern, clean).
     - **Monospace**: Courier.
   - High-fidelity live canvas preview via Google Fonts and embedded TrueType fonts (`@pdf-lib/fontkit`) in generated PDFs.

2. **Bulk Excel / CSV Certificate Generator**:
   - Upload any `.xlsx`, `.xls`, or `.csv` recipient spreadsheet.
   - Smart auto-detection maps template placeholders (`{{recipient_name}}`, `{{event_name}}`, `{{issue_date}}`, etc.) to matching spreadsheet columns.
   - Interactive preview table displaying parsed rows, mapped values, and total count.
   - Download sample CSV button tailored to the active template's fields.
   - **Dual Export Modes**:
     - **Combined Master PDF**: Merges all generated certificates into a single printable document, ready for print shops or batch printing.
     - **ZIP Archive**: Packages individually named PDF certificates (e.g., `Certificate_John_Doe.pdf`) into a compressed `.zip` file.

3. **Overlay Mode & Text Covering**:
   - Preserves original certificate background.
   - **Background Cover Patches**: Place opaque, color-matched rectangle patches to obscure legacy names, dates, or signatures printed on existing certificates.

4. **Record Coordinates & Bulk-Gen Preset Workflow**:
   - **Position Once & Record**: Place the recipient name placeholder manually, then click **"Record Coordinates"** in the properties panel to save the exact position ($X, Y, W, H$, typography).
   - **Auto-Inherited on Duplicate**: Duplicating a template automatically clones and retains all recorded coordinates and field rules.
   - **Auto-Applied on New Uploads**: When uploading a new certificate, the system offers to snap the recipient name directly to your recorded preset.
   - **Bulk-Gen Ready**: The generation engine reads these recorded coordinates directly, allowing bulk operations to stamp thousands of names without manual intervention.

5. **Direct Visual Canvas**:
   - High-fidelity PDF.js rendering for PDFs and responsive canvas for image templates.
   - Drag to reposition fields; resize text boxes via interactive corner handles.
   - Arrow keys for 1-pixel micro-positioning (10-pixel with `Shift`).
   - Undo (`Ctrl+Z`), Redo (`Ctrl+Y`), and Save (`Ctrl+S`).

6. **13 Field Types & Dynamic Placeholders**:
   - Recipient Name, Certificate Title, Event Name, Issue Date, Completion Date, Expiry Date, Roll Number / ID, Organization Name, Authority Name, Authority Designation, Custom Text, Signature Image, Seal / Logo Image.
   - Placeholders like `{{recipient_name}}`, `{{issue_date}}`, `{{authority_1_name}}`.
   - Toggle between dynamic input mode and fixed template text.

7. **Auto-Shrink Typography**:
   - Automatically reduces font size down to `minFontSize` when names or titles exceed the box width, preventing clipping or overflow.

8. **Multi-Page Preservation**:
   - Modifying a target page of a multi-page PDF leaves all other vector pages completely intact.

---

## 6. Testing

Automated test suite covering uploads, file validation, template CRUD, generation, multi-font embedding, spreadsheet parsing, bulk generation (combined PDF and ZIP archive), multi-page preservation, and path traversal security:
```bash
npm run test:backend
```

**Results**:
- 26 passed / 26 tests (100% pass rate).
- Validated with landscape, portrait, multi-page PDFs, PNG templates, transparent signatures, custom TrueType fonts, Excel spreadsheets, ZIP packaging, and Nodemailer email delivery.

---

## 7. Sample Test Assets

Ready-to-use sample files are available in `sample-assets/`:
- `sample-assets/sample_certificate.pdf`: An A4 Landscape certificate with legacy placeholder text.
- `sample-assets/sample_signature.png`: A transparent digital signature for testing authority signatures.

---

## 8. Scope Restrictions & Phase 2 Roadmap

As specified for Phase 1, the following features are intentionally deferred:
- Bulk email delivery / Outlook / Microsoft Graph integration.
- QR code dynamic verification links.
- Multi-tenant organization roles.
- Payment / subscription gateways.
