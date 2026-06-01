document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const password2 = document.getElementById('password2').value;
    
    if (password !== password2) {
        document.getElementById('error').textContent = 'Пароли не совпадают';
        return;
    }
    
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            full_name: document.getElementById('full_name').value,
            email: document.getElementById('email').value,
            password: password
        })
    });
    
    if (res.ok) window.location.href = '/dashboard.html';
    else {
        const data = await res.json();
        document.getElementById('error').textContent = data.detail || 'Ошибка регистрации';
    }
});