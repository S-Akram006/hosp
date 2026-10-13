# 🏥 MediAI Pulse — Modern Hospital & Appointment Management Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Website-06b6d4?style=for-the-badge&logo=vercel)](https://hosp-tawny-seven.vercel.app/login)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-1e293b?style=for-the-badge&logo=github)](https://github.com/S-Akram006/hosp)
[![Status](https://img.shields.io/badge/Status-Live_%26_Operational-10b981?style=for-the-badge)](https://hosp-98t3.onrender.com/api/health)

> **MediAI Pulse** is an easy-to-use, all-in-one web platform that helps hospitals organize patient appointments, coordinate doctor schedules, and eliminate chaotic clinic waiting rooms.

🔗 **Try the Live App**: [https://hosp-tawny-seven.vercel.app/login](https://hosp-tawny-seven.vercel.app/login)  
📂 **Source Code**: [https://github.com/S-Akram006/hosp](https://github.com/S-Akram006/hosp)

---

## 🎯 What Problem Does This Solve?

Visiting a hospital or scheduling a medical visit is often frustrating and slow:
- **Phone calls and long holds** just to find out if a doctor is available.
- **Crowded waiting lobbies** where patients wait for hours without knowing their place in line.
- **Stacks of paper files and handwritten notes** that can easily be misplaced or misread.
- **Unexpected emergency delays** that leave scheduled patients confused and uninformed.

### 💡 The Solution
MediAI Pulse replaces manual paperwork and telephone tag with a **modern digital healthcare portal**:
1. **Patients** pick the exact date and time slot that fits their schedule, check in online from home or the lobby, and monitor delays in real time.
2. **Doctors** see an organized list of today’s visits, use smart digital scribing to capture consultation notes effortlessly, and mark visits complete with one click.
3. **Hospital Administrators** keep track of examination rooms, medical equipment (like MRI and CT scanners), and clinic queues from a central command dashboard.

---

## 👥 Who Uses the Platform? (User Roles)

The platform provides tailored workspaces for each person involved in the hospital visit:

| Role | Who It's For | What They Can Do |
|---|---|---|
| **🧑‍⚕️ Patient** | Everyday people seeking care | • Create an account or sign in with email<br>• Describe symptoms to receive AI specialist recommendations<br>• Choose available date and time slots on doctor calendars<br>• Check in online upon arrival<br>• View past medical history, prescriptions, and visit statuses<br>• Cancel appointments if plans change |
| **🩺 Doctor** | Physicians & specialists | • Set daily working hours and consultation shift times<br>• View today’s live queue of scheduled and waiting patients<br>• Review patient symptoms and medical background before entering the room<br>• Generate automated consultation summary notes (SOAP notes)<br>• Digitally sign medical records to mark visits completed |
| **🏢 Administrator** | Hospital staff & managers | • Oversee hospital-wide clinic queues and real-time waiting times<br>• Monitor physical facilities (Consultation Rooms, MRI Suites, CT Scanners)<br>• Trigger emergency overrides to safely shift schedules during priority trauma arrivals<br>• Ensure hospital resources run smoothly without double-bookings |

---

## ✨ Key Features Explained in Plain English

- **📅 Smart Calendar Booking**: Automatically checks each doctor’s shift hours so patients can only pick times when the physician is actively on duty—no double bookings, ever.
- **📱 One-Click Online Check-In**: Patients can confirm their arrival with a single tap on their phone or computer, notifying the clinic staff immediately.
- **⏱️ Live Queue Updates**: Hospital screens and patient phones update in real time without having to refresh the page whenever a doctor finishes a visit or gets delayed.
- **🎙️ AI Clinical Note Writer**: Doctors can review automated consultation summaries and prescription suggestions, freeing them to focus directly on patient care instead of typing.
- **🚨 Instant Emergency Priority Mode**: When a critical trauma case arrives, the hospital can activate an emergency override that securely moves existing appointments forward by 30 minutes and notifies waiting patients automatically.
- **🔒 Private & Secure Sign-In**: Protects sensitive health records with encrypted password authentication and role-based access so only authorized personnel can view medical charts.

---

## ⚙️ How It Works (A Simple Real-World Analogy)

Think of MediAI Pulse like a modern physical medical clinic with three core departments working together:

1. **🖥️ The Reception & Lobby (The Front - React & Tailwind CSS)**:  
   *What you see on your screen.* Like walking into a clean, modern clinic lobby with clear signs, self-service check-in kiosks, and helpful information desks.
2. **🏢 The Administrative Back Office (The Engine - Node.js & Express)**:  
   *The logic running behind the scenes.* Like clinic administrators verifying insurance, checking calendar availability, confirming credentials, and announcing announcements over the intercom.
3. **🗄️ The Secure Medical Archives (The Memory - MongoDB)**:  
   *The digital filing room.* Like a secure, fireproof filing cabinet that safely stores patient records, past prescriptions, and equipment statuses so they can be retrieved instantly whenever needed.

---

## 🚀 How to Run It on Your Computer (Step-by-Step for Beginners)

Want to run the complete hospital system on your own laptop? Follow these simple steps.

### What You Need First (Prerequisites)
Make sure you have installed:
1. **[Node.js](https://nodejs.org/)** (Version 18 or newer — this runs JavaScript on your computer).
2. **[Git](https://git-scm.com/)** (To download the code repository).

---

### Step 1: Download the Project
Open your computer's terminal or command prompt (PowerShell on Windows, Terminal on Mac/Linux) and run:

```bash
git clone https://github.com/S-Akram006/hosp.git
cd hosp
```

---

### Step 2: Set Up the Backend (The Engine)

1. Move into the backend folder:
   ```bash
   cd backend
   ```

2. Install the required components:
   ```bash
   npm install
   ```

3. Create your configuration settings file:
   Make a copy of `.env.example` named `.env`:
   ```bash
   # On Windows PowerShell:
   Copy-Item .env.example .env

   # On Mac / Linux:
   cp .env.example .env
   ```

4. Populate the demo hospital database (creates sample doctors, patients, and rooms):
   ```bash
   npm run seed
   ```

5. Start the backend server:
   ```bash
   npm start
   ```
   *Your server will start and print `[Server] Hospital AI Backend running on port 5000`.*

---

### Step 3: Set Up the Frontend (The Website Interface)

Open a **new, second terminal window** and run:

1. Move into the frontend folder:
   ```bash
   cd hosp/frontend
   ```

2. Install the website components:
   ```bash
   npm install
   ```

3. Launch the website locally:
   ```bash
   npm run dev
   ```

4. Open your web browser and go to:
   ```text
   http://localhost:5173
   ```

---

## 🔑 Quick Demo Login Accounts

When testing locally or on the [Live Website](https://hosp-tawny-seven.vercel.app/login), you can click the quick demo buttons on the login screen or use these credentials:

| Role | Demo Email | Demo Password |
|---|---|---|
| **Patient** | `patient@example.com` | `password123` |
| **Doctor** | `doctor@hospital.com` | `password123` |
| **Admin** | `admin@hospital.com` | `password123` |

---

## 📄 License & Credits

Built with care for accessible, modern healthcare management. Licensed under the [ISC License](LICENSE).
