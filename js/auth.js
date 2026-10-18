(function () {
  function setHidden(element, hidden) {
    if (!element) return;
    element.hidden = hidden;
    element.classList.toggle('hidden', hidden);
  }

  function mountAuthControls() {
    const navs = [
      { selector: 'nav[aria-label="Navegação principal"]', mobile: false },
      { selector: 'nav[aria-label="Navegação móvel"]', mobile: true }
    ];
    navs.forEach(({ selector, mobile }) => {
      document.querySelectorAll(selector).forEach((nav) => {
        if (nav.querySelector('[data-auth-link]')) return;
        const link = document.createElement('a');
        link.href = 'login.html';
        link.textContent = 'Entrar';
        link.dataset.authLink = '';
        link.className = mobile ? 'mob-link py-2.5 border-b border-line' : 'nav-link';

        const logout = document.createElement('button');
        logout.type = 'button';
        logout.textContent = 'Sair';
        logout.dataset.authLogout = '';
        logout.className = mobile
          ? 'mob-link py-2.5 border-b border-line text-left w-full hidden'
          : 'nav-link bg-transparent border-0 cursor-pointer hidden';

        const callToAction = mobile ? nav.querySelector('a.btn-primary') : null;
        nav.insertBefore(link, callToAction);
        nav.insertBefore(logout, callToAction);
      });
    });
  }

  async function updateAuthNavigation() {
    const links = document.querySelectorAll('[data-auth-link]');
    const logoutButtons = document.querySelectorAll('[data-auth-logout]');
    if (!links.length && !logoutButtons.length) return;

    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (!response.ok) return;
      const session = await response.json();
      links.forEach((link) => {
        if (!session.authenticated) {
          link.href = 'login.html';
          link.textContent = 'Entrar';
          setHidden(link, false);
        } else if (session.role === 'admin') {
          link.href = '/admin';
          link.textContent = 'Admin';
          setHidden(link, false);
        } else {
          setHidden(link, true);
        }
      });
      logoutButtons.forEach((button) => setHidden(button, !session.authenticated));
    } catch (error) {
      // O acesso público continua funcionando se o servidor estiver indisponível.
    }
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-auth-logout]');
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      window.location.assign('/index.html');
    }
  });

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const message = document.getElementById('login-message');
    const submit = document.getElementById('login-submit');
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.textContent = '';
      setHidden(message, true);
      submit.disabled = true;
      submit.textContent = 'Verificando…';
      const data = new FormData(loginForm);
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: data.get('username'), password: data.get('password') })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');
        const requestedNext = new URLSearchParams(window.location.search).get('next');
        const destination = result.role === 'admin' && requestedNext === '/admin' ? '/admin' :
          (result.role === 'admin' ? '/admin' : '/index.html');
        window.location.assign(destination);
      } catch (error) {
        message.textContent = error.message || 'Não foi possível conectar ao servidor local.';
        setHidden(message, false);
      } finally {
        submit.disabled = false;
        submit.textContent = 'Acessar';
      }
    });
  }

  mountAuthControls();
  updateAuthNavigation();
})();
