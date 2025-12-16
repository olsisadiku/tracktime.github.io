class TaskTracker {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.db = null;
        this.tasksCollection = null;
        this.useFirebase = false;

        this.initFirebase();
    }

    async initFirebase() {
        // Check if Firebase config exists
        if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
            try {
                firebase.initializeApp(firebaseConfig);
                this.db = firebase.firestore();
                this.tasksCollection = this.db.collection('tasks');
                this.useFirebase = true;
                console.log('Firebase connected');

                // Listen for real-time updates
                this.tasksCollection.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
                    this.tasks = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    this.renderTasks();
                    this.updateAnalytics();
                });
            } catch (error) {
                console.warn('Firebase init failed, using localStorage:', error);
                this.useFirebase = false;
                this.loadFromLocalStorage();
            }
        } else {
            console.log('No Firebase config found, using localStorage');
            this.loadFromLocalStorage();
        }

        this.init();
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('time-tracker-tasks');
        this.tasks = saved ? JSON.parse(saved) : [];
        this.renderTasks();
        this.updateAnalytics();
    }

    saveToLocalStorage() {
        localStorage.setItem('time-tracker-tasks', JSON.stringify(this.tasks));
    }

    getToday() {
        return new Date().toISOString().split('T')[0];
    }

    init() {
        this.taskInput = document.getElementById('taskInput');
        this.plannedTimeInput = document.getElementById('plannedTime');
        this.taskDateInput = document.getElementById('taskDate');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.tasksList = document.getElementById('tasksList');
        this.emptyState = document.getElementById('emptyState');
        this.filterTabs = document.querySelectorAll('.filter-tab');

        // Set default date to today
        this.taskDateInput.value = this.getToday();

        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        this.plannedTimeInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newVal = Math.max(5, (parseFloat(e.target.value) || 0) + 5);
                e.target.value = newVal;
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newVal = Math.max(5, (parseFloat(e.target.value) || 0) - 5);
                e.target.value = newVal;
            }
        });

        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => this.setFilter(tab.dataset.filter));
        });

        if (!this.useFirebase) {
            this.renderTasks();
            this.updateAnalytics();
        }
    }

    async addTask() {
        const text = this.taskInput.value.trim();
        const plannedTime = parseFloat(this.plannedTimeInput.value) || 15;
        const taskDate = this.taskDateInput.value || this.getToday();

        if (!text) {
            this.taskInput.focus();
            return;
        }

        const task = {
            text,
            plannedTime,
            actualTime: 0,
            completed: false,
            date: taskDate,
            createdAt: new Date().toISOString()
        };

        if (this.useFirebase) {
            try {
                await this.tasksCollection.add(task);
            } catch (error) {
                console.error('Error adding task:', error);
            }
        } else {
            task.id = Date.now().toString();
            this.tasks.unshift(task);
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateAnalytics();
        }

        this.taskInput.value = '';
        this.plannedTimeInput.value = '';
        this.taskDateInput.value = this.getToday();
        this.taskInput.focus();
    }

    async deleteTask(id) {
        if (this.useFirebase) {
            try {
                await this.tasksCollection.doc(id).delete();
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        } else {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateAnalytics();
        }
    }

    async toggleComplete(id) {
        const task = this.tasks.find(task => task.id === id);
        if (!task) return;

        if (this.useFirebase) {
            try {
                await this.tasksCollection.doc(id).update({
                    completed: !task.completed
                });
            } catch (error) {
                console.error('Error toggling task:', error);
            }
        } else {
            task.completed = !task.completed;
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateAnalytics();
        }
    }

    async updateActualTime(id, newTime) {
        const task = this.tasks.find(task => task.id === id);
        if (!task) return;

        const actualTime = Math.max(0, parseFloat(newTime) || 0);

        if (this.useFirebase) {
            try {
                await this.tasksCollection.doc(id).update({ actualTime });
            } catch (error) {
                console.error('Error updating actual time:', error);
            }
        } else {
            task.actualTime = actualTime;
            this.saveToLocalStorage();
            this.updateAnalytics();
        }
    }

    async updatePlannedTime(id, newTime) {
        const task = this.tasks.find(task => task.id === id);
        if (!task) return;

        const plannedTime = Math.max(5, parseFloat(newTime) || 5);

        if (this.useFirebase) {
            try {
                await this.tasksCollection.doc(id).update({ plannedTime });
            } catch (error) {
                console.error('Error updating planned time:', error);
            }
        } else {
            task.plannedTime = plannedTime;
            this.saveToLocalStorage();
            this.updateAnalytics();
        }
    }

    async moveToToday(id) {
        const task = this.tasks.find(task => task.id === id);
        if (!task) return;

        const today = this.getToday();

        if (this.useFirebase) {
            try {
                await this.tasksCollection.doc(id).update({ date: today });
            } catch (error) {
                console.error('Error moving task:', error);
            }
        } else {
            task.date = today;
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateAnalytics();
        }
    }

    async editTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (!task) return;

        const newText = prompt('Edit task:', task.text);
        if (newText !== null && newText.trim()) {
            if (this.useFirebase) {
                try {
                    await this.tasksCollection.doc(id).update({ text: newText.trim() });
                } catch (error) {
                    console.error('Error editing task:', error);
                }
            } else {
                task.text = newText.trim();
                this.saveToLocalStorage();
                this.renderTasks();
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        this.renderTasks();
    }

    getTodaysTasks() {
        const today = this.getToday();
        return this.tasks.filter(task => task.date === today || !task.date);
    }

    getCarryoverTasks() {
        const today = this.getToday();
        return this.tasks.filter(task => task.date && task.date < today && !task.completed);
    }

    getScheduledTasks() {
        const today = this.getToday();
        return this.tasks.filter(task => task.date && task.date > today);
    }

    getFilteredTasks() {
        const todaysTasks = this.getTodaysTasks();
        switch (this.currentFilter) {
            case 'active':
                return todaysTasks.filter(task => !task.completed);
            case 'completed':
                return todaysTasks.filter(task => task.completed);
            default:
                return todaysTasks;
        }
    }

    updateEmptyState() {
        const filteredTasks = this.getFilteredTasks();
        const carryoverTasks = this.getCarryoverTasks();
        const scheduledTasks = this.getScheduledTasks();

        if (filteredTasks.length === 0 && carryoverTasks.length === 0 && scheduledTasks.length === 0) {
            this.emptyState.style.display = 'flex';
            const h3 = this.emptyState.querySelector('h3');
            const p = this.emptyState.querySelector('p');

            const todaysTasks = this.getTodaysTasks();
            if (this.currentFilter === 'completed' && todaysTasks.length > 0) {
                h3.textContent = 'No completed tasks';
                p.textContent = 'Complete some tasks to see them here';
            } else if (this.currentFilter === 'active' && todaysTasks.length > 0) {
                h3.textContent = 'All caught up!';
                p.textContent = 'No active tasks remaining';
            } else {
                h3.textContent = 'No tasks yet';
                p.textContent = 'Add your first task to get started';
            }
        } else {
            this.emptyState.style.display = 'none';
        }

        // Update tab counts (today's tasks only)
        const todaysTasks = this.getTodaysTasks();
        document.getElementById('allCount').textContent = todaysTasks.length;
        document.getElementById('activeCount').textContent = todaysTasks.filter(t => !t.completed).length;
        document.getElementById('completedCount').textContent = todaysTasks.filter(t => t.completed).length;
    }

    createTaskElement(task, isCarryover = false, isScheduled = false) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''} ${isCarryover ? 'carryover' : ''} ${isScheduled ? 'scheduled' : ''}`;

        const carryoverAction = isCarryover ? `
            <button class="btn-icon btn-move" title="Move to today">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </button>
        ` : '';

        const scheduledAction = isScheduled ? `
            <button class="btn-icon btn-move" title="Move to today">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </button>
        ` : '';

        const dateLabel = isScheduled ? `<span class="task-date">${this.formatDate(task.date)}</span>` : '';

        taskElement.innerHTML = `
            <label class="task-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
            </label>
            <div class="task-content">
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                ${dateLabel}
            </div>
            <div class="task-time-info">
                <div class="time-input-group">
                    <input type="number" class="time-input planned-time"
                           value="${task.plannedTime}" min="5" step="5">
                    <span class="time-label">Plan</span>
                </div>
                <div class="time-input-group actual-group">
                    <input type="number" class="time-input actual-time"
                           value="${task.actualTime}" min="0" step="5">
                    <button class="btn-add-time" title="Add session time">+</button>
                    <span class="time-label">Actual</span>
                </div>
            </div>
            <div class="task-actions">
                ${carryoverAction}${scheduledAction}
                <button class="btn-icon btn-edit" title="Edit task">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-icon btn-delete" title="Delete task">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        `;

        const checkbox = taskElement.querySelector('.task-checkbox input');
        const editBtn = taskElement.querySelector('.btn-edit');
        const deleteBtn = taskElement.querySelector('.btn-delete');
        const plannedTimeInput = taskElement.querySelector('.planned-time');
        const actualTimeInput = taskElement.querySelector('.actual-time');
        const addTimeBtn = taskElement.querySelector('.btn-add-time');
        const moveBtn = taskElement.querySelector('.btn-move');

        checkbox.addEventListener('change', () => this.toggleComplete(task.id));
        editBtn.addEventListener('click', () => this.editTask(task.id));
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

        if (moveBtn) {
            moveBtn.addEventListener('click', () => this.moveToToday(task.id));
        }

        addTimeBtn.addEventListener('click', () => {
            const timeToAdd = prompt('Minutes to add:');
            if (timeToAdd !== null && timeToAdd.trim() !== '') {
                const minutes = parseFloat(timeToAdd);
                if (!isNaN(minutes) && minutes > 0) {
                    const newTotal = task.actualTime + minutes;
                    actualTimeInput.value = newTotal;
                    this.updateActualTime(task.id, newTotal);
                }
            }
        });

        plannedTimeInput.addEventListener('change', (e) => {
            this.updatePlannedTime(task.id, e.target.value);
        });

        plannedTimeInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newVal = Math.max(5, (parseFloat(e.target.value) || 0) + 5);
                e.target.value = newVal;
                this.updatePlannedTime(task.id, newVal);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newVal = Math.max(5, (parseFloat(e.target.value) || 0) - 5);
                e.target.value = newVal;
                this.updatePlannedTime(task.id, newVal);
            }
        });

        actualTimeInput.addEventListener('change', (e) => {
            this.updateActualTime(task.id, e.target.value);
        });

        actualTimeInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const newVal = Math.max(0, (parseFloat(e.target.value) || 0) + 5);
                e.target.value = newVal;
                this.updateActualTime(task.id, newVal);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const newVal = Math.max(0, (parseFloat(e.target.value) || 0) - 5);
                e.target.value = newVal;
                this.updateActualTime(task.id, newVal);
            }
        });

        return taskElement;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    renderTasks() {
        // Clear existing tasks and sections
        const existingTasks = this.tasksList.querySelectorAll('.task-item, .carryover-section, .scheduled-section');
        existingTasks.forEach(el => el.remove());

        const filteredTasks = this.getFilteredTasks();
        const carryoverTasks = this.getCarryoverTasks();
        const scheduledTasks = this.getScheduledTasks();

        // Render today's tasks
        filteredTasks.forEach(task => {
            this.tasksList.appendChild(this.createTaskElement(task, false, false));
        });

        // Render carryover section if there are incomplete tasks from previous days
        if (carryoverTasks.length > 0 && this.currentFilter !== 'completed') {
            const carryoverSection = document.createElement('div');
            carryoverSection.className = 'carryover-section';
            carryoverSection.innerHTML = `
                <div class="carryover-header">
                    <span>Unfinished from before</span>
                    <span class="carryover-count">${carryoverTasks.length}</span>
                </div>
            `;
            this.tasksList.appendChild(carryoverSection);

            carryoverTasks.forEach(task => {
                this.tasksList.appendChild(this.createTaskElement(task, true, false));
            });
        }

        // Render scheduled section if there are future tasks
        if (scheduledTasks.length > 0 && this.currentFilter !== 'completed') {
            const scheduledSection = document.createElement('div');
            scheduledSection.className = 'scheduled-section';
            scheduledSection.innerHTML = `
                <div class="scheduled-header">
                    <span>Scheduled</span>
                    <span class="scheduled-count">${scheduledTasks.length}</span>
                </div>
            `;
            this.tasksList.appendChild(scheduledSection);

            // Sort by date
            const sortedScheduled = [...scheduledTasks].sort((a, b) => a.date.localeCompare(b.date));
            sortedScheduled.forEach(task => {
                this.tasksList.appendChild(this.createTaskElement(task, false, true));
            });
        }

        this.updateEmptyState();
    }

    updateAnalytics() {
        const todaysTasks = this.getTodaysTasks();
        const totalTasks = todaysTasks.length;
        const completedTasksList = todaysTasks.filter(task => task.completed);
        const completedTasks = completedTasksList.length;
        const pendingTasks = totalTasks - completedTasks;
        const totalPlannedTime = todaysTasks.reduce((sum, task) => sum + task.plannedTime, 0);
        const totalActualTime = todaysTasks.reduce((sum, task) => sum + task.actualTime, 0);

        // Efficiency only for completed tasks: planned vs actual
        const completedPlanned = completedTasksList.reduce((sum, task) => sum + task.plannedTime, 0);
        const completedActual = completedTasksList.reduce((sum, task) => sum + task.actualTime, 0);
        const efficiency = completedActual > 0 ? Math.round((completedPlanned / completedActual) * 100) : 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Update sidebar stats
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('pendingTasks').textContent = pendingTasks;
        document.getElementById('totalHours').textContent = Math.round(totalActualTime) + 'm';
        document.getElementById('totalPlannedTime').textContent = Math.round(totalPlannedTime) + 'm';
        document.getElementById('totalActualTime').textContent = Math.round(totalActualTime) + 'm';
        document.getElementById('efficiency').textContent = efficiency + '%';
        document.getElementById('todayProgress').textContent = completionRate + '%';

        // Update progress ring
        this.updateProgressRing(completionRate);
    }

    updateProgressRing(percentage) {
        const progressRing = document.getElementById('progressRing');
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference - (percentage / 100) * circumference;

        progressRing.style.strokeDasharray = circumference;
        progressRing.style.strokeDashoffset = offset;

        // Update color based on percentage
        let color;
        if (percentage >= 80) {
            color = '#22c55e'; // green
        } else if (percentage >= 60) {
            color = '#eab308'; // yellow
        } else if (percentage >= 40) {
            color = '#f97316'; // orange
        } else {
            color = '#8b5cf6'; // purple (accent)
        }

        progressRing.style.stroke = color;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TaskTracker();
});
