let currentQueueEventId = null;
let currentReviewWorkId = null;
let pendingRemoveEventId = null;
let pendingRemoveUserId = null;
let pendingDeleteEventId = null;

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
        else if (page === 'queue') { showPanel('queue'); loadQueueEvents(); }
        else if (page === 'results') { showPanel('results'); loadResults('my'); }
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
                ${isOrganizer && e.status !== 'finished' ? `
                    <div style="margin-top: 15px;">
                        <button class="invite-event-btn" data-event-id="${e.id}" style="background: #D479F5; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Пригласить</button>
                        <button class="participants-event-btn" data-event-id="${e.id}" style="background: #D479F5; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px;">Участники</button>
                        <button class="delete-event-btn" data-event-id="${e.id}" style="background: #ff4444; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px;">Удалить</button>
                        ${e.event_type === 'peer' && e.status === 'draft' ? `
                            <button class="start-event-btn" data-event-id="${e.id}" style="background: #4CAF50; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-left: 10px;">Запустить P2P</button>
                        ` : ''}
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
    
    document.querySelectorAll('.delete-event-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const eventId = btn.dataset.eventId;
            pendingDeleteEventId = eventId;
            document.getElementById('confirmDeleteMessage').innerText = 'Вы уверены, что хотите удалить это мероприятие? Все данные будут потеряны.';
            document.getElementById('confirmDeleteModal').style.display = 'block';
        });
    });
    
    document.querySelectorAll('.start-event-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const eventId = btn.dataset.eventId;
            const res = await fetch(`/api/events/${eventId}/start`, { method: 'POST' });
            if (res.ok) {
                showNotification('Мероприятие запущено! Работы распределены.', 'success');
                loadEvents();
            } else {
                const err = await res.json();
                showNotification(err.detail || 'Ошибка запуска', 'error');
            }
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
                                ${p.role === 'organizer' ? '👑 Организатор' : (p.role === 'reviewer' ? '👨‍🏫 Проверяющий' : '👨‍🎓 Студент')}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: #999; margin-top: 5px;">
                            Присоединился: ${new Date(p.joined_at).toLocaleDateString('ru-RU')}
                        </div>
                    </div>
                    ${p.role !== 'organizer' ? `
                        <div style="display: flex; gap: 8px;">
                            <button class="change-role-btn" data-event-id="${eventId}" data-user-id="${p.user_id}" data-current-role="${p.role}" style="background: #4CAF50; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                                ${p.role === 'reviewer' ? 'Сделать участником' : 'Сделать проверяющим'}
                            </button>
                            <button class="remove-participant-btn" data-event-id="${eventId}" data-user-id="${p.user_id}" style="background: #ff4444; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Удалить</button>
                        </div>
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
        
        document.querySelectorAll('.change-role-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const eventId = btn.dataset.eventId;
                const userId = btn.dataset.userId;
                const currentRole = btn.dataset.currentRole;
                
                const newRole = currentRole === 'reviewer' ? 'performer' : 'reviewer';
                
                const res = await fetch(`/api/events/${eventId}/participants/${userId}/role`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'}
                });
                
                if (res.ok) {
                    showNotification(`Роль изменена`, 'success');
                    await showParticipants(eventId);
                } else {
                    const err = await res.json();
                    showNotification(err.detail || 'Ошибка изменения роли', 'error');
                }
            });
        });
        
        document.getElementById('participantsModal').style.display = 'block';
    } else {
        const err = await res.json();
        showNotification(err.detail || 'Ошибка загрузки участников', 'error');
    }
}

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

const confirmDeleteModal = document.getElementById('confirmDeleteModal');
const confirmDeleteYesBtn = document.getElementById('confirmDeleteYesBtn');
const confirmDeleteNoBtn = document.getElementById('confirmDeleteNoBtn');

