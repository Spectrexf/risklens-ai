async function syncUserPlan() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res  = await fetch('http://localhost:3001/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (!data.ok) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.plan  = data.user.plan;
    user.role  = data.user.role;
    localStorage.setItem('user', JSON.stringify(user));

    const initials = (user.name || user.email || 'U').substring(0, 2).toUpperCase();
    const avatarEl = document.getElementById('userAvatar');
    const nameEl   = document.getElementById('userName');
    const planEl   = document.getElementById('userPlan');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl)   nameEl.textContent   = user.name || user.email || 'Usuario';
    if (planEl)   planEl.textContent   = data.user.role === 'admin' ? 'admin' : (data.user.plan === 'premium' ? 'Premium' : 'Free');

    const adminBtn = document.getElementById('btnAdmin');
    if (adminBtn && data.user.role === 'admin') adminBtn.style.display = 'block';

  } catch (err) {
    console.warn('sync error:', err.message);
  }
}

syncUserPlan();