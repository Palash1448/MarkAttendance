// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBI-wchnFmTp87uvr99_opokr4mIKrvUYQ",
  authDomain: "e-salary-c8614.firebaseapp.com",
  projectId: "e-salary-c8614",
  storageBucket: "e-salary-c8614.firebasestorage.app",
  messagingSenderId: "1070339127404",
  appId: "1:1070339127404:web:88b021a8bcbcf10c760049",
  measurementId: "G-ERRPSS2WXT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
