// src/app/page.js
"use client"; // 重要！這行告訴 Next.js 這是要在瀏覽器執行的元件 (因為我們要用 useState)

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "./firebase"; // 引入我們剛剛設定好的資料庫
import { collection, getDocs } from "firebase/firestore";

export default function Home() {
  // 1. 定義一個變數來存影片資料，預設是空陣列 []
  const [videos, setVideos] = useState([]);

  // 2. 這是一個 "副作用" 函數，網頁一載入就會執行裡面的程式
  useEffect(() => {
    async function fetchData() {
      // 去資料庫找叫做 'videos' 的集合
      const querySnapshot = await getDocs(collection(db, "videos"));
      
      // 把抓回來的資料轉換成我們好讀的格式 (加上 id)
      const videoList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log("從 Firebase 抓到的資料:", videoList); // 你可以在瀏覽器 Console 看到它
      setVideos(videoList); // 把資料存進變數，網頁就會自動更新
    }

    fetchData();
  }, []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
        AI 工具學習平台
      </h1>

      {/* 這裡是網格佈局，類似 adl.edu.tw 的卡片排列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 把 videos 陣列裡的每一筆資料拿出來跑迴圈 */}
        {videos.map((video) => (
          <div key={video.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition">
            <h2 className="text-xl font-bold mb-2">{video.title}</h2>
            <p className="text-gray-600 mb-4">{video.description}</p>
            {/* 這裡之後會做成連結，點了跳去觀看頁 */}
            <Link href={`/watch/${video.id}`}>
              <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                開始學習
              </button>
            </Link>
          </div>
        ))}
        
      </div>
      <footer className="mt-20 py-10 text-center text-gray-300 text-sm">
        <p>© 2026 AI Learning Platform</p>
        
        {/* 只有把滑鼠移上去才會變色的隱藏連結 */}
        <Link href="/admin" className="opacity-0 hover:opacity-100 transition-opacity duration-500 mt-2 inline-block">
          Admin Portal
        </Link>
      </footer>
    </div>
  );
}