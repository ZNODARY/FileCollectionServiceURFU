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


// Выпадающее меню профиля
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

// Закрыть dropdown при клике вне его
document.addEventListener('click', (e) => {
    if (profileDropdown && profileBtn && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('show');
        if (profileArrow) {
            profileArrow.classList.remove('rotated');
        }
    }
});

// Выход
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    };
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
    container.innerHTML = events.map(e => `
        <div style="border: 1px solid #D479F5; border-radius: 10px; padding: 20px; margin-bottom: 15px;">
            <strong style="font-size: 24px;">${e.title}</strong><br>
            <span>Тип: ${e.event_type}</span><br>
            <span>Статус: ${e.status}</span><br>
            <small>Создано: ${new Date(e.created_at).toLocaleDateString()}</small>
        </div>
    `).join('');
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
    const res = await fetch('/api/events/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            event_type: document.getElementById('eventType').value,
            criteria: [],
            review_timeout_hours: parseInt(document.getElementById('timeout').value) || 48
        })
    });
    if (res.ok) {
        modal.style.display = 'none';
        document.getElementById('createEventForm').reset();
        loadEvents();
        alert('Мероприятие создано!');
    } else {
        const err = await res.json();
        alert('Ошибка: ' + (err.detail || 'Неизвестная ошибка'));
    }
};

loadEvents();