if (confirmDeleteYesBtn) {
    confirmDeleteYesBtn.onclick = async () => {
        if (pendingDeleteEventId) {
            const res = await fetch(`/api/events/${pendingDeleteEventId}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'}
            });
            
            if (res.ok) {
                showNotification('Мероприятие удалено', 'success');
                await loadEvents();
            } else {
                const err = await res.json();
                showNotification(err.detail || 'Ошибка удаления', 'error');
            }
        }
        confirmDeleteModal.style.display = 'none';
        pendingDeleteEventId = null;
    };
}

if (confirmDeleteNoBtn) {
    confirmDeleteNoBtn.onclick = () => {
        confirmDeleteModal.style.display = 'none';
        pendingDeleteEventId = null;
    };
}

async function loadQueueEvents() {
    const res = await fetch('/api/events/my');
    const events = await res.json();
    const select = document.getElementById('queueEventSelect');
    select.innerHTML = '<option value="">Выберите мероприятие</option>';
    events.forEach(e => {
        select.innerHTML += `<option value="${e.id}">${e.title}</option>`;
    });
    if (events.length > 0) {
        select.value = events[0].id;
        currentQueueEventId = parseInt(events[0].id);
        loadQueueWorks();
    }
    select.onchange = () => {
        currentQueueEventId = parseInt(select.value);
        loadQueueWorks();
        document.getElementById('nextWorkResult').innerHTML = '';
    };
}

async function loadQueueWorks() {
    if (!currentQueueEventId) {
        document.getElementById('queueList').innerHTML = '<p class="events-board__placeholder">Выберите мероприятие</p>';
        return;
    }
    
    const res = await fetch('/api/reviews/assigned');
    const works = await res.json();
    const container = document.getElementById('queueList');
    
    if (works.length === 0) {
        container.innerHTML = '<p class="events-board__placeholder">Нет назначенных работ</p>';
        return;
    }
    
    container.innerHTML = works.map(w => `
        <div style="border: 1px solid #D479F5; border-radius: 10px; padding: 20px; margin-bottom: 15px; background: white;">
            <strong style="font-size: 18px;">${w.title}</strong><br>
            <button class="review-work-btn" data-work-id="${w.id}" style="background: #D479F5; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-top: 10px;">Проверить</button>
        </div>
    `).join('');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('review-work-btn')) {
        const workId = e.target.dataset.workId;
        openReviewModal(workId);
    }
});

document.getElementById('nextWorkBtn').onclick = async () => {
    if (!currentQueueEventId) {
        showNotification('Сначала выберите мероприятие', 'error');
        return;
    }
    
    const btn = document.getElementById('nextWorkBtn');
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    const res = await fetch(`/api/reviews/next?event_id=${currentQueueEventId}`);
    const data = await res.json();
    
    btn.disabled = false;
    btn.style.opacity = '1';
    
    if (data.work) {
        showNotification('Работа взята на проверку!', 'success');
        loadQueueWorks();
    } else {
        showNotification(data.message || 'Нет доступных работ', 'error');
    }
};

async function openReviewModal(workId) {
    currentReviewWorkId = workId;
    
    document.getElementById('reviewWorkTitle').textContent = 'Загрузка...';
    document.getElementById('reviewWorkLink').href = '#';
    document.getElementById('reviewWorkLink').textContent = 'Открыть работу';
    document.getElementById('reviewComment').value = '';
    document.getElementById('reviewError').textContent = '';
    
    const res = await fetch(`/api/works/${workId}`);
    if (res.ok) {
        const work = await res.json();
        document.getElementById('reviewWorkTitle').textContent = work.title;
        if (work.link && work.link !== '#') {
            document.getElementById('reviewWorkLink').href = work.link;
            document.getElementById('reviewWorkLink').textContent = 'Открыть работу';
        } else {
            document.getElementById('reviewWorkLink').href = '#';
            document.getElementById('reviewWorkLink').textContent = 'Ссылка не указана';
            document.getElementById('reviewWorkLink').style.color = 'gray';
        }
    } else {
        document.getElementById('reviewWorkTitle').textContent = '❌ Ошибка загрузки';
        document.getElementById('reviewWorkLink').textContent = 'Ошибка';
    }
    
    document.getElementById('reviewModal').style.display = 'block';
}

document.getElementById('reviewCloseBtn').onclick = () => {
    document.getElementById('reviewModal').style.display = 'none';
    currentReviewWorkId = null;
};

document.getElementById('reviewSubmitBtn').onclick = async () => {
    const comment = document.getElementById('reviewComment').value.trim();
    if (!comment) {
        document.getElementById('reviewError').textContent = 'Напишите комментарий';
        return;
    }
    
    const btn = document.getElementById('reviewSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Отправка...';
    
    const res = await fetch(`/api/reviews/${currentReviewWorkId}/submit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ text_comment: comment })
    });
    
    btn.disabled = false;
    btn.textContent = 'Отправить проверку';
    
    if (res.ok) {
        showNotification('Проверка отправлена!', 'success');
        document.getElementById('reviewModal').style.display = 'none';
        currentReviewWorkId = null;
        loadQueueWorks();
    } else {
        const err = await res.json();
        document.getElementById('reviewError').textContent = err.detail || 'Ошибка отправки';
    }
};

