"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/app/firebase"; 
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function WatchPage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [quizzes, setQuizzes] = useState([]); // 存題目
  const [userAnswers, setUserAnswers] = useState({}); // 存使用者的答案 {題目ID: 選項Index}
  const [result, setResult] = useState(null); // 存分析結果

  // 1. 抓取資料 (影片 + 題目)
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      // A. 抓影片
      const videoDoc = await getDoc(doc(db, "videos", id));
      if (videoDoc.exists()) setVideo(videoDoc.data());

      // B. 抓題目 (使用 where 查詢跟這部影片有關的題目)
      const q = query(collection(db, "quizzes"), where("videoId", "==", id));
      const querySnapshot = await getDocs(q);
      const quizList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuizzes(quizList);
    };

    fetchData();
  }, [id]);

  // 2. 處理使用者選擇答案
  const handleSelect = (quizId, optionIndex) => {
    setUserAnswers(prev => ({
      ...prev,
      [quizId]: optionIndex
    }));
  };

  // 3. 核心功能：提交並分析
  // 3. 核心功能：提交並分析 (含 Local Storage 儲存功能)
  const handleSubmit = () => {
    let score = 0;
    let wrongTags = {};

    quizzes.forEach(quiz => {
      const userAns = userAnswers[quiz.id];
      if (userAns === quiz.correctAnswer) {
        score++;
      } else {
        if (quiz.tag) {
          wrongTags[quiz.tag] = (wrongTags[quiz.tag] || 0) + 1;
        }
      }
    });

    // 找出錯最多的 tag
    let weakestTag = null;
    let maxErrors = 0;
    for (const [tag, count] of Object.entries(wrongTags)) {
      if (count > maxErrors) {
        maxErrors = count;
        weakestTag = tag;
      }
    }

    const finalResult = {
      score,
      total: quizzes.length,
      weakness: weakestTag
    };

    setResult(finalResult);

    // --- 新增：將成績存入 Local Storage ---
    // 資料結構設計：用一個大物件 'learning_records' 存所有影片進度
    // 格式： { "video_id_A": { score: 2, passed: true }, "video_id_B": ... }
    try {
      const storageKey = "learning_records";
      const currentData = JSON.parse(localStorage.getItem(storageKey) || "{}");
      
      currentData[id] = { // 使用影片 ID 當 key
        score: score,
        total: quizzes.length,
        passed: score === quizzes.length, // 全對才算通過，或者你自己定義及格線
        date: new Date().toISOString()
      };

      localStorage.setItem(storageKey, JSON.stringify(currentData));
      console.log("進度已儲存", currentData);
    } catch (e) {
      console.error("Local Storage 寫入失敗", e);
    }
    // -------------------------------------
  };

  if (!video) return <div className="p-10 text-black">載入中...</div>;

  return (
    <div className="p-8 min-h-screen bg-white text-black">
      <Link href="/" className="text-blue-600 mb-4 inline-block hover:underline">
        ← 回首頁
      </Link>
      
      {/* 影片區塊 */}
      <h1 className="text-3xl font-bold mb-4">{video.title}</h1>
      <div className="aspect-video w-full bg-black mb-8 rounded-lg overflow-hidden shadow-lg">
        <iframe 
          width="100%" 
          height="100%" 
          src={video.video_url} 
          title="Video player"
          className="border-none"
        ></iframe>
      </div>
      
      <div className="bg-gray-100 p-6 rounded-lg mb-12">
        <h3 className="text-xl font-bold mb-2">課程說明</h3>
        <p className="text-gray-700">{video.description}</p>
      </div>

      {/* 測驗區塊 */}
      {quizzes.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 border-l-4 border-blue-500 pl-4">
            課後小測驗
          </h2>
          
          <div className="space-y-8">
            {quizzes.map((quiz, index) => (
              <div key={quiz.id} className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                <p className="font-medium text-lg mb-4">
                  {index + 1}. {quiz.question}
                </p>
                <div className="space-y-2">
                  {quiz.options.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => handleSelect(quiz.id, optIndex)}
                      className={`w-full text-left p-3 rounded transition-colors ${
                        userAnswers[quiz.id] === optIndex 
                          ? "bg-blue-100 border-2 border-blue-500 text-blue-900" 
                          : "bg-gray-50 hover:bg-gray-100 border border-transparent"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                
                {/* 如果已經交卷，顯示解析 */}
                {result && (
                  <div className={`mt-4 p-3 rounded text-sm ${
                    userAnswers[quiz.id] === quiz.correctAnswer 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {userAnswers[quiz.id] === quiz.correctAnswer ? "✅ 答對了！" : `❌ 答錯了，正確答案是：${quiz.options[quiz.correctAnswer]}`}
                    <p className="mt-1 text-gray-600">💡 解析：{quiz.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 提交按鈕與結果分析 */}
          <div className="mt-8 text-center">
            {!result ? (
              <button 
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-bold hover:bg-blue-700 transition shadow-lg"
              >
                提交答案
              </button>
            ) : (
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 inline-block text-left">
                <h3 className="text-2xl font-bold text-blue-800 mb-2">
                  測驗結果: {result.score} / {result.total}
                </h3>
                {result.weakness ? (
                  <p className="text-lg text-red-600 font-medium">
                    ⚠️ 系統分析：你在「{result.weakness}」相關的概念比較薄弱，建議重新複習影片中段部分。
                  </p>
                ) : (
                  <p className="text-lg text-green-600 font-medium">
                    🎉 太棒了！你已經完全掌握本章節的重點。
                  </p>
                )}
                <button 
                  onClick={() => { setResult(null); setUserAnswers({}); }}
                  className="mt-4 text-blue-500 underline hover:text-blue-700"
                >
                  重新測驗
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}