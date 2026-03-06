import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import PropertyCard from "../../components/immobilier/PropertyCard";
import api from "../../lib/api";
import { Loader2, ArrowLeft, User, MapPin, Phone, Mail, Eye, Home, Calendar } from "lucide-react";

export default function AgentProfilePage() {
  const { agentId } = useParams();
  const [agent, setAgent] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/agents/${agentId}/profile`),
      api.get(`/agents/${agentId}/properties`),
    ])
      .then(([profileRes, propsRes]) => {
        setAgent(profileRes.data);
        setProperties(propsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>
    </div>
  );

  if (!agent) return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="text-center py-32">
        <p className="font-['Oswald'] text-2xl uppercase text-zinc-300">Agent introuvable</p>
        <Link to="/immobilier" className="mt-4 inline-block text-[#FF6600] font-bold text-sm">&larr; Retour</Link>
      </div>
    </div>
  );

  const memberSince = agent.created_at ? new Date(agent.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/immobilier" className="flex items-center gap-2 text-sm font-bold uppercase text-zinc-500 hover:text-[#FF6600] transition-colors mb-8" data-testid="agent-back-btn">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        {/* Profile Card */}
        <div className="bg-white border border-zinc-200 p-6 sm:p-8 mb-8" data-testid="agent-profile-card">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#FF6600] rounded-full flex items-center justify-center flex-shrink-0">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="font-['Oswald'] text-3xl sm:text-4xl font-bold text-white uppercase">
                  {agent.username?.charAt(0) || "A"}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight" data-testid="agent-name">{agent.username}</h1>
              <p className="text-xs text-[#FF6600] font-bold uppercase mt-1">Agent immobilier</p>
              {agent.bio && <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{agent.bio}</p>}

              <div className="flex flex-wrap gap-4 mt-4 text-xs text-zinc-500">
                {agent.phone && (
                  <a href={`tel:${agent.phone}`} className="flex items-center gap-1 hover:text-[#FF6600] transition-colors">
                    <Phone className="w-3 h-3" /> {agent.phone}
                  </a>
                )}
                {agent.email && (
                  <a href={`mailto:${agent.email}`} className="flex items-center gap-1 hover:text-[#FF6600] transition-colors">
                    <Mail className="w-3 h-3" /> {agent.email}
                  </a>
                )}
                {memberSince && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Membre depuis {memberSince}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-zinc-100">
                <div data-testid="agent-stat-properties">
                  <p className="font-['Oswald'] text-2xl font-bold text-[#FF6600]">{agent.stats?.total_properties || 0}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Annonces</p>
                </div>
                <div data-testid="agent-stat-available">
                  <p className="font-['Oswald'] text-2xl font-bold">{agent.stats?.available_properties || 0}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Disponibles</p>
                </div>
                <div data-testid="agent-stat-views">
                  <p className="font-['Oswald'] text-2xl font-bold">{agent.stats?.total_views || 0}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Vues totales</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agent's Properties */}
        <div>
          <h2 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-[#FF6600]" /> Annonces de {agent.username}
          </h2>

          {properties.length === 0 ? (
            <p className="text-center text-zinc-400 py-12">Aucune annonce disponible.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {properties.map(p => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
