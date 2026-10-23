// js/firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyAj7TAfECOa134ykPeWhyEPcWcYi1RW_5s",
  authDomain: "solar-telemetry.firebaseapp.com",
  databaseURL: "https://solar-telemetry-default-rtdb.firebaseio.com",
  projectId: "solar-telemetry",
  storageBucket: "solar-telemetry.firebasestorage.app",
  messagingSenderId: "662460055753",
  appId: "1:662460055753:web:1ea5fb252acdec3f6f4d18"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
