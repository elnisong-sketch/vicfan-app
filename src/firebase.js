import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyExample-reemplazar-con-tu-config",
  authDomain: "vicfan-app.firebaseapp.com",
  projectId: "vicfan-app",
  storageBucket: "vicfan-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000000000000000"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
