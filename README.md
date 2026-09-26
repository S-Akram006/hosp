# AI-Driven Hospital and Appointment Management System (MERN)

A healthcare management and scheduling system built with Node.js, Express, Socket.io, MongoDB, React, Vite, and Tailwind CSS.

---

## Project Structure

```text
hospital-ai-system/
├── backend/
│   ├── src/
│   │   ├── config/          # db.js (Mongoose connection & listeners)
│   │   ├── controllers/     # authController, appointmentController, resourceController, aiController, emergencyController, queueController
│   │   ├── middleware/      # authMiddleware.js, errorMiddleware.js, uploadMiddleware.js
│   │   ├── models/          # User.js, Resource.js, Appointment.js, MedicalRecord.js
│   │   ├── routes/          # authRoutes, appointmentRoutes, resourceRoutes, aiRoutes, emergencyRoutes, queueRoutes
│   │   ├── services/        # aiService.js, ocrService.js, noShowService.js
│   │   ├── utils/           # generateToken.js, slotValidator.js
│   │   ├── socket.js        # Socket.io initialization & room topology
│   │   └── server.js        # Node HTTP Server + Socket.io + Express entry
│   ├── .env.example         # Environment template
│   ├── .env                 # Local environment config
│   ├── test_check.js        # Unit verification test suite
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/             # axiosClient.js, authApi.js, appointmentApi.js, aiApi.js, queueApi.js
    │   ├── store/           # useAuthStore.js, useSocketStore.js
    │   ├── components/
    │   │   ├── common/      # Navbar.jsx, Sidebar.jsx, ProtectedRoute.jsx, LoadingSpinner.jsx
    │   │   ├── ui/          # Button.jsx, Card.jsx, Badge.jsx, Input.jsx, Modal.jsx
    │   │   ├── patient/     # TriageChatDrawer.jsx, DynamicSlotPicker.jsx, DocumentUploader.jsx, AppointmentCard.jsx
    │   │   ├── doctor/      # PatientBriefingCard.jsx, AmbientScribeWidget.jsx, SoapNoteEditor.jsx, EmergencyOverrideModal.jsx
    │   │   └── admin/       # ResourceMatrixGrid.jsx, LiveQueueBoard.jsx
    │   ├── layouts/         # AuthLayout.jsx, DashboardLayout.jsx
    │   ├── pages/
    │   │   ├── auth/        # Login.jsx, Register.jsx
    │   │   ├── patient/     # PatientDashboard.jsx
    │   │   ├── doctor/      # DoctorDashboard.jsx
    │   │   └── admin/       # AdminDashboard.jsx
    │   ├── App.jsx          # React Router & RBAC routes
    │   ├── index.css        # Tailwind CSS imports & base theme styles
    │   └── main.jsx         # App mounting
    ├── .env.example
    ├── .env
    ├── vite.config.js       # Vite + @tailwindcss/vite
    └── package.json
```

---

## Phase 1: Authentication & RBAC

