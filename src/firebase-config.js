// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB1f3HFY9Wx7TORWsEbykmneWrjEyMfHSQ",
  authDomain: "quices-de-prof-luis.firebaseapp.com",
  projectId: "quices-de-prof-luis",
  storageBucket: "quices-de-prof-luis.firebasestorage.app",
  messagingSenderId: "660277386736",
  appId: "1:660277386736:web:54a766454e0e87dcd7d135",
  measurementId: "G-89XJHGZ1VY"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
const db = getFirestore(app);

export { db };