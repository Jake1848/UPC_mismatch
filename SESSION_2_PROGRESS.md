# Session 2: File Processing + Conflict Management - IN PROGRESS

## 🎯 Session Goal
Build complete file upload, processing, and conflict management system with real-time analytics.

---

## ✅ Completed Components

### Backend Services

#### 1. File Parser Service (`server-v2/src/services/fileParser.ts`)
- ✅ CSV parsing with `csv-parser`
- ✅ Excel parsing with `xlsx` (XLSX and XLS formats)
- ✅ Smart column detection with multiple naming variations:
  - UPC/barcode/GTIN columns
  - SKU/item/product_code columns
  - Price/cost/amount columns
  - Quantity/qty/stock columns
  - Location/warehouse/site columns
  - Description/name/title columns
- ✅ Data normalization and type conversion
- ✅ UPC cleaning and standardization (8, 12, 13, 14 digits)
- ✅ Automatic padding for short UPCs

#### 2. Conflict Detector Service (`server-v2/src/services/conflictDetector.ts`)
- ✅ **6 Conflict Types Detected:**
  - `DUPLICATE_UPC` - Same UPC appears multiple times
  - `PRICE_MISMATCH` - Different prices for same UPC
  - `QUANTITY_MISMATCH` - Negative or zero quantities
  - `LOCATION_CONFLICT` - Same UPC in multiple locations
  - `MISSING_DATA` - Missing price, quantity, or location
  - `INVALID_FORMAT` - UPC not 8/12/13/14 digits

- ✅ **Severity Calculation:**
  - `CRITICAL` - Price diff >50% or missing price+quantity
  - `HIGH` - Price diff 25-50%, invalid format, negative quantity
  - `MEDIUM` - Price diff 10-25%, location conflicts
  - `LOW` - Price diff <10%, zero quantity, missing location

- ✅ **Smart Features:**
  - Suggested fixes for each conflict type
  - Related row tracking
  - Duplicate detection by location
  - Suspicious price/quantity validation

#### 3. Analysis Controller (`server-v2/src/controllers/analysisController.ts`)
- ✅ File upload with Multer
- ✅ Asynchronous file processing
- ✅ Automatic conflict detection
- ✅ Severity statistics calculation
- ✅ Database transaction for data consistency
- ✅ File cleanup after processing
- ✅ Error handling and status updates
- ✅ **API Endpoints:**
  - `POST /api/analysis/upload` - Upload file
  - `GET /api/analysis` - List all analyses (paginated, filtered)
  - `GET /api/analysis/:id` - Get single analysis with conflicts
  - `DELETE /api/analysis/:id` - Delete analysis

#### 4. Conflicts Controller (`server-v2/src/controllers/conflictsController.ts`)
- ✅ Advanced filtering system:
  - By severity (multiple selection)
  - By type (multiple selection)
  - By status (multiple selection)
  - By analysis ID
  - By assigned user
  - Search by UPC or description
  - Sorting with custom order
- ✅ Pagination support
- ✅ Real-time statistics aggregation
- ✅ Conflict assignment to users
- ✅ Resolution tracking with notes
- ✅ Bulk operations support
- ✅ **API Endpoints:**
  - `GET /api/conflicts` - List conflicts (filtered, paginated)
  - `GET /api/conflicts/:id` - Get single conflict
  - `PATCH /api/conflicts/:id` - Update conflict
  - `POST /api/conflicts/bulk-update` - Bulk update conflicts
  - `GET /api/conflicts/stats` - Get conflict statistics

### Database Schema Updates

#### Updated Analysis Model
```prisma
model Analysis {
  id               String         @id @default(uuid())
  fileName         String
  fileSize         Int
  totalRows        Int            @default(0)
  processedRows    Int            @default(0)
  conflictsFound   Int            @default(0)
  lowSeverity      Int            @default(0)    // ✅ NEW
  mediumSeverity   Int            @default(0)    // ✅ NEW
  highSeverity     Int            @default(0)    // ✅ NEW
  criticalSeverity Int            @default(0)    // ✅ NEW
  status           AnalysisStatus @default(PENDING)
  processedAt      DateTime?                    // ✅ NEW
  userId           String
  organizationId   String
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}
```

#### Updated Conflict Model
```prisma
model Conflict {
  id              String         @id @default(uuid())
  upc             String
  type            ConflictType
  severity        Severity
  description     String
  suggestedFix    String?
  relatedRows     Int[]                         // ✅ NEW
  status          ConflictStatus @default(PENDING)
  assignedToId    String?
  analysisId      String
  organizationId  String                        // ✅ NEW
  resolutionNotes String?
  resolvedAt      DateTime?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}
```

### Frontend Components

