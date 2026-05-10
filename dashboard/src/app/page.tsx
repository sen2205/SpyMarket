"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Trash2, Bell, Search, Settings2, Power, PowerOff, 
  RefreshCcw, Clock, ExternalLink, ChevronRight, AlertCircle,
  TrendingUp, Hash, Tag, DollarSign
} from "lucide-react";

type WatchSetting = {
  id: string;
  keyword_and: string;
  keyword_not: string | null;
  min_price: number;
  max_price: number;
  is_active: boolean;
};

type NotifiedItem = {
  item_id: string;
  title: string;
  url: string;
  price: number;
  setting_id: string;
  image_url: string | null;
  created_at: string;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"settings" | "history">("settings");
  const [settings, setSettings] = useState<WatchSetting[]>([]);
  const [notifiedItems, setNotifiedItems] = useState<NotifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedSettings, setExpandedSettings] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    keyword_and: "",
    keyword_not: "",
    min_price: 0,
    max_price: 100000,
  });

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchNotifiedItems();
    checkSubscription();
  }, []);

  async function checkSubscription() {
    if (typeof window !== "undefined" && 'serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    }
  }

  async function subscribeToPush() {
    setSubscriptionLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error("このブラウザはプッシュ通知をサポートしていません。");
      }

      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) throw new Error("VAPID public key is missing");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      const { error } = await supabase
        .from("push_subscriptions")
        .insert([{ subscription }]);

      if (error) throw error;
      
      setIsSubscribed(true);
      alert("通知が有効になりました！");
    } catch (err: any) {
      console.error("Push subscription failed:", err);
      alert(`通知の設定に失敗しました: ${err.message}`);
    } finally {
      setSubscriptionLoading(false);
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("watch_settings")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) console.error("Error fetching settings:", error);
    else setSettings(data || []);
    setLoading(false);
  }

  async function fetchNotifiedItems() {
    const { data, error } = await supabase
      .from("notified_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) console.error("Error fetching notified items:", error);
    else setNotifiedItems(data || []);
  }

  async function saveSetting() {
    const payload = {
      keyword_and: formData.keyword_and,
      keyword_not: formData.keyword_not,
      min_price: formData.min_price,
      max_price: formData.max_price,
      is_active: true,
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from("watch_settings").update(payload).eq("id", editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from("watch_settings").insert([payload]);
      error = err;
    }

    if (error) alert(error.message);
    else {
      setIsAdding(false);
      setEditingId(null);
      setFormData({ keyword_and: "", keyword_not: "", min_price: 0, max_price: 100000 });
      fetchSettings();
    }
  }

  function startEdit(setting: WatchSetting) {
    setFormData({
      keyword_and: setting.keyword_and,
      keyword_not: setting.keyword_not || "",
      min_price: setting.min_price,
      max_price: setting.max_price,
    });
    setEditingId(setting.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteSetting(id: string) {
    if (!confirm("本当に削除しますか？関連する履歴もすべて消去されます。")) return;
    const { error } = await supabase.from("watch_settings").delete().eq("id", id);
    if (error) alert(error.message);
    else fetchSettings();
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from("watch_settings").update({ is_active: !current }).eq("id", id);
    if (error) alert(error.message);
    else fetchSettings();
  }

  async function clearHistory(settingId: string) {
    if (!confirm("このワードのヒット履歴をすべて削除しますか？")) return;
    const { error } = await supabase.from("notified_items").delete().eq("setting_id", settingId);
    if (error) alert(error.message);
    else fetchNotifiedItems();
  }

  const toggleExpand = (id: string) => {
    setExpandedSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Search className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">SpyMarket</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="status-pulse">
                  <span className="status-pulse-inner"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Live</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "settings" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Monitoring
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "history" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Global History
              </button>
            </nav>
            
            <div className="flex items-center gap-2">
              {!isSubscribed && (
                <button
                  onClick={subscribeToPush}
                  disabled={subscriptionLoading}
                  className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-200"
                >
                  <Bell size={18} />
                </button>
              )}
              <button 
                onClick={() => window.location.reload()}
                className="bg-white border border-slate-200 p-2.5 rounded-xl hover:bg-slate-50 transition-all active:scale-95 text-slate-600 shadow-sm"
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === "settings" ? (
          <div className="space-y-8">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">監視センター</h2>
                <p className="text-slate-500 text-sm font-medium">現在 {settings.length} 件の条件で市場をスキャンしています</p>
              </div>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ keyword_and: "", keyword_not: "", min_price: 0, max_price: 100000 });
                  setIsAdding(!isAdding);
                }}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-indigo-100 active:scale-95"
              >
                {isAdding ? <PowerOff size={18} /> : <Plus size={18} />}
                {isAdding ? "作成を中止" : "新しい監視条件を追加"}
              </button>
            </div>

            {/* Add/Edit Form */}
            {isAdding && (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl shadow-indigo-500/5 animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Settings2 size={20} />
                  </div>
                  <h2 className="text-xl font-bold">{editingId ? "監視条件を編集" : "新しい監視条件"}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Tag size={14} /> 必須キーワード <span className="text-indigo-400 text-[10px] normal-case font-bold">(すべて含む)</span>
                    </label>
                    <div className="w-full p-2 rounded-2xl border-2 border-slate-100 focus-within:border-indigo-500 bg-slate-50/50 transition-all min-h-[56px] flex flex-wrap gap-2 items-center group">
                      {formData.keyword_and.split(",").filter(Boolean).map((tag, idx) => (
                        <span key={idx} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in zoom-in-95">
                          {tag}
                          <button
                            onClick={() => {
                              const tags = formData.keyword_and.split(",").filter(Boolean);
                              tags.splice(idx, 1);
                              setFormData({ ...formData, keyword_and: tags.join(",") });
                            }}
                            className="bg-indigo-500/50 hover:bg-indigo-400 rounded-lg p-0.5 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                      <div className="flex-1 flex items-center min-w-[150px]">
                        <input
                          type="text"
                          placeholder={formData.keyword_and ? "" : "例: iPhone 15, Pro, 256GB"}
                          className="w-full bg-transparent outline-none text-sm px-2 py-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                const currentTags = formData.keyword_and.split(",").filter(Boolean);
                                if (!currentTags.includes(val)) {
                                  setFormData({ ...formData, keyword_and: [...currentTags, val].join(",") });
                                }
                                e.currentTarget.value = "";
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              const currentTags = formData.keyword_and.split(",").filter(Boolean);
                              if (!currentTags.includes(val)) {
                                setFormData({ ...formData, keyword_and: [...currentTags, val].join(",") });
                              }
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={14} /> 除外キーワード <span className="text-rose-400 text-[10px] normal-case font-bold">(どれか含めば除外)</span>
                    </label>
                    <div className="w-full p-2 rounded-2xl border-2 border-slate-100 focus-within:border-rose-500 bg-slate-50/50 transition-all min-h-[56px] flex flex-wrap gap-2 items-center group">
                      {formData.keyword_not.split(",").filter(Boolean).map((tag, idx) => (
                        <span key={idx} className="bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in zoom-in-95">
                          {tag}
                          <button
                            onClick={() => {
                              const tags = formData.keyword_not.split(",").filter(Boolean);
                              tags.splice(idx, 1);
                              setFormData({ ...formData, keyword_not: tags.join(",") });
                            }}
                            className="bg-rose-500/50 hover:bg-rose-400 rounded-lg p-0.5 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                      <div className="flex-1 flex items-center min-w-[150px]">
                        <input
                          type="text"
                          placeholder={formData.keyword_not ? "" : "例: ジャンク品, 画面割れ"}
                          className="w-full bg-transparent outline-none text-sm px-2 py-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                const currentTags = formData.keyword_not.split(",").filter(Boolean);
                                if (!currentTags.includes(val)) {
                                  setFormData({ ...formData, keyword_not: [...currentTags, val].join(",") });
                                }
                                e.currentTarget.value = "";
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              const currentTags = formData.keyword_not.split(",").filter(Boolean);
                              if (!currentTags.includes(val)) {
                                setFormData({ ...formData, keyword_not: [...currentTags, val].join(",") });
                              }
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign size={14} /> 価格範囲 (下限)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                      <input
                        type="number"
                        className="w-full pl-8 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all bg-slate-50/50"
                        value={formData.min_price || ""}
                        onChange={(e) => setFormData({ ...formData, min_price: e.target.value === "" ? 0 : parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={14} /> 価格範囲 (上限)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                      <input
                        type="number"
                        className="w-full pl-8 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all bg-slate-50/50"
                        value={formData.max_price || ""}
                        onChange={(e) => setFormData({ ...formData, max_price: e.target.value === "" ? 0 : parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex justify-end gap-4">
                  <button onClick={() => {setIsAdding(false); setEditingId(null);}} className="px-8 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                    キャンセル
                  </button>
                  <button onClick={saveSetting} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-200 transition-all active:scale-95 hover:bg-indigo-700">
                    {editingId ? "条件を更新" : "監視をスタート"}
                  </button>
                </div>
              </div>
            )}

            {/* Settings List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-indigo-600"></div>
                <p className="text-slate-400 font-bold animate-pulse">データを読み込み中...</p>
              </div>
            ) : settings.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                <Search size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-bold">監視中のワードがありません</p>
                <p className="text-sm">上のボタンから最初の監視条件を追加しましょう</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {settings.map((setting) => {
                  const myHits = notifiedItems.filter(h => h.setting_id === setting.id);
                  const isExpanded = expandedSettings[setting.id];

                  return (
                    <div key={setting.id} className={`premium-card rounded-3xl overflow-hidden ${!setting.is_active && "opacity-50 grayscale-[0.5]"}`}>
                      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1.5 status-pulse ${!setting.is_active && "hidden"}`}>
                            <span className="status-pulse-inner"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-black text-xl text-slate-900">{setting.keyword_and}</h3>
                              {myHits.length > 0 && (
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                  {myHits.length} Hits
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                <DollarSign size={10} /> ¥{setting.min_price.toLocaleString()} 〜 ¥{setting.max_price.toLocaleString()}
                              </span>
                              {setting.keyword_not && (
                                <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                                  <AlertCircle size={10} /> 除外: {setting.keyword_not}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button 
                            onClick={() => toggleExpand(setting.id)} 
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                              isExpanded ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <Clock size={16} />
                            履歴
                            <ChevronRight size={14} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </button>
                          
                          <div className="w-[1px] h-8 bg-slate-100 mx-1 hidden md:block"></div>
                          
                          <button onClick={() => startEdit(setting)} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                            <Settings2 size={20} />
                          </button>
                          <button 
                            onClick={() => toggleActive(setting.id, setting.is_active)} 
                            className={`p-2.5 rounded-xl transition-all ${setting.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-50"}`}
                          >
                            {setting.is_active ? <Power size={20} /> : <PowerOff size={20} />}
                          </button>
                          <button onClick={() => deleteSetting(setting.id)} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50/50 px-6 py-6 border-t border-slate-50 animate-in slide-in-from-top-4 duration-500">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Hash size={14} /> ヒットログ
                            </h3>
                            {myHits.length > 0 && (
                              <button 
                                onClick={() => clearHistory(setting.id)}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-black flex items-center gap-1.5 transition-colors uppercase tracking-tight"
                              >
                                <Trash2 size={12} /> 履歴をクリア
                              </button>
                            )}
                          </div>
                          
                          {myHits.length === 0 ? (
                            <div className="py-8 text-center bg-white/50 rounded-2xl border border-slate-100 border-dashed">
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No Activity Yet</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {myHits.map((hit) => (
                                <a 
                                  key={hit.item_id} 
                                  href={hit.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="group flex items-center gap-4 bg-white border border-slate-100 p-3 rounded-2xl hover:border-indigo-500 transition-all shadow-sm hover:shadow-md"
                                >
                                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                                    <img src={hit.image_url || ""} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-indigo-600 transition-colors">{hit.title}</div>
                                    <div className="flex items-center justify-between mt-1">
                                      <div className="text-indigo-600 font-black text-sm">¥{hit.price.toLocaleString()}</div>
                                      <ExternalLink size={12} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Global History Tab */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">グローバル・ヒット履歴</h2>
                <p className="text-slate-500 text-sm font-medium">全監視ワードを横断した最新の通知履歴です</p>
              </div>
              <button 
                onClick={fetchNotifiedItems}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm"
              >
                <RefreshCcw size={18} />
                最新に更新
              </button>
            </div>

            {notifiedItems.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                <Clock size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-bold">履歴はまだありません</p>
                <p className="text-sm">市場のスキャンが完了するまでお待ちください</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notifiedItems.map((item) => (
                  <a
                    key={item.item_id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="premium-card p-4 rounded-3xl flex flex-col gap-4 group h-full"
                  >
                    <div className="relative w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 group-hover:scale-[1.02] transition-transform duration-500">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300">No Image</div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase shadow-lg">
                          {settings.find(s => s.id === item.setting_id)?.keyword_and || "Target Found"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-1 justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800 line-clamp-2 text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h3>
                        <div className="mt-2 text-xl font-black text-indigo-600">
                          ¥{item.price.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={12} />
                          <span className="text-[10px] font-bold">
                            {new Date(item.created_at).toLocaleString("ja-JP", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                          <ExternalLink size={14} />
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center">
            <Search className="text-white w-3 h-3" />
          </div>
          <span className="text-sm font-black tracking-tighter text-slate-900 uppercase">SpyMarket</span>
        </div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-4">
          Professional Fleamarket Intelligence System &copy; 2026
        </p>
      </footer>

      {/* Bottom Nav Mobile Only */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm glass-header p-2 rounded-2xl flex items-center justify-around shadow-2xl z-50 border border-white/50">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
            activeTab === "settings" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400"
          }`}
        >
          <Search size={18} />
          <span className="text-[9px] font-black uppercase">Monitoring</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
            activeTab === "history" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400"
          }`}
        >
          <Clock size={18} />
          <span className="text-[9px] font-black uppercase">History</span>
        </button>
      </nav>
    </div>
  );
}
