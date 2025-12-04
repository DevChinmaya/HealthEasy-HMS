import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  where,
  getDocs,
  runTransaction,
  deleteDoc
} from 'firebase/firestore';
import * as mockDb from './mockDb';

// Enable mock DB when Vite env var is set to 'true'
const USE_MOCK = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_MOCK_DB === 'true'; 
// Expose a runtime toggle so we can fall back to mock mode if Firestore is unreachable.
if (typeof window !== 'undefined' && typeof window.__USE_MOCK === 'undefined') {
  window.__USE_MOCK = USE_MOCK;
}
import { 
  Activity, Users, Calendar, CreditCard, Plus, User, FileText, 
  CheckCircle, XCircle, Clock, Menu, X, Stethoscope, LayoutDashboard, 
  Sparkles, Loader2, AlertCircle, DollarSign, ThumbsDown, ThumbsUp,
  Lock, LogOut, ShieldCheck, Briefcase, ChevronRight, Search, FileQuestion, ClipboardList
} from 'lucide-react';

// --- CONFIGURATION START ---
// This configuration handles both the Preview Environment and Local/Production setups.

const firebaseConfig = {
  apiKey: "AIzaSyCaeXEh5mPQtbepoDNrmSeAPM33X2sAGtI",
  authDomain: "healtheasy-c6aa4.firebaseapp.com",
  projectId: "healtheasy-c6aa4",
  storageBucket: "healtheasy-c6aa4.firebasestorage.app",
  messagingSenderId: "40828180190",
  appId: "1:40828180190:web:bebaa7920b76d1592a144f"
};

const appId = "default-app-id"; 
const apiKey = "AIzaSyDuAofJAVyS0YJ1x5EeP-PaBhGcF51WF-E";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Gemini AI Helper ---
const callGemini = async (prompt) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis available.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Unable to generate insight. AI service is currently unavailable.";
  }
};

// --- Shared UI Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    Scheduled: "bg-blue-50 text-blue-700 border-blue-100",
    "Pending Payment": "bg-amber-50 text-amber-700 border-amber-100",
    Completed: "bg-green-50 text-green-700 border-green-100",
    Cancelled: "bg-red-50 text-red-700 border-red-100",
    Pending: "bg-amber-50 text-amber-700 border-amber-100",
    Paid: "bg-green-50 text-green-700 border-green-100",
    Failed: "bg-red-50 text-red-700 border-red-100",
    Active: "bg-green-50 text-green-700 border-green-100",
    Inactive: "bg-gray-50 text-gray-500 border-gray-100"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-50 text-gray-700 border-gray-100"}`}>
      {status}
    </span>
  );
};

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }) => {
  const base = "px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200",
    ghost: "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- Login Component (HEALTHEASY Branding) ---
const LoginScreen = ({ onLogin }) => {
  const [role, setRole] = useState('Admin'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (role === 'Admin') {
        if (email === 'admin@gmail.com' && password === 'admin123') {
          setTimeout(() => { onLogin({ name: 'Administrator', email: email, role: 'Admin' }); }, 500);
        } else { throw new Error('Invalid Admin credentials'); }
      } else {
        if (password !== 'doc123') throw new Error('Invalid password');
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'doctors'), where("name", "==", name), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doctorData = querySnapshot.docs[0].data();
          onLogin({ name: doctorData.name, email: doctorData.email, role: 'Doctor', id: querySnapshot.docs[0].id });
        } else { throw new Error('Doctor not found in directory.'); }
      }
    } catch (err) { setError(err.message); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 text-center border-b border-gray-100">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HEALTHEASY</h1>
          <p className="text-gray-500 text-sm mt-2">Secure Hospital Portal</p>
        </div>
        
        <div className="flex p-1 bg-gray-50 m-6 rounded-lg border border-gray-100">
          {['Admin', 'Doctor'].map((r) => (
            <button 
              key={r}
              onClick={() => { setRole(r); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {r} Login
            </button>
          ))}
        </div>

        <div className="px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {role === 'Doctor' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Doctor Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="e.g. Dr. Smith" required />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="name@hospital.com" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="••••••••" required />
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? <Loader2 className="animate-spin" size={20} /> : `Login`}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400">
             <p>Admin: admin@gmail.com / admin123</p>
             <p>Doctor: Verify via directory / doc123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Data Hooks ---

const usePatients = (user) => {
  const [patients, setPatients] = useState([]);
  useEffect(() => {
    if (!user) return;
    if (window.__USE_MOCK) {
      // subscribe to mock collection
      const unsub = mockDb.subscribe('patients', (docs) => setPatients(docs));
      return () => unsub();
    }
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (s) => setPatients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);
  const addPatient = (data) => {
    if (window.__USE_MOCK) return mockDb.add('patients', { ...data, createdAt: new Date().toISOString(), status: 'Active' });
    return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), { ...data, createdAt: serverTimestamp(), status: 'Active' });
  };
  return { patients, addPatient };
};

const useDoctors = (user) => {
  const [doctors, setDoctors] = useState([]);
  useEffect(() => {
    if (!user) return;
    if (window.__USE_MOCK) {
      const unsub = mockDb.subscribe('doctors', (docs) => setDoctors(docs));
      return () => unsub();
    }
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'doctors'), orderBy('name'));
    return onSnapshot(q, (s) => setDoctors(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);
  const addDoctor = (data) => {
    if (window.__USE_MOCK) return mockDb.add('doctors', { ...data, createdAt: new Date().toISOString(), status: 'Active' });
    return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'doctors'), { ...data, createdAt: serverTimestamp(), status: 'Active' });
  };
  return { doctors, addDoctor };
};