async function loadResults(tab = 'my') {
    const container = document.getElementById('resultsList');
    container.innerHTML = '<p class="events-board__placeholder">Загрузка...</p>';
    
    const endpoint = tab === 'my' ? '/api/reviews/my' : '/api/reviews/for-me';
    const res = await fetch(endpoint);
    const reviews = await res.json();
    
    if (reviews.length === 0) {
        container.innerHTML = `<p class="events-board__placeholder">${tab === 'my' ? 'Вы не проверили ни одной работы' : 'Нет проверок ваших работ'}</p>`;
        return;
    }
    
    container.innerHTML = reviews.map(r => `
        <div style="border: 1px solid #D479F5; border-radius: 10px; padding: 20px; margin-bottom: 15px; background: white;">
            <div style="font-weight: bold; font-size: 18px; color: #2B0738;">${r.work_title}</div>
            ${tab === 'for-me' ? `<div style="color: #666; margin-top: 5px;"><span style="background: #F8E8FA; padding: 3px 10px; border-radius: 15px;">Проверил: ${r.reviewer_name}</span></div>` : ''}
            <div style="margin-top: 10px; padding: 10px; background: #F8E8FA; border-radius: 5px;">
                ${r.text_comment || 'Комментарий отсутствует'}
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 10px;">
                Проверено: ${new Date(r.completed_at).toLocaleDateString('ru-RU')}
            </div>
        </div>
    `).join('');
}

document.getElementById('myReviewsTab').onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#F8E8FA';
        b.style.color = '#2B0738';
        b.style.border = '2px solid #D479F5';
    });
    document.getElementById('myReviewsTab').style.background = '#D479F5';
    document.getElementById('myReviewsTab').style.color = 'white';
    document.getElementById('myReviewsTab').style.border = 'none';
    loadResults('my');
};

document.getElementById('forMeTab').onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#F8E8FA';
        b.style.color = '#2B0738';
        b.style.border = '2px solid #D479F5';
    });
    document.getElementById('forMeTab').style.background = '#D479F5';
    document.getElementById('forMeTab').style.color = 'white';
    document.getElementById('forMeTab').style.border = 'none';
    loadResults('for-me');
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
    if (confirmDeleteModal && e.target === confirmDeleteModal) {
        confirmDeleteModal.style.display = 'none';
    }
    if (modal && e.target === modal) {
        modal.style.display = 'none';
    }
    if (document.getElementById('reviewModal') && e.target === document.getElementById('reviewModal')) {
        document.getElementById('reviewModal').style.display = 'none';
        currentReviewWorkId = null;
    }
};

loadEvents();