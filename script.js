class QuickPad {
    constructor() {
        this.currentCategory = 'general';
        this.notes = this.loadNotes();
        this.autoSaveInterval = null;
        this.isDarkMode = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStats();
        this.renderSavedNotes();
        this.startAutoSave();
        this.updateStorageInfo();
        this.loadCategoryContent();
    }

    setupEventListeners() {
        const textarea = document.getElementById('mainTextarea');
        textarea.addEventListener('input', () => {
            this.updateStats();
            this.saveToCategory();
        });

        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });

        document.getElementById('copyBtn').addEventListener('click', () => this.copyText());
        document.getElementById('pasteBtn').addEventListener('click', () => this.pasteText());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearText());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveNamedNote());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportText());

        document.getElementById('upperCaseBtn').addEventListener('click', () => this.transformText('upper'));
        document.getElementById('lowerCaseBtn').addEventListener('click', () => this.transformText('lower'));
        document.getElementById('titleCaseBtn').addEventListener('click', () => this.transformText('title'));
        document.getElementById('timestampBtn').addEventListener('click', () => this.addTimestamp());

        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveNamedNote();
            }
        });
    }

    switchCategory(category) {
        this.saveToCategory();
        
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-brown-200');
            btn.classList.add('bg-beige-200');
        });
        
        const activeBtn = document.querySelector(`[data-category="${category}"]`);
        activeBtn.classList.add('active', 'bg-brown-200');
        activeBtn.classList.remove('bg-beige-200');
        
        this.currentCategory = category;
        
        const categoryNames = {
            general: '📄 General Notes',
            code: '💻 Code Snippets',
            todo: '✅ To-Do Lists',
            links: '🔗 Links & URLs'
        };
        document.getElementById('currentCategory').textContent = categoryNames[category];
        
        this.loadCategoryContent();
    }

    loadCategoryContent() {
        const content = this.notes.categories[this.currentCategory] || '';
        document.getElementById('mainTextarea').value = content;
        this.updateStats();
    }

    saveToCategory() {
        const content = document.getElementById('mainTextarea').value;
        if (!this.notes.categories) {
            this.notes.categories = {};
        }
        this.notes.categories[this.currentCategory] = content;
        this.saveNotes();
        this.updateLastSaved();
    }

    updateStats() {
        const text = document.getElementById('mainTextarea').value;
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const lines = text.split('\n').length;

        document.getElementById('charCount').textContent = chars;
        document.getElementById('wordCount').textContent = words;
        document.getElementById('lineCount').textContent = lines;
    }

    async copyText() {
        const text = document.getElementById('mainTextarea').value;
        try {
            await navigator.clipboard.writeText(text);
            this.showFeedback('copyBtn', 'copy-success');
        } catch (err) {
            document.getElementById('mainTextarea').select();
            document.execCommand('copy');
            this.showFeedback('copyBtn', 'copy-success');
        }
    }

    async pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            const textarea = document.getElementById('mainTextarea');
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentText = textarea.value;
            
            textarea.value = currentText.substring(0, start) + text + currentText.substring(end);
            textarea.setSelectionRange(start + text.length, start + text.length);
            
            this.updateStats();
            this.saveToCategory();
        } catch (err) {
            console.log('Paste failed:', err);
        }
    }

    clearText() {
        if (confirm('Are you sure you want to clear all text?')) {
            document.getElementById('mainTextarea').value = '';
            this.updateStats();
            this.saveToCategory();
        }
    }

    saveNamedNote() {
        const text = document.getElementById('mainTextarea').value.trim();
        if (!text) return;

        const title = prompt('Enter a name for this note:') || `Note ${Date.now()}`;
        const note = {
            id: Date.now(),
            title: title,
            content: text,
            category: this.currentCategory,
            timestamp: new Date().toLocaleString()
        };

        if (!this.notes.saved) {
            this.notes.saved = [];
        }
        
        this.notes.saved.unshift(note);
        this.saveNotes();
        this.renderSavedNotes();
        this.updateStorageInfo();
        this.showFeedback('saveBtn', 'save-pulse');
    }

    exportText() {
        const text = document.getElementById('mainTextarea').value;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quickpad-${this.currentCategory}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showFeedback('exportBtn', 'save-pulse');
    }

    transformText(type) {
        const textarea = document.getElementById('mainTextarea');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        if (!selectedText) return;
        
        let transformedText;
        switch (type) {
            case 'upper':
                transformedText = selectedText.toUpperCase();
                break;
            case 'lower':
                transformedText = selectedText.toLowerCase();
                break;
            case 'title':
                transformedText = selectedText.replace(/\w\S*/g, (txt) => 
                    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
                break;
        }
        
        textarea.value = textarea.value.substring(0, start) + transformedText + textarea.value.substring(end);
        textarea.setSelectionRange(start, start + transformedText.length);
        
        this.updateStats();
        this.saveToCategory();
    }

    addTimestamp() {
        const textarea = document.getElementById('mainTextarea');
        const timestamp = new Date().toLocaleString();
        const timestampText = `\n\n--- ${timestamp} ---\n`;
        
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(cursorPos);
        
        textarea.value = textBefore + timestampText + textAfter;
        textarea.setSelectionRange(cursorPos + timestampText.length, cursorPos + timestampText.length);
        
        this.updateStats();
        this.saveToCategory();
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-mode', this.isDarkMode);
        
        const themeBtn = document.getElementById('themeToggle');
        themeBtn.textContent = this.isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
        
        localStorage.setItem('quickpad-theme', this.isDarkMode ? 'dark' : 'light');
    }

    renderSavedNotes() {
        const container = document.getElementById('savedNotesList');
        const notes = this.notes.saved || [];
        
        if (notes.length === 0) {
            container.innerHTML = '<div class="text-sm text-brown-600 italic">No saved notes yet</div>';
            return;
        }
        
        container.innerHTML = notes.slice(0, 5).map(note => `
            <div class="saved-note-item bg-beige-200 p-2 border border-brown-200 cursor-pointer hover:bg-brown-200 transition-colors duration-200" onclick="quickPad.loadSavedNote(${note.id})">
                <div class="font-medium text-xs text-brown-800 truncate">${note.title}</div>
                <div class="text-xs text-brown-600">${note.timestamp}</div>
                <div class="text-xs text-brown-500 mt-1">${note.category}</div>
            </div>
        `).join('');
    }

    loadSavedNote(id) {
        const note = this.notes.saved.find(n => n.id === id);
        if (note) {
            document.getElementById('mainTextarea').value = note.content;
            this.updateStats();
        }
    }

    showFeedback(buttonId, className) {
        const button = document.getElementById(buttonId);
        button.classList.add(className);
        setTimeout(() => {
            button.classList.remove(className);
        }, 600);
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveToCategory();
        }, 30000);
    }

    updateLastSaved() {
        document.getElementById('lastSaved').textContent = new Date().toLocaleTimeString();
    }

    updateStorageInfo() {
        const notesJson = JSON.stringify(this.notes);
        const sizeInBytes = new Blob([notesJson]).size;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);
        
        document.getElementById('storageUsed').textContent = `${sizeInKB} KB`;
        document.getElementById('totalNotes').textContent = (this.notes.saved || []).length;
    }

    loadNotes() {
        try {
            const saved = localStorage.getItem('quickpad-notes');
            return saved ? JSON.parse(saved) : { categories: {}, saved: [] };
        } catch (err) {
            return { categories: {}, saved: [] };
        }
    }

    saveNotes() {
        try {
            localStorage.setItem('quickpad-notes', JSON.stringify(this.notes));
        } catch (err) {
            console.error('Failed to save notes:', err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.quickPad = new QuickPad();
    
    const savedTheme = localStorage.getItem('quickpad-theme');
    if (savedTheme === 'dark') {
        quickPad.toggleTheme();
    }
});
