function showPanel(panelName) {
    document.getElementById('eventsPanel').classList.add('hidden');
    document.getElementById('myWorksPanel').classList.add('hidden');
    document.getElementById('queuePanel').classList.add('hidden');
    document.getElementById('resultsPanel').classList.add('hidden');
    document.getElementById(panelName + 'Panel').classList.remove('hidden');
}

document.querySelectorAll('.sidebar-menu__item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.sidebar-menu__item').forEach(i => i.classList.remove('sidebar-menu__item--active'));
        item.classList.add('sidebar-menu__item--active');
        const page = item.dataset.page;
        if (page === 'events') showPanel('events');
        else if (page === 'my-works') { showPanel('myWorks'); loadEventsForSelect(); loadMyWorks(); }
        else if (page === 'queue') showPanel('queue');
        else if (page === 'results') showPanel('results');
    };
});

const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const profileArrow = document.querySelector('.sidebar-profile__arrow');

if (profileBtn) {
    profileBtn.onclick = (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
        if (profileArrow) {
            profileArrow.classList.toggle('rotated');
        }
    };
}

document.addEventListener('click', (e) => {
    if (profileDropdown && profileBtn && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
        if (profileArrow) {
            profileArrow.classList.remove('rotated');
        }
    }
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    };
}

const eventTypeSelect = document.getElementById('eventType');
const peerCountBlock = document.getElementById('peerCountBlock');

if (eventTypeSelect && peerCountBlock) {
    eventTypeSelect.addEventListener('change', function() {
        if (this.value === 'peer') {
            peerCountBlock.style.display = 'block';
        } else {
            peerCountBlock.style.display = 'none';
        }
    });
}

async function loadEvents() {
    const res = await fetch('/api/auth/me');
    const user = await res.json();
    if (!user.authenticated) window.location.href = '/login.html';
    
    const eventsRes = await fetch('/api/events/my');
    const events = await eventsRes.json();
    const container = document.getElementById('eventsList');
    if (events.length === 0) {
        container.innerHTML = '<p class="events-board__placeholder">Нет мероприятий. Создайте первое!</p>';
        return;
    }
    container.innerHTML = events.map(e => {
        let typeText = '';
        if (e.event_type === 'expert') typeText = 'Экспертная проверка';
        else if (e.event_type === 'peer') typeText = 'P2P проверка';
        else typeText = 'Конкурсное голосование';
        
        let statusText = '';
        if (e.status === 'draft') statusText = 'Черновик';
        else if (e.status === 'active') statusText = 'Активен';
        else statusText = 'Завершён';
        
        const date = new Date(e.created_at);
        const dateStr = date.toLocaleDateString('ru-RU');
        const timeStr = date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
        
        return `
            <div class="event-card">
                <div class="event-title">${e.title}</div>
                <div class="event-type">Тип: ${typeText}</div>
                <div class="event-status">Статус: ${statusText}</div>
                <div class="event-created">Создано: ${dateStr} в ${timeStr}</div>
            </div>
        `;
    }).join('');
}

async function loadEventsForSelect() {
    const res = await fetch('/api/events/my');
    const events = await res.json();
    const select = document.getElementById('uploadEventSelect');
    select.innerHTML = '<option value="">Выберите мероприятие</option>';
    events.forEach(e => {
        select.innerHTML += `<option value="${e.id}">${e.title}</option>`;
    });
}

async function loadMyWorks() {
    const res = await fetch('/api/works/my');
    const works = await res.json();
    const container = document.getElementById('worksList');
    if (works.length === 0) {
        container.innerHTML = '<p class="events-board__placeholder">У вас нет загруженных работ</p>';
        return;
    }
    container.innerHTML = works.map(w => `
        <div class="work-card">
            <div class="work-title">${w.title}</div>
            <a href="${w.link}" class="work-link" target="_blank">Открыть работу</a><br>
            <span class="work-status ${w.status === 'reviewed' ? 'status-reviewed' : 'status-pending'}">
                ${w.status === 'reviewed' ? '✅ Проверено' : '⏳ Ожидает проверки'}
            </span>
            <div style="margin-top: 10px; font-size: 14px; color: gray;">
                Загружено: ${new Date(w.created_at).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

document.getElementById('uploadWorkBtn').onclick = async () => {
    const eventId = document.getElementById('uploadEventSelect').value;
    const title = document.getElementById('workTitle').value;
    const link = document.getElementById('workLink').value;
    if (!eventId || !title || !link) {
        alert('Заполните все поля');
        return;
    }
    const res = await fetch('/api/works/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            event_id: parseInt(eventId),
            title: title,
            link: link
        })
    });
    if (res.ok) {
        alert('Работа загружена!');
        document.getElementById('workTitle').value = '';
        document.getElementById('workLink').value = '';
        loadMyWorks();
    } else {
        const err = await res.json();
        alert('Ошибка: ' + (err.detail || 'Неизвестная ошибка'));
    }
};

const modal = document.getElementById('eventModal');
const createBtn = document.getElementById('createEventBtn');
const closeBtn = document.getElementById('closeModalBtn');
if (createBtn) createBtn.onclick = () => modal.style.display = 'block';
if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

document.getElementById('createEventForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const requestBody = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        event_type: document.getElementById('eventType').value,
        criteria: [],
        review_timeout_hours: parseInt(document.getElementById('timeout').value) || 48
    };
    
    if (document.getElementById('eventType').value === 'peer') {
        requestBody.peer_review_count = parseInt(document.getElementById('peerCount').value) || 2;
    }
    
    const res = await fetch('/api/events/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestBody)
    });
    
    if (res.ok) {
        modal.style.display = 'none';
        document.getElementById('createEventForm').reset();
        if (peerCountBlock) peerCountBlock.style.display = 'none';
        loadEvents();
        alert('Мероприятие создано!');
    } else {
        const err = await res.json();
        alert('Ошибка: ' + (err.detail || 'Неизвестная ошибка'));
    }
};

loadEvents();