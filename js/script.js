 /* --- SCRIPT JAVASCRIPT COMPLET --- */

    let db = [];
    let pyodideInstance = null;
    let currentChapter = null;
    let currentExercise = null;
    
    let historyStack = [];
    let historyStep = -1;

    const textarea = document.getElementById('code-input');
    const codeBlock = document.getElementById('code-block');

    window.onload = () => {
      loadSavedTheme();
      loadExercisesFromDB();
      initPyodide();
    };

    /* 1. CHARGEMENT DES DONNÉES DEPUIS LE SERVEUR */
    async function loadExercisesFromDB() {
      const container = document.getElementById('chapters-list');
      container.innerHTML = '<p style="color: #94a3b8; text-align:center; grid-column: 1/-1;">⏳ Chargement des données...</p>';

      try {
        const response = await fetch('get_exercises.php');
        if (!response.ok) throw new Error(`Erreur serveur (Code ${response.status}).`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          db = data;
          renderChaptersGrille();
        } else {
          container.innerHTML = '<p style="color: #f59e0b; text-align:center; grid-column: 1/-1;">⚠️ Aucun exercice trouvé dans la base.</p>';
        }
      } catch (error) {
        console.error('Erreur fetch BDD :', error);
        container.innerHTML = `<div style="color: #f43f5e; text-align:center; grid-column: 1/-1; background:#1e293b; padding:20px; border-radius:8px;">
                                ❌ Erreur de connexion au serveur.<br><small>${error.message}</small>
                              </div>`;
      }
    }

    /* 2. INITIALISATION ET CHARGEMENT PYODIDE + NUMPY */
    async function initPyodide() {
      const statusEl = document.getElementById('pyodide-status');
      const consoleEl = document.getElementById('console-output');

      try {
        statusEl.textContent = '⚡ Chargement Pyodide...';
        
        pyodideInstance = await loadPyodide({
          indexURL: "./pyodide/"
        });

        // Configuration entrée utilisateur (input)
        pyodideInstance.setStdin({
          stdin: () => {
            const result = window.prompt("Saisie utilisateur Python (input) :");
            return result !== null ? result : "";
          }
        });

        statusEl.textContent = '✅ Python 3 prêt (Offline)';
        statusEl.style.color = '#10b981';
        consoleEl.textContent = 'Environnement Python prêt. Sélectionne un exercice pour exécuter du code.';
      } catch (err) {
        statusEl.textContent = '❌ Erreur Pyodide';
        statusEl.style.color = '#f43f5e';
        consoleEl.textContent = 'Échec de l\'initialisation du moteur Python local.\n' + err.message;
      }
    }

    /* 3. EXÉCUTION DU CODE PYTHON (AVEC AUTO-LOAD DE NUMPY ET PAQUETS) */
    async function runPython() {
      if (!pyodideInstance) return;

      const consoleEl = document.getElementById('console-output');
      const runBtn = document.getElementById('run-btn');
      const statusEl = document.getElementById('pyodide-status');
      const code = textarea.value;

      runBtn.disabled = true;
      consoleEl.style.color = '#e2e8f0';
      consoleEl.textContent = "⏳ Exécution locale en cours...\n";

      // Interception des sorties standard print()
      pyodideInstance.setStdout({
        batched: (text) => {
          consoleEl.textContent += text + "\n";
        }
      });
      pyodideInstance.setStderr({
        batched: (text) => {
          consoleEl.textContent += text + "\n";
        }
      });

      try {
        // Détection et chargement automatique si numpy est importé
        if (code.includes('numpy') || code.includes('np.')) {
          statusEl.textContent = '📦 Chargement de NumPy...';
          await pyodideInstance.loadPackage("numpy");
          statusEl.textContent = '✅ Python 3 prêt';
        }

        // Exécution synchrone/asynchrone du code
        await pyodideInstance.runPythonAsync(code);
      } catch (err) {
        consoleEl.style.color = '#f43f5e';
        consoleEl.textContent += "\n❌ Erreur d'exécution Python :\n" + err.message;
      } finally {
        runBtn.disabled = false;
      }
    }

    /* 4. AFFICHAGE DES CHAPITRES ET DE L'ACCORDÉON */
    function renderChaptersGrille() {
      const container = document.getElementById('chapters-list');
      container.innerHTML = '';

      db.forEach(chap => {
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.onclick = () => openChapter(chap.id);
        const count = (chap.exercises && Array.isArray(chap.exercises)) ? chap.exercises.length : 0;
        
        card.innerHTML = `
          <h3>${chap.title}</h3>
          <span class="badge">${count > 0 ? count + ' solution(s)' : 'Vide'}</span>
        `;
        container.appendChild(card);
      });
    }

    function openChapter(chapterId) {
      currentChapter = db.find(c => c.id == chapterId);
      if (!currentChapter) return;

      document.getElementById('chapters-view').style.display = 'none';
      document.getElementById('workspace-view').classList.add('active');
      document.getElementById('current-chapter-title').textContent = currentChapter.title;
      
      renderExercisesAccordion();
      
      if (currentChapter.exercises && currentChapter.exercises.length > 0) {
        loadExercise(currentChapter.exercises[0].id);
      }
    }

    function showChaptersList() {
      document.getElementById('workspace-view').classList.remove('active');
      setTimeout(() => {
        document.getElementById('chapters-view').style.display = 'block';
      }, 300);
    }

    function renderExercisesAccordion() {
      const accordionContainer = document.getElementById('exercise-accordion');
      accordionContainer.innerHTML = '';

      if (!currentChapter || !currentChapter.exercises || currentChapter.exercises.length === 0) {
        accordionContainer.innerHTML = '<p style="color: #94a3b8; padding:15px; font-size:0.85rem;">Aucun exercice disponible.</p>';
        return;
      }

      const groupedExercises = currentChapter.exercises.reduce((acc, ex) => {
        const cat = ex.categorie || "Exercices"; 
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ex);
        return acc;
      }, {});

      let globalExerciseNumber = 1;
      const categoryOrder = ["Activité", "Application rapide", "Exercice", "Défi", "Autres"];
      const sortedCategories = Object.keys(groupedExercises).sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));

      sortedCategories.forEach(category => {
        const exercises = groupedExercises[category];
        
        const categoryHeader = document.createElement('button');
        categoryHeader.className = 'accordion-category';
        categoryHeader.innerHTML = `${category} (${exercises.length}) <span class="category-icon">▼</span>`;
        
        const categoryContent = document.createElement('div');
        categoryContent.className = 'accordion-content';

        exercises.forEach(ex => {
          const exerciseItem = document.createElement('div');
          const isActive = currentExercise && currentExercise.id === ex.id;
          exerciseItem.className = `exercise-item ${isActive ? 'active' : ''}`;
          exerciseItem.id = `nav-${ex.id}`;

          exerciseItem.innerHTML = `<span class="ex-number">Ex${globalExerciseNumber}</span> <span class="ex-title">${ex.title}</span>`;
          exerciseItem.onclick = (e) => {
            e.stopPropagation();
            loadExercise(ex.id);
          };

          categoryContent.appendChild(exerciseItem);
          globalExerciseNumber++;
        });

        categoryHeader.onclick = function() {
          this.classList.toggle('active');
          const content = this.nextElementSibling;
          content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
        };

        accordionContainer.appendChild(categoryHeader);
        accordionContainer.appendChild(categoryContent);
        
        if (currentExercise && exercises.some(e => e.id === currentExercise.id)) {
          categoryHeader.classList.add('active');
          categoryContent.style.maxHeight = categoryContent.scrollHeight + "px";
        }
      });
      
      if (!currentExercise && accordionContainer.firstChild) {
        accordionContainer.firstChild.click();
      }
    }

    /* 5. CHARGEMENT ET RENDU D'UN EXERCICE */
    function loadExercise(exId) {
      currentExercise = currentChapter.exercises.find(e => e.id === exId);
      if (!currentExercise) return;

      document.querySelectorAll('.accordion-content .exercise-item').forEach(item => item.classList.remove('active'));
      const clickedItem = document.getElementById(`nav-${exId}`);
      if (clickedItem) clickedItem.classList.add('active');

      document.getElementById('exercise-title').textContent = currentExercise.title;
      document.getElementById('exercise-body').innerHTML = currentExercise.statement; 
      document.getElementById('explanation-body').innerHTML = currentExercise.explanation || "<i>Aucune explication fournie.</i>";
      
      const simBody = document.getElementById('simulation-body');
      
      // Injection ou génération visuelle directe pour les cas PyQt5
      if (currentChapter.id === 8 || (currentExercise.title && currentExercise.title.toLowerCase().includes("qt"))) {
         simBody.innerHTML = `
          <div style="background:#1e293b; padding:15px; border-radius:6px; border:1px solid #334155;">
            <p style="color:#38bdf8; font-weight:bold; margin-bottom:10px;">🖥️ Rendu visuel simulé de l'interface GUI :</p>
            <div style="background:#f8fafc; color:#0f172a; padding:15px; border-radius:4px; max-width:320px; font-family:sans-serif;">
               <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Champ de saisie (txt_saisie / txt_entree) :</label>
               <input type="text" value="12" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:10px;" readonly>
               <button style="background:#0284c7; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;" onclick="alert('Simulation du Signal PyQt5 : clicked.connect(action_bouton)')">Exécuter le Bouton (btn_reset)</button>
               <div style="margin-top:10px; font-size:13px; font-weight:bold; color:#0369a1;">Étiquette (lbl_message) : <span style="color:#15803d;">Bienvenue</span></div>
            </div>
          </div>`;
      } else if (currentExercise.simulation_html && currentExercise.simulation_html.trim() !== "") {
        simBody.innerHTML = currentExercise.simulation_html;
      } else {
        simBody.innerHTML = "<p style='color: #64748b; font-style:italic;'>Utilisez l'éditeur pour exécuter directement le code et observer ses sorties console.</p>";
      }
      
      switchTab('explanation');

      textarea.value = currentExercise.code;
      historyStack = [currentExercise.code];
      historyStep = 0;

      updatePrismDisplay();

      if (pyodideInstance) {
        document.getElementById('run-btn').disabled = false;
      }
      document.getElementById('console-output').textContent = "Corrigé chargé. Cliquez sur 'Exécuter le code' pour lancer l'interprète.";
      document.getElementById('console-output').style.color = "#e2e8f0";
    }

    /* 6. OUTILS DE L'ÉDITEUR ET HISTORIQUE */
    function updatePrismDisplay() {
      if (!textarea || !codeBlock) return;
      let content = textarea.value;
      if (content[content.length - 1] === "\n") content += " ";
      codeBlock.textContent = content;
      if (window.Prism) Prism.highlightElement(codeBlock);
    }

    function updateEditor() {
      updatePrismDisplay();
      saveState(textarea.value);
    }






















