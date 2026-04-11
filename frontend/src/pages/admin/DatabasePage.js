import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import {
  Users, FileText, Home, CreditCard, Database, ArrowLeft,
  RefreshCw, Bell, DollarSign
} from "lucide-react";
import { StatCard } from "./database/SharedComponents";
import { RequestsTab } from "./database/RequestsTab";
import { UsersTab } from "./database/UsersTab";
import { ArticlesTab } from "./database/ArticlesTab";
import { PropertiesTab } from "./database/PropertiesTab";
import { PaymentsTab } from "./database/PaymentsTab";
import { PriceReferencesTab } from "./database/PriceReferencesTab";

const TABS = [
  { id: "requests", label: "Demandes", icon: Bell },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "articles", label: "Articles", icon: FileText },
  { id: "properties", label: "Annonces", icon: Home },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "prices", label: "Prix m²", icon: DollarSign },
];

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState("requests");
  const [stats, setStats] = useState({ total_users: 0, total_articles: 0, total_properties: 0, total_payments: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).catch(() => {}).finally(() => setLoadingStats(false));
    api.get("/admin/notifications/count").then(r => setPendingCount(r.data.pending_count)).catch(() => {});
    api.put("/admin/notifications/mark-seen").catch(() => {});
  }, []);

  const refreshStats = () => {
    setLoadingStats(true);
    api.get("/admin/stats").then(r => setStats(r.data)).catch(() => {}).finally(() => setLoadingStats(false));
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />

      <section className="bg-black py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FF6600] rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <p className="text-[#FF6600] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">Administration</p>
              <h1 className="font-['Oswald'] text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-white">
                Base de données
              </h1>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1 sm:h-1.5 bg-[#FF6600]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#FF6600] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard icon={Users} label="Utilisateurs" value={loadingStats ? "-" : stats.total_users} color="bg-purple-600" />
          <StatCard icon={FileText} label="Articles" value={loadingStats ? "-" : stats.total_articles} color="bg-blue-600" />
          <StatCard icon={Home} label="Annonces" value={loadingStats ? "-" : stats.total_properties} color="bg-green-600" />
          <StatCard icon={CreditCard} label="Paiements" value={loadingStats ? "-" : stats.total_payments} color="bg-[#FF6600]" />
        </div>

        <div className="bg-white border border-zinc-200 mb-6">
          <div className="flex border-b border-zinc-200 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`tab-${tab.id}`}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 relative ${
                  activeTab === tab.id ? "border-[#FF6600] text-[#FF6600]" : "border-transparent text-zinc-500 hover:text-black"
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "requests" && pendingCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="pending-badge">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
            <button onClick={refreshStats} className="ml-auto px-4 py-3 text-zinc-400 hover:text-[#FF6600] transition-colors" title="Rafraîchir">
              <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "requests" && <RequestsTab onCountChange={setPendingCount} />}
            {activeTab === "users" && <UsersTab />}
            {activeTab === "articles" && <ArticlesTab />}
            {activeTab === "properties" && <PropertiesTab />}
            {activeTab === "payments" && <PaymentsTab />}
            {activeTab === "prices" && <PriceReferencesTab />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
