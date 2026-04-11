import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import {
  Loader2, ArrowLeft, Edit, Trash2, CheckCircle,
  FileText, Download, ChevronRight, Bookmark, Video, ExternalLink
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { AuthGateOverlay, VideoPlayer } from "../../components/DetailPageHelpers";
import { ProcedureDetailSidebar, COMPLEXITY_CONFIG } from "./ProcedureDetailSidebar";

const LOGO = "/nimba-logo.png";
const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

export default function ProcedureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isSaved, setIsSaved] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);

  useEffect(() => {
    api.get(`/procedures/${id}`)
      .then(r => setProcedure(r.data))
      .catch(() => setError("Procedure introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    api.get(`/saved-procedures/${id}/status`).then(r => setIsSaved(r.data.is_saved)).catch(() => {});
  }, [id, isAuthenticated]);

  const toggleSave = async () => {
    if (!isAuthenticated) { toast.error("Connectez-vous pour sauvegarder."); return; }
    try {
      const res = await api.post(`/saved-procedures/${id}`);
      setIsSaved(res.data.action === "saved");
      toast.success(res.data.action === "saved" ? "Ajoute aux favoris" : "Retire des favoris");
    } catch { toast.error("Erreur"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer cette procedure ?")) return;
    setDeleting(true);
    try {
      await api.delete(`/procedures/${id}`);
      toast.success("Procedure supprimee");
      navigate("/procedures");
    } catch { toast.error("Erreur"); }
    finally { setDeleting(false); }
  };

  const handleDownload = async (file) => {
    setDownloadingFile(file.id);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/procedures/files/${file.id}/download`
      );
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_filename || file.file_name || "fichier";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Telechargement lance");
    } catch {
      toast.error("Erreur lors du telechargement");
    } finally {
      setDownloadingFile(null);
    }
  };

  const toggleStepComplete = (stepIndex) => {
    setCompletedSteps(prev => {
      const n = new Set(prev);
      if (n.has(stepIndex)) n.delete(stepIndex); else n.add(stepIndex);
      return n;
    });
  };

  const isAdmin = user?.role === "admin";
  const steps = procedure?.steps || [];
  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.order - b.order), [steps]);
  const files = procedure?.files || [];
  const quickActions = procedure?.quick_actions || [];
  const cx = COMPLEXITY_CONFIG[procedure?.complexity] || COMPLEXITY_CONFIG.modere;
  const progress = steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>;

  if (error || !procedure) {
    return (
      <div className="min-h-screen bg-white font-['Manrope']">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="font-['Oswald'] text-3xl uppercase text-zinc-300">{error}</p>
          <Link to="/procedures" className="mt-4 inline-block text-[#FF6600] font-bold hover:underline">Retour</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />

      {/* Auth Gate for non-logged in users */}
      {!isAuthenticated && <AuthGateOverlay />}

      {/* Hero */}
      <section className="bg-black py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <img src={LOGO} alt="GIMO" className="w-12 h-12 sm:w-16 sm:h-16 object-contain flex-shrink-0" />
            <div className="flex items-start gap-3">
              <div className="w-1 h-12 bg-[#FF6600] flex-shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {procedure.country_flag && (
                    <img src={FLAG_URL(procedure.country_flag)} alt="" className="w-6 h-4" />
                  )}
                  <span className="text-[#FF6600] text-xs font-bold uppercase tracking-widest">
                    {procedure.country_name || procedure.subcategory_name}
                  </span>
                  <span className="text-zinc-600 text-xs">|</span>
                  <span className="text-zinc-400 text-xs">{procedure.category_name}</span>
                </div>
                <h1 className="font-['Oswald'] text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-white leading-tight">
                  {procedure.title}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1 bg-[#FF6600]" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/procedures" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-[#FF6600]" data-testid="back-procedures">
            <ArrowLeft className="w-4 h-4" /> Toutes les procedures
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button onClick={toggleSave} data-testid="save-procedure-btn"
                className={`p-2 transition-colors ${isSaved ? "text-[#FF6600]" : "text-zinc-400 hover:text-[#FF6600]"}`}>
                <Bookmark className={`w-5 h-5 ${isSaved ? "fill-[#FF6600]" : ""}`} />
              </button>
            )}
            {isAdmin && (
              <>
                <Link to={`/admin/procedures/modifier/${procedure.id}`} data-testid="edit-proc-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-zinc-100 text-zinc-700 hover:bg-[#FF6600] hover:text-white transition-colors">
                  <Edit className="w-3.5 h-3.5" /> Modifier
                </Link>
                <button onClick={handleDelete} disabled={deleting} data-testid="delete-proc-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" /> {deleting ? "..." : "Supprimer"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main image (priority display) */}
            {procedure.main_image_url && (
              <div className="overflow-hidden rounded-lg" data-testid="procedure-main-image">
                <img src={procedure.main_image_url} alt={procedure.title} className="w-full max-h-[400px] object-cover" />
              </div>
            )}

            {/* Cover image (fallback if no main image) */}
            {!procedure.main_image_url && procedure.image_url && (
              <div className="overflow-hidden rounded-lg">
                <img src={procedure.image_url} alt={procedure.title} className="w-full max-h-[350px] object-cover" />
              </div>
            )}

            {/* Description */}
            {procedure.description && (
              <div className="bg-white border border-zinc-200 rounded-lg p-5">
                <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Description</h2>
                <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{procedure.description}</div>
                {procedure.content && procedure.content !== procedure.description && (
                  <article className="mt-4 prose prose-sm max-w-none prose-a:text-[#FF6600]"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(procedure.content) }} />
                )}
              </div>
            )}

            {/* Steps */}
            {steps.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="steps-section">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                  <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-black flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FF6600]" /> Etapes de la procedure
                  </h2>
                  <span className="text-xs text-zinc-500">{completedSteps.size}/{steps.length} completees</span>
                </div>
                <div className="h-1 bg-zinc-100">
                  <div className="h-full bg-[#FF6600] transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>

                <div className="divide-y divide-zinc-100">
                  {sortedSteps.map((step, i) => {
                    const isCompleted = completedSteps.has(i);
                    const isActive = activeStep === i;

                    return (
                      <div key={step.id || i} className={`transition-colors ${isActive ? "bg-[#FF6600]/5" : ""}`}
                        data-testid={`procedure-step-${i}`}>
                        <div onClick={() => setActiveStep(isActive ? -1 : i)}
                          className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer">
                          <button onClick={(e) => { e.stopPropagation(); toggleStepComplete(i); }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                              isCompleted ? "bg-green-500 border-green-500 text-white" : "border-zinc-300 text-zinc-300 hover:border-[#FF6600]"
                            }`} data-testid={`complete-step-${i}`}>
                            {isCompleted ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${isCompleted ? "line-through text-zinc-400" : "text-black"}`}>
                              {step.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {step.mandatory && (
                                <span className="text-[9px] font-bold uppercase text-red-500">Obligatoire</span>
                              )}
                              {step.video_url && (
                                <span className="text-[9px] font-bold uppercase text-blue-500 flex items-center gap-0.5">
                                  <Video className="w-2.5 h-2.5" /> Video
                                </span>
                              )}
                              {step.links?.length > 0 && (
                                <span className="text-[9px] font-bold uppercase text-purple-500 flex items-center gap-0.5">
                                  <ExternalLink className="w-2.5 h-2.5" /> {step.links.length} lien{step.links.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${isActive ? "rotate-90" : ""}`} />
                        </div>

                        {isActive && (
                          <div className="px-5 pb-5 pl-16 space-y-3">
                            {step.description && (
                              <p className="text-sm text-zinc-600 leading-relaxed">{step.description}</p>
                            )}
                            {step.video_url && (
                              <VideoPlayer url={step.video_url} testId={`step-video-${i}`} />
                            )}
                            {step.links?.length > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase text-zinc-500 mb-2">Liens utiles :</p>
                                <div className="space-y-1.5">
                                  {step.links.map((link, li) => (
                                    <a key={`${link.url}-${li}`} href={link.url} target="_blank" rel="noreferrer"
                                      data-testid={`step-${i}-link-${li}`}
                                      className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded text-sm transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                      <span className="text-blue-700 font-medium">{link.label || link.url}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {step.required_documents?.length > 0 && (
                              <div>
                                <p className="text-xs font-bold uppercase text-zinc-500 mb-2">Documents requis :</p>
                                <div className="space-y-1.5">
                                  {step.required_documents.map((doc, di) => (
                                    <div key={`doc-${doc}-${di}`} className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded text-sm">
                                      <div className="w-4 h-4 bg-[#FF6600]/20 rounded flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-2.5 h-2.5 text-[#FF6600]" />
                                      </div>
                                      <span className="text-zinc-700">{doc}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {completedSteps.size === steps.length && steps.length > 0 && (
                  <div className="px-5 py-4 bg-green-50 border-t border-green-200 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-bold text-green-700">Toutes les etapes sont completees !</p>
                  </div>
                )}
              </div>
            )}

            {/* Files / Downloads — Fixed with programmatic download */}
            {files.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden" data-testid="files-section">
                <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50">
                  <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-black flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#FF6600]" /> Formulaires et Documents
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {files.map(f => (
                    <button key={f.id} onClick={() => handleDownload(f)}
                      disabled={downloadingFile === f.id}
                      data-testid={`download-file-${f.id}`}
                      className="flex items-center gap-3 bg-zinc-50 hover:bg-[#FF6600]/5 px-4 py-3 rounded transition-colors group w-full text-left disabled:opacity-50">
                      <div className="w-10 h-10 bg-[#FF6600]/10 rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-[#FF6600]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-800 truncate group-hover:text-[#FF6600]">{f.file_name || f.original_filename}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{f.file_type} | {f.content_type}</p>
                      </div>
                      {downloadingFile === f.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#FF6600]" />
                      ) : (
                        <Download className="w-4 h-4 text-zinc-400 group-hover:text-[#FF6600]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Procedure-level video (displayed after steps and files) */}
            {procedure.video_url && (
              <div className="bg-white border border-zinc-200 rounded-lg p-5" data-testid="procedure-video-section">
                <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#FF6600]" /> Video
                </h2>
                <VideoPlayer url={procedure.video_url} testId="procedure-video" />
              </div>
            )}
          </div>

          {/* Sidebar (1/3) */}
          <ProcedureDetailSidebar procedure={procedure} steps={steps} files={files}
            quickActions={quickActions} cx={cx} setActiveStep={setActiveStep} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
