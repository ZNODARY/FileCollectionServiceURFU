document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        })
    });
    if (res.ok) window.location.href = '/dashboard.html';
    else {
        const data = await res.json();
        document.getElementById('error').textContent = data.detail || 'Ошибка входа';
    }
});

document.getElementById('registerBtn').onclick = () => {
    window.location.href = '/register.html';
};