import { useState } from "react";
import { MessageCircle, X, Send, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "Comment publier une annonce immobilière ?",
    answer: "Pour publier une annonce, vous devez d'abord créer un compte en tant qu'Agent immobilier. Ensuite, connectez-vous et cliquez sur 'Publier une annonce' dans votre menu profil ou sur la page Immobilier."
  },
  {
    question: "Comment devenir auteur d'articles ?",
    answer: "Contactez notre équipe via l'adresse matrixguinea@gmail.com pour demander le statut d'auteur. Une fois approuvé, vous pourrez créer et publier des articles."
  },
  {
    question: "Comment contacter un vendeur ?",
    answer: "Sur chaque annonce immobilière, vous trouverez les coordonnées du vendeur (téléphone, email). Cliquez sur 'Contacter' pour appeler directement."
  },
  {
    question: "Comment sauvegarder un article ?",
    answer: "Connectez-vous à votre compte, puis cliquez sur l'icône signet (bookmark) sur n'importe quel article pour le sauvegarder. Retrouvez vos articles sauvegardés dans votre profil."
  },
  {
    question: "Comment modifier mon profil ?",
    answer: "Cliquez sur votre avatar en haut à droite, puis sélectionnez 'Paramètres' pour modifier votre photo de profil, nom d'utilisateur et autres informations."
  }
];

export default function ChatHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [message, setMessage] = useState("");

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    // For now, show a message that the team will respond
    alert(`Merci pour votre message ! Notre équipe vous répondra bientôt à l'adresse email de votre compte.\n\nVotre message: "${message}"`);
    setMessage("");
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        data-testid="chat-help-btn"
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#FF6600] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#CC5200] transition-all duration-200 group ${isOpen ? "hidden" : ""}`}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-['Manrope'] text-sm font-bold">Aide</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden font-['Manrope']" data-testid="chat-help-window">
          {/* Header */}
          <div className="bg-[#FF6600] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <span className="font-bold">Centre d'aide</span>
            </div>
            <button onClick={() => { setIsOpen(false); setActiveQuestion(null); }} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="h-[400px] overflow-y-auto">
            {activeQuestion === null ? (
              <div className="p-4">
                <p className="text-sm text-zinc-600 mb-4">
                  Bonjour ! Comment pouvons-nous vous aider ?
                </p>

                {/* FAQ List */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Questions fréquentes</p>
                  {FAQ_ITEMS.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveQuestion(index)}
                      className="w-full text-left p-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-sm text-zinc-700 transition-colors"
                    >
                      {item.question}
                    </button>
                  ))}
                </div>

                {/* Contact */}
                <div className="mt-4 pt-4 border-t border-zinc-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Nous contacter</p>
                  <a 
                    href="mailto:matrixguinea@gmail.com" 
                    className="flex items-center gap-2 p-3 bg-black text-white rounded-lg text-sm hover:bg-zinc-800 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    matrixguinea@gmail.com
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Back button */}
                <button
                  onClick={() => setActiveQuestion(null)}
                  className="text-sm text-[#FF6600] hover:underline mb-4 flex items-center gap-1"
                >
                  ← Retour aux questions
                </button>

                {/* Question */}
                <div className="bg-zinc-100 rounded-lg p-3 mb-3">
                  <p className="font-semibold text-sm text-zinc-800">
                    {FAQ_ITEMS[activeQuestion].question}
                  </p>
                </div>

                {/* Answer */}
                <div className="bg-[#FF6600]/10 rounded-lg p-3">
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    {FAQ_ITEMS[activeQuestion].answer}
                  </p>
                </div>

                {/* Additional help */}
                <div className="mt-4 pt-4 border-t border-zinc-200">
                  <p className="text-xs text-zinc-500 mb-2">Cette réponse ne vous aide pas ?</p>
                  <a 
                    href="mailto:matrixguinea@gmail.com" 
                    className="text-sm text-[#FF6600] hover:underline"
                  >
                    Contactez-nous directement
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 bg-zinc-50">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Posez votre question..."
                className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-full focus:outline-none focus:border-[#FF6600]"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="p-2 bg-[#FF6600] text-white rounded-full hover:bg-[#CC5200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