document.addEventListener('DOMContentLoaded', () => {
  const codeArea = document.getElementById('code-input');
  const editorWrapper = document.querySelector('.editor-wrapper');

  if (codeArea) {
    // 1. Bloquer la copie (Ctrl+C, Cmd+C, menu contextuel Copier)
    codeArea.addEventListener('copy', (e) => {
      e.preventDefault();
      alert("La copie du code est désactivée pour cet exercice. Réécrivez le code manuellement !");
    });

    // 2. Bloquer le menu contextuel (clic droit) spécifiquement sur l'éditeur
    codeArea.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 3. Bloquer le glisser-déposer de texte (Drag and Drop) vers/depuis l'éditeur
    codeArea.addEventListener('drop', (e) => {
      e.preventDefault();
    });
    
    codeArea.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
  }

  // 4. Bloquer la combinaison de touches Ctrl+C / Cmd+C quand l'utilisateur est dans l'éditeur
  document.addEventListener('keydown', (e) => {
    const isCopyShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
    if (isCopyShortcut && document.activeElement === codeArea) {
      e.preventDefault();
    }
  });
});











    function handleTab(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + "    " + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 4;
        updateEditor();
      }
    }

    function saveState(val) {
      if (historyStep < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyStep + 1);
      }
      historyStack.push(val);
      historyStep++;
    }

    function undoCode() {
      if (historyStep > 0) {
        historyStep--;
        textarea.value = historyStack[historyStep];
        updatePrismDisplay();
      }
    }

    function redoCode() {
      if (historyStep < historyStack.length - 1) {
        historyStep++;
        textarea.value = historyStack[historyStep];
        updatePrismDisplay();
      }
    }

    function copyCode() {
      navigator.clipboard.writeText(textarea.value);
      alert("Code copié dans le presse-papier !");
    }

    async function pasteCode() {
      const text = await navigator.clipboard.readText();
      textarea.value = text;
      updateEditor();
    }

    function resetSolution() {
      if (currentExercise) {
        textarea.value = currentExercise.code;
        updateEditor();
      }
    }

    /* 7. THÈMES ET NAVEGATION ONGLET */
    function loadSavedTheme() {
      const savedTheme = localStorage.getItem('editor_theme') || 'tomorrownight';
      document.getElementById('theme-select').value = savedTheme;
      changeTheme(savedTheme);
    }

    function changeTheme(themeName) {
      const themeLink = document.getElementById('prism-theme');
      themeLink.href = `./assets/prism/prism-${themeName}.min.css`;
      localStorage.setItem('editor_theme', themeName);
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

      document.getElementById(`btn-tab-${tabName}`).classList.add('active');
      document.getElementById(`tab-${tabName}`).classList.add('active');
    }

    function logout() {
      localStorage.removeItem('access_granted');
      alert("Déconnexion réussie.");
      window.location.reload();
    }