"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/firebase";
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where, writeBatch } from "firebase/firestore";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 資料讀取區 ---
  const fetchVideos = async () => {
    const querySnapshot = await getDocs(collection(db, "videos"));
    const videoList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setVideos(videoList);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // ==============================
  // 分頁 1: 影片管理邏輯
  // ==============================
  const [editVideoId, setEditVideoId] = useState(null); // 追蹤正在編輯哪個影片
  const [videoForm, setVideoForm] = useState({
    title: "",
    video_url: "",
    description: ""
  });

  // 進入編輯模式：把資料填回表單
  const handleEditVideoStart = (video) => {
    setEditVideoId(video.id);
    setVideoForm({
      title: video.title,
      video_url: video.video_url,
      description: video.description
    });
  };

  // 取消編輯
  const handleCancelEditVideo = () => {
    setEditVideoId(null);
    setVideoForm({ title: "", video_url: "", description: "" });
  };

  const handleSubmitVideo = async (e) => {
    e.preventDefault();
    if(!videoForm.title || !videoForm.video_url) return alert("標題和連結必填");
    
    setLoading(true);
    try {
      if (editVideoId) {
        // --- 更新模式 ---
        const videoRef = doc(db, "videos", editVideoId);
        await updateDoc(videoRef, videoForm);
        alert("✅ 影片更新成功！");
      } else {
        // --- 新增模式 ---
        await addDoc(collection(db, "videos"), videoForm);
        alert("✅ 影片新增成功！");
      }
      
      // 重置表單
      handleCancelEditVideo(); 
      fetchVideos();
    } catch (error) {
      console.error(error);
      alert("❌ 操作失敗");
    }
    setLoading(false);
  };

  const handleDeleteVideo = async (id) => {
    // 1. 為了讓使用者安心，我們先查詢有多少題目會被影響
    setLoading(true);
    const q = query(collection(db, "quizzes"), where("videoId", "==", id));
    const snapshot = await getDocs(q);
    const quizCount = snapshot.size; // 取得題目數量

    // 2. 顯示清楚的確認視窗 (UX 優化)
    const confirmMessage = quizCount > 0 
      ? `確定要刪除這部影片嗎？\n\n⚠️ 系統檢測到這部影片包含 ${quizCount} 個題目，它們也將一併被永久刪除！`
      : "確定要刪除這部影片嗎？";

    if (!confirm(confirmMessage)) {
      setLoading(false);
      return;
    }

    try {
      // 3. 建立一個批次處理物件 (Batch)
      const batch = writeBatch(db);

      // 步驟 A: 把「刪除影片」的指令加入批次
      const videoRef = doc(db, "videos", id);
      batch.delete(videoRef);

      // 步驟 B: 把該影片所有「刪除題目」的指令加入批次
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 4. 一次性提交所有變更 (Commit)
      await batch.commit();

      alert(`✅ 刪除成功！影片與 ${quizCount} 個相關題目已清除乾淨。`);
      
      // 5. 畫面重整
      fetchVideos();
      // 如果剛好正在看這部影片的題目，也要清空下方顯示
      if (currentVideoId === id) {
        setCurrentVideoId("");
        setCurrentQuizzes([]);
      }

    } catch (error) {
      console.error(error);
      alert("❌ 刪除失敗，請檢查網路連線");
    }
    setLoading(false);
  };

  // ==============================
  // 分頁 2: 題目管理邏輯
  // ==============================
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [currentQuizzes, setCurrentQuizzes] = useState([]);
  const [editQuizId, setEditQuizId] = useState(null); // 追蹤正在編輯哪個題目

  const [quizForm, setQuizForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    tag: "",
    explanation: ""
  });

  // 載入該影片的題目
  useEffect(() => {
    if (!currentVideoId) return;
    fetchQuizzes(currentVideoId);
  }, [currentVideoId]);

  const fetchQuizzes = async (videoId) => {
    const q = query(collection(db, "quizzes"), where("videoId", "==", videoId));
    const querySnapshot = await getDocs(q);
    const quizList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCurrentQuizzes(quizList);
  };

  // 進入題目編輯模式
  const handleEditQuizStart = (quiz) => {
    setEditQuizId(quiz.id);
    setQuizForm({
      question: quiz.question,
      options: [...quiz.options], // 複製陣列，避免傳參考問題
      correctAnswer: quiz.correctAnswer,
      tag: quiz.tag,
      explanation: quiz.explanation
    });
  };

  const handleCancelEditQuiz = () => {
    setEditQuizId(null);
    setQuizForm({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      tag: "",
      explanation: ""
    });
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        videoId: currentVideoId,
        ...quizForm,
        correctAnswer: Number(quizForm.correctAnswer)
      };

      if (editQuizId) {
        // --- 更新模式 ---
        await updateDoc(doc(db, "quizzes", editQuizId), payload);
        alert("✅ 題目更新成功！");
      } else {
        // --- 新增模式 ---
        await addDoc(collection(db, "quizzes"), payload);
        alert("✅ 題目新增成功！");
      }

      handleCancelEditQuiz();
      fetchQuizzes(currentVideoId);
    } catch (error) {
      console.error(error);
      alert("操作失敗");
    }
    setLoading(false);
  };

  const handleDeleteQuiz = async (id) => {
    if(!confirm("確定刪除這題？")) return;
    try {
      await deleteDoc(doc(db, "quizzes", id));
      fetchQuizzes(currentVideoId);
    } catch (error) {
      alert("刪除失敗");
    }
  };

  // 處理表單輸入
  const handleQuizChange = (e) => {
    const { name, value } = e.target;
    setQuizForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...quizForm.options];
    newOptions[index] = value;
    setQuizForm(prev => ({ ...prev, options: newOptions }));
  };

  // ==============================
  // UI 渲染區
  // ==============================
  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        
        {/* 分頁 Tab */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-4 text-center font-bold ${activeTab === 'videos' ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('videos')}
          >
            📺 影片管理
          </button>
          <button 
            className={`flex-1 py-4 text-center font-bold ${activeTab === 'quizzes' ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('quizzes')}
          >
            📝 題目管理
          </button>
        </div>

        <div className="p-8">
          {/* --- 分頁內容：影片管理 --- */}
          {activeTab === 'videos' && (
            <div className="space-y-8">
              {/* 影片表單 (新增/編輯共用) */}
              <div className={`p-6 rounded-lg border ${editVideoId ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-xl font-bold ${editVideoId ? 'text-yellow-800' : 'text-blue-800'}`}>
                    {editVideoId ? "編輯影片模式" : "新增影片"}
                  </h2>
                  {editVideoId && (
                    <button onClick={handleCancelEditVideo} className="text-sm text-gray-500 underline">取消編輯</button>
                  )}
                </div>
                
                <form onSubmit={handleSubmitVideo} className="space-y-4">
                  <input 
                    className="w-full p-2 border rounded" 
                    placeholder="影片標題" 
                    value={videoForm.title}
                    onChange={e => setVideoForm({...videoForm, title: e.target.value})}
                  />
                  <input 
                    className="w-full p-2 border rounded" 
                    placeholder="YouTube Embed 網址" 
                    value={videoForm.video_url}
                    onChange={e => setVideoForm({...videoForm, video_url: e.target.value})}
                  />
                  <textarea 
                    className="w-full p-2 border rounded" 
                    placeholder="影片說明" 
                    value={videoForm.description}
                    onChange={e => setVideoForm({...videoForm, description: e.target.value})}
                  />
                  <button 
                    disabled={loading} 
                    className={`w-full text-white px-4 py-2 rounded hover:opacity-90 ${editVideoId ? 'bg-yellow-600' : 'bg-blue-600'}`}
                  >
                    {loading ? "處理中..." : (editVideoId ? "更新影片資訊" : "新增影片")}
                  </button>
                </form>
              </div>

              {/* 影片列表 */}
              <div>
                <h2 className="text-xl font-bold mb-4">現有影片列表</h2>
                <div className="space-y-3">
                  {videos.map(video => (
                    <div key={video.id} className="flex justify-between items-center p-4 border rounded hover:bg-gray-50">
                      <div>
                        <p className="font-bold">{video.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-md">{video.video_url}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditVideoStart(video)}
                          className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded hover:bg-yellow-100 border border-yellow-200"
                        >
                          編輯
                        </button>
                        <button 
                          onClick={() => handleDeleteVideo(video.id)}
                          className="bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 border border-red-200"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- 分頁內容：題目管理 --- */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <div>
                <label className="block font-bold mb-2">請先選擇要管理的影片：</label>
                <select 
                  className="w-full p-3 border rounded bg-white"
                  value={currentVideoId}
                  onChange={(e) => {
                    setCurrentVideoId(e.target.value);
                    handleCancelEditQuiz(); // 切換影片時重置編輯狀態
                  }}
                >
                  <option value="">-- 請選擇 --</option>
                  {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
              </div>

              {currentVideoId && (
                <>
                  {/* 題目表單 (新增/編輯共用) */}
                  <div className={`p-6 rounded-lg border ${editQuizId ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className={`font-bold ${editQuizId ? 'text-yellow-800' : 'text-green-800'}`}>
                        {editQuizId ? "編輯題目模式" : "新增題目"}
                      </h3>
                      {editQuizId && (
                        <button onClick={handleCancelEditQuiz} className="text-sm text-gray-500 underline">取消編輯</button>
                      )}
                    </div>

                    <form onSubmit={handleSubmitQuiz} className="space-y-4">
                      <input 
                        name="question"
                        value={quizForm.question}
                        onChange={handleQuizChange}
                        className="w-full p-2 border rounded" 
                        placeholder="輸入問題..." 
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {quizForm.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center">
                            <input 
                              type="radio" 
                              name="correctAnswer" 
                              value={idx} 
                              checked={Number(quizForm.correctAnswer) === idx} 
                              onChange={handleQuizChange}
                              className="mr-2"
                            />
                            <input 
                              value={opt} 
                              onChange={(e) => handleOptionChange(idx, e.target.value)}
                              className="w-full p-2 border rounded text-sm" 
                              placeholder={`選項 ${idx+1}`} 
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          name="tag"
                          value={quizForm.tag}
                          onChange={handleQuizChange}
                          className="w-1/3 p-2 border rounded" 
                          placeholder="標籤 (Tag)" 
                        />
                        <input 
                          name="explanation"
                          value={quizForm.explanation}
                          onChange={handleQuizChange}
                          className="w-2/3 p-2 border rounded" 
                          placeholder="解析" 
                        />
                      </div>
                      <button 
                        disabled={loading} 
                        className={`w-full text-white px-4 py-2 rounded hover:opacity-90 ${editQuizId ? 'bg-yellow-600' : 'bg-green-600'}`}
                      >
                        {loading ? "處理中..." : (editQuizId ? "更新題目" : "新增題目")}
                      </button>
                    </form>
                  </div>

                  {/* 題目列表 */}
                  <div>
                    <h3 className="font-bold mb-2">本影片現有題目 ({currentQuizzes.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {currentQuizzes.map((quiz, idx) => (
                        <div key={quiz.id} className="p-3 border rounded flex justify-between items-start hover:bg-gray-50">
                          <div>
                            <span className="font-bold text-gray-500 mr-2">Q{idx+1}.</span>
                            <span>{quiz.question}</span>
                            <div className="text-xs text-gray-400 mt-1">Tag: {quiz.tag}</div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditQuizStart(quiz)}
                              className="text-yellow-600 hover:text-yellow-800 text-sm font-bold"
                            >
                              編輯
                            </button>
                            <button 
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="text-red-500 hover:text-red-700 text-sm font-bold"
                            >
                              刪除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}