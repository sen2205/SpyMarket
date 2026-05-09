"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Bell, Search, Settings2, Power, PowerOff } from "lucide-react";

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

  useEffect(() => {
    fetchSettings();
    fetchNotifiedItems();
  }, []);

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

  const toggleExpand = (id: string) => {
    setExpandedSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="py-4 flex justify-between items-center border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
                <Search className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">SpyMarket</h1>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "settings" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                監視リスト
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "history" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                ヒット履歴
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === "settings" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 監視リスト画面 */}
            <div className="flex justify-between items-center mb-6 px-1">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={16} /> 監視リスト設定
              </h2>
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ keyword_and: "", keyword_not: "", min_price: 0, max_price: 100000 });
                  setIsAdding(!isAdding);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-100 active:scale-95"
              >
                <Plus size={16} />
                新しい監視
              </button>
            </div>

            {isAdding && (
              <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in zoom-in-95 duration-300">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  {editingId ? "監視条件の編集" : "監視条件の追加"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">必須キーワード</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.keyword_and}
                      onChange={(e) => setFormData({ ...formData, keyword_and: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">除外キーワード</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.keyword_not}
                      onChange={(e) => setFormData({ ...formData, keyword_not: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">最低価格 (円)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.min_price || ""}
                      onChange={(e) => setFormData({ ...formData, min_price: e.target.value === "" ? 0 : parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">最高価格 (円)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.max_price || ""}
                      onChange={(e) => setFormData({ ...formData, max_price: e.target.value === "" ? 0 : parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => {setIsAdding(false); setEditingId(null);}} className="px-6 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-100">
                    キャンセル
                  </button>
                  <button onClick={saveSetting} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95">
                    {editingId ? "更新する" : "保存する"}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : settings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
                監視条件がありません。「新しい監視」から追加してください。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {settings.map((setting) => {
                  const myHits = notifiedItems.filter(h => h.setting_id === setting.id);
                  const isExpanded = expandedSettings[setting.id];

                  return (
                    <div key={setting.id} className={`bg-white rounded-2xl border ${setting.is_active ? "border-slate-200 shadow-sm" : "border-slate-100 opacity-60"} overflow-hidden transition-all shadow-slate-200/50`}>
                      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-slate-800">{setting.keyword_and}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">¥{setting.min_price.toLocaleString()} 〜 ¥{setting.max_price.toLocaleString()}</span>
                            {setting.keyword_not && <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded uppercase">除外: {setting.keyword_not}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleExpand(setting.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-1 transition-all">
                            <Bell size={16} /><span className="text-xs font-bold">{myHits.length}</span>
                          </button>
                          <button onClick={() => startEdit(setting)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                            <Settings2 size={18} />
                          </button>
                          <button onClick={() => toggleActive(setting.id, setting.is_active)} className={`p-2 rounded-xl transition-all ${setting.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-50"}`}>
                            {setting.is_active ? <Power size={18} /> : <PowerOff size={18} />}
                          </button>
                          <button onClick={() => deleteSetting(setting.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3">このワードでのヒット履歴</h3>
                          {myHits.length === 0 ? (
                            <p className="text-xs text-slate-300 italic">まだヒットはありません</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {myHits.map((hit) => (
                                <a key={hit.item_id} href={hit.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-xl text-[11px] hover:border-indigo-400 transition-all shadow-sm">
                                  <img src={hit.image_url || ""} alt="" className="w-8 h-8 rounded object-cover border border-slate-100" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-700 line-clamp-1">{hit.title}</div>
                                    <div className="text-indigo-600 font-bold">¥{hit.price.toLocaleString()}</div>
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 全体のヒット履歴画面 */}
            <div className="flex justify-between items-center mb-6 px-1">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Bell size={16} /> 全体のヒット履歴
              </h2>
              <button 
                onClick={fetchNotifiedItems}
                className="text-xs text-indigo-600 hover:underline font-bold"
              >
                最新に更新
              </button>
            </div>

            {notifiedItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                まだデータがありません。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notifiedItems.map((item) => (
                  <a
                    key={item.item_id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:border-indigo-400 transition-all group flex gap-4"
                  >
                    <div className="w-16 h-16 shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 line-clamp-2 text-sm group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-indigo-600 font-bold text-sm">¥{item.price.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-300 px-1 border border-slate-100 rounded">
                            {settings.find(s => s.id === item.setting_id)?.keyword_and || "不明"}
                          </span>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">
                        {new Date(item.created_at).toLocaleString("ja-JP")}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 py-8 border-t border-slate-200 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        SpyMarket 🕵️ - Realtime Fleamarket Monitoring
      </footer>
    </div>
  );
}
