const calendar = document.getElementById('calendar');
const taskList = document.getElementById('taskList');
const taskInput = document.getElementById('taskInput');
const taskTime = document.getElementById('taskTime');
const addButton = document.querySelector('.task-form button');
const cancelButton = document.querySelector('.cancel-edit-button');
const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const today = new Date();

let currentTasks = [];
let activeFilter = null;
let editingTaskId = null;
let alarmAudio = new Audio();
let currentAlarmTimeout = null;

// Cria a semana atual no calendário
function createCalendarWeek() {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    calendar.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const btn = document.createElement('div');
        btn.className = 'day' + (date.toDateString() === today.toDateString() ? ' active' : '');
        btn.innerHTML = `${days[date.getDay()]}<br>${date.getDate()}/${date.getMonth() + 1}`;
        btn.onclick = () => filterTasksByDate(date);
        calendar.appendChild(btn);
    }
}

// Adiciona ou edita tarefa
function addTask() {
    const desc = taskInput.value.trim();
    const time = taskTime.value;
    if (!desc || !time) return;

    let task;
    if (editingTaskId) {
        task = currentTasks.find(t => t.id === editingTaskId);
        if (task) {
            task.desc = desc;
            task.time = time;
            editingTaskId = null;
            addButton.textContent = 'Adicionar Tarefa';
            cancelButton.style.display = 'none';
        }
    } else {
        task = { id: Date.now(), desc, time, done: false };
        currentTasks.push(task);
    }

    saveTasks();
    renderTasks();
    taskInput.value = '';
    taskTime.value = '';
    scheduleNotification(task);
}

// Agendar notificação com verificação de tempo
function scheduleNotification(task) {
    const taskDate = new Date(task.time);
    const now = Date.now();
    const delay = taskDate.getTime() - now;

    if (delay >= 0) {
        const notify = () => {
            setTimeout(() => {
                showNotification(task);
            }, delay);
        };

        if (Notification.permission === 'granted') {
            notify();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') notify();
            });
        }
    } else {
        console.log(`Tarefa "${task.desc}" já está no passado. Ignorando notificação.`);
    }
}

// Mostra notificação e toca som
function showNotification(task) {
    new Notification(`Lembrete: ${task.desc}`, {
        body: `Agendada para ${new Date(task.time).toLocaleString()}`,
        icon: 'https://via.placeholder.com/128',
    });
    tocarAlarme();
}

// Toca o som de alarme com duração limitada
function tocarAlarme() {
    alarmAudio.currentTime = 0;
    alarmAudio.play().catch(e => console.warn("Erro ao tocar alarme:", e));
    clearTimeout(currentAlarmTimeout);
    currentAlarmTimeout = setTimeout(() => {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }, 15000); // toca por 15 segundos
}

// Renderiza as tarefas na tela
function renderTasks() {
    taskList.innerHTML = '';
    const tasks = getFilteredTasks();
    for (const task of tasks) {
        const div = document.createElement('div');
        div.className = 'task' + (task.done ? ' done' : '');
        div.innerHTML = `
            <strong>📝 ${task.desc}</strong>
            📅 ${new Date(task.time).toLocaleString()}
            <div class="task-icons">
                <i class="fas fa-edit" onclick="editTask(${task.id})"></i>
                <i class="fas fa-check" onclick="toggleDone(${task.id})"></i>
                <i class="fas fa-trash" onclick="deleteTask(${task.id})"></i>
            </div>`;
        taskList.appendChild(div);
    }
}

// Alterna entre tarefa concluída e pendente
function toggleDone(id) {
    const task = currentTasks.find(t => t.id === id);
    if (task) task.done = !task.done;
    saveTasks();
    renderTasks();
}

// Exclui uma tarefa
function deleteTask(id) {
    currentTasks = currentTasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

// Edita uma tarefa
function editTask(id) {
    const task = currentTasks.find(t => t.id === id);
    if (!task) return;
    taskInput.value = task.desc;
    taskTime.value = task.time;
    editingTaskId = id;
    addButton.textContent = 'Salvar Edição';
    cancelButton.style.display = 'inline-block';
    taskInput.style.border = '2px solid #0077cc';
}

// Cancela o modo de edição
function cancelEdit() {
    editingTaskId = null;
    addButton.textContent = 'Adicionar Tarefa';
    cancelButton.style.display = 'none';
    taskInput.value = '';
    taskTime.value = '';
    taskInput.style.border = '1px solid #ccc';
}

// Salva tarefas no localStorage
function saveTasks() {
    localStorage.setItem('tarefas', JSON.stringify(currentTasks));
}

// Carrega tarefas salvas e agenda notificações
function loadTasks() {
    const data = localStorage.getItem('tarefas');
    if (data) {
        currentTasks = JSON.parse(data);
        currentTasks.forEach(task => scheduleNotification(task));
    }
    renderTasks();
}

// Filtros
function filterTasks(status) {
    activeFilter = status;
    renderTasks();
}

function filterTasksByDate(date) {
    activeFilter = date.toDateString();
    renderTasks();
}

function getFilteredTasks() {
    if (!activeFilter) return currentTasks;
    if (activeFilter === 'hoje') {
        return currentTasks.filter(t => new Date(t.time).toDateString() === new Date().toDateString());
    } else if (activeFilter === 'semana') {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return currentTasks.filter(t => new Date(t.time) >= start && new Date(t.time) < end);
    } else if (activeFilter === 'concluidas') {
        return currentTasks.filter(t => t.done);
    } else {
        return currentTasks.filter(t => new Date(t.time).toDateString() === activeFilter);
    }
}

// Carrega o som de alarme do localStorage
function loadAlarmSound() {
    const savedSound = localStorage.getItem("customAlarmSound");
    if (savedSound) {
        alarmAudio.src = savedSound;
    } else {
        alarmAudio.src = "https://notificationsounds.com/storage/sounds/file-sounds-1152-pristine.mp3";
    }
}

// Permitir upload do som personalizado
document.getElementById('customSound').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            localStorage.setItem('customAlarmSound', evt.target.result);
            loadAlarmSound();
            alert('✅ Som personalizado salvo com sucesso!');
        };
        reader.readAsDataURL(file);
    } else {
        alert('⚠️ Por favor, selecione um arquivo de áudio válido.');
    }
});

// Botão para restaurar som padrão
document.getElementById('resetSound').addEventListener('click', function () {
    localStorage.removeItem('customAlarmSound');
    loadAlarmSound();
    alert('🔄 Som padrão restaurado.');
});

// Inicialização geral
loadTasks();
createCalendarWeek();
loadAlarmSound();

// Permissão de notificação
if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
}

// Service Worker PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (registration) {
        console.log('Service Worker registrado:', registration);
    }).catch(function (error) {
        console.error('Erro ao registrar Service Worker:', error);
    });
}

// Estilização do fundo ao carregar
window.onload = function () {
    document.body.style.backgroundImage = "url('assets/img/Plano de fundo.png')";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "transparent";
};


// Exibir botão "Voltar ao Topo" ao rolar
const btnTop = document.getElementById("btnTop");

window.onscroll = () => {
  if (document.documentElement.scrollTop > 200) {
    btnTop.classList.add("show");
  } else {
    btnTop.classList.remove("show");
  }
};

// Scroll suave ao topo
btnTop.onclick = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};
