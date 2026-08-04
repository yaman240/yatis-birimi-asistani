import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig={
  apiKey:"AIzaSyDvAPSMf__Z1qGDezD5V5cagV0t1tDybTU",
  authDomain:"yatis-birim-asistani.firebaseapp.com",
  projectId:"yatis-birim-asistani",
  storageBucket:"yatis-birim-asistani.firebasestorage.app",
  messagingSenderId:"366593697008",
  appId:"1:366593697008:web:68c029a33edf9fc7490e35"
};

const app=initializeApp(firebaseConfig);
export const db=getFirestore(app);
export const auth=getAuth(app);
export const googleProvider=new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt:"select_account"});