const useAppointments = (user) => {
  const [appointments, setAppointments] = useState([]);
  useEffect(() => {
    if (!user) return;
    if (window.__USE_MOCK) {
      const unsub = mockDb.subscribe('appointments', (docs) => setAppointments(docs));
      return () => unsub();
    }
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), orderBy('date', 'desc'));
    return onSnapshot(q, (s) => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const addAppointment = async (data) => {
    if (!data.doctorId || !data.date || !data.time || !data.patientId) throw new Error('Missing appointment details');

    if (window.__USE_MOCK) {
      // Client-side availability check against mock store
      const list = mockDb._mock.appointments || [];
      const newTime = parseInt(data.time.split(':')[0]) * 60 + parseInt(data.time.split(':')[1]);
      for (let ap of list) {
        if (!ap || ap.status === 'Cancelled' || ap.status === 'Failed') continue;
        if (ap.doctorId !== data.doctorId || ap.date !== data.date) continue;
        if (!ap.time) continue;
        const exTime = parseInt(ap.time.split(':')[0]) * 60 + parseInt(ap.time.split(':')[1]);
        if (Math.abs(newTime - exTime) < 15) throw new Error('Selected doctor is busy around that time. Please choose a different time.');
      }

      // Add appointment and invoice atomically in mock
      const created = mockDb.add('appointments', { ...data, status: 'Pending Payment', createdAt: new Date().toISOString() });
      const invoicePayload = {
        patientId: data.patientId || '',
        patientName: data.patientName || '',
        appointmentId: created.id,
        doctorId: data.doctorId || '',
        doctorName: data.doctorName || '',
        doctorSpecialty: data.doctorSpecialty || '',
        amount: data.consultationFee || '0',
        description: `Consultation: ${data.doctorName || ''}`,
        date: data.date,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };
      const inv = mockDb.add('invoices', invoicePayload);
      console.log('Mock: created appointment and invoice', created.id, inv.id);
      return { id: created.id };
    }

    // Real Firestore path
    const apptCol = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const availabilityQuery = query(apptCol, where('doctorId', '==', data.doctorId), where('date', '==', data.date));
    const snap = await getDocs(availabilityQuery);
    const newTime = parseInt(data.time.split(':')[0]) * 60 + parseInt(data.time.split(':')[1]);
    for (let d of snap.docs) {
      const ap = d.data();
      if (ap.status === 'Cancelled' || ap.status === 'Failed') continue;
      if (!ap.time) continue;
      const exTime = parseInt(ap.time.split(':')[0]) * 60 + parseInt(ap.time.split(':')[1]);
      if (Math.abs(newTime - exTime) < 15) {
        throw new Error('Selected doctor is busy around that time. Please choose a different time.');
      }
    }

    const safeTime = data.time.replace(/:/g, '-');
    const apptId = `${data.doctorId}_${data.date}_${safeTime}_${data.patientId}`;
    const apptDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'appointments', apptId);
    const invoiceCol = collection(db, 'artifacts', appId, 'public', 'data', 'invoices');
    const invoiceDocRef = doc(invoiceCol);

    const res = await runTransaction(db, async (tx) => {
      const existing = await tx.get(apptDocRef);
      if (existing.exists()) {
        throw new Error('Duplicate appointment detected (likely from multiple clicks).');
      }

      const apptPayload = { ...data, status: 'Pending Payment', createdAt: serverTimestamp() };
      tx.set(apptDocRef, apptPayload);

      const invoicePayload = {
        patientId: data.patientId || '',
        patientName: data.patientName || '',
        appointmentId: apptId,
        doctorId: data.doctorId || '',
        doctorName: data.doctorName || '',
        doctorSpecialty: data.doctorSpecialty || '',
        amount: data.consultationFee || '0',
        description: `Consultation: ${data.doctorName || ''}`,
        date: data.date,
        status: 'Pending',
        createdAt: serverTimestamp()
      };
      tx.set(invoiceDocRef, invoicePayload);

      return { apptId, invoiceId: invoiceDocRef.id };
    });

    console.log('Created appointment and invoice in transaction', res);
    return { id: res.apptId };
  };

  const updateStatus = (id, status) => {
    if (window.__USE_MOCK) return mockDb.update('appointments', id, { status });
    return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'appointments', id), { status });
  };
  return { appointments, addAppointment, updateStatus };
};