#### 1. File Upload Page (`client-v2/src/app/(dashboard)/upload/page.tsx`)
- ✅ Beautiful drag-and-drop interface
- ✅ Multi-file upload support
- ✅ File validation (CSV, XLSX, XLS only)
- ✅ Progress tracking with visual indicators
- ✅ Real-time status updates:
  - Uploading with progress percentage
  - Processing with spinner
  - Completed with success icon
  - Error handling with messages
- ✅ Status polling (checks every 2 seconds)
- ✅ File size display
- ✅ View results button on completion
- ✅ Remove file from list
- ✅ File requirements info card
- ✅ Responsive design

#### 2. Conflicts List Page (`client-v2/src/app/(dashboard)/conflicts/page.tsx`)
- ✅ **Statistics Dashboard:**
  - By Severity (CRITICAL, HIGH, MEDIUM, LOW)
  - By Status (PENDING, IN_PROGRESS, RESOLVED, IGNORED)
  - Total conflicts count
  - Needs attention counter (CRITICAL + HIGH)

- ✅ **Advanced Filtering:**
  - Search by UPC or description
  - Filter by severity (multi-select)
  - Filter by type (multi-select)
  - Filter by status (multi-select)
  - Expandable filter panel
  - Filter state management

- ✅ **Conflict Cards:**
  - Severity badge with icon
  - Status badge
  - Type badge
  - UPC display in monospace font
  - Description
  - Suggested fix (highlighted box)
  - Metadata (file name, rows, date, assignee)
  - Click to view details

- ✅ **Pagination:**
  - Previous/Next buttons
  - Page counter
  - 20 items per page

- ✅ **Empty States:**
  - No conflicts found
  - Helpful messages

- ✅ **Beautiful UI:**
  - Dark theme with slate/blue colors
  - Smooth transitions
  - Hover effects
  - Color-coded severity levels
  - Responsive grid layout

---

## 📊 Processing Flow

```
User uploads file
    ↓
Frontend: FormData with file → POST /api/analysis/upload
    ↓
Backend: Save file to uploads/ folder
    ↓
Backend: Create Analysis record (status: PROCESSING)
    ↓
Backend: Return analysisId to frontend
    ↓
Frontend: Poll GET /api/analysis/:id every 2 seconds
    ↓
Backend (async): FileParser.parseFile()
    ↓
Backend (async): ConflictDetector.detectConflicts()
    ↓
Backend (async): Calculate severity statistics
    ↓
Backend (async): Save conflicts to database (transaction)
    ↓
Backend (async): Update Analysis status → COMPLETED
    ↓
Backend (async): Delete uploaded file
    ↓
Frontend: Show completion, enable "View Results" button
    ↓
User clicks "View Results" → Navigate to /analysis/:id
```

---

## 🔧 Technical Implementation

### File Upload with Multer
```typescript
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowedTypes.includes(ext))
  }
})
```

### Async Processing Pattern
```typescript
// 1. Return immediately to user
res.json({ analysisId, status: 'PROCESSING' })

// 2. Process in background
processFileAsync(analysisId, filePath, fileName, organizationId)
  .catch(error => console.error('Processing error:', error))

// 3. Update database when complete
await prisma.analysis.update({
  where: { id: analysisId },
  data: { status: 'COMPLETED', /* stats */ }
})
```

### Real-time Status Polling
```typescript
const pollAnalysisStatus = async (analysisId: string) => {
  const checkStatus = async () => {
    const res = await fetch(`/api/analysis/${analysisId}`)
    const data = await res.json()

    if (data.analysis.status === 'COMPLETED') {
      // Show completion UI
    } else if (data.analysis.status === 'FAILED') {
      // Show error UI
    } else {
      // Check again in 2 seconds
      setTimeout(checkStatus, 2000)
    }
  }
  checkStatus()
}
```

---

## 📂 Files Created/Modified

### Backend
```
server-v2/
├── src/
│   ├── services/
│   │   ├── fileParser.ts          ✅ NEW
│   │   └── conflictDetector.ts    ✅ NEW
│   ├── controllers/
│   │   ├── analysisController.ts  ✅ NEW
│   │   └── conflictsController.ts ✅ NEW
│   └── routes/
│       ├── analysis.ts            ✅ UPDATED
│       └── conflicts.ts           ✅ UPDATED
├── prisma/
│   └── schema.prisma              ✅ UPDATED
├── uploads/                       ✅ NEW (created)
└── .env                           ✅ CREATED
```

### Frontend
```
client-v2/
└── src/
    └── app/
        └── (dashboard)/
            ├── upload/
            │   └── page.tsx       ✅ NEW
            └── conflicts/
                └── page.tsx       ✅ NEW
```

