"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase"; // 或者是 "../firebase"
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function Home() {
  const [videos, setVideos] = useState([]);
  // 新增：用來存學習紀錄的狀態
  const [progress, setProgress] = useState({});

  useEffect(() => {
    async function fetchData() {
      // 1. 抓影片資料 (原本的邏輯)
      const querySnapshot = await getDocs(collection(db, "videos"));
      const videoList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVideos(videoList);

      // 2. 新增：抓取 Local Storage 的學習紀錄
      // 為什麼要包在 try-catch？因為在 Next.js Server Side Rendering 時 localStorage 不存在
      try {
        const savedProgress = JSON.parse(localStorage.getItem("learning_records") || "{}");
        setProgress(savedProgress);
      } catch (e) {
        console.log("無法讀取進度");
      }
    }

    fetchData();
  }, []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
        AI 工具學習平台
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          // 檢查這部影片有沒有紀錄
          const record = progress[video.id];
          
          return (
            <div key={video.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition relative overflow-hidden">
              
              {/* --- 新增：如果已完成，顯示一個漂亮的標籤 --- */}
              {record && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  {record.passed ? "✅ 已完課" : `📝 ${record.score}/${record.total} 分`}
                </div>
              )}
              {/* ------------------------------------------ */}

              <h2 className="text-xl font-bold mb-2 pr-6">{video.title}</h2>
              <p className="text-gray-600 mb-4 line-clamp-2">{video.description}</p>
              
              <Link href={`/watch/${video.id}`}>
                <button className={`w-full px-4 py-2 rounded text-white transition ${
                  record ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-600'
                }`}>
                  {record ? "再次複習" : "開始學習"}
                </button>
              </Link>
            </div>
          );
        })}
      </div>
      
      {/* Footer 區塊 (保持你原本的) */}
      <footer className="mt-20 py-10 text-center text-gray-300 text-sm">
        <p>© 2026 AI Learning Platform</p>
        <Link href="/admin" className="opacity-0 hover:opacity-100 transition-opacity duration-500 mt-2 inline-block">
          Admin Portal
        </Link>
      </footer>
    </div>
  );
}