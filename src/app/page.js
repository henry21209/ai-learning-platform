"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/firebase";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState({});
  
  // --- 新增：搜尋關鍵字狀態 ---
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchData() {
      const querySnapshot = await getDocs(collection(db, "videos"));
      const videoList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVideos(videoList);

      try {
        const savedProgress = JSON.parse(localStorage.getItem("learning_records") || "{}");
        setProgress(savedProgress);
      } catch (e) {
        console.log("無法讀取進度");
      }
    }
    fetchData();
  }, []);

  // --- 新增：篩選邏輯 ---
  // 這段程式碼會根據 searchTerm 過濾影片
  // 只要標題 (title) 或 說明 (description) 包含關鍵字，就會留下來
  const filteredVideos = videos.filter(video => {
    const term = searchTerm.toLowerCase();
    const title = video.title?.toLowerCase() || "";
    const desc = video.description?.toLowerCase() || "";
    return title.includes(term) || desc.includes(term);
  });

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
        AI 工具學習平台
      </h1>

      {/* --- 新增：搜尋框 UI --- */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 搜尋課程名稱或關鍵字..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 pl-12 rounded-full border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {/* 如果有輸入文字，顯示一個小 X 按鈕可以清空 */}
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {/* 顯示搜尋結果數量 */}
        <p className="text-center text-sm text-gray-500 mt-2">
          找到 {filteredVideos.length} 堂相關課程
        </p>
      </div>
      {/* ----------------------- */}

      {/* 這裡改成顯示 filteredVideos */}
      {filteredVideos.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-xl">👻 找不到相關課程</p>
          <button onClick={() => setSearchTerm("")} className="text-blue-500 underline mt-2">清除搜尋</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => { // 注意這裡改成 filteredVideos
            const record = progress[video.id];
            
            return (
              <div key={video.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition relative overflow-hidden">
                
                {record && (
                  <div className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg ${record.passed ? 'bg-green-500' : 'bg-yellow-500'}`}>
                    {record.passed ? "✅ 已完課" : `📝 ${record.score}/${record.total} 分`}
                  </div>
                )}

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
      )}
      
      <footer className="mt-20 py-10 text-center text-gray-300 text-sm">
        <p>© 2026 AI Learning Platform</p>
        <Link href="/admin" className="opacity-0 hover:opacity-100 transition-opacity duration-500 mt-2 inline-block">
          Admin Portal
        </Link>
      </footer>
    </div>
  );
}