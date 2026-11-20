document.addEventListener('DOMContentLoaded', function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  /* ---------- sticky header ---------- */
  var header = document.getElementById('site-header');
  function onScroll(){
    if(window.scrollY > 30){ header.classList.add('scrolled'); } else { header.classList.remove('scrolled'); }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  /* ---------- mobile menu ---------- */
  var menuToggle = document.getElementById('menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  var menuIconUse = document.querySelector('#menu-icon use');
  var menuOpen = false;
  function setMenu(open){
    menuOpen = open;
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menuIconUse.setAttribute('href', open ? '#ic-close' : '#ic-menu');
    if(open){
      mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
      mobileMenu.style.opacity = '1';
      document.documentElement.style.overflow = 'hidden';
    } else {
      mobileMenu.style.maxHeight = '0px';
      mobileMenu.style.opacity = '0';
      document.documentElement.style.overflow = '';
    }
  }
  if(menuToggle && mobileMenu && menuIconUse){
    setMenu(false);
    menuToggle.addEventListener('click', function(){ setMenu(!menuOpen); });
    document.querySelectorAll('.mob-link').forEach(function(l){ l.addEventListener('click', function(){ setMenu(false); }); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && menuOpen) setMenu(false); });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){ entry.target.classList.add('in-view'); io.unobserve(entry.target); }
      });
    }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in-view'); });
  }

  /* ---------- destination CTA -> prefill destino ---------- */
  document.querySelectorAll('[data-destino]').forEach(function(el){
    el.addEventListener('click', function(){
      var val = el.getAttribute('data-destino');
      var sel = document.getElementById('t-destino');
      if(sel){ Array.prototype.forEach.call(sel.options, function(o){ if(o.value === val) sel.value = val; }); }
    });
  });
  document.querySelectorAll('[data-tipo]').forEach(function(el){
    el.addEventListener('click', function(){
      var val = el.getAttribute('data-tipo');
      var sel = document.getElementById('t-tipo');
      if(sel){ Array.prototype.forEach.call(sel.options, function(o){ if(o.value === val) sel.value = val; }); }
    });
  });
  var requestedTrip = new URLSearchParams(window.location.search);
  var requestedDestination = requestedTrip.get('destino');
  var requestedType = requestedTrip.get('tipo');
  var destinationSelect = document.getElementById('t-destino');
  var typeSelect = document.getElementById('t-tipo');
  if(destinationSelect && requestedDestination){ destinationSelect.value = requestedDestination; }
  if(typeSelect && requestedType){ typeSelect.value = requestedType; }

  /* ---------- comparador ---------- */
  var cmpData = [
    {label:'História', cuba:75, china:75, vietna:75},
    {label:'Tecnologia', cuba:50, china:100, vietna:75},
    {label:'Natureza', cuba:75, china:75, vietna:100},
    {label:'Gastronomia', cuba:75, china:100, vietna:100},
    {label:'Arquitetura', cuba:75, china:100, vietna:75},
    {label:'Vida urbana', cuba:50, china:100, vietna:75},
    {label:'Experiência acadêmica', cuba:75, china:100, vietna:75}
  ];
  var cmpWrap = document.getElementById('comparador-rows');
  if(cmpWrap){
    cmpData.forEach(function(row){
      var el = document.createElement('div');
      el.className = 'cmp-row';
      el.innerHTML =
        '<p class="text-sm font-semibold font-display mb-2">'+row.label+'</p>'+
        '<div class="space-y-1.5">'+
          '<div class="h-2 rounded-full bg-red-mist overflow-hidden"><div class="cmp-bar h-full rounded-full bg-red" style="--w:'+row.cuba+'%"></div></div>'+
          '<div class="h-2 rounded-full bg-gold-mist overflow-hidden"><div class="cmp-bar h-full rounded-full bg-gold" style="--w:'+row.china+'%"></div></div>'+
          '<div class="h-2 rounded-full bg-mist overflow-hidden"><div class="cmp-bar h-full rounded-full bg-ink" style="--w:'+row.vietna+'%"></div></div>'+
        '</div>';
      cmpWrap.appendChild(el);
    });
    if('IntersectionObserver' in window){
      var io2 = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('in-view'); io2.unobserve(entry.target); } });
      }, {threshold:.3});
      document.querySelectorAll('.cmp-row').forEach(function(r){ io2.observe(r); });
    } else {
      document.querySelectorAll('.cmp-row').forEach(function(r){ r.classList.add('in-view'); });
    }
  }

  /* ---------- blog filters ---------- */
  var filterBtns = document.querySelectorAll('#blog-filters .tag-pill');
  var blogCards = document.querySelectorAll('.blog-card');
  var blogEmpty = document.getElementById('blog-empty');
  filterBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      filterBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var f = btn.getAttribute('data-filter');
      var visible = 0;
      blogCards.forEach(function(card){
        var tags = card.getAttribute('data-tags');
        var show = (f === 'todos') || tags.indexOf(f) !== -1;
        card.style.display = show ? '' : 'none';
        if(show) visible++;
      });
      blogEmpty.classList.toggle('hidden', visible !== 0);
    });
  });

  /* ---------- Caderno Vermelho article modal ---------- */
  var articleModal = document.getElementById('article-modal');
  if(articleModal){
    var articleModalTitle = document.getElementById('article-modal-title');
    var articleModalCategory = document.getElementById('article-modal-category');
    var articleModalSummary = document.getElementById('article-modal-summary');
    var articleModalPoints = document.getElementById('article-modal-points');
    var articleModalMedia = document.getElementById('article-modal-media');
    var articleModalImage = document.getElementById('article-modal-image');
    var closeArticleModal = document.getElementById('article-modal-close');
    var articleDetails = {
      havana: {
        intro:'Havana se revela melhor quando o roteiro alterna lugares conhecidos com tempo para observar a vida cotidiana. Arquitetura, música, espaços criativos e conversas nas ruas ajudam a compor uma visita mais próxima da cidade real.',
        points:['Explore o Centro Histórico com calma e repare nos diferentes estilos arquitetônicos.','Reserve tempo para caminhar por Centro Habana e observar o ritmo dos bairros.','Inclua ateliês, apresentações musicais e pequenos espaços culturais no roteiro.']
      },
      'pequim-xangai': {
        intro:'Pequim e Xangai oferecem experiências distintas. A capital combina marcos históricos e grandes eixos urbanos; Xangai reúne bairros históricos, arquitetura contemporânea e uma atmosfera metropolitana. A escolha depende do tempo disponível e do tema da viagem.',
        points:['Escolha Pequim se a prioridade for história, patrimônio e instituições culturais.','Considere Xangai para observar urbanismo, design e a vida de uma grande metrópole.','Com mais dias, combine as duas cidades e compare seus contrastes no mesmo roteiro.']
      },
      vietna: {
        intro:'Conhecer o Vietnã também é prestar atenção aos costumes e aos encontros cotidianos. Mercados, culinária, paisagens e espaços de memória podem fazer parte de uma viagem equilibrada entre experiências culturais e tempo livre.',
        points:['Visite mercados locais com respeito às rotinas de quem trabalha e compra ali.','Experimente a culinária regional e conheça os ingredientes presentes em cada prato.','Inclua paisagens naturais e locais de memória sem tentar concentrar tudo em poucos dias.']
      },
      academica: {
        intro:'Uma viagem acadêmica começa com objetivos de aprendizagem claros e um roteiro que conecte visitas, atividades e tempo de estudo. A organização antecipada ajuda o grupo a aproveitar melhor cada encontro e a cuidar dos requisitos práticos.',
        points:['Defina o tema, o perfil dos participantes e os resultados esperados.','Organize visitas e atividades em uma sequência coerente com os objetivos do grupo.','Planeje documentação, acessibilidade, deslocamentos e momentos de descanso.']
      },
      'china-atual': {
        intro:'Uma viagem pela China pode aproximar o visitante de diferentes períodos e formas de viver. O roteiro pode combinar espaços históricos, museus, bairros contemporâneos e centros de inovação, sempre considerando as distâncias entre as cidades.',
        points:['Intercale visitas a locais históricos com experiências urbanas contemporâneas.','Reserve tempo para museus, centros culturais e observação da arquitetura.','Agrupe atividades por região para reduzir deslocamentos e deixar o roteiro mais confortável.']
      }
    };

    document.querySelectorAll('.blog-card-trigger').forEach(function(trigger){
      trigger.addEventListener('click', function(){
        var card = trigger.closest('.blog-card');
        var detail = articleDetails[trigger.getAttribute('data-article-key')];
        if(!card || !detail) return;

        var title = card.querySelector('h3');
        var category = card.querySelector('.blog-card-category');
        var cardImage = card.querySelector('.blog-card-image');
        articleModalTitle.textContent = title ? title.textContent.trim() : '';
        articleModalCategory.textContent = category ? category.textContent.trim() : 'Caderno Vermelho';
        articleModalSummary.textContent = detail.intro;
        articleModalPoints.replaceChildren();
        detail.points.forEach(function(point){
          var item = document.createElement('li');
          item.textContent = point;
          articleModalPoints.appendChild(item);
        });
        if(cardImage){
          articleModalImage.src = cardImage.getAttribute('src');
          articleModalImage.alt = cardImage.alt;
          articleModalImage.hidden = false;
          articleModalMedia.classList.remove('blog-modal-media-placeholder');
        } else {
          articleModalImage.removeAttribute('src');
          articleModalImage.alt = '';
          articleModalImage.hidden = true;
          articleModalMedia.classList.add('blog-modal-media-placeholder');
        }
        articleModal.showModal();
      });
    });

    closeArticleModal.addEventListener('click', function(){ articleModal.close(); });
    articleModal.addEventListener('click', function(event){
      if(event.target === articleModal) articleModal.close();
    });
  }

  /* ---------- mapa ---------- */
  var mapData = {
    cuba: {name:'Cuba', capital:'Havana', destinos:'Havana, Varadero, Trinidad', duracao:'7–10 dias'},
    china: {name:'China', capital:'Pequim', destinos:'Pequim, Xangai, Shenzhen, Xi\'an', duracao:'10–14 dias'},
    vietna: {name:'Vietnã', capital:'Hanói', destinos:'Hanói, Huế, Ho Chi Minh, Baía de Ha Long', duracao:'8–12 dias'}
  };
  var mapBtns = document.querySelectorAll('.marker-btn[data-country]');
  function setCountry(key){
    var d = mapData[key];
    if(!d) return;
    document.getElementById('map-name').textContent = d.name;
    document.getElementById('map-capital').textContent = d.capital;
    document.getElementById('map-destinos').textContent = d.destinos;
    document.getElementById('map-duracao').textContent = d.duracao;
    var mapExplore = document.getElementById('map-explorar');
    if(mapExplore){
      mapExplore.setAttribute('data-destino', d.name);
      mapExplore.href = 'contato.html?destino=' + encodeURIComponent(d.name) + '#planejar';
    }
    mapBtns.forEach(function(b){ b.setAttribute('data-active', b.getAttribute('data-country') === key ? 'true' : 'false'); });
  }
  mapBtns.forEach(function(b){
    b.addEventListener('click', function(){ setCountry(b.getAttribute('data-country')); });
    b.addEventListener('mouseenter', function(){ setCountry(b.getAttribute('data-country')); });
  });

  /* ---------- testimonials carousel ---------- */
  var track = document.getElementById('testi-track');
  var slides = track ? track.children.length : 0;
  var idx = 0;
  var dotsWrap = document.getElementById('testi-dots');
  var prevTestimonial = document.getElementById('testi-prev');
  var nextTestimonial = document.getElementById('testi-next');
  if(track && dotsWrap && prevTestimonial && nextTestimonial && slides > 0){
    for(var i=0;i<slides;i++){
      var dot = document.createElement('button');
      dot.className = 'w-2 h-2 rounded-full ' + (i===0 ? 'bg-red' : 'bg-line');
      dot.setAttribute('aria-label', 'Ir para depoimento ' + (i+1));
      dot.addEventListener('click', (function(n){ return function(){ goTo(n); }; })(i));
      dotsWrap.appendChild(dot);
    }
    function goTo(n){
      idx = (n + slides) % slides;
      track.style.transform = 'translateX(-' + (idx*100) + '%)';
      Array.prototype.forEach.call(dotsWrap.children, function(d, i){
        d.className = 'w-2 h-2 rounded-full ' + (i===idx ? 'bg-red' : 'bg-line');
      });
    }
    prevTestimonial.addEventListener('click', function(){ goTo(idx-1); });
    nextTestimonial.addEventListener('click', function(){ goTo(idx+1); });
    var autoplay;
    function startAutoplay(){ if(reduceMotion) return; autoplay = setInterval(function(){ goTo(idx+1); }, 6500); }
    function stopAutoplay(){ clearInterval(autoplay); }
    startAutoplay();
    [track, prevTestimonial, nextTestimonial].forEach(function(el){
      el.addEventListener('mouseenter', stopAutoplay);
      el.addEventListener('mouseleave', startAutoplay);
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.acc-item').forEach(function(item){
    var trigger = item.querySelector('.acc-trigger');
    trigger.addEventListener('click', function(){
      var isOpen = item.getAttribute('data-open') === 'true';
      document.querySelectorAll('.acc-item').forEach(function(other){
        other.setAttribute('data-open', 'false');
        other.querySelector('.acc-trigger').setAttribute('aria-expanded', 'false');
      });
      item.setAttribute('data-open', isOpen ? 'false' : 'true');
      trigger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  });

  /* ---------- form validation helper ---------- */
  function validateForm(form){
    var valid = true;
    var fields = form.querySelectorAll('[required]');
    fields.forEach(function(field){
      var errEl = field.parentElement.querySelector('.err');
      var ok = field.value.trim() !== '';
      if(ok && field.type === 'email'){ ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()); }
      field.classList.toggle('border-red', !ok);
      if(errEl) errEl.classList.toggle('hidden', ok);
      if(!ok) valid = false;
    });
    return valid;
  }

  function handleForm(formId, successId, errorId){
    var form = document.getElementById(formId);
    if(!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var successEl = document.getElementById(successId);
      var errorEl = document.getElementById(errorId);
      successEl.classList.remove('show');
      errorEl.classList.remove('show');
      if(validateForm(form)){
        successEl.classList.add('show');
        form.reset();
      } else {
        errorEl.classList.add('show');
      }
    });
  }
  handleForm('trip-form','trip-success','trip-error');
  handleForm('contact-form','contact-success','contact-error');

  /* ---------- newsletter ---------- */
  var nlForm = document.getElementById('newsletter-form');
  if(nlForm){
    nlForm.addEventListener('submit', function(e){
      e.preventDefault();
      var input = document.getElementById('newsletter-email');
      var msg = document.getElementById('newsletter-msg');
      if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())){
        msg.classList.add('show');
        nlForm.reset();
      }
    });
  }
});
