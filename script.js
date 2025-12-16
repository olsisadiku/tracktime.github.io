class TaskTracker {
    constructor() {
        this.tasks = this.loadTasks();
        this.init();
        this.updateAnalytics();
    }

    init() {
        this.taskInput = document.getElementById('taskInput');
        this.plannedTimeInput = document.getElementById('plannedTime');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.tasksList = document.getElementById('tasksList');
        this.emptyState = document.getElementById('emptyState');
        this.taskCount = document.getElementById('taskCount');

        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        this.renderTasks();
    }

    loadTasks() {
        const saved = localStorage.getItem('time-tracker-tasks');
        return saved ? JSON.parse(saved) : [];
    }

    saveTasks() {
        localStorage.setItem('time-tracker-tasks', JSON.stringify(this.tasks));
    }

    addTask() {
        const text = this.taskInput.value.trim();
        const plannedTime = parseFloat(this.plannedTimeInput.value) || 1;

        if (!text) {
            this.taskInput.focus();
            return;
        }

        const task = {
            id: Date.now(),
            text,
            plannedTime,
            actualTime: 0,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateAnalytics();

        this.taskInput.value = '';
        this.plannedTimeInput.value = '';
        this.taskInput.focus();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.updateAnalytics();
    }

    toggleComplete(id) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderTasks();
            this.updateAnalytics();
        }
    }

    updateActualTime(id, newTime) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.actualTime = Math.max(0, parseFloat(newTime) || 0);
            this.saveTasks();
            this.updateAnalytics();
        }
    }

    updatePlannedTime(id, newTime) {
        const task = this.tasks.find(task => task.id === id);
        if (task) {
            task.plannedTime = Math.max(0.5, parseFloat(newTime) || 0.5);
            this.saveTasks();
            this.updateAnalytics();
        }
    }

    editTask(id) {
        const task = this.tasks.find(task => task.id === id);
        if (!task) return;

        const newText = prompt('Edit task:', task.text);
        if (newText !== null && newText.trim()) {
            task.text = newText.trim();
            this.saveTasks();
            this.renderTasks();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateEmptyState() {
        if (this.tasks.length === 0) {
            this.emptyState.style.display = 'flex';
        } else {
            this.emptyState.style.display = 'none';
        }

        const taskText = this.tasks.length === 1 ? 'task' : 'tasks';
        this.taskCount.textContent = `${this.tasks.length} ${taskText}`;
    }

    renderTasks() {
        const existingTasks = this.tasksList.querySelectorAll('.task-item');
        existingTasks.forEach(task => task.remove());

        this.tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;

            taskElement.innerHTML = `
                <label class="task-checkbox">
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <div class="task-content">
                    <span class="task-text">${this.escapeHtml(task.text)}</span>
                </div>
                <div class="task-time-info">
                    <div class="time-input-group">
                        <input type="number" class="time-input planned-time"
                               value="${task.plannedTime}" min="0.5" step="0.5">
                        <span class="time-label">Plan</span>
                    </div>
                    <div class="time-input-group">
                        <input type="number" class="time-input actual-time"
                               value="${task.actualTime}" min="0" step="0.25">
                        <span class="time-label">Actual</span>
                    </div>
                </div>
                <div class="task-actions">
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

            checkbox.addEventListener('change', () => this.toggleComplete(task.id));
            editBtn.addEventListener('click', () => this.editTask(task.id));
            deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

            plannedTimeInput.addEventListener('change', (e) => {
                this.updatePlannedTime(task.id, e.target.value);
            });

            actualTimeInput.addEventListener('change', (e) => {
                this.updateActualTime(task.id, e.target.value);
            });

            this.tasksList.appendChild(taskElement);
        });

        this.updateEmptyState();
    }

    getTasksInLast16Hours() {
        const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000);
        return this.tasks.filter(task => new Date(task.createdAt) >= sixteenHoursAgo);
    }

    updateAnalytics() {
        const recentTasks = this.getTasksInLast16Hours();
        const totalTasks = recentTasks.length;
        const completedTasks = recentTasks.filter(task => task.completed).length;
        const totalPlannedTime = recentTasks.reduce((sum, task) => sum + task.plannedTime, 0);
        const totalActualTime = recentTasks.reduce((sum, task) => sum + task.actualTime, 0);

        const efficiency = totalPlannedTime > 0 ? Math.round((totalPlannedTime / Math.max(totalActualTime, 0.1)) * 100) : 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const progressPercentage = Math.min(100, totalTasks > 0 ?
            Math.round(((completedTasks / totalTasks) * 0.7 + (Math.min(efficiency, 100) / 100) * 0.3) * 100) : 0);

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('totalPlannedTime').textContent = totalPlannedTime.toFixed(1) + 'h';
        document.getElementById('totalActualTime').textContent = totalActualTime.toFixed(1) + 'h';
        document.getElementById('efficiency').textContent = efficiency + '%';
        document.getElementById('todayProgress').textContent = completionRate + '%';
        document.getElementById('progressFill').style.width = progressPercentage + '%';

        this.updateProgressColor(progressPercentage);
    }

    updateProgressColor(percentage) {
        const progressFill = document.getElementById('progressFill');
        let gradient;

        if (percentage >= 80) {
            gradient = 'linear-gradient(90deg, #22c55e, #4ade80)';
        } else if (percentage >= 60) {
            gradient = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        } else if (percentage >= 40) {
            gradient = 'linear-gradient(90deg, #ef4444, #f87171)';
        } else {
            gradient = 'linear-gradient(90deg, #6366f1, #818cf8)';
        }

        progressFill.style.background = gradient;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TaskTracker();
});
