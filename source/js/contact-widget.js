(function () {
  function append(parent, tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    parent.appendChild(node);
    return node;
  }

  function hasContact(contact) {
    return contact && (contact.qq || contact.wechat || contact.wechatQr || contact.note);
  }

  fetch('/contact/contact.json', { cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (contact) {
      if (!hasContact(contact) || document.querySelector('.boke-contact-button')) return;

      var button = document.createElement('button');
      button.className = 'boke-contact-button';
      button.type = 'button';
      button.textContent = '联系';
      button.setAttribute('aria-label', '联系我');

      var panel = document.createElement('div');
      panel.className = 'boke-contact-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', '联系我');
      append(panel, 'h3', null, '联系我');

      if (contact.qq) {
        var qq = append(panel, 'a', null, 'QQ：' + contact.qq);
        qq.href = 'https://wpa.qq.com/msgrd?v=3&uin=' + encodeURIComponent(contact.qq) + '&site=qq&menu=yes';
        qq.target = '_blank';
        qq.rel = 'noopener';
      }

      if (contact.wechat) append(panel, 'p', null, '微信：' + contact.wechat);

      if (contact.wechatQr) {
        var qr = append(panel, 'img');
        qr.src = contact.wechatQr;
        qr.alt = '微信二维码';
        qr.loading = 'lazy';
        qr.decoding = 'async';
      }

      if (contact.note) append(panel, 'p', null, contact.note);

      button.addEventListener('click', function () {
        var next = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', next);
        button.setAttribute('aria-expanded', String(next));
      });

      document.body.appendChild(panel);
      document.body.appendChild(button);
    })
    .catch(function () {});
})();
