import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 你的設定 (從 Firebase Console -> Project Settings -> General -> Your apps 複製)
const firebaseConfig = {
  apiKey: "AIzaSyDIfS5uJ3MoM2zv3isMxhfWL__63GC8Uh0",
  authDomain: "ai-teacher-lms.firebaseapp.com",
  projectId: "ai-teacher-lms",
  storageBucket: "ai-teacher-lms.firebasestorage.app",
  messagingSenderId: "537394466944",
  appId: "1:537394466944:web:238c67c407f0f8f538d665"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);