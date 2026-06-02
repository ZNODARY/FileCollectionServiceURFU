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

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const notificationDiv = notification.querySelector('div');
    
    notificationText.innerText = message;
    
    if (type === 'success') {
        notificationDiv.style.borderLeftColor = '#4CAF50';
    } else if (type === 'error') {
        notificationDiv.style.borderLeftColor = '#ff4444';
    } else {
        notificationDiv.style.borderLeftColor = '#D479F5';
    }
    
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
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
    
    container.innerHTML = await Promise.all(events.map(async e => {
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
        
        const isOrganizer = await checkIsOrganizer(e.id, user.user_id);
        
        return `
            <div class="event-card" data-event-id="${e.id}">
                <div class="event-title">${e.title}</div>
                <div class="event-type">Тип: ${typeText}</div>
                <div class="event-status">Статус: ${statusText}</div>
                <div class="event-created">Создано: ${dateStr} в ${timeStr}</div>
                ${isOrganizer ? `
                    <div style="margin-top: 15px;">
                        <button class="invite-event-btn" data-event-id="${e.id}" style="background: #D479F5; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Пригласить</button>
                        <button class="participants-event-btn" data-event-id="${e.id}" style="background: #D479F5; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px;">Участники</button>
                    </div>
                ` : ''}
            </div>
        `;
    })).then(html => html.join(''));
    
    document.querySelectorAll('.invite-event-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const eventId = btn.dataset.eventId;
            await generateInvite(eventId);
        });
    });
    
    document.querySelectorAll('.participants-event-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const eventId = btn.dataset.eventId;
            await showParticipants(eventId);
        });
    });
}

async function checkIsOrganizer(eventId, userId) {
    const res = await fetch(`/api/events/${eventId}/is-organizer`);
    const data = await res.json();
    return data.is_organizer;
}

async function showParticipants(eventId) {
    const res = await fetch(`/api/events/${eventId}/participants`);
    if (res.ok) {
        const participants = await res.json();
        const container = document.getElementById('participantsList');
        
        if (participants.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: gray;">Нет участников</p>';
        } else {
            container.innerHTML = participants.map(p => `
                <div style="border-bottom: 1px solid #D479F5; padding: 15px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; font-size: 18px; color: #2B0738;">
                            ${p.user_full_name || p.user_email}
                        </div>
                        <div style="font-size: 14px; color: #666; margin-top: 5px;">
                            <span style="background: #F8E8FA; padding: 3px 10px; border-radius: 15px;">
                                ${p.role === 'organizer' ? 'Организатор' : (p.role === 'reviewer' ? 'Проверяющий' : 'Студент')}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: #999; margin-top: 5px;">
                            Присоединился: ${new Date(p.joined_at).toLocaleDateString('ru-RU')}
                        </div>
                    </div>
                    ${p.role !== 'organizer' ? `
                        <button class="remove-participant-btn" data-event-id="${eventId}" data-user-id="${p.user_id}" style="background: #ff4444; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Удалить</button>
                    ` : ''}
                </div>
            `).join('');
        }
        
        document.querySelectorAll('.remove-participant-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                const userId = btn.dataset.userId;
                pendingRemoveEventId = eventId;
                pendingRemoveUserId = userId;
                document.getElementById('confirmMessage').innerText = 'Вы уверены, что хотите удалить этого участника?';
                document.getElementById('confirmModal').style.display = 'block';
            });
        });
        
        document.getElementById('participantsModal').style.display = 'block';
    } else {
        const err = await res.json();
        showNotification(err.detail || 'Ошибка загрузки участников', 'error');
    }
}

let pendingRemoveEventId = null;
let pendingRemoveUserId = null;

async function generateInvite(eventId) {
    const res = await fetch(`/api/events/${eventId}/invites`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
    if (res.ok) {
        const data = await res.json();
        const inviteUrl = `${window.location.origin}/join.html?code=${data.code}`;
        const inviteInput = document.getElementById('inviteLinkInput');
        if (inviteInput) {
            inviteInput.value = inviteUrl;
        }
        const inviteModal = document.getElementById('inviteModal');
        if (inviteModal) {
            inviteModal.style.display = 'block';
        }
    } else {
        const err = await res.json();
        showNotification(err.detail || 'Ошибка создания приглашения', 'error');
    }
}

const inviteModal = document.getElementById('inviteModal');
const closeInviteModalBtn = document.getElementById('closeInviteModalBtn');
const copyInviteBtn = document.getElementById('copyInviteBtn');

if (closeInviteModalBtn) {
    closeInviteModalBtn.onclick = () => {
        if (inviteModal) inviteModal.style.display = 'none';
    };
}

if (copyInviteBtn) {
    copyInviteBtn.onclick = () => {
        const input = document.getElementById('inviteLinkInput');
        if (input) {
            input.select();
            document.execCommand('copy');
            showNotification('Ссылка скопирована', 'success');
        }
    };
}

const participantsModal = document.getElementById('participantsModal');
const closeParticipantsModalBtn = document.getElementById('closeParticipantsModalBtn');

if (closeParticipantsModalBtn) {
    closeParticipantsModalBtn.onclick = () => {
        if (participantsModal) participantsModal.style.display = 'none';
    };
}

const confirmModal = document.getElementById('confirmModal');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

if (confirmYesBtn) {
    confirmYesBtn.onclick = async () => {
        if (pendingRemoveEventId && pendingRemoveUserId) {
            const res = await fetch(`/api/events/${pendingRemoveEventId}/participants/${pendingRemoveUserId}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'}
            });
            
            if (res.ok) {
                showNotification('Участник удалён', 'success');
                await showParticipants(pendingRemoveEventId);
            } else {
                const err = await res.json();
                showNotification(err.detail || 'Ошибка удаления', 'error');
            }
        }
        confirmModal.style.display = 'none';
        pendingRemoveEventId = null;
        pendingRemoveUserId = null;
    };
}

if (confirmNoBtn) {
    confirmNoBtn.onclick = () => {
        confirmModal.style.display = 'none';
        pendingRemoveEventId = null;
        pendingRemoveUserId = null;
    };
}

window.onclick = (e) => {
    if (inviteModal && e.target === inviteModal) {
        inviteModal.style.display = 'none';
    }
    if (participantsModal && e.target === participantsModal) {
        participantsModal.style.display = 'none';
    }
    if (confirmModal && e.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
    if (modal && e.target === modal) {
        modal.style.display = 'none';
    }
};

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
        showNotification('Заполните все поля', 'error');
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
        showNotification('Работа загружена!', 'success');
        document.getElementById('workTitle').value = '';
        document.getElementById('workLink').value = '';
        loadMyWorks();
    } else {
        const err = await res.json();
        showNotification(err.detail || 'Ошибка загрузки', 'error');
    }
};

const modal = document.getElementById('eventModal');
const createBtn = document.getElementById('createEventBtn');
const closeBtn = document.getElementById('closeModalBtn');
if (createBtn) createBtn.onclick = () => modal.style.display = 'block';
if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';

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
        showNotification('Мероприятие создано!', 'success');
    } else {
        const err = await res.json();
        showNotification(err.detail || 'Ошибка создания', 'error');
    }
};

loadEvents();