- **Data Model**: `User.js` supporting `patient`, `doctor`, and `admin` with `doctorProfile` and `patientProfile`.
- **Security**: Pre-save bcryptjs password hashing and JWT token generator with role payload.
- **Middleware**: `protect` (Bearer token verification) and `authorize(...roles)` (RBAC).
- **Endpoints**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/doctors`.

---

## Phase 2: Core Domain Models & Calendar Engine

- **`Resource.js`**: Tracks equipment & rooms (`consultation_room`, `mri`, `ct_scan`, `xray`, `ultrasound`, `operation_theater`) with `currentStatus` (`available`, `occupied`, `sanitizing`, `maintenance`).
- **`Appointment.js`**: Core appointment records referencing `patientId`, `doctorId`, and `resourceId`.
- **`MedicalRecord.js`**: Clinical documentation referencing `appointmentId`, `patientId`, and `doctorId`, containing `rawTranscript`, structured `soapNote`, and `prescriptions` array with doctor digital signature.
- **`slotValidator.js`**: Prevents doctor double-booking, verifies doctor's weekly profile schedule (`workingHours`), and checks physical resource availability.

---

## Phase 3: AI Engine & Background Logic

- **AI Symptom Triage**: `POST /api/ai/triage` evaluates symptoms, flags red flags, routes specialty, and calculates dynamic duration.
- **Ambient Clinical Documentation**: `POST /api/ai/generate-soap` converts consultation conversation to structured SOAP notes and updates draft medical records.
- **Pre-visit Intake OCR**: `POST /api/ai/ocr-intake` extracts document text via `tesseract.js` and structures insurance/prescription details via LLM.
- **Predictive No-Show Risk Engine**: Evaluates lead time, urgency, and past patient history to compute attendance risk directly upon booking.

---

## Phase 4: Real-Time Event Layer (Socket.io)

- **HTTP Server & Socket.io Architecture**: Native `http.createServer(app)` in `server.js` with singleton accessor in `socket.js`.
- **Room Topology**: `room:doctor:<doctorId>`, `room:patient:<patientId>`, `room:waiting-room`, `room:admin`.
- **Emergency Override Trigger (`POST /api/emergency/override`)**: Shifts doctor's remaining daily schedule and broadcasts delay notifications to patients, waiting displays, and ops.
- **Live Hospital Queue (`GET /api/queue/live`)**: Real-time status broadcasting (`checked-in`, `in-consultation`, `completed`).

---

## Phase 5: Frontend Foundation & Design System

- **Framework**: React 19 + Vite 8 + Tailwind CSS.
- **Global State**: Zustand stores `useAuthStore` and `useSocketStore`.
- **UI Kit**: `Button`, `Card`, `Badge`, `Input`, `Modal`, `LoadingSpinner`.
- **Layouts**: `AuthLayout` and `DashboardLayout` with responsive `Sidebar` and `Navbar`.

---

## Phase 6: Role-Specific Feature Portals

### 1. Patient Portal (`PatientDashboard.jsx`)
- **AI Symptom Triage Drawer (`TriageChatDrawer.jsx`)**: Conversational symptom assessment with red flag warnings and specialty routing.
- **Dynamic Slot Picker (`DynamicSlotPicker.jsx`)**: Automatically sizes calendar slots to AI triage duration, filters physicians by specialty, and checks slot collisions.
- **Document OCR Uploader (`DocumentUploader.jsx`)**: Drag-and-drop intake document scanner with Tesseract text extraction and profile sync.
- **Live Appointment View (`AppointmentCard.jsx`)**: Displays scheduled visits with real-time Socket.io delay notification alerts.

### 2. Doctor Portal (`DoctorDashboard.jsx`)
- **Daily Consultation Queue**: Chronological list of scheduled patients with calculated no-show risk scores.
- **Patient Briefing Card (`PatientBriefingCard.jsx`)**: Pre-consultation summary featuring AI triage notes, vitals, allergies, and chronic conditions.
- **Ambient AI Scribe (`AmbientScribeWidget.jsx`)**: Audio dictation and live conversation transcription triggering AI SOAP generation.
- **SOAP Note Editor (`SoapNoteEditor.jsx`)**: Editable 4-box SOAP note form with dynamic prescription table and "Sign & Complete Consultation" button.
- **Emergency Override Modal (`EmergencyOverrideModal.jsx`)**: One-click shift of upcoming daily appointments with live multi-room broadcast.

### 3. Admin & Facility Portal (`AdminDashboard.jsx`)
- **Resource Matrix Board (`ResourceMatrixGrid.jsx`)**: Real-time grid of exam rooms, MRI, and CT scanners with live status toggles (`available`, `occupied`, `sanitizing`, `maintenance`).
- **Live Clinic Waiting Monitor (`LiveQueueBoard.jsx`)**: Public TV monitor stream showing privacy-safe queue tickets (`TK-A1B2`, masked patient tokens `J*** D***`) and footfall metrics.

---

## Phase 7: Testing, Hardening & Security

### 1. Backend Security & Hardening Middleware
- **Security Headers (`helmet`)**: Configures standard HTTP headers (`Content-Security-Policy`, `X-DNS-Prefetch-Control`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Download-Options`).
- **Strict CORS (`backend/src/config/cors.js`)**: Dynamic origin whitelist honoring `CLIENT_URL` and development origins with credentials enabled and explicit HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`).
- **Data Sanitization (`backend/src/middleware/sanitizeMiddleware.js`)**: Recursively strips NoSQL injection operators (`$`, `.`) from request bodies/queries and sanitizes malicious XSS `<script>` payloads.
- **Three-Tier Rate Limiting (`backend/src/middleware/rateLimiter.js`)**:
  - `generalLimiter`: 100 requests per 15 minutes per IP across all `/api/` endpoints.
  - `authLimiter`: 5 attempts per 15 minutes for `/api/auth/login` and `/api/auth/register` (brute-force defense).
  - `aiLimiter`: 20 requests per 15 minutes for `/api/ai/*` (token abuse & compute defense).

### 2. Core Domain Integration Test Suites (`backend/src/tests/`)
- **`appointmentCollision.test.js`**:
  - Test 1: Successfully books within doctor profile working hours.
  - Test 1b: Rejects bookings requested outside physician operating hours.
  - Test 2: Detects and rejects overlapping appointment windows.
  - Test 2b: Permits contiguous back-to-back non-overlapping appointments.
  - Test 3: Rejects bookings targeting resources marked under `maintenance` or `sanitizing`.
- **`emergencyOverride.test.js`**:
  - Test 1: Simulates emergency override shifting $N$ future appointments by exactly $N$ minutes.
  - Test 2: Verifies `isDelayed` flag is set to `true` and immutable `originalStartTime` is preserved across multiple shifts.

### 3. Client-Side Defensive Hardening
- **Global Error Boundary (`ErrorBoundary.jsx`)**: Catches unexpected rendering/network exceptions to prevent white-screen crashes, offering a self-recovery trigger.
- **Sensitive Patient Data Masking (`maskData.js`)**: Masks policy numbers (`••••-4321`), emails (`a***@domain.com`), and names for HIPAA and public display compliance.
- **Hardware Audio Stream Release (`AmbientScribeWidget.jsx`)**: Explicitly terminates hardware audio tracks (`stream.getTracks().forEach(track => track.stop())`) upon unmount or recording stop to release microphone locks.

---

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm test       # Run Phase 1 - 7 automated verification & integration test suites
npm run dev    # Start API server on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build  # Validate production bundle
npm run dev    # Start Vite dev server on http://localhost:5173
```
