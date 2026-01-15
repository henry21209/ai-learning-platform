"use client";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where, writeBatch } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";

export default function AdminPage() {
  // --- Auth States ---
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Admin Logic States ---
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Video Management States
  const [editVideoId, setEditVideoId] = useState(null);
  const [videoForm, setVideoForm] = useState({ title: "", video_url: "", description: "" });

  // Quiz Management States
  const [currentVideoId, setCurrentVideoId] = useState("");
  const [currentQuizzes, setCurrentQuizzes] = useState([]);
  const [editQuizId, setEditQuizId] = useState(null);
  const [quizForm, setQuizForm] = useState({ 
    question: "", options: ["", "", "", ""], correctAnswer: 0, tag: "", explanation: "" 
  });

  // 1. 監聽登入與權限檢查
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 檢查白名單
        const q = query(collection(db, "admins"), where("email", "==", currentUser.email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setIsAdmin(true);
          fetchVideos(); // 登入成功且是管理員，才去抓影片資料
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setVideos([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auth Functions
  const handleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    window.location.reload(); // 重新整理頁面確保狀態清空
  };

  // --- Data Logic ---
  const fetchVideos = async () => {
    const querySnapshot = await getDocs(collection(db, "videos"));
    const videoList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setVideos(videoList);
  };

  // Video Handlers
  const handleEditVideoStart = (video) => {
    setEditVideoId(video.id);
    setVideoForm({ title: video.title, video_url: video.video_url, description: video.description });
  };

  const handleCancelEditVideo = () => {
    setEditVideoId(null);
    setVideoForm({ title: "", video_url: "", description: "" });
  };

  const handleSubmitVideo = async (e) => {
    e.preventDefault();
    if(!videoForm.title || !videoForm.video_url) return alert("必填欄位為空");
    setLoading(true);
    try {
      if (editVideoId) {
        await updateDoc(doc(db, "videos", editVideoId), videoForm);
        alert("✅ 更新成功");
      } else {
        await addDoc(collection(db, "videos"), videoForm);
        alert("✅ 新增成功");
      }
      handleCancelEditVideo();
      fetchVideos();
    } catch (error) { alert("操作失敗"); }
    setLoading(false);
  };

  const handleDeleteVideo = async (id) => {
    setLoading(true);
    const q = query(collection(db, "quizzes"), where("videoId", "==", id));
    const snapshot = await getDocs(q);
    const quizCount = snapshot.size;
    const confirmMessage = quizCount > 0 
      ? `⚠️ 警告：這部影片含有 ${quizCount} 個題目，刪除影片將連同題目一起永久刪除！\n確定要刪除嗎？`
      : "確定要刪除這部影片嗎？";

    if (!confirm(confirmMessage)) { setLoading(false); return; }

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "videos", id));
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      alert("🗑️ 刪除成功");
      fetchVideos();
      if (currentVideoId === id) { setCurrentVideoId(""); setCurrentQuizzes([]); }
    } catch (error) { alert("刪除失敗"); }
    setLoading(false);
  };

  // Quiz Handlers
  useEffect(() => {
    if (!currentVideoId) return;
    fetchQuizzes(currentVideoId);
  }, [currentVideoId]);

  const fetchQuizzes = async (videoId) => {
    const q = query(collection(db, "quizzes"), where("videoId", "==", videoId));
    const querySnapshot = await getDocs(q);
    setCurrentQuizzes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleEditQuizStart = (quiz) => {
    setEditQuizId(quiz.id);
    setQuizForm({ ...quiz, options: [...quiz.options] }); // Copy options
  };

  const handleCancelEditQuiz = () => {
    setEditQuizId(null);
    setQuizForm({ question: "", options: ["", "", "", ""], correctAnswer: 0, tag: "", explanation: "" });
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { videoId: currentVideoId, ...quizForm, correctAnswer: Number(quizForm.correctAnswer) };
      if (editQuizId) {
        await updateDoc(doc(db, "quizzes", editQuizId), payload);
      } else {
        await addDoc(collection(db, "quizzes"), payload);
      }
      handleCancelEditQuiz();
      fetchQuizzes(currentVideoId);
      alert("✅ 成功");
    } catch (error) { alert("失敗"); }
    setLoading(false);
  };

  const handleDeleteQuiz = async (id) => {
    if(!confirm("確定刪除此題？")) return;
    try {
      await deleteDoc(doc(db, "quizzes", id));
      fetchQuizzes(currentVideoId);
    } catch (e) { alert("失敗"); }
  };

  // Form Field Handlers
  const handleQuizChange = (e) => setQuizForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleOptionChange = (idx, val) => {
    const newOpts = [...quizForm.options]; newOpts[idx] = val; setQuizForm(prev => ({ ...prev, options: newOpts }));
  };

  // --- Views ---
  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-black">驗證中...</div>;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-6 text-black">管理員後台</h1>
        <button onClick={handleLogin} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-md">
           G  使用 Google 帳號登入
        </button>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-black">
      <h1 className="text-2xl font-bold text-red-600 mb-2">⛔ 存取被拒</h1>
      <p className="mb-4 text-gray-600">帳號 {user.email} 未被授權</p>
      <button onClick={handleLogout} className="text-blue-500 underline">登出</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
            {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-full" />}
            <span className="font-bold text-gray-700">{user.displayName} (管理員)</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 font-bold border border-red-200 px-3 py-1 rounded bg-white">登出</button>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b">
          <button className={`flex-1 py-4 font-bold ${activeTab==='videos'?'bg-blue-600 text-white':'bg-gray-50 hover:bg-gray-200'}`} onClick={()=>setActiveTab('videos')}>📺 影片管理</button>
          <button className={`flex-1 py-4 font-bold ${activeTab==='quizzes'?'bg-blue-600 text-white':'bg-gray-50 hover:bg-gray-200'}`} onClick={()=>setActiveTab('quizzes')}>📝 題目管理</button>
        </div>

        <div className="p-8">
          {activeTab === 'videos' && (
            <div className="space-y-8">
              <div className={`p-6 rounded-lg border ${editVideoId ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex justify-between mb-4">
                  <h2 className="font-bold text-lg">{editVideoId ? "編輯影片" : "新增影片"}</h2>
                  {editVideoId && <button onClick={handleCancelEditVideo} className="text-sm underline">取消</button>}
                </div>
                <form onSubmit={handleSubmitVideo} className="space-y-3">
                  <input className="w-full p-2 border rounded" placeholder="標題" value={videoForm.title} onChange={e=>setVideoForm({...videoForm, title:e.target.value})} />
                  <input className="w-full p-2 border rounded" placeholder="Embed URL" value={videoForm.video_url} onChange={e=>setVideoForm({...videoForm, video_url:e.target.value})} />
                  <textarea className="w-full p-2 border rounded" placeholder="說明" value={videoForm.description} onChange={e=>setVideoForm({...videoForm, description:e.target.value})} />
                  <button disabled={loading} className={`w-full text-white py-2 rounded ${editVideoId?'bg-yellow-600':'bg-blue-600'}`}>{loading?"處理中...":"送出"}</button>
                </form>
              </div>
              <div className="space-y-3">
                {videos.map(v => (
                  <div key={v.id} className="flex justify-between items-center p-4 border rounded hover:bg-gray-50">
                    <div><p className="font-bold">{v.title}</p><p className="text-xs text-gray-400">{v.video_url}</p></div>
                    <div className="flex gap-2">
                      <button onClick={()=>handleEditVideoStart(v)} className="text-yellow-600 font-bold text-sm">編輯</button>
                      <button onClick={()=>handleDeleteVideo(v.id)} className="text-red-600 font-bold text-sm">刪除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <div>
                <label className="font-bold mb-2 block">選擇影片：</label>
                <select className="w-full p-3 border rounded" value={currentVideoId} onChange={e=>{setCurrentVideoId(e.target.value); handleCancelEditQuiz();}}>
                  <option value="">-- 請選擇 --</option>
                  {videos.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
              </div>
              {currentVideoId && (
                <>
                  <div className={`p-6 rounded-lg border ${editQuizId ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex justify-between mb-4">
                      <h3 className="font-bold">{editQuizId?"編輯題目":"新增題目"}</h3>
                      {editQuizId && <button onClick={handleCancelEditQuiz} className="text-sm underline">取消</button>}
                    </div>
                    <form onSubmit={handleSubmitQuiz} className="space-y-3">
                      <input name="question" value={quizForm.question} onChange={handleQuizChange} className="w-full p-2 border rounded" placeholder="問題..." />
                      <div className="grid grid-cols-2 gap-2">
                        {quizForm.options.map((opt, i)=>(
                          <div key={i} className="flex items-center"><input type="radio" name="correctAnswer" value={i} checked={Number(quizForm.correctAnswer)===i} onChange={handleQuizChange} className="mr-2"/><input value={opt} onChange={e=>handleOptionChange(i, e.target.value)} className="w-full p-2 border rounded text-sm" placeholder={`選項${i+1}`}/></div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input name="tag" value={quizForm.tag} onChange={handleQuizChange} className="w-1/3 p-2 border rounded" placeholder="Tag"/>
                        <input name="explanation" value={quizForm.explanation} onChange={handleQuizChange} className="w-2/3 p-2 border rounded" placeholder="解析"/>
                      </div>
                      <button disabled={loading} className={`w-full text-white py-2 rounded ${editQuizId?'bg-yellow-600':'bg-green-600'}`}>{loading?"處理中...":"送出"}</button>
                    </form>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {currentQuizzes.map((q, i) => (
                      <div key={q.id} className="p-3 border rounded flex justify-between hover:bg-gray-50">
                        <div><span className="font-bold text-gray-500 mr-2">Q{i+1}.</span>{q.question}</div>
                        <div className="flex gap-2">
                           <button onClick={()=>handleEditQuizStart(q)} className="text-yellow-600 text-sm font-bold">編輯</button>
                           <button onClick={()=>handleDeleteQuiz(q.id)} className="text-red-500 text-sm font-bold">刪除</button>
                        </div>
                      </div>
                    ))}
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