(function () {
  const message = document.getElementById('admin-message');
  const userForm = document.getElementById('user-form');
  const userList = document.getElementById('user-list');
  const cardForm = document.getElementById('card-form');
  const cardList = document.getElementById('card-list');
  const cardFilter = document.getElementById('card-filter');
  const cardIdInput = document.getElementById('card-id');
  const cardTypeInput = document.getElementById('card-type');
  const cardTitleInput = document.getElementById('card-title');
  const cardCategoryInput = document.getElementById('card-category');
  const cardSummaryInput = document.getElementById('card-summary');
  const cardDetailsInput = document.getElementById('card-details');
  const cardTagsInput = document.getElementById('card-tags');
  const cardImageInput = document.getElementById('card-image');
  const cardOrderInput = document.getElementById('card-order');
  const cardFormHeading = document.getElementById('card-form-heading');
  const cardSaveButton = document.getElementById('card-save');
  const cardCancelButton = document.getElementById('card-cancel');
  const knownCards = new Map();

  function showMessage(text, isError) {
    message.textContent = text;
    message.classList.remove('hidden', 'bg-red-mist', 'text-red-deep', 'bg-green-50', 'text-green-800');
    message.classList.add(isError ? 'bg-red-mist' : 'bg-green-50', isError ? 'text-red-deep' : 'text-green-800');
  }

  async function request(url, options) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new Error('Não foi possível conectar ao servidor local.');
    }
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.assign('/login.html?next=%2Fadmin');
      throw new Error('Sua sessão expirou. Entre novamente.');
    }
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload;
  }

  function addText(parent, tagName, text, className) {
    const element = document.createElement(tagName);
    element.textContent = text;
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  async function refreshUsers() {
    const users = await request('/api/admin/users');
    userList.replaceChildren();
    users.forEach((user) => {
      const item = document.createElement('li');
      item.className = 'rounded-xl border border-line bg-mist px-4 py-3 flex items-center justify-between gap-3';
      addText(item, 'span', user.username, 'font-semibold text-sm break-all');
      addText(item, 'span', user.role === 'admin' ? 'Administrador' : 'Comum',
        'shrink-0 text-xs font-bold uppercase tracking-wide text-red');
      userList.appendChild(item);
    });
  }

  function setCardForm(card) {
    cardIdInput.value = card ? String(card.id) : '';
    cardTypeInput.value = card ? card.type : cardFilter.value;
    cardTitleInput.value = card ? card.title : '';
    cardCategoryInput.value = card ? card.category : '';
    cardSummaryInput.value = card ? card.summary : '';
    cardDetailsInput.value = card ? card.details : '';
    cardTagsInput.value = card ? card.tags.join(', ') : '';
    cardImageInput.value = card ? (card.image || '') : '';
    cardOrderInput.value = card ? String(card.sortOrder) : '0';
    cardFormHeading.textContent = card ? 'Editar card' : 'Adicionar card';
    cardSaveButton.textContent = card ? 'Salvar alterações' : 'Salvar card';
    cardCancelButton.classList.toggle('hidden', !card);
    if (card) cardForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCards(cards) {
    knownCards.clear();
    cardList.replaceChildren();
    if (!cards.length) {
      addText(cardList, 'p', 'Nenhum card nesta página ainda.', 'text-sm text-inksoft rounded-xl bg-mist p-4');
      return;
    }
    cards.forEach((card) => {
      knownCards.set(String(card.id), card);
      const item = document.createElement('article');
      item.className = 'rounded-xl border border-line p-4 grid sm:grid-cols-[1fr_auto] gap-4';
      const content = document.createElement('div');
      content.className = 'min-w-0';
      addText(content, 'p', `${card.category} · ${card.tags.join(' · ')}`, 'text-xs uppercase tracking-wide font-bold text-red');
      addText(content, 'h3', card.title, 'font-display font-bold text-base mt-1 break-words');
      addText(content, 'p', card.summary, 'text-sm text-inksoft mt-1');
      const actions = document.createElement('div');
      actions.className = 'flex sm:flex-col gap-2 sm:items-end';
      const editButton = addText(actions, 'button', 'Editar', 'rounded-full border border-line px-4 py-2 text-sm font-semibold hover:bg-mist');
      editButton.type = 'button';
      editButton.dataset.cardAction = 'edit';
      editButton.dataset.cardId = String(card.id);
      const deleteButton = addText(actions, 'button', 'Apagar', 'rounded-full border border-red/30 px-4 py-2 text-sm font-semibold text-red hover:bg-red-mist');
      deleteButton.type = 'button';
      deleteButton.dataset.cardAction = 'delete';
      deleteButton.dataset.cardId = String(card.id);
      item.append(content, actions);
      cardList.appendChild(item);
    });
  }

  async function refreshCards() {
    const cards = await request(`/api/admin/cards?type=${encodeURIComponent(cardFilter.value)}`);
    renderCards(cards);
  }

  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(userForm);
    const button = userForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const user = await request('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
          role: formData.get('role')
        })
      });
      userForm.reset();
      showMessage(`Usuário ${user.username} adicionado. Anote a senha informada no cadastro.`, false);
      await refreshUsers();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  cardForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = cardIdInput.value;
    const card = {
      type: cardTypeInput.value,
      title: cardTitleInput.value,
      category: cardCategoryInput.value,
      summary: cardSummaryInput.value,
      details: cardDetailsInput.value,
      tags: cardTagsInput.value.split(',').map((tag) => tag.trim()).filter(Boolean),
      image: cardImageInput.value.trim() || null,
      sortOrder: Number(cardOrderInput.value)
    };
    cardSaveButton.disabled = true;
    try {
      await request(id ? `/api/admin/cards/${encodeURIComponent(id)}` : '/api/admin/cards', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(card)
      });
      cardFilter.value = card.type;
      setCardForm(null);
      cardForm.reset();
      cardIdInput.value = '';
      cardOrderInput.value = '0';
      showMessage(id ? 'Card atualizado.' : 'Card adicionado.', false);
      await refreshCards();
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      cardSaveButton.disabled = false;
    }
  });

  cardCancelButton.addEventListener('click', () => {
    cardForm.reset();
    setCardForm(null);
    cardOrderInput.value = '0';
  });

  cardFilter.addEventListener('change', () => {
    setCardForm(null);
    refreshCards().catch((error) => showMessage(error.message, true));
  });

  cardList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-card-action]');
    if (!button) return;
    const card = knownCards.get(button.dataset.cardId);
    if (!card) return;
    if (button.dataset.cardAction === 'edit') {
      setCardForm(card);
      return;
    }
    if (button.dataset.cardAction === 'delete' && window.confirm(`Apagar o card “${card.title}”?`)) {
      try {
        await request(`/api/admin/cards/${encodeURIComponent(card.id)}`, { method: 'DELETE' });
        showMessage('Card apagado.', false);
        await refreshCards();
      } catch (error) {
        showMessage(error.message, true);
      }
    }
  });

  Promise.all([refreshUsers(), refreshCards()]).catch((error) => showMessage(error.message, true));
})();