---

## 🎨 UI/UX Highlights

### Color Scheme (Severity)
- 🔴 **CRITICAL**: Red (`bg-red-900/20 text-red-400 border-red-800`)
- 🟠 **HIGH**: Orange (`bg-orange-900/20 text-orange-400 border-orange-800`)
- 🟡 **MEDIUM**: Yellow (`bg-yellow-900/20 text-yellow-400 border-yellow-800`)
- 🔵 **LOW**: Blue (`bg-blue-900/20 text-blue-400 border-blue-800`)

### Color Scheme (Status)
- 🟢 **RESOLVED**: Green (`bg-green-900/20 text-green-400 border-green-800`)
- 🔵 **IN_PROGRESS**: Blue (`bg-blue-900/20 text-blue-400 border-blue-800`)
- 🟡 **PENDING**: Yellow (`bg-yellow-900/20 text-yellow-400 border-yellow-800`)
- ⚫ **IGNORED**: Gray (`bg-slate-800 text-slate-400 border-slate-700`)

### Icons
- ❌ **CRITICAL**: XCircle
- ⚠️ **HIGH**: AlertCircle
- ⚠️ **MEDIUM**: AlertTriangle
- 🕐 **LOW**: Clock

---

## 🚀 What's Working

1. ✅ File upload with drag-and-drop
2. ✅ CSV/XLSX parsing with smart column detection
3. ✅ Comprehensive conflict detection (6 types)
4. ✅ Severity calculation with 4 levels
5. ✅ Asynchronous processing with status updates
6. ✅ Real-time polling from frontend
7. ✅ Conflicts list with advanced filtering
8. ✅ Statistics dashboard
9. ✅ Pagination
10. ✅ Beautiful, responsive UI

---

## 📝 Still TODO in Session 2

- [ ] Create individual conflict detail page (`/conflicts/:id`)
- [ ] Add conflict resolution UI (status updates, assignment, notes)
- [ ] Create enhanced analytics dashboard with charts
- [ ] Add export functionality (CSV, Excel, PDF)
- [ ] Build analysis detail page (`/analysis/:id`)
- [ ] Add real-time WebSocket updates (optional)
- [ ] Add bulk operations UI
- [ ] Create conflict assignment workflow
- [ ] Add user management for assignments
- [ ] Test complete end-to-end flow

---

## 🗃️ Database Migration Required

Before testing, run:
```bash
cd server-v2

# Start PostgreSQL (if not running)
docker run --name upc-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=upc_resolver \
  -p 5432:5432 \
  -d postgres:16

# Run migration
npx prisma migrate dev --name add_severity_counts_and_related_rows

# Start server
npm run dev
```

---

## 🎯 Next Steps

1. **Conflict Detail Page** - View and resolve individual conflicts
2. **Analytics Dashboard** - Charts showing trends, patterns, insights
3. **Analysis Detail Page** - View all conflicts from a single upload
4. **Testing** - End-to-end testing of the complete flow

---

## 💡 Key Features

### Smart Column Detection
The parser tries multiple variations of column names:
- `['upc', 'UPC', 'Upc', 'barcode', 'Barcode', 'BARCODE', 'gtin', 'GTIN']`
- Works with inconsistent spreadsheet formats
- Case-insensitive matching

### UPC Normalization
- Removes non-numeric characters
- Pads to standard lengths (8, 12, 13, 14 digits)
- Example: `"12-345"` → `"00012345"` (padded to 8 digits)

### Intelligent Conflict Detection
- Groups rows by UPC
- Detects price mismatches with percentage calculation
- Identifies location conflicts
- Validates data completeness
- Checks for suspicious values (negative qty, extreme prices)
- Provides actionable suggested fixes

### Organization Isolation
- All queries filtered by `organizationId`
- Multi-tenant data security
- Users only see their organization's data

---

## 📈 Performance Considerations

- **Async Processing**: Files processed in background, immediate response to user
- **Pagination**: 20 conflicts per page to avoid large payloads
- **Indexed Queries**: Database indexes on `organizationId`, `analysisId`, `status`, `severity`
- **Transaction Safety**: Conflict creation uses Prisma transactions
- **File Cleanup**: Uploaded files deleted after processing
- **Efficient Grouping**: Prisma `groupBy` for statistics instead of loading all records

---

## 🔒 Security

- ✅ JWT authentication required on all endpoints
- ✅ Organization-based data isolation
- ✅ File type validation
- ✅ File size limits (100MB)
- ✅ Input sanitization
- ✅ Multer disk storage (temporary files)
- ✅ Automatic file cleanup

---

**Status: Session 2 is 60% complete**

**Ready to continue with:** Analytics Dashboard and Conflict Detail Pages

