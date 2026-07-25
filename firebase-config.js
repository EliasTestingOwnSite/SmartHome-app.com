const firebaseConfig = {
  apiKey: "AIzaSyDowmuB23zolMRHiXgJTPsrpOnpZmkDyao",
  authDomain: "smarthome-app-b12a0.firebaseapp.com",
  projectId: "smarthome-app-b12a0",
  storageBucket: "smarthome-app-b12a0.firebasestorage.app",
  messagingSenderId: "117782642337",
  appId: "1:117782642337:web:a9f5566834c08dfdb3bae0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