const useBilling = (user) => {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    if (!user) return;
    if (window.__USE_MOCK) {
      const unsub = mockDb.subscribe('invoices', (docs) => setInvoices(docs));
      return () => unsub();
    }
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'invoices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (s) => setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);
  const createInvoice = (data) => {
    if (window.__USE_MOCK) return mockDb.add('invoices', { ...data, status: 'Pending', createdAt: new Date().toISOString() });
    return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'invoices'), { ...data, status: 'Pending', createdAt: serverTimestamp() });
  };
  const updateInvoiceStatus = (id, status) => {
    if (window.__USE_MOCK) return mockDb.update('invoices', id, { status });
    return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invoices', id), { status });
  };
  return { invoices, createInvoice, updateInvoiceStatus };
};

// --- Main Application ---

export default function HospitalManagementSystem() {
  const [firebaseUser, setFirebaseUser] = useState(null); 
  const [appUser, setAppUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (error) { console.error("Auth Error:", error); }
    };
    initAuth();
    return onAuthStateChanged(auth, setFirebaseUser);
  }, []);

  useEffect(() => {
    if (appUser?.role === 'Doctor' && !['patients', 'appointments'].includes(view)) setView('appointments');
    else if (appUser?.role === 'Admin' && view === 'dashboard' && !['dashboard', 'patients', 'doctors', 'appointments', 'billing'].includes(view)) setView('dashboard');
  }, [appUser, view]);

  // Quick connectivity check: if Firestore is unreachable, prompt to switch to mock DB and reload.
  useEffect(() => {
    if (!firebaseUser) return;
    if (window.__USE_MOCK) return;
    (async () => {
      try {
        const testQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), orderBy('createdAt', 'desc'));
        await getDocs(testQ);
      } catch (err) {
        console.warn('Firestore connectivity error, enabling mock DB fallback', err);
        try {
          if (typeof window !== 'undefined' && window.confirm && window.confirm('Cannot reach Firestore (404/permission). Switch to local mock DB for development? Click OK to reload in mock mode.')) {
            window.__USE_MOCK = true;
            location.reload();
          } else {
            // still enable mock to allow UI to function
            window.__USE_MOCK = true;
            location.reload();
          }
        } catch (e) {
          window.__USE_MOCK = true;
          location.reload();
        }
      }
    })();
  }, [firebaseUser]);

  const { patients, addPatient } = usePatients(firebaseUser);
  const { doctors, addDoctor } = useDoctors(firebaseUser);
  const { appointments, addAppointment, updateStatus } = useAppointments(firebaseUser);
  const { invoices, createInvoice, updateInvoiceStatus } = useBilling(firebaseUser);

  const metrics = useMemo(() => {
    const totalPatients = patients.length;
    const activeDoctors = doctors.filter(d => d.status === 'Active').length;
    const pendingAppointments = appointments.filter(a => a.status === 'Scheduled').length;
    const totalRevenue = invoices.reduce((sum, inv) => inv.status === 'Paid' ? sum + Number(inv.amount) : sum, 0);
    return { totalPatients, activeDoctors, pendingAppointments, totalRevenue };
  }, [patients, doctors, appointments, invoices]);

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState(null);

  const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: 'Male', phone: '', condition: '' });
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', phone: '', email: '' });
  const [newAppt, setNewAppt] = useState({ patientId: '', doctorId: '', date: '', time: '', reason: '', consultationFee: '50' });
  const [newInvoice, setNewInvoice] = useState({ patientId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [isBooking, setIsBooking] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.condition?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  const navItems = useMemo(() => {
    const allItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'doctors', label: 'Doctors', icon: Stethoscope },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'billing', label: 'Billing', icon: CreditCard },
    ];
    if (appUser?.role === 'Doctor') return allItems.filter(item => ['patients', 'appointments'].includes(item.id));
    return allItems;
  }, [appUser]);

  const checkAvailability = (doctorId, date, time) => {
    const existingAppts = appointments.filter(a => a.doctorId === doctorId && a.date === date && a.status !== 'Cancelled' && a.status !== 'Failed');
    if (existingAppts.length === 0) return true;
    const newTime = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    for (let appt of existingAppts) {
      const existingTime = parseInt(appt.time.split(':')[0]) * 60 + parseInt(appt.time.split(':')[1]);
      if (Math.abs(newTime - existingTime) < 15) return false;
    }
    return true;
  };

  // Handlers
  const handleAddPatient = (e) => { e.preventDefault(); addPatient(newPatient); setShowPatientModal(false); setNewPatient({ name: '', age: '', gender: 'Male', phone: '', condition: '' }); };
  const handleAddDoctor = (e) => { e.preventDefault(); addDoctor(newDoctor); setShowDoctorModal(false); setNewDoctor({ name: '', specialty: '', phone: '', email: '' }); };
  const handleAddAppt = async (e) => {
    e.preventDefault();
    // Immediate form-level guard to avoid duplicate submits from rapid clicks
    try {
      const formEl = e.currentTarget;
      if (formEl && formEl.dataset && formEl.dataset.busy === '1') return;
      if (formEl && formEl.dataset) formEl.dataset.busy = '1';
    } catch (err) {
      // continue even if dataset manipulation fails
    }
    if (isBooking) return; // prevent double submissions
    setIsBooking(true);
    try {
      if (!checkAvailability(newAppt.doctorId, newAppt.date, newAppt.time)) { alert("⚠️ Doctor busy. Need 15 min gap."); setIsBooking(false); return; }
      const patient = patients.find(p => p.id === newAppt.patientId);
      const doctor = doctors.find(d => d.id === newAppt.doctorId);
      const apptRef = await addAppointment({ ...newAppt, patientName: patient?.name || 'Unknown', doctorName: doctor?.name || 'Unknown', doctorSpecialty: doctor?.specialty || 'General' });
      setShowApptModal(false); setNewAppt({ patientId: '', doctorId: '', date: '', time: '', reason: '', consultationFee: '50' });
      alert("Appointment booked! Go to Billing to pay.");
    } catch (err) {
      console.error('Booking error:', err);
      alert(err.message || 'Unable to book appointment.');
    } finally {
      try { const formEl = e.currentTarget; if (formEl && formEl.dataset) delete formEl.dataset.busy; } catch (err) {}
      setIsBooking(false);
    }
  };
  const processPayment = async (isSuccess) => {
    if (!paymentModalData) return;
    await updateInvoiceStatus(paymentModalData.id, isSuccess ? 'Paid' : 'Failed');
    if (isSuccess && paymentModalData.appointmentId) await updateStatus(paymentModalData.appointmentId, 'Scheduled');
    setPaymentModalData(null);
  };
  const handleCreateInvoice = (e) => {
    e.preventDefault(); const patient = patients.find(p => p.id === newInvoice.patientId);
    createInvoice({ ...newInvoice, patientName: patient?.name || 'Unknown' }); setShowInvoiceModal(false);
    setNewInvoice({ patientId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
  };

  if (!firebaseUser) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400"><Loader2 className="animate-spin mr-2"/> Initializing HEALTHEASY...</div>;
  if (!appUser) return <LoginScreen onLogin={setAppUser} />;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0`}>
        <div className="h-20 flex items-center px-8 border-b border-gray-50">
           <div className="bg-indigo-600 p-1.5 rounded-lg mr-3"><Plus className="text-white w-5 h-5" strokeWidth={3.5}/></div>
           <span className="font-bold text-xl tracking-tight text-slate-900">HEALTHEASY<span className="text-indigo-600">.</span></span>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-8 px-3 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
             <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm"><User size={20} /></div>
             <div className="overflow-hidden">
               <p className="text-sm font-bold text-gray-900 truncate">{appUser.name}</p>
               <p className="text-xs text-indigo-600 font-medium uppercase">{appUser.role}</p>
             </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setView(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${view === item.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <div className="flex items-center gap-3"><item.icon size={18} /> <span>{item.label}</span></div>
                {view === item.id && <ChevronRight size={16} className="opacity-50"/>}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="absolute bottom-6 left-0 right-0 px-6">
          <Button variant="secondary" onClick={() => setAppUser(null)} className="w-full !justify-start text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100">
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-sm border-b border-gray-50 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><Menu size={24} /></button>
            <h2 className="text-xl font-bold text-slate-800 hidden md:block">{view.charAt(0).toUpperCase() + view.slice(1)}</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
               <Calendar size={14}/> <span>{new Date().toLocaleDateString()}</span>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {window.__USE_MOCK && (
            <div className="max-w-6xl mx-auto mb-4">
              <div className="p-3 rounded-md bg-amber-50 border border-amber-100 text-amber-800 flex items-center justify-between">
                <div>Firestore unreachable — running in local mock mode for development.</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { window.__USE_MOCK = false; location.reload(); }} className="px-3 py-1 bg-white border rounded">Try Firestore</button>
                </div>
              </div>
            </div>
          )}
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Dashboard */}
            {view === 'dashboard' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                  <div className="relative z-10 max-w-xl">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">Welcome back, {appUser.name.split(' ')[0]}! 👋</h1>
                    <p className="text-indigo-100 text-lg mb-8">You have {metrics.pendingAppointments} appointments scheduled for today. Your hospital is operating at 98% efficiency.</p>
                    <button onClick={() => setView('appointments')} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 flex items-center gap-2">Check Schedule <ChevronRight size={18}/></button>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none"><Activity size={400}/></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   {[
                     { label: 'Total Patients', val: metrics.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                     { label: 'Active Doctors', val: metrics.activeDoctors, icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                     { label: 'Appointments', val: metrics.pendingAppointments, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
                     { label: 'Revenue', val: `$${metrics.totalRevenue}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                   ].map((m, i) => (
                     <Card key={i} className="p-6 flex items-center gap-4 border-none shadow-sm hover:shadow-lg">
                        <div className={`w-14 h-14 rounded-2xl ${m.bg} flex items-center justify-center ${m.color}`}><m.icon size={26}/></div>
                        <div><p className="text-slate-500 text-sm font-medium">{m.label}</p><h3 className="text-2xl font-bold text-slate-800">{m.val}</h3></div>
                     </Card>
                   ))}
                </div>
              </div>
            )}

            {/* Patients List + Search */}
            {view === 'patients' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="relative hidden md:block w-64">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search patients..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <Button onClick={() => setShowPatientModal(true)}><Plus size={18}/> Add Patient</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPatients.map(p => (
                    <Card key={p.id} className="p-6 relative group border-none shadow-sm hover:shadow-xl flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl shadow-inner">{p.name[0]}</div>
                        <Badge status={p.status} />
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                      <p className="text-sm text-slate-500 mb-4">{p.age} Years • {p.gender}</p>
                      <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100"><div className="flex items-start gap-2 text-sm text-slate-600"><Activity size={16} className="text-indigo-500 shrink-0 mt-0.5" /><span className="line-clamp-2">{p.condition}</span></div></div>
                      <div className="mt-auto">
                        <Button variant="ghost" className="w-full justify-center bg-indigo-50/50" onClick={async (e) => {
                            const btn = e.currentTarget; const originalText = btn.innerHTML; btn.innerText = "Thinking...";
                            try { const tip = await callGemini(`Patient: ${p.age}yr ${p.gender}, ${p.condition}. Give 1 very short, specific health tip. MAX 1 sentence.`); alert(tip); } catch(err) { alert("AI Error"); }
                            btn.innerHTML = originalText;
                          }}>
                          <Sparkles size={16}/> ✨ AI Health Tip
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor Directory */}
            {view === 'doctors' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                   <div><h2 className="text-2xl font-bold text-slate-800">Specialists</h2><p className="text-slate-500 text-sm">Qualified doctors available for booking</p></div>
                   {appUser.role === 'Admin' && <button onClick={() => setShowDoctorModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"><Plus size={20}/> Add Doctor</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {doctors.map(d => (
                    <Card key={d.id} className="p-6 hover:shadow-xl transition-all border-none shadow-sm group">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          Dr
                        </div>
                        <h3 className="font-bold text-xl text-slate-800 mb-1">{d.name}</h3>
                        <p className="text-indigo-500 font-medium text-sm mb-4 uppercase tracking-wide">{d.specialty}</p>
                        <div className="w-full pt-4 border-t border-slate-100 flex justify-center">
                           <p className="text-slate-500 text-sm flex items-center gap-2"><User size={16}/> {d.email}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {view === 'appointments' && (
               <div className="space-y-8">
                 <div className="flex justify-between items-center">
                   <div><h2 className="text-2xl font-bold text-slate-800">Manage Appointments</h2><p className="text-slate-500 text-sm">Manage bookings and schedules</p></div>
                   <Button onClick={() => setShowApptModal(true)}><Plus size={18}/> Book Appointment</Button>
                 </div>
                 <Card className="overflow-hidden border-none shadow-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-xs"><tr><th className="p-5 pl-8">Patient</th><th className="p-5">Doctor</th><th className="p-5">Date & Time</th><th className="p-5">Status</th><th className="p-5">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {appointments.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-5 pl-8"><div className="font-bold text-slate-800">{a.patientName}</div><div className="text-xs text-slate-500 mt-0.5">{a.reason}</div></td>
                              <td className="p-5"><div className="text-slate-800 font-medium">{a.doctorName}</div><div className="text-xs text-indigo-500">{a.doctorSpecialty}</div></td>
                              <td className="p-5 text-slate-600"><div className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-lg w-fit shadow-sm"><Calendar size={14} className="text-indigo-500"/> {a.date} <span className="text-slate-300">|</span> <Clock size={14} className="text-indigo-500"/> {a.time}</div></td>
                              <td className="p-5"><Badge status={a.status}/></td>
                              <td className="p-5">
                                <div className="flex gap-2">
                                {a.status === 'Scheduled' && (
                                  <>
                                    <button onClick={() => updateStatus(a.id, 'Completed')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Complete"><CheckCircle size={18}/></button>
                                    <button onClick={() => updateStatus(a.id, 'Cancelled')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel"><XCircle size={18}/></button>
                                    <button onClick={async () => { const prep = await callGemini(`Prep instructions for ${a.reason} with ${a.doctorSpecialty}. List 3 bullet points.`); alert(prep); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="AI Prep"><ClipboardList size={18}/></button>
                                  </>
                                )}
                                {a.status === 'Pending Payment' && <button onClick={() => setView('billing')} className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-amber-100"><DollarSign size={14}/> Pay Now</button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </Card>
               </div>
            )}

            {/* Billing + AI Explainer */}
            {view === 'billing' && (
               <div className="space-y-8">
                 <div className="flex justify-between items-center">
                   <div><h2 className="text-2xl font-bold text-slate-800">Billing & Invoices</h2><p className="text-slate-500 text-sm">Track payments and revenue</p></div>
                   {appUser.role === 'Admin' && <Button onClick={() => setShowInvoiceModal(true)}><Plus size={18}/> Create Invoice</Button>}
                 </div>
                 <div className="grid gap-4">
                    {invoices.map(inv => (
                      <Card key={inv.id} className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-none shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-5 w-full md:w-auto">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${inv.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><FileText size={24} /></div>
                          <div>
                              <h4 className="font-bold text-slate-800 text-lg">{inv.patientName}</h4>
                              <p className="text-sm text-slate-500">{inv.description}</p>
                              <button onClick={async () => { const exp = await callGemini(`Explain medical charge: "${inv.description}" costing $${inv.amount} in simple terms.`); alert(exp); }} className="text-xs text-indigo-500 flex items-center gap-1 mt-1 hover:underline"><FileQuestion size={12}/> Explain Charge</button>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right"><div className="font-bold text-xl text-slate-800">${inv.amount}</div><div className="text-xs text-gray-400">{inv.date}</div></div>
                          <Badge status={inv.status}/>
                          {inv.status === 'Pending' && appUser.role === 'Admin' && (
                            <button onClick={() => setPaymentModalData(inv)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5"><CreditCard size={16}/> Process</button>
                          )}
                        </div>
                      </Card>
                    ))}
                 </div>
               </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showPatientModal && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><Card className="w-full max-w-md p-8 shadow-2xl"><div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Add Patient</h3><button onClick={() => setShowPatientModal(false)}><X size={20} className="text-slate-400"/></button></div><form onSubmit={handleAddPatient} className="space-y-4"><input placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} required /><div className="flex gap-4"><input type="number" placeholder="Age" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} required /><select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value})}><option>Male</option><option>Female</option></select></div><input placeholder="Condition" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newPatient.condition} onChange={e => setNewPatient({...newPatient, condition: e.target.value})} /><button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Save Patient</button></form></Card></div>}
      {showDoctorModal && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><Card className="w-full max-w-md p-8 shadow-2xl"><div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Add Doctor</h3><button onClick={() => setShowDoctorModal(false)}><X size={20} className="text-slate-400"/></button></div><form onSubmit={handleAddDoctor} className="space-y-4"><input placeholder="Name (e.g. Dr. Smith)" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} required /><select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newDoctor.specialty} onChange={e => setNewDoctor({...newDoctor, specialty: e.target.value})}><option value="">Select Specialty</option><option>Cardiology</option><option>Neurology</option><option>Orthopedics</option><option>Pediatrics</option><option>Dermatology</option><option>General Medicine</option></select><input placeholder="Email Address" type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} required /><button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Save Doctor</button></form></Card></div>}
      {showApptModal && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><Card className="w-full max-w-md p-8 shadow-2xl"><div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Book Appointment</h3><button onClick={() => setShowApptModal(false)}><X size={20} className="text-slate-400"/></button></div><form onSubmit={handleAddAppt} className="space-y-4"><select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newAppt.patientId} onChange={e => setNewAppt({...newAppt, patientId: e.target.value})} required><option value="">Select Patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><div className="flex gap-2"><input placeholder="Reason" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newAppt.reason} onChange={e => setNewAppt({...newAppt, reason: e.target.value})} /><button type="button" onClick={async () => { if(!newAppt.reason) return; const btn = document.getElementById('ai-triage-btn'); btn.innerText = "..."; const prompt = `Triage: "${newAppt.reason}". Pick 1: Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, General Medicine. Only output specialty name.`; const spec = await callGemini(prompt); const matched = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'General Medicine'].find(s => spec.includes(s)); if(matched) { const doc = doctors.find(d => d.specialty === matched); if(doc) setNewAppt(prev => ({...prev, doctorId: doc.id})); alert(`Recommended: ${matched}`); } btn.innerText = "✨"; }} id="ai-triage-btn" className="px-4 bg-indigo-100 text-indigo-600 rounded-xl"><Sparkles size={18}/></button></div><select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newAppt.doctorId} onChange={e => setNewAppt({...newAppt, doctorId: e.target.value})} required><option value="">Select Doctor</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.name} - {d.specialty}</option>)}</select><div className="flex gap-4"><input type="date" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newAppt.date} onChange={e => setNewAppt({...newAppt, date: e.target.value})} required /><input type="time" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} required /></div><div className="bg-slate-50 p-3 rounded-xl"><label className="text-xs font-bold text-slate-400 uppercase block mb-1">Fee ($)</label><input type="number" className="w-full bg-transparent outline-none font-bold text-slate-800" value={newAppt.consultationFee} onChange={e => setNewAppt({...newAppt, consultationFee: e.target.value})} required /></div><button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Confirm Booking</button></form></Card></div>}
      {paymentModalData && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><Card className="w-full max-w-sm p-8 text-center shadow-2xl"><div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Verify Payment</h3><button onClick={() => setPaymentModalData(null)}><X size={20} className="text-slate-400"/></button></div><p className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Total Amount</p><p className="text-4xl font-bold text-slate-900 mb-8">${paymentModalData.amount}</p><div className="grid grid-cols-2 gap-4"><button onClick={() => processPayment(false)} className="flex items-center justify-center gap-2 px-4 py-3 border border-red-200 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"><ThumbsDown size={18}/> Fail</button><button onClick={() => processPayment(true)} className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-colors"><ThumbsUp size={18}/> Verify</button></div></Card></div>}
      {showInvoiceModal && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><Card className="w-full max-w-md p-8 shadow-2xl"><div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Create Invoice</h3><button onClick={() => setShowInvoiceModal(false)}><X size={20} className="text-slate-400"/></button></div><form onSubmit={handleCreateInvoice} className="space-y-4"><select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newInvoice.patientId} onChange={e => setNewInvoice({...newInvoice, patientId: e.target.value})}><option value="">Select Patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" placeholder="Amount ($)" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} required /><input placeholder="Description" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500" value={newInvoice.description} onChange={e => setNewInvoice({...newInvoice, description: e.target.value})} required /><button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Issue Invoice</button></form></Card></div>}
    </div>
  );
}