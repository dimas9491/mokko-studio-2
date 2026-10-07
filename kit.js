/* Dimas kit — поведение блоков. Настройки сайта задаются в window.SITE до подключения файла. */
(() => {
  const SITE = Object.assign({ endpoint: '', telegram: '', whatsapp: '', phone: '' }, window.SITE);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Картинки: файл есть — плейсхолдер исчезает, файла нет — остаётся подпись с именем файла
  $$('.ph img').forEach(img => {
    const box = img.closest('.ph');
    const ok = () => box.classList.add('ok'), bad = () => img.remove();
    if (img.complete) (img.naturalWidth ? ok : bad)();
    else { img.addEventListener('load', ok); img.addEventListener('error', bad); }
  });

  // Появление блоков: тип задаётся data-anim, очередь внутри data-stagger
  $$('[data-stagger]').forEach(g => [...g.children].forEach((el, i) => {
    el.style.setProperty('--i', i);
    if (!el.dataset.anim) el.dataset.anim = g.dataset.stagger || 'up';
  }));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.dataset.count) count(e.target);
    io.unobserve(e.target);
  }), { threshold: .15 });
  $$('[data-anim],[data-count]').forEach(el => io.observe(el));

  function count(el) {
    const to = +el.dataset.count, t0 = performance.now(), fmt = n => n.toLocaleString('ru-RU') + (el.dataset.suffix || '');
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return el.textContent = fmt(to);
    const tick = t => {
      const p = Math.min(1, (t - t0) / 1400);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Анимации от прокрутки: каждому [data-scroll] ставим --p (0 — блок входит снизу, 1 — ушёл вверх);
  // [data-hscroll] закрепляет экран и двигает ленту вбок на ту же длину, что прокручено вниз
  const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const scrolled = $$('[data-scroll]'), rails = still ? [] : $$('[data-hscroll]');
  // Плавность: размеры и позиции считаем один раз (и при resize), в кадре — только арифметика от scrollY,
  // переменные пишем лишь видимым блокам и только когда значение реально изменилось
  let vh = innerHeight;
  const docTop = el => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
  const measure = () => {
    vh = innerHeight;
    rails.forEach(w => {
      w._track = w.querySelector('.hs-track');
      w._max = Math.max(0, w._track.scrollWidth - innerWidth);
      w.style.height = (vh + w._max) + 'px';
    });
    scrolled.forEach(el => { el._top = docTop(el); el._h = el.offsetHeight; });
    rails.forEach(w => { w._top = docTop(w); });
  };
  let tick = false;
  const frame = () => {
    tick = false;
    const y = scrollY;
    for (const el of scrolled) {
      const top = el._top - y;
      if (top > vh + 100 || top + el._h < -100) continue;
      const p = Math.round(Math.min(1, Math.max(0, (vh - top) / (vh + el._h))) * 500) / 500;
      if (p !== el._p) { el._p = p; el.style.setProperty('--p', p); }
    }
    for (const w of rails) {
      const p = w._max ? Math.min(1, Math.max(0, (y - w._top) / w._max)) : 0;
      if (p === w._p) continue;
      w._p = p;
      w._track.style.transform = 'translate3d(' + Math.round(-p * w._max) + 'px,0,0)';
      w.style.setProperty('--hp', p.toFixed(3));
    }
  };
  if (!still) {
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener('resize', () => { measure(); frame(); });
    addEventListener('load', () => { measure(); frame(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); frame(); });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); frame(); }).observe(document.body);
    measure(); frame();
  }

  // До / после
  $$('[data-compare]').forEach(c => {
    const r = c.querySelector('input');
    r.addEventListener('input', () => c.style.setProperty('--pos', r.value + '%'));
  });

  // Ленты со стрелками
  $$('[data-reel]').forEach(box => {
    const reel = box.querySelector('.reel');
    const step = d => reel.scrollBy({ left: d * (reel.firstElementChild.offsetWidth + 16), behavior: 'smooth' });
    box.querySelector('[data-reel-prev]')?.addEventListener('click', () => step(-1));
    box.querySelector('[data-reel-next]')?.addEventListener('click', () => step(1));
  });

  // Фильтр работ
  $$('[data-filters]').forEach(f => f.addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    $$('[data-f]', f).forEach(x => x.classList.toggle('is-on', x === b));
    $$(f.dataset.filters + ' [data-cat]').forEach(w => w.hidden = b.dataset.f !== '*' && w.dataset.cat !== b.dataset.f);
  }));

  // Этапы
  $$('[data-steps]').forEach(s => {
    const btns = $$('.step-btn', s), panes = $$('.step-pane', s);
    const show = i => { btns.forEach((b, k) => b.classList.toggle('is-on', k === i)); panes.forEach((p, k) => p.classList.toggle('is-on', k === i)); };
    btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
    $$('[data-step-next]', s).forEach(n => n.addEventListener('click', () => show((btns.findIndex(b => b.classList.contains('is-on')) + 1) % btns.length)));
    show(0);
  });

  // Телефон: +7 (999) 123-45-67
  const digits = v => v.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
  $$('input[type=tel]').forEach(t => t.addEventListener('input', () => {
    const d = digits(t.value); let o = '+7';
    if (d.length) o += ' (' + d.slice(0, 3);
    if (d.length >= 3) o += ') ' + d.slice(3, 6);
    if (d.length >= 6) o += '-' + d.slice(6, 8);
    if (d.length >= 8) o += '-' + d.slice(8, 10);
    t.value = o;
  }));
  const phoneOk = f => { const t = f.querySelector('input[type=tel]'); return !t || digits(t.value).length === 10; };

  // Доставка заявки. Есть endpoint — POST JSON. Нет — открываем выбранный мессенджер с готовым текстом.
  // Успех показываем только после реального ответа сервера; без сервера честно пишем, что откроется чат.
  async function send(data) {
    if (SITE.endpoint) {
      const r = await fetch(SITE.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return 'sent';
    }
    if (/звонок/i.test(data['Связь'] || '')) return 'call';
    const text = encodeURIComponent(Object.entries(data).map(([k, v]) => k + ': ' + v).join('\n'));
    const via = /whatsapp/i.test(data['Связь'] || '') && SITE.whatsapp ? SITE.whatsapp + '?text=' + text
      : SITE.telegram ? SITE.telegram + '?text=' + text
      : SITE.whatsapp ? SITE.whatsapp + '?text=' + text : '';
    if (!via) throw new Error('no channel');
    window.open(via, '_blank', 'noopener');
    return 'chat';
  }
  const collect = form => {
    const d = { 'Страница': document.title };
    new FormData(form).forEach((v, k) => { if (k !== 'consent') d[k] = d[k] ? d[k] + ', ' + v : v; });
    return d;
  };
  async function submit(form, msg, btn, done) {
    if (!phoneOk(form)) return msg.textContent = 'Проверьте номер: нужно 10 цифр после +7.';
    const c = form.querySelector('[name=consent]');
    if (c && !c.checked) return msg.textContent = 'Отметьте согласие на обработку данных.';
    btn.disabled = true; msg.textContent = 'Отправляем…';
    try {
      const how = await send(collect(form));
      msg.textContent = how === 'sent' ? (form.dataset.ok || 'Заявка принята. Свяжемся с вами в ближайшее время.')
        : how === 'call' ? 'Позвоните нам: ' + SITE.phone + ' — назовём стоимость по телефону.'
        : 'Открыли чат с готовым сообщением — нажмите «Отправить».';
      if (form.dataset.bonus) {
        const a = document.createElement('a');
        a.href = form.dataset.bonus; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = form.dataset.bonusText || 'Открыть подарок'; a.style.cssText = 'display:block;margin-top:8px;font-weight:800;text-decoration:underline';
        msg.append(a);
      }
      if (how === 'sent' && done) done();
    } catch (e) {
      msg.innerHTML = 'Не получилось отправить. Попробуйте ещё раз' + (SITE.phone ? ' или позвоните: <a href="tel:' + SITE.phone.replace(/[^+\d]/g, '') + '"><b>' + SITE.phone + '</b></a>' : '') + '.';
    }
    btn.disabled = false;
  }
  $$('form[data-lead]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    submit(f, f.querySelector('.form-msg'), f.querySelector('[type=submit]'));
  }));

  // Квиз: шаги = fieldset.q-step, последний шаг — контакт
  $$('[data-quiz]').forEach(q => {
    const form = q.querySelector('form'), steps = $$('.q-step', q), bar = q.querySelector('[data-quiz-bar]'),
      cnt = q.querySelector('[data-quiz-count]'), prev = q.querySelector('[data-prev]'), next = q.querySelector('[data-next]'),
      msg = q.querySelector('.form-msg');
    let i = 0;
    const answered = () => { const r = $$('input[type=radio],input[type=checkbox]:not([name=consent])', steps[i]); return !r.length || r.some(x => x.checked); };
    const show = () => {
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      const last = i === steps.length - 1;
      bar.style.width = ((i + 1) / steps.length * 100) + '%';
      cnt.textContent = last ? 'Последний шаг' : 'Вопрос ' + (i + 1) + ' из ' + (steps.length - 1);
      prev.hidden = i === 0;
      next.textContent = last ? (q.dataset.submit || 'Получить расчёт') : 'Дальше';
      next.disabled = !answered();
    };
    q.addEventListener('change', e => {
      next.disabled = !answered();
      if (e.target.type === 'radio' && i < steps.length - 1) setTimeout(() => { i++; show(); }, 260);
    });
    prev.addEventListener('click', () => { i--; show(); });
    next.addEventListener('click', () => {
      if (i < steps.length - 1) { i++; return show(); }
      submit(form, msg, next, () => { q.querySelector('.quiz-nav').hidden = true; });
    });
    form.addEventListener('submit', e => { e.preventDefault(); next.click(); });
    show();
  });
})();
