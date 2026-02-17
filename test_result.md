#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



user_problem_statement: "Plateforme hybride Matrix News + Marketplace Immobilier GIMO Guinée. Nouvelle section indépendante Immobilier avec annonces (achat/vente/location), système de paiement simulé (Orange Money, Mobile Money, Paycard, Carte bancaire), carte Leaflet. Nouveau rôle agent immobilier."

backend:
  - task: "Endpoints CRUD /api/properties"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Testé via curl: POST/GET/PUT/DELETE properties OK. Agent role register OK."

  - task: "Endpoints /api/payments"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST payment génère référence GIMO-XXXXX. GET /payments/my et /payments (admin). PUT status."

frontend:
  - task: "Page liste immobilier /immobilier"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/immobilier/ImmobilierPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Screenshot confirme rendu correct. Hero, filtres type, grille PropertyCard."

  - task: "Page détail propriété /immobilier/:id"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/immobilier/PropertyDetailPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Galerie images, carte Leaflet (défaut Conakry si pas GPS), contact vendeur, bouton Réserver."

  - task: "Formulaire publication /immobilier/publier"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/immobilier/PropertyFormPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true

  - task: "Modal paiement simulé"
    implemented: true
    working: "NA"
    file: "frontend/src/components/immobilier/PaymentModal.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true

  - task: "Carte Leaflet PropertyMap"
    implemented: true
    working: "NA"
    file: "frontend/src/components/immobilier/PropertyMap.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true

  - task: "Nav IMMOBILIER dans Header"
    implemented: true
    working: "NA"
    file: "frontend/src/components/Header.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true

  - task: "Inscription rôle agent dans LoginPage"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/LoginPage.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true

  - task: "Dashboard agent /mes-annonces"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/immobilier/AgentDashboardPage.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true

  - task: "Admin paiements /admin/paiements"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/immobilier/PaymentsAdminPage.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: true

test_plan:
  current_focus: "Tester section immobilier complète"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Section immobilier complète implémentée. Screenshot confirme page /immobilier fonctionne avec hero, filtres et carte d'annonce. Tester: 1) Navigation /immobilier depuis homepage, 2) Clic sur annonce -> détail avec carte Leaflet, 3) Inscription comme agent, 4) Publier une annonce, 5) Réservation avec modal paiement (nécessite connexion). Credentials: admin@example.com/adminpassword (auteur), agent@gimo.gn/agentpass (agent). L'annonce test ID est dans la DB."

backend:
  - task: "Endpoint POST /api/upload pour images/vidéos"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Testé et validé dans itération 5. 100% passing."

frontend:
  - task: "Icône personnalisée partout"
    implemented: true
    working: true
    file: "frontend/src/components/Header.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Validé dans itération 5."

  - task: "Menu hamburger visiteur non connecté"
    implemented: true
    working: "NA"
    file: "frontend/src/components/Header.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Quand token=null, affiche 3 barres animées (hamburger-menu-btn). Click ouvre dropdown (guest-dropdown) avec guest-login-link (/connexion) et guest-register-link (/connexion?tab=register). Hamburger se transforme en X quand ouvert."

  - task: "Onglet register depuis ?tab=register"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/LoginPage.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "useEffect qui lit searchParams et setTab register si ?tab=register présent dans URL."

  - task: "Upload photo profil depuis appareil (SettingsPage)"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/SettingsPage.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Champ URL supprimé. Bouton caméra sur avatar. Click ouvre file picker natif (avatar-upload-input). Upload via /api/upload. URL retournée mise dans profile.avatar_url."

  - task: "Upload fichier dans RichEditor"
    implemented: true
    working: true
    file: "frontend/src/components/RichEditor.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "Validé dans itération 5."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus: "Tester hamburger menu et upload photo profil"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Nouvelles fonctionnalités: 1) Hamburger 3 barres (data-testid=hamburger-menu-btn) remplace bouton Connexion quand non connecté. Dropdown (guest-dropdown) avec guest-login-link et guest-register-link. Les barres deviennent un X quand ouvert. 2) SettingsPage: champ URL supprimé, bouton Camera sur avatar (avatar-upload-input) déclenche upload via POST /api/upload. IMPORTANT: backend via localhost:8001. Credentials: admin@example.com / adminpassword (auteur)."