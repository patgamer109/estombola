class TombolaGame {
    constructor() {
        this.numbers = Array.from({ length: 90 }, (_, i) => i + 1);
        this.extractedNumbers = [];
        this.currentNumber = null;
        this.gameStarted = false;
        this.autoGameRunning = false;
        this.autoGamePaused = false;
        this.autoGameInterval = null;
        this.config = { autoExtractionInterval: 6 }; // Default fallback
        
        this.initialize();
    }
    
    async initialize() {
        await this.loadConfig();
        this.initializeElements();
        this.createBoard();
        this.bindEvents();
        this.updateStats();
    }
    
    async loadConfig() {
        try {
            // Prova prima a caricare da localStorage (configurazioni salvate)
            const savedConfig = localStorage.getItem('tombolaConfig');
            if (savedConfig) {
                const configData = JSON.parse(savedConfig);
                this.config = configData.gameSettings;
                console.log(`📋 Configurazione caricata da localStorage: intervallo ${this.config.autoExtractionInterval} secondi`);
                return;
            }
            
            // Altrimenti carica dal file JSON
            const response = await fetch('config.json');
            if (response.ok) {
                const configData = await response.json();
                this.config = configData.gameSettings;
                console.log(`📋 Configurazione caricata da file: intervallo ${this.config.autoExtractionInterval} secondi`);
            } else {
                console.warn('File config.json non trovato, uso configurazione predefinita');
            }
        } catch (error) {
            console.warn('Errore nel caricamento della configurazione, uso valori predefiniti:', error);
        }
    }

    initializeElements() {
        this.extractBtn = document.getElementById('extractBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.pauseResumeBtn = document.getElementById('pauseResumeBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.currentNumberDisplay = document.getElementById('currentNumber');
        this.extractedCountDisplay = document.getElementById('extractedCount');
        this.remainingCountDisplay = document.getElementById('remainingCount');
        this.boardElement = document.getElementById('board');
        
        // Verifica elementi critici
        const criticalElements = [
            { name: 'extractBtn', element: this.extractBtn },
            { name: 'boardElement', element: this.boardElement },
            { name: 'currentNumberDisplay', element: this.currentNumberDisplay }
        ];
        
        criticalElements.forEach(({ name, element }) => {
            if (!element) {
                console.error(`❌ Elemento critico non trovato: ${name}`);
            }
        });
        
        console.log('📋 Elementi inizializzati');
    }

    createBoard() {
        if (!this.boardElement) {
            console.error('❌ Elemento board non trovato!');
            return;
        }
        
        this.boardElement.innerHTML = '';
        
        for (let i = 1; i <= 90; i++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = i;
            cell.dataset.number = i;
            
            // Aggiungi evento click per marcare manualmente
            cell.addEventListener('click', () => this.toggleNumber(i));
            
            this.boardElement.appendChild(cell);
        }
        
        console.log('📋 Tabellone creato con 90 numeri');
    }

    bindEvents() {
        if (this.extractBtn) {
            this.extractBtn.addEventListener('click', () => this.extractNumber());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetGame());
        }
        
        // Pulsante inizio partita
        if (this.startGameBtn) {
            this.startGameBtn.addEventListener('click', () => this.startAutoGame());
        }
        
        // Pulsante pausa/riprendi  
        if (this.pauseResumeBtn) {
            this.pauseResumeBtn.addEventListener('click', () => this.togglePauseResume());
        }
        
        // Pulsante impostazioni
        if (this.settingsBtn) {
            console.log('📋 Pulsante Impostazioni trovato e configurato');
            this.settingsBtn.addEventListener('click', () => {
                console.log('📋 Click su Impostazioni rilevato');
                this.openSettingsModal();
            });
        } else {
            console.error('❌ Pulsante Impostazioni non trovato!');
        }
        
        // Binding per il modal delle impostazioni
        this.bindSettingsModal();
        
        // Pulsante test audio
        const testAudioBtn = document.getElementById('testAudioBtn');
        if (testAudioBtn) {
            testAudioBtn.addEventListener('click', () => {
                this.speakNumber(Math.floor(Math.random() * 90) + 1);
            });
        }
        
        // Aggiungi evento per la barra spaziatrice
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (this.numbers.length > 0) {
                    this.extractNumber();
                }
            }
        });
    }

    extractNumber() {
        if (this.numbers.length === 0) {
            this.showGameComplete();
            return;
        }

        // Rimuovi l'evidenziazione del numero precedente
        if (this.currentNumber) {
            const prevCell = document.querySelector(`[data-number="${this.currentNumber}"]`);
            if (prevCell) {
                prevCell.classList.remove('current');
            }
        }

        // Estrai numero casuale
        const randomIndex = Math.floor(Math.random() * this.numbers.length);
        const extractedNumber = this.numbers[randomIndex];
        
        // Rimuovi il numero dall'array dei numeri disponibili
        this.numbers.splice(randomIndex, 1);
        
        // Aggiungi alla lista dei numeri estratti
        this.extractedNumbers.push(extractedNumber);
        this.currentNumber = extractedNumber;
        
        // Aggiorna l'interfaccia
        this.updateCurrentNumberDisplay(extractedNumber);
        this.updateBoardCell(extractedNumber);
        this.updateStats();
        
        // Effetti sonori e animazioni
        this.playExtractAnimation(extractedNumber);
        this.speakNumber(extractedNumber);
        
        // Controlla se il gioco è finito
        if (this.numbers.length === 0) {
            setTimeout(() => this.showGameComplete(), 1000);
        }

        this.gameStarted = true;
    }

    toggleNumber(number) {
        const cell = document.querySelector(`[data-number="${number}"]`);
        if (!cell) return;

        const isExtracted = this.extractedNumbers.includes(number);
        
        if (isExtracted) {
            // Rimuovi dalla lista estratti
            const index = this.extractedNumbers.indexOf(number);
            this.extractedNumbers.splice(index, 1);
            this.numbers.push(number);
            this.numbers.sort((a, b) => a - b);
            
            // Aggiorna interfaccia
            cell.classList.remove('extracted', 'current');
            if (this.currentNumber === number) {
                this.currentNumber = this.extractedNumbers[this.extractedNumbers.length - 1] || null;
            }
        } else {
            // Aggiungi alla lista estratti
            if (!this.extractedNumbers.includes(number)) {
                const index = this.numbers.indexOf(number);
                if (index > -1) {
                    this.numbers.splice(index, 1);
                    this.extractedNumbers.push(number);
                    
                    // Rimuovi evidenziazione precedente
                    if (this.currentNumber) {
                        const prevCell = document.querySelector(`[data-number="${this.currentNumber}"]`);
                        if (prevCell) {
                            prevCell.classList.remove('current');
                        }
                    }
                    
                    this.currentNumber = number;
                    cell.classList.add('extracted', 'current');
                    this.updateCurrentNumberDisplay(number);
                }
            }
        }
        
        this.updateStats();
    }

    updateCurrentNumberDisplay(number) {
        this.currentNumberDisplay.textContent = number;
        this.currentNumberDisplay.style.animation = 'none';
        setTimeout(() => {
            this.currentNumberDisplay.style.animation = 'pulse 2s infinite';
        }, 10);
    }

    updateBoardCell(number) {
        const cell = document.querySelector(`[data-number="${number}"]`);
        if (cell) {
            cell.classList.add('extracted', 'current');
        }
    }





    updateStats() {
        if (this.extractedCountDisplay) {
            this.extractedCountDisplay.textContent = this.extractedNumbers.length;
        }
        if (this.remainingCountDisplay) {
            this.remainingCountDisplay.textContent = this.numbers.length;
        }
        
        // Gestisci lo stato dei pulsanti
        if (this.numbers.length === 0) {
            if (this.autoGameRunning) {
                this.stopAutoGame();
            }
            if (this.extractBtn) {
                this.extractBtn.disabled = true;
                this.extractBtn.textContent = 'Gioco Terminato';
            }
            if (this.startGameBtn) {
                this.startGameBtn.disabled = true;
                this.startGameBtn.textContent = 'Gioco Terminato';
            }
        } else if (!this.autoGameRunning) {
            if (this.extractBtn) {
                this.extractBtn.disabled = false;
                this.extractBtn.textContent = 'Estrai Numero';
            }
            if (this.startGameBtn) {
                this.startGameBtn.disabled = false;
                this.startGameBtn.textContent = 'Inizio Partita';
            }
        }
    }

    speakNumber(number) {
        // Controlla se il browser supporta la sintesi vocale
        if ('speechSynthesis' in window) {
            try {
                // Ferma eventuali annunci precedenti
                window.speechSynthesis.cancel();
                
                // Aspetta un momento per assicurarsi che sia pronto
                setTimeout(() => {
                    // Crea il messaggio da pronunciare
                    const utterance = new SpeechSynthesisUtterance(number.toString());
                    
                    // Configura le impostazioni vocali
                    utterance.lang = 'it-IT'; // Italiano
                    utterance.rate = 0.7;     // Velocità più lenta
                    utterance.pitch = 1.0;    // Tono normale
                    utterance.volume = 1.0;   // Volume massimo
                    
                    // Gestione eventi
                    utterance.onstart = () => console.log(`Pronunciando: ${number}`);
                    utterance.onerror = (event) => {
                        console.error('Errore sintesi vocale:', event.error);
                        // Fallback: prova con voce di sistema
                        this.speakNumberFallback(number);
                    };
                    
                    // Pronuncia il numero
                    window.speechSynthesis.speak(utterance);
                }, 100);
                
            } catch (error) {
                console.error('Errore durante la sintesi vocale:', error);
                this.speakNumberFallback(number);
            }
        } else {
            console.warn('Sintesi vocale non supportata da questo browser');
        }
    }
    
    speakNumberFallback(number) {
        // Tentativo alternativo con configurazione base
        try {
            const utterance = new SpeechSynthesisUtterance(number.toString());
            utterance.rate = 0.8;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Anche il fallback della sintesi vocale ha fallito:', error);
        }
    }
    
    startAutoGame() {
        // Reset automatico del tabellone
        this.resetGameSilent();
        
        // Imposta lo stato del gioco automatico
        this.autoGameRunning = true;
        this.autoGamePaused = false;
        this.gameStarted = true;
        
        // Aggiorna i pulsanti
        if (this.startGameBtn) {
            this.startGameBtn.disabled = true;
            this.startGameBtn.textContent = 'Partita in Corso';
        }
        if (this.pauseResumeBtn) {
            this.pauseResumeBtn.disabled = false;
            this.pauseResumeBtn.textContent = 'Pausa';
        }
        if (this.extractBtn) {
            this.extractBtn.disabled = true;
        }
        
        // Avvia l'estrazione automatica usando il tempo configurato
        const intervalMs = this.config.autoExtractionInterval * 1000;
        this.autoGameInterval = setInterval(() => {
            if (!this.autoGamePaused && this.numbers.length > 0) {
                this.extractNumber();
            } else if (this.numbers.length === 0) {
                this.stopAutoGame();
            }
        }, intervalMs);
        
        // Estrai il primo numero immediatamente
        if (this.numbers.length > 0) {
            this.extractNumber();
        }
    }
    
    stopAutoGame() {
        this.autoGameRunning = false;
        this.autoGamePaused = false;
        
        if (this.autoGameInterval) {
            clearInterval(this.autoGameInterval);
            this.autoGameInterval = null;
        }
        
        // Ripristina i pulsanti
        if (this.startGameBtn) {
            this.startGameBtn.disabled = false;
            this.startGameBtn.textContent = 'Inizio Partita';
        }
        if (this.pauseResumeBtn) {
            this.pauseResumeBtn.disabled = true;
            this.pauseResumeBtn.textContent = 'Pausa';
        }
        if (this.extractBtn) {
            this.extractBtn.disabled = false;
        }
    }
    
    togglePauseResume() {
        if (!this.autoGameRunning) return;
        
        this.autoGamePaused = !this.autoGamePaused;
        
        if (this.pauseResumeBtn) {
            if (this.autoGamePaused) {
                this.pauseResumeBtn.textContent = 'Riprendi';
                this.pauseResumeBtn.classList.remove('btn-secondary');
                this.pauseResumeBtn.classList.add('btn-primary');
            } else {
                this.pauseResumeBtn.textContent = 'Pausa';
                this.pauseResumeBtn.classList.remove('btn-primary');
                this.pauseResumeBtn.classList.add('btn-secondary');
            }
        }
    }
    
    openSettingsModal() {
        console.log('📋 Apertura modal impostazioni...');
        const modal = document.getElementById('settingsModal');
        const intervalInput = document.getElementById('intervalInput');
        const currentInterval = document.getElementById('currentInterval');
        
        console.log('📋 Elementi trovati:', { modal: !!modal, intervalInput: !!intervalInput, currentInterval: !!currentInterval });
        
        if (modal && intervalInput && currentInterval) {
            // Mostra i valori attuali
            intervalInput.value = this.config.autoExtractionInterval;
            currentInterval.textContent = this.config.autoExtractionInterval;
            
            // Mostra il modal
            modal.style.display = 'flex';
            console.log('📋 Modal mostrato');
        } else {
            console.error('❌ Elementi del modal non trovati');
        }
    }
    
    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async saveSettings() {
        const intervalInput = document.getElementById('intervalInput');
        if (!intervalInput) return;
        
        const newInterval = parseInt(intervalInput.value);
        if (newInterval < 1 || newInterval > 60) {
            alert('Il valore deve essere compreso tra 1 e 60 secondi.');
            return;
        }
        
        // Aggiorna la configurazione
        this.config.autoExtractionInterval = newInterval;
        
        // Se il gioco automatico è in corso, riavvialo con il nuovo intervallo
        if (this.autoGameRunning) {
            const wasPaused = this.autoGamePaused;
            this.stopAutoGame();
            setTimeout(() => {
                this.startAutoGame();
                if (wasPaused) {
                    this.togglePauseResume();
                }
            }, 100);
        }
        
        // Salva nel file di configurazione
        try {
            const configData = {
                gameSettings: this.config
            };
            
            // Simula il salvataggio (in un'applicazione reale servirebbe un backend)
            console.log('💾 Configurazione salvata:', configData);
            localStorage.setItem('tombolaConfig', JSON.stringify(configData));
            
            this.showNotification(`⚙️ Impostazioni salvate! Nuovo intervallo: ${newInterval} secondi`);
        } catch (error) {
            console.error('Errore nel salvataggio della configurazione:', error);
            this.showNotification('⚠️ Errore nel salvataggio delle impostazioni', 'error');
        }
        
        this.closeSettingsModal();
    }
    
    bindSettingsModal() {
        // Chiusura modal
        const closeBtn = document.getElementById('closeSettingsModal');
        const cancelBtn = document.getElementById('cancelSettings');
        const saveBtn = document.getElementById('saveSettings');
        const modal = document.getElementById('settingsModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSettingsModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeSettingsModal());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // Chiusura cliccando fuori dal modal
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeSettingsModal();
                }
            });
        }
        
        // Chiusura con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettingsModal();
            }
        });
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 3000;
            max-width: 300px;
            animation: slideInRight 0.5s ease, fadeOut 0.5s ease 3s forwards;
            background: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 4000);
    }
    
    resetGameSilent() {
        // Ferma il gioco automatico se attivo
        this.stopAutoGame();
        
        // Reset dello stato del gioco
        this.numbers = Array.from({ length: 90 }, (_, i) => i + 1);
        this.extractedNumbers = [];
        this.currentNumber = null;
        this.gameStarted = false;
        
        // Reset dell'interfaccia
        this.currentNumberDisplay.textContent = '-';
        
        // Reset del tabellone
        const cells = document.querySelectorAll('.number-cell');
        cells.forEach(cell => {
            cell.classList.remove('extracted', 'current');
        });
        
        // Aggiorna statistiche
        this.updateStats();
    }

    playExtractAnimation(number) {
        // Crea un effetto di estrazione con il numero che appare al centro
        const announcement = document.createElement('div');
        announcement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 4em;
            font-weight: bold;
            color: #f39c12;
            text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
            z-index: 1000;
            animation: announceNumber 2s ease-out forwards;
            pointer-events: none;
        `;
        announcement.textContent = number;
        
        // Aggiungi keyframe per l'animazione
        if (!document.getElementById('announceAnimation')) {
            const style = document.createElement('style');
            style.id = 'announceAnimation';
            style.textContent = `
                @keyframes announceNumber {
                    0% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.5); 
                    }
                    30% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1.2); 
                    }
                    70% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.8); 
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 2000);
    }

    showGameComplete() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;
        
        content.innerHTML = `
            <h2 style="color: #2c3e50; margin-bottom: 20px; font-size: 2em;">🎉 GIOCO COMPLETATO! 🎉</h2>
            <p style="color: #7f8c8d; font-size: 1.1em; margin-bottom: 20px;">
                Tutti i 90 numeri sono stati estratti!
            </p>
            <button id="closeModal" style="
                padding: 12px 25px;
                background: linear-gradient(45deg, #e74c3c, #c0392b);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1.1em;
                cursor: pointer;
                font-weight: bold;
            ">Chiudi</button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        content.querySelector('#closeModal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    resetGame() {
        if (this.gameStarted && this.extractedNumbers.length > 0) {
            const confirmed = confirm('Sei sicuro di voler resettare il gioco? Tutti i progressi andranno persi.');
            if (!confirmed) return;
        }

        // Ferma il gioco automatico se attivo
        this.stopAutoGame();
        
        // Reset dello stato del gioco
        this.numbers = Array.from({ length: 90 }, (_, i) => i + 1);
        this.extractedNumbers = [];
        this.currentNumber = null;
        this.gameStarted = false;
        
        // Reset dell'interfaccia
        this.currentNumberDisplay.textContent = '-';
        
        // Reset del tabellone
        const cells = document.querySelectorAll('.number-cell');
        cells.forEach(cell => {
            cell.classList.remove('extracted', 'current');
        });
        
        // Aggiorna statistiche
        this.updateStats();
        
        // Messaggio di conferma
        const resetMessage = document.createElement('div');
        resetMessage.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 1000;
            animation: slideInRight 0.5s ease, fadeOut 0.5s ease 2s forwards;
        `;
        resetMessage.textContent = '✓ Gioco resettato con successo!';
        
        // Aggiungi animazioni se non esistono
        if (!document.getElementById('resetAnimations')) {
            const style = document.createElement('style');
            style.id = 'resetAnimations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(resetMessage);
        
        setTimeout(() => {
            if (document.body.contains(resetMessage)) {
                document.body.removeChild(resetMessage);
            }
        }, 3000);
    }
}

// Inizializza il gioco quando la pagina è caricata
document.addEventListener('DOMContentLoaded', () => {
    try {
        new TombolaGame();
        console.log('🎯 Tombola inizializzata!');
    } catch (error) {
        console.error('Errore nel caricamento della tombola:', error);
    }
});