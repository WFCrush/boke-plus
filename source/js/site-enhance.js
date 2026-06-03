(function () {
  var site = {
    author: '晚风',
    description: '记录技术、生活与思考的数字花园。',
    avatar: '/img/avatar.png',
    github: 'https://github.com/WFCrush',
    zhihu: 'https://www.zhihu.com',
    juejin: 'https://juejin.cn',
    subscribeAction: ''
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function text(node) {
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function append(parent, tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    parent.appendChild(node);
    return node;
  }

  function safeHref(href) {
    if (!href) return '#';
    try {
      return new URL(href, location.origin).href;
    } catch (error) {
      return '#';
    }
  }

  function isPostPage() {
    return !!document.querySelector('.post-content .markdown-body');
  }

  function isHomeListPage() {
    var path = location.pathname.replace(/\/+$/, '/') || '/';
    return path === '/' || /^\/page\/\d+\/$/.test(path);
  }

  function normalizePath(path) {
    return (path || '/').replace(/\/+$/, '/') || '/';
  }

  function isActiveNavPath(href) {
    var path = normalizePath(location.pathname);
    var target = normalizePath(href);
    if (target === '/') return path === '/';
    return path.indexOf(target) === 0;
  }

  function setPageClasses() {
    var path = normalizePath(location.pathname);
    document.body.classList.toggle('boke-home', isHomeListPage());
    document.body.classList.toggle('boke-post', isPostPage());
    document.body.classList.toggle('boke-archive', path.indexOf('/archives/') === 0);
    document.body.classList.toggle('boke-category', path.indexOf('/categories/') === 0);
    document.body.classList.toggle('boke-tag', path.indexOf('/tags/') === 0);
    document.body.classList.toggle('boke-about', path.indexOf('/about/') === 0);
  }

  function enhanceImages() {
    document.querySelectorAll('img').forEach(function (img) {
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.getAttribute('alt')) {
        var title = document.querySelector('#seo-header, .index-header, title');
        img.setAttribute('alt', text(title) || '技术文章配图');
      }
    });
  }

  function enhanceSearch() {
    var search = document.querySelector('.icon-search') || document.querySelector('[data-toggle="modal"][data-target*="search"]');
    if (search) {
      search.setAttribute('title', '搜索 Ctrl+K');
      search.setAttribute('aria-label', '搜索 Ctrl+K');
    }

    document.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        var searchButton = document.querySelector('.icon-search') || document.querySelector('[data-toggle="modal"][data-target*="search"]');
        if (searchButton) {
          event.preventDefault();
          searchButton.click();
        }
      }
    });
  }

  function enhanceNavbar() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;
    Array.prototype.slice.call(navbar.querySelectorAll('.nav-link[href], .dropdown-item[href]')).forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.indexOf('javascript') === 0) return;
      if (isActiveNavPath(new URL(href, location.origin).pathname)) {
        link.classList.add('active');
        var dropdown = link.closest('.dropdown-menu');
        if (dropdown && dropdown.previousElementSibling) {
          dropdown.previousElementSibling.classList.add('active');
        }
      }
    });

    function update() {
      navbar.classList.toggle('boke-navbar-scrolled', window.scrollY > 24);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function estimateReadMinutes(card) {
    var raw = [
      text(card.querySelector('.index-header')),
      text(card.querySelector('.index-excerpt'))
    ].join(' ');
    var cnChars = (raw.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = raw.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil((cnChars + words * 2) / 320));
  }

  function enhanceIndexCards() {
    Array.prototype.slice.call(document.querySelectorAll('.index-card')).forEach(function (card, index) {
      card.style.setProperty('--boke-card-order', Math.min(index, 8));
      card.classList.toggle('boke-card-with-image', !!card.querySelector('.index-img'));
      var source = card.querySelector('.index-header a');
      if (source) card.setAttribute('aria-label', text(source));

      var metas = card.querySelector('.index-btm');
      if (metas && !metas.querySelector('.boke-readtime')) {
        var item = append(metas, 'div', 'post-meta boke-readtime');
        var icon = append(item, 'i', 'iconfont icon-clock-fill');
        icon.setAttribute('aria-hidden', 'true');
        item.appendChild(document.createTextNode('约 ' + estimateReadMinutes(card) + ' 分钟'));
      }
    });
  }

  function enhancePostSurface() {
    if (!isPostPage()) return;
    document.body.classList.add('boke-readable');
    document.body.classList.toggle('boke-has-toc', !!document.getElementById('toc'));

    var article = document.querySelector('.post-content');
    if (!article) return;

    var title = article.querySelector('#seo-header');
    if (title && !article.querySelector('.boke-post-kicker')) {
      var kicker = document.createElement('p');
      kicker.className = 'boke-post-kicker';
      kicker.textContent = 'Article / 技术笔记';
      title.parentElement.insertBefore(kicker, title);
    }

    var firstParagraph = article.querySelector('.markdown-body > p');
    if (firstParagraph && text(firstParagraph).length > 32) {
      firstParagraph.classList.add('boke-lede');
    }

    Array.prototype.slice.call(document.querySelectorAll('.post-prevnext a')).forEach(function (link) {
      if (!link.getAttribute('aria-label')) link.setAttribute('aria-label', text(link));
    });
  }

  function insertPageHeading(target, eyebrow, title, desc) {
    if (!target || document.querySelector('.boke-page-heading')) return;
    var heading = document.createElement('section');
    heading.className = 'boke-page-heading';
    append(heading, 'p', 'boke-page-eyebrow', eyebrow);
    append(heading, 'h1', null, title);
    append(heading, 'p', 'boke-page-desc', desc);
    target.parentElement.insertBefore(heading, target);
  }

  function enhanceIndexPages() {
    if (isHomeListPage() || isPostPage()) return;
    var path = normalizePath(location.pathname);
    var list = document.querySelector('.list-group');

    if (path.indexOf('/archives/') === 0) {
      insertPageHeading(list, 'Archive', '文章归档', '按时间回看所有笔记，快速定位每一次问题解决和项目复盘。');
      return;
    }

    if (path === '/categories/') {
      insertPageHeading(document.querySelector('.category-list'), 'Categories', '分类索引', '把相近主题收束到一起，让技术记录更容易被再次检索。');
      return;
    }

    if (path.indexOf('/categories/') === 0) {
      insertPageHeading(list, 'Category', '分类文章', '这里收录同一主题下的相关笔记。');
      return;
    }

    if (path === '/tags/') {
      insertPageHeading(document.querySelector('.tagcloud'), 'Tags', '标签云', '用关键词穿起文章之间的联系。');
      return;
    }

    if (path.indexOf('/tags/') === 0) {
      insertPageHeading(list, 'Tag', '标签文章', '同一标签下的文章汇总。');
    }
  }

  function enhanceHomeHero() {
    if (!isHomeListPage()) return;
    var hero = document.querySelector('#banner .banner-text');
    if (!hero || hero.querySelector('.boke-hero-title')) return;

    var subtitle = hero.querySelector('.h2');
    var fragment = document.createDocumentFragment();
    var kicker = document.createElement('div');
    kicker.className = 'boke-hero-kicker';
    kicker.textContent = 'Digital Garden / 晚风手记';
    fragment.appendChild(kicker);

    var title = document.createElement('div');
    title.className = 'boke-hero-title';
    title.textContent = '晚风技术笔记';
    fragment.appendChild(title);

    var desc = document.createElement('p');
    desc.className = 'boke-hero-desc';
    desc.textContent = '记录技术、生活与思考的数字花园。把编程学习、项目复盘和日常观察，整理成可回看的线索。';
    fragment.appendChild(desc);

    hero.insertBefore(fragment, subtitle || hero.firstChild);

    var tags = append(hero, 'div', 'boke-hero-tags');
    ['技术实践', '项目复盘', '生活思考'].forEach(function (label) {
      append(tags, 'span', null, label);
    });

    var actions = append(hero, 'div', 'boke-hero-actions');
    var latest = append(actions, 'a', 'boke-hero-action boke-hero-action-primary', '阅读最新文章');
    latest.href = '#board';
    var about = append(actions, 'a', 'boke-hero-action boke-hero-action-ghost', '关于晚风');
    about.href = '/about/';
  }

  function addHomeSectionHeader() {
    if (!isHomeListPage()) return;
    var layout = document.querySelector('.boke-home-layout');
    if (!layout || document.querySelector('.boke-section-heading')) return;

    var section = document.createElement('section');
    section.className = 'boke-section-heading';
    var copy = append(section, 'div');
    append(copy, 'p', 'boke-section-eyebrow', 'Recently Published');
    append(copy, 'h2', null, '最近更新');
    append(copy, 'p', 'boke-section-copy', '从技术搭建到学习方法，留下能被再次调用的经验。');
    var link = append(section, 'a', 'boke-section-link', '查看归档');
    link.href = '/archives/';

    layout.parentElement.insertBefore(section, layout);
  }

  function readingProgress() {
    if (!isPostPage() || document.querySelector('.boke-reading-progress')) return;
    var bar = append(document.body, 'div', 'boke-reading-progress');

    function update() {
      var article = document.querySelector('.post-content');
      if (!article) return;
      var rect = article.getBoundingClientRect();
      var total = Math.max(article.offsetHeight - window.innerHeight, 1);
      var done = Math.min(Math.max(-rect.top, 0), total);
      bar.style.width = (done / total * 100).toFixed(2) + '%';
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  function addSchema() {
    if (!isPostPage() || document.getElementById('boke-schema-blogposting')) return;
    var articleTitle = document.querySelector('#seo-header, .post-content h1, .markdown-body h1, .post-title');
    if (!articleTitle) return;
    var image = document.querySelector('#banner');
    var bg = image && image.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
    var data = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: text(articleTitle),
      description: document.querySelector('meta[name="description"]') ? document.querySelector('meta[name="description"]').content : '',
      image: bg ? bg[1] : site.avatar,
      url: location.href,
      mainEntityOfPage: location.href,
      author: { '@type': 'Person', name: site.author, url: site.github },
      publisher: { '@type': 'Person', name: site.author, image: site.avatar }
    };
    var script = document.createElement('script');
    script.id = 'boke-schema-blogposting';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function collectTaxonomy(cards) {
    var categoryMap = {};
    var tagMap = {};
    cards.forEach(function (card) {
      card.querySelectorAll('.post-meta a, .post-metas a').forEach(function (link) {
        var value = text(link).replace(/^#/, '');
        var href = safeHref(link.getAttribute('href') || '#');
        if (!value) return;
        if (href.indexOf('/tags/') !== -1 || text(link).indexOf('#') === 0) tagMap[value] = href;
        else categoryMap[value] = href;
      });
    });
    return { categories: categoryMap, tags: tagMap };
  }

  function buildChipList(map) {
    var keys = Object.keys(map);
    if (!keys.length) {
      var empty = document.createElement('p');
      empty.className = 'boke-empty';
      empty.textContent = '发布文章后自动显示。';
      return empty;
    }

    var list = document.createElement('ul');
    list.className = 'boke-chip-list';
    keys.forEach(function (key) {
      var item = append(list, 'li');
      var link = append(item, 'a');
      link.href = safeHref(map[key]);
      link.textContent = key;
    });
    return list;
  }

  function buildInfoCard(postCount, categoryCount, tagCount) {
    var card = document.createElement('section');
    card.className = 'boke-sidebar-card boke-info-card';
    append(card, 'h2', null, '博客信息');
    var list = append(card, 'ul');
    [
      ['文章数目', postCount],
      ['分类数目', categoryCount],
      ['标签数目', tagCount],
      ['最后更新', new Date().toLocaleDateString('zh-CN')]
    ].forEach(function (row) {
      var item = append(list, 'li');
      append(item, 'span', null, row[0]);
      append(item, 'b', null, row[1]);
    });
    return card;
  }

  function buildSimpleCard(title, child) {
    var card = document.createElement('section');
    card.className = 'boke-sidebar-card';
    append(card, 'h2', null, title);
    card.appendChild(child);
    return card;
  }

  function buildRecentList(cards) {
    var list = document.createElement('ol');
    list.className = 'boke-hot-list';
    cards.slice(0, 5).forEach(function (card) {
      var source = card.querySelector('.index-header a');
      if (!source) return;
      var item = append(list, 'li');
      var link = append(item, 'a');
      link.href = safeHref(source.getAttribute('href'));
      link.textContent = text(source);
    });
    return list;
  }

  function buildHomeSidebar() {
    if (!isHomeListPage()) return;
    document.body.classList.add('boke-home');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.index-card'));
    if (!cards.length || document.querySelector('.boke-home-layout')) return;

    var board = document.getElementById('board');
    if (board) board.classList.add('boke-home-board');

    var parent = cards[0].parentElement;
    var layout = document.createElement('div');
    layout.className = 'boke-home-layout';
    var posts = append(layout, 'div', 'boke-home-posts');
    var sidebar = append(layout, 'aside', 'boke-home-sidebar');
    sidebar.setAttribute('aria-label', '博客侧边栏');

    parent.insertBefore(layout, cards[0]);
    cards.forEach(function (card) {
      posts.appendChild(card);
    });

    var taxonomy = collectTaxonomy(cards);
    sidebar.appendChild(buildInfoCard(cards.length, Object.keys(taxonomy.categories).length, Object.keys(taxonomy.tags).length));
    sidebar.appendChild(buildSimpleCard('标签云', buildChipList(taxonomy.tags)));
    sidebar.appendChild(buildSimpleCard('文章分类', buildChipList(taxonomy.categories)));
    sidebar.appendChild(buildSimpleCard('近期文章', buildRecentList(cards)));
  }

  function buildHandsomeShell() {
    document.body.classList.add('boke-handsome');
    if (document.querySelector('.boke-left-rail')) return;

    var rail = append(document.body, 'aside', 'boke-left-rail');
    rail.setAttribute('aria-label', '站点导航');

    var profile = append(rail, 'section', 'boke-rail-profile');
    var avatar = append(profile, 'img');
    avatar.src = site.avatar;
    avatar.alt = site.author + '头像';
    append(profile, 'h2', null, site.author);
    append(profile, 'p', null, site.description);

    var nav = append(rail, 'nav', 'boke-rail-nav');
    [
      ['iconfont icon-home-fill', '首页', '/'],
      ['iconfont icon-archive-fill', '归档', '/archives/'],
      ['iconfont icon-category-fill', '分类', '/categories/'],
      ['iconfont icon-tags-fill', '标签', '/tags/'],
      ['iconfont icon-user-fill', '关于', '/about/']
    ].forEach(function (item) {
      var link = append(nav, 'a');
      link.href = item[2];
      if (isActiveNavPath(item[2])) link.classList.add('is-active');
      var marker = append(link, 'span', 'boke-rail-icon');
      var icon = append(marker, 'i', item[0]);
      icon.setAttribute('aria-hidden', 'true');
      link.appendChild(document.createTextNode(item[1]));
    });

    var badges = append(rail, 'section', 'boke-rail-badges');
    addBadge(badges, site.github, 'GitHub', 'WFCrush', true);
    addBadge(badges, '/', 'Theme', 'Fluid Glass');
  }

  function addBadge(parent, href, label, value, external) {
    var link = append(parent, 'a');
    link.href = href;
    if (external) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    append(link, 'span', null, label);
    append(link, 'b', null, value);
    return link;
  }

  function enhanceFooterBadges() {
    var footer = document.querySelector('footer, #footer');
    if (!footer) return;
    var host = footer.querySelector('.footer-inner') || footer;
    if (!footer.querySelector('.boke-footer-signature')) {
      append(host, 'p', 'boke-footer-signature', '愿每一次记录，都成为下一次出发的坐标。');
    }
    if (footer.querySelector('.boke-footer-badges')) return;
    var badges = append(host, 'div', 'boke-footer-badges');
    addBadge(badges, '/', 'Copyright', site.author);
    addBadge(badges, 'https://hexo.io', 'Engine', 'Hexo', true).rel = 'nofollow noopener';
    addBadge(badges, 'https://github.com/fluid-dev/hexo-theme-fluid', 'Theme', 'Fluid', true).rel = 'nofollow noopener';
  }

  function selectionShare() {
    if (!isPostPage() || document.querySelector('.boke-share-pop')) return;
    if (window.matchMedia('(pointer: coarse), (max-width: 768px)').matches) return;

    var pop = append(document.body, 'div', 'boke-share-pop');
    ['Twitter', '微博'].forEach(function (label) {
      var button = append(pop, 'button', null, label);
      button.type = 'button';
      button.dataset.share = label === '微博' ? 'weibo' : 'twitter';
    });

    document.addEventListener('mouseup', function () {
      var sel = window.getSelection();
      var selected = sel ? sel.toString().trim() : '';
      if (!sel || !sel.rangeCount || !selected || selected.length < 6) {
        pop.classList.remove('is-visible');
        return;
      }
      var rect = sel.getRangeAt(0).getBoundingClientRect();
      var width = pop.offsetWidth || 170;
      var height = pop.offsetHeight || 44;
      pop.style.left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8) + 'px';
      pop.style.top = Math.min(Math.max(rect.top - height - 10, 8), window.innerHeight - height - 8) + 'px';
      pop.dataset.text = selected.slice(0, 180);
      pop.classList.add('is-visible');
    });

    pop.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-share]');
      if (!button) return;
      var selected = pop.dataset.text || document.title;
      var url = encodeURIComponent(location.href);
      var shareText = encodeURIComponent(selected + ' - ' + document.title);
      var target = button.dataset.share === 'weibo'
        ? 'https://service.weibo.com/share/share.php?url=' + url + '&title=' + shareText
        : 'https://twitter.com/intent/tweet?url=' + url + '&text=' + shareText;
      window.open(target, '_blank', 'noopener,width=720,height=520');
      pop.classList.remove('is-visible');
    });
  }

  function likeCard() {
    if (!isPostPage() || document.querySelector('.boke-like-card')) return;
    var comments = document.getElementById('comments');
    var host = comments || document.querySelector('.post-content');
    if (!host || !host.parentElement) return;

    var key = 'boke-like:' + location.pathname;
    var count = 0;
    try {
      count = Number(localStorage.getItem(key) || 0);
    } catch (error) {
      count = 0;
    }

    var card = document.createElement('section');
    card.className = 'boke-like-card';
    var copy = append(card, 'div');
    append(copy, 'h2', null, '这篇笔记有帮助吗？');
    append(copy, 'p', null, '无需登录，点一下会保存在当前浏览器。');
    var button = append(card, 'button', 'boke-like-button');
    button.type = 'button';
    button.appendChild(document.createTextNode('点赞 '));
    var number = append(button, 'span', null, count);
    host.parentElement.insertBefore(card, host);
    button.addEventListener('click', function () {
      count += 1;
      try {
        localStorage.setItem(key, count);
      } catch (error) {}
      number.textContent = count;
    });
  }

  function relatedPosts() {
    if (!isPostPage()) return;
    var prevNext = document.querySelector('.post-prevnext');
    if (!prevNext || document.querySelector('.boke-related-card')) return;
    var links = Array.prototype.slice.call(document.querySelectorAll('.post-prevnext a')).slice(0, 3);
    if (!links.length) return;

    var section = document.createElement('section');
    section.className = 'boke-sidebar-card boke-related-card';
    append(section, 'h2', null, '相关文章');
    var list = append(section, 'ol', 'boke-hot-list');
    links.forEach(function (source) {
      var item = append(list, 'li');
      var link = append(item, 'a');
      link.href = safeHref(source.getAttribute('href'));
      link.textContent = text(source);
    });
    prevNext.parentElement.insertBefore(section, prevNext);
  }

  function subscribeAction() {
    document.querySelectorAll('.boke-subscribe-form').forEach(function (form) {
      if (site.subscribeAction) {
        form.setAttribute('action', site.subscribeAction);
      }
      form.addEventListener('submit', function (event) {
        if (!site.subscribeAction) {
          event.preventDefault();
          alert('请先在 source/js/site-enhance.js 中填写 Mailchimp 表单 action 地址。');
        }
      });
    });
  }

  function enhance404() {
    if (document.body.textContent.indexOf('这页走丢了') === -1 && location.pathname.indexOf('404') === -1) return;
    var board = document.getElementById('board');
    if (!board || document.querySelector('.boke-404-search')) return;
    var box = append(board, 'div', 'boke-sidebar-card boke-404-search');
    append(box, 'h2', null, '找不到页面');
    append(box, 'p', null, '可以返回首页，或搜索已有技术笔记。');
    var paragraph = append(box, 'p');
    var link = append(paragraph, 'a', null, '返回首页');
    link.href = '/';
  }

  ready(function () {
    if (document.documentElement.dataset.bokeEnhanceReady === 'true') return;
    document.documentElement.dataset.bokeEnhanceReady = 'true';

    setPageClasses();
    enhanceImages();
    enhanceSearch();
    enhanceNavbar();
    enhancePostSurface();
    readingProgress();
    addSchema();
    enhanceHomeHero();
    buildHandsomeShell();
    buildHomeSidebar();
    enhanceIndexCards();
    addHomeSectionHeader();
    enhanceIndexPages();
    selectionShare();
    likeCard();
    relatedPosts();
    subscribeAction();
    enhanceFooterBadges();
    enhance404();
  });
})();
