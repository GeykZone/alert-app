// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXdeKhNwhrW1qgiNjdvWFWtF2Zk7oSk7w",
  authDomain: "irms-2f0bb.firebaseapp.com",
  projectId: "irms-2f0bb",
  storageBucket: "irms-2f0bb.appspot.com",
  messagingSenderId: "60963607750",
  appId: "1:60963607750:web:90e4d5535cc8e21660f3c7",
  measurementId: "G-J7VTNTWYMT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);