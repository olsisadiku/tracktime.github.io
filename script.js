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

        if (!text) return;

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

    renderTasks() {
        this.tasksList.innerHTML = '';

        this.tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;

            taskElement.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-text">${task.text}</span>
                </div>
                <div class="task-time-info">
                    <div class="time-input-group">
                        <input type="number" class="time-input planned-time" 
                               value="${task.plannedTime}" min="0.5" step="0.5">
                        <span class="time-label">planned (h)</span>
                    </div>
                    <div class="time-input-group">
                        <input type="number" class="time-input actual-time" 
                               value="${task.actualTime}" min="0" step="0.25">
                        <span class="time-label">actual (h)</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-small btn-edit">Edit</button>
                    <button class="btn-small btn-delete">Delete</button>
                </div>
            `;

            const checkbox = taskElement.querySelector('.task-checkbox');
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
        let color;
        
        if (percentage >= 80) {
            color = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        } else if (percentage >= 60) {
            color = 'linear-gradient(90deg, #f39c12, #e67e22)';
        } else if (percentage >= 40) {
            color = 'linear-gradient(90deg, #e74c3c, #c0392b)';
        } else {
            color = 'linear-gradient(90deg, #95a5a6, #7f8c8d)';
        }
        
        progressFill.style.background = color;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TaskTracker();
});