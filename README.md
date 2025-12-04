# HealthEasy-HMS

A modern Hospital Management System (HMS) built with React, Vite, Tailwind CSS, and Firebase Firestore. The app enables admins to manage patients, doctors, appointments, and billing — with real-time updates, AI-powered insights, and a seamless booking experience.

## Features

- **Patient Management**: Add and manage patient records with health conditions and demographics
- **Doctor Directory**: Maintain a database of specialists available for booking
- **Appointment Booking**: Schedule appointments with conflict detection (15-minute gap per doctor), automatic invoice generation, and payment processing
- **Billing & Invoices**: Track payments, manage invoices, and view revenue analytics
- **Real-time Updates**: Firestore-powered live data synchronization across all users
- **AI Insights**: Gemini AI integration for health tips, medical charge explanations, and appointment prep instructions
- **Role-based Access**: Separate admin and doctor portals with customized workflows
- **Mock DB Fallback**: Local in-memory database for development and testing without Firestore
- **Duplicate Prevention**: Deterministic appointment IDs + Firestore transactions prevent duplicate bookings under concurrency

## Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS, PostCSS
- **Icons**: lucide-react
- **Backend**: Firebase (Auth, Firestore)
- **AI**: Gemini 2.5 Flash API
- **State Management**: React Hooks
- **Database Options**: Firestore (production) or in-memory mock DB (local dev)

## Project Structure

```
healtheasy/
├── src/
│   ├── App.jsx              # Main app component + data hooks
│   ├── mockDb.js            # In-memory mock DB for local dev
│   ├── main.jsx             # React entry point
│   ├── index.css            # Global styles + Tailwind directives
│   ├── App.css              # Component styles
│   └── assets/              # Static assets
├── public/                  # Public static files
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── package.json             # Dependencies and scripts
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## Installation

### Prerequisites

- Node.js 16+ and npm
- Firebase account (for production use)

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/DevChinmaya/HealthEasy-HMS.git
cd HealthEasy-HMS
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure Firebase** (optional, if using real Firestore)

   - Update the Firebase config in `src/App.jsx` with your project credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
   - Ensure Cloud Firestore is enabled in your Firebase project.

4. **Start development server**

   **Option A: With real Firestore**
   ```bash
   npm run dev
   ```
   - App will attempt Firestore on startup. If unavailable, it auto-falls back to mock mode.

   **Option B: With local mock DB (no Firestore required)**
   ```bash
   $env:VITE_USE_MOCK_DB='true'; npm run dev
   ```
   - Dev server runs on `http://localhost:5173` (or next available port).

5. **Build for production**

```bash
npm run build
```

6. **Preview production build**

```bash
npm run preview
```

## Usage

### Login

- **Admin**: `admin@gmail.com` / `admin123`
- **Doctor**: Enter doctor name & email from directory, password `doc123`

### Workflows

#### Admin
- **Dashboard**: View metrics (patients, doctors, appointments, revenue)
- **Patients**: Add patients, search, view health profiles
- **Doctors**: Add specialists with specialties
- **Appointments**: Book/manage appointments, approve after payment
- **Billing**: Process payments, track revenue

#### Doctor
- **Patients**: View assigned patients
- **Appointments**: View and manage personal schedule

### Booking an Appointment

1. Navigate to **Appointments** → **Book Appointment**
2. Select patient, reason for visit
3. (Optional) Click **✨ AI Triage** to auto-recommend a specialist
4. Select doctor, date, and time
5. Set consultation fee
6. Click **Confirm Booking** → app creates appointment + invoice automatically
7. Go to **Billing** → **Process** → verify payment → invoice marked "Paid"

### Firestore Database Schema

```
artifacts/
└── default-app-id/
    └── public/
        └── data/
            ├── patients/          # Patient records
            ├── doctors/           # Doctor profiles
            ├── appointments/      # Appointments (status: Pending Payment, Scheduled, Completed, Cancelled)
            └── invoices/          # Invoices (status: Pending, Paid, Failed)
```

## Configuration

### Firestore Security Rules (Development)

For **local testing only**, apply permissive rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ DO NOT use in production.** Revert to proper security rules before deploying.

### Environment Variables

Create a `.env` file in the project root (optional):

```
VITE_USE_MOCK_DB=false  # Set to 'true' to force mock DB mode
```

## Features in Detail

### Appointment Conflict Prevention

- **Client-side**: Checks existing appointments for 15-minute gap per doctor
- **Server-side**: Firestore transaction validates and creates appointment + invoice atomically
- **Deterministic ID**: `${doctorId}_${date}_${time}_${patientId}` prevents duplicates from repeated clicks

### Auto-Invoice Generation

- When an appointment is created, an invoice is auto-generated with:
  - Status: `Pending`
  - Amount: consultation fee
  - Linked appointment ID for traceability
- Admin can process payment in **Billing** → **Process** button

### Real-time Data Sync

- All data hooks use Firestore `onSnapshot` listeners for live updates
- When one user books an appointment, other users' screens update instantly

### AI Features (Gemini API)

- **AI Health Tip**: Get a personalized tip for a patient's condition
- **AI Triage**: Auto-recommend a specialist based on reason for visit
- **Explain Charge**: Get a plain-language explanation of a medical charge
- **AI Prep**: Get appointment preparation instructions for a visit

### Mock DB for Development

File: `src/mockDb.js`

- In-memory store with `subscribe`, `add`, `update`, `find`, `seed` methods
- Activated when `VITE_USE_MOCK_DB=true` or auto-enabled if Firestore is unreachable
- Perfect for local development without Firebase setup

## Troubleshooting

### "Firestore API not enabled" / 404 Error

1. Open Firebase Console → Cloud Firestore
2. Create a database (if not already created)
3. Set database location and choose starting security rules
4. Ensure Cloud Firestore API is enabled in Google Cloud Console

### App stuck at "Initializing HEALTHEASY..."

- If Firestore is unavailable, the app auto-prompts to switch to mock mode
- Or run with `VITE_USE_MOCK_DB=true` to skip Firestore entirely

### "Permission denied" Errors

- Update Firestore security rules (see **Configuration** above)
- Confirm Firebase project credentials in `src/App.jsx` match your project

### Port Already in Use

- Vite auto-selects the next available port (e.g., 5174, 5175)
- Check terminal output for the correct URL

## Development Workflow

1. Make changes to `src/App.jsx`, `src/mockDb.js`, or styles
2. Vite automatically reloads the dev server (HMR)
3. Test locally with mock DB or Firestore
4. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

## Future Enhancements

- [ ] Cloud Functions for server-side validation and audit logging
- [ ] Enhanced security rules based on user roles
- [ ] SMS/Email notifications for appointment reminders
- [ ] Patient portal for booking and payment
- [ ] Advanced analytics dashboard
- [ ] Integration with third-party payment gateways
- [ ] Prescription management module

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request.

## Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ using React, Vite, and Firebase**
