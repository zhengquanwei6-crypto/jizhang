(function () {
  "use strict";

  var ROUND_ATTR = "data-cl-round-007";
  var DEFAULT_ACCOUNT_KEY = "cl_round_007_default_account";
  var ACCOUNTS_KEY = "cl_round_007_accounts";
  var CATEGORIES_KEY = "cl_round_007_categories";
  var RECENT_KEY = "cl_round_007_recent_choice";
  var PENDING_KEY = "cl_round_001_pending_action";
  var OWN_OPEN_KEY = "cl_round_007_pending_open";
  var timer = null;
  var pendingOpenTimer = null;
  var fetchPatched = false;
  var historyPatched = false;
  var accountsPromise = null;
  var categoriesPromise = null;
  var catFilterMode = "all";

  var publicPaths = ["/login", "/register", "/reset-password", "/legal"];

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function icon(name) {
    var paths = {
      wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14" r="1"/>',
      tag: '<path d="M20 10 12 2H4v8l8 8z"/><path d="M7 7h.01"/>',
      check: '<path d="M5 12l5 5L20 7"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14">' + (paths[name] || paths.sparkles) + "</svg>";
  }

  function isPublicPath() {
    return publicPaths.some(function (path) {
      return location.pathname === path || location.pathname.indexOf(path + "/") === 0;
    });
  }

  function isAuthed() {
    try {
      return !!JSON.parse(localStorage.getItem("cl_auth") || "{}").accessToken;
    } catch (error) {
      return false;
    }
  }

  function authHeaders() {
    try {
      var token = JSON.parse(localStorage.getItem("cl_auth") || "{}").accessToken;
      return token ? { Authorization: "Bearer " + token } : {};
    } catch (error) {
      return {};
    }
  }

  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function requestPath(input) {
    try {
      var raw = typeof input === "string" ? input : input && input.url;
      return new URL(raw || "", location.origin).pathname;
    } catch (error) {
      return "";
    }
  }

  function requestMethod(input, init) {
    return String((init && init.method) || (input && input.method) || "GET").toUpperCase();
  }

  function normalizeAccounts(data) {
    var source = Array.isArray(data) ? data : Array.isArray(data && data.accounts) ? data.accounts : Array.isArray(data && data.items) ? data.items : [];
    return source.map(function (item, index) {
      var id = String(item.id || item.account_id || item.value || item.name || "account-" + index);
      var name = item.name || item.account_name || item.label || "账户";
      return {
        id: id,
        name: name,
        balance: item.balance != null ? Number(item.balance) : item.current_balance != null ? Number(item.current_balance) : null,
        type: item.type || item.group || item.kind || ""
      };
    }).filter(function (item) {
      return item.id && item.name;
    });
  }

  function normalizeCategories(data) {
    var source = Array.isArray(data) ? data : Array.isArray(data && data.categories) ? data.categories : Array.isArray(data && data.items) ? data.items : [];
    return source.map(function (item, index) {
      return {
        id: String(item.id || item.name || "category-" + index),
        name: item.name || item.category || item.label || "分类",
        type: item.type || item.kind || "expense",
        icon: item.icon || "tag"
      };
    }).filter(function (item) {
      return item.name;
    });
  }

  function saveAccounts(data) {
    var accounts = normalizeAccounts(data);
    if (accounts.length) writeJson(ACCOUNTS_KEY, accounts);
    return accounts;
  }

  function saveCategories(data) {
    var categories = normalizeCategories(data);
    if (categories.length) writeJson(CATEGORIES_KEY, categories);
    return categories;
  }

  function loadAccounts(force) {
    var cached = readJson(ACCOUNTS_KEY, []);
    if (!force && cached.length) return Promise.resolve(cached);
    if (accountsPromise) return accountsPromise;
    accountsPromise = fetch("/api/accounts", { headers: authHeaders() }).then(function (response) {
      if (!response.ok) throw new Error("accounts");
      return response.json();
    }).then(saveAccounts).catch(function () {
      return cached;
    }).finally(function () {
      accountsPromise = null;
    });
    return accountsPromise;
  }

  function loadCategories(force) {
    var cached = readJson(CATEGORIES_KEY, []);
    if (!force && cached.length) return Promise.resolve(cached);
    if (categoriesPromise) return categoriesPromise;
    categoriesPromise = fetch("/api/transactions/categories/list", { headers: authHeaders() }).then(function (response) {
      if (!response.ok) throw new Error("categories");
      return response.json();
    }).then(saveCategories).catch(function () {
      return cached;
    }).finally(function () {
      categoriesPromise = null;
    });
    return categoriesPromise;
  }

  function patchFetch() {
    if (fetchPatched || !window.fetch) return;
    fetchPatched = true;
    var original = window.fetch;
    window.fetch = function (input, init) {
      var path = requestPath(input);
      var method = requestMethod(input, init);
      var body = init && init.body;
      return original.apply(this, arguments).then(function (response) {
        if (response && response.ok) {
          if (path === "/api/accounts") {
            response.clone().json().then(saveAccounts).then(schedule).catch(function () {});
          }
          if (path === "/api/transactions/categories/list") {
            response.clone().json().then(saveCategories).then(schedule).catch(function () {});
          }
          if (path === "/api/transactions" && method === "POST" && typeof body === "string") {
            try {
              var tx = JSON.parse(body);
              writeJson(RECENT_KEY, {
                account_id: tx.account_id || "",
                category: tx.category || "",
                type: tx.type || "expense"
              });
            } catch (error) {
              return response;
            }
          }
        }
        return response;
      });
    };
  }

  function money(value) {
    var number = Number(value || 0);
    return number.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function visible(node) {
    if (!node) return false;
    var rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function visibleControls(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector)).filter(visible);
  }

  function getSheet() {
    return document.querySelector(".sheet-overlay .sheet") || document.querySelector(".sheet");
  }

  function setContent(node, content) {
    if (node.__round007Content === content) return;
    node.__round007Content = content;
    node.innerHTML = content;
  }

  function readDefaultAccount() {
    return readJson(DEFAULT_ACCOUNT_KEY, null);
  }

  function saveDefaultAccount(account) {
    if (!account) return;
    writeJson(DEFAULT_ACCOUNT_KEY, {
      id: account.id || account.value || "",
      name: account.name || account.text || "账户"
    });
    flash("已设为默认记账账户");
    schedule();
  }

  function setSelectValue(select, value) {
    if (!select) return false;
    var option = Array.prototype.find.call(select.options, function (item) {
      return item.value === value;
    });
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function accountOptionsFromSheet(sheet) {
    var select = sheet && sheet.querySelector("select");
    if (!select) return [];
    return Array.prototype.slice.call(select.options).map(function (option) {
      return {
        id: option.value,
        value: option.value,
        name: option.textContent.trim() || (option.value ? "账户" : "不记账户")
      };
    });
  }

  function findAccountOption(options, account) {
    if (!account) return null;
    return options.find(function (item) {
      return (account.id && item.value === account.id) || (account.name && item.name === account.name);
    }) || null;
  }

  function applyDefaultAccount(sheet) {
    if (!sheet || sheet.__round007DefaultApplied) return;
    var select = sheet.querySelector("select");
    if (!select || select.options.length < 2) return;
    var found = findAccountOption(accountOptionsFromSheet(sheet), readDefaultAccount());
    if (found && found.value && (select.value === found.value || setSelectValue(select, found.value))) {
      sheet.__round007DefaultApplied = true;
    }
  }

  function textOf(node) {
    return (node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function currentAmount(sheet) {
    var match = textOf(sheet).match(/¥\s*([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : 0;
  }

  function currentCategory(sheet) {
    if (sheet.__round007Category) return sheet.__round007Category;
    var active = visibleControls(sheet, ".cat-cell.on").find(function (cell) { return textOf(cell); });
    if (active) return textOf(active);
    var first = visibleControls(sheet, ".cat-cell").find(function (cell) { return textOf(cell); });
    return first ? textOf(first) : "";
  }

  function currentAccount(sheet) {
    var select = sheet.querySelector("select");
    if (!select) return { id: "", name: "不记账户" };
    var option = select.options[select.selectedIndex];
    return {
      id: select.value,
      name: option ? option.textContent.trim() : "不记账户"
    };
  }

  function step(label, value, ready) {
    return '<span class="cl-choice-step ' + (ready ? "is-ready" : "") + '"><i></i>' + html(label + " · " + value) + "</span>";
  }

  function choicePanelNode(sheet) {
    var existing = sheet.querySelector("[" + ROUND_ATTR + '="tx-choice"]');
    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-choice-panel";
      node.setAttribute(ROUND_ATTR, "tx-choice");
    }
    var anchor = sheet.querySelector(".scan-row") || sheet.querySelector(".cl-tx-last") || sheet.querySelector(".cl-tx-form-helper") || sheet.querySelector(".sheet-head");
    if (anchor && anchor.parentNode && node.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement("afterend", node);
    }
    return node;
  }

  function renderTxChoice() {
    var sheet = getSheet();
    if (!sheet || !isAuthed()) return;
    applyDefaultAccount(sheet);

    var cats = visibleControls(sheet, ".cat-cell").slice(0, 8);
    var accounts = accountOptionsFromSheet(sheet);
    var selectedAccount = currentAccount(sheet);
    var defaultAccount = readDefaultAccount();
    var category = currentCategory(sheet);
    var amount = currentAmount(sheet);

    var catHtml = cats.length ? cats.map(function (cell, index) {
      var name = textOf(cell) || "分类";
      var active = sheet.__round007CategoryIndex === index || (!sheet.__round007Category && name === category);
      return '<button type="button" class="cl-choice-chip ' + (active ? "is-active" : "") + '" data-cl-choice-cat="' + index + '">' + icon("tag") + '<span>' + html(name) + "</span></button>";
    }).join("") : '<span class="cl-choice-step">分类加载中</span>';

    var accountHtml = accounts.length ? accounts.map(function (account) {
      var isDefault = defaultAccount && ((defaultAccount.id && defaultAccount.id === account.value) || (defaultAccount.name && defaultAccount.name === account.name));
      var active = selectedAccount.id === account.value;
      return '<button type="button" class="cl-choice-chip ' + (active ? "is-active" : "") + " " + (isDefault ? "is-default" : "") + '" data-cl-choice-account="' + html(account.value) + '" data-cl-choice-account-name="' + html(account.name) + '">' + icon("wallet") + '<span>' + html(account.name) + "</span>" + (isDefault ? "<small>默认</small>" : "") + "</button>";
    }).join("") : '<span class="cl-choice-step">账户加载中</span>';

    var content = '<div class="cl-choice-head"><div class="cl-choice-copy"><span>Round 007</span><strong>选择助手</strong><small>分类和账户先定好，保存前少回头。</small></div></div>' +
      '<div class="cl-choice-status" data-cl-choice-status>' +
      step("金额", amount > 0 ? "已填" : "待填", amount > 0) +
      step("分类", category || "待选", !!category) +
      step("账户", selectedAccount.id ? selectedAccount.name : "不记", !!selectedAccount.id) +
      "</div>" +
      '<div class="cl-choice-block"><div class="cl-choice-label"><strong>常用分类</strong><button type="button" data-cl-choice-refresh>刷新</button></div><div class="cl-choice-row">' + catHtml + "</div></div>" +
      '<div class="cl-choice-block"><div class="cl-choice-label"><strong>记账账户</strong><button type="button" data-cl-choice-set-default>设当前为默认</button></div><div class="cl-choice-row">' + accountHtml + "</div></div>";

    setContent(choicePanelNode(sheet), content);
  }

  function routeAnchor() {
    return document.querySelector("[" + ROUND_ATTR + '="tx-choice"]') ||
      document.querySelector('[data-cl-round-006="compass"]') ||
      document.querySelector(".page-header") ||
      document.querySelector("header") ||
      document.querySelector(".app-shell .page") ||
      document.querySelector("#app");
  }

  function panelAfter(anchor, node) {
    if (!anchor || !anchor.parentNode) return;
    if (node.previousElementSibling !== anchor) anchor.insertAdjacentElement("afterend", node);
  }

  function openTransactionFromAnywhere() {
    localStorage.setItem(PENDING_KEY, "open-transaction");
    localStorage.setItem(OWN_OPEN_KEY, "1");
    if (location.pathname === "/home" || location.pathname === "/ledger") {
      window.dispatchEvent(new CustomEvent("cl:open-tx-editor"));
      return;
    }
    location.href = "/ledger";
  }

  function clearPendingOpen() {
    localStorage.removeItem(OWN_OPEN_KEY);
    localStorage.removeItem(PENDING_KEY);
    if (pendingOpenTimer) {
      window.clearInterval(pendingOpenTimer);
      pendingOpenTimer = null;
    }
    window.setTimeout(schedule, 80);
  }

  function ensurePendingOpen() {
    if (!localStorage.getItem(OWN_OPEN_KEY)) return;
    if (location.pathname !== "/home" && location.pathname !== "/ledger") return;
    if (getSheet()) {
      clearPendingOpen();
      return;
    }
    if (pendingOpenTimer) return;
    var started = Date.now();
    pendingOpenTimer = window.setInterval(function () {
      if (getSheet()) {
        clearPendingOpen();
        return;
      }
      window.dispatchEvent(new CustomEvent("cl:open-tx-editor"));
      if (Date.now() - started > 7000) {
        window.clearInterval(pendingOpenTimer);
        pendingOpenTimer = null;
      }
    }, 260);
  }

  function renderAccountPanel() {
    var existing = document.querySelector("[" + ROUND_ATTR + '="account-default"]');
    if (location.pathname !== "/accounts" || !isAuthed() || isPublicPath()) {
      if (existing) existing.remove();
      return;
    }

    var accounts = readJson(ACCOUNTS_KEY, []);
    if (!accounts.length) loadAccounts(false).then(schedule);

    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-default-panel";
      node.setAttribute(ROUND_ATTR, "account-default");
    }

    var current = readDefaultAccount();
    var list = accounts.length ? accounts.slice(0, 6).map(function (account) {
      var active = current && ((current.id && current.id === account.id) || (current.name && current.name === account.name));
      var balance = account.balance == null ? "" : "¥" + money(account.balance);
      return '<button type="button" class="cl-default-chip ' + (active ? "is-active is-default" : "") + '" data-cl-default-account="' + html(account.id) + '" data-cl-default-account-name="' + html(account.name) + '"><span>' + html(account.name) + "</span><small>" + html(active ? "默认" : balance || "选择") + "</small></button>";
    }).join("") : '<span class="cl-choice-step">正在读取账户</span>';

    var content = '<div class="cl-default-head"><div class="cl-default-copy"><span>Round 007</span><strong>默认记账账户</strong><small>先在这里定默认值，新账单会自动带上。</small></div></div>' +
      '<div class="cl-default-list">' + list + "</div>" +
      '<div class="cl-default-actions"><button type="button" class="cl-choice-mini primary" data-cl-account-action="openTx">' + icon("plus") + "<span>用默认记一笔</span></button><button type=\"button\" class=\"cl-choice-mini\" data-cl-account-action=\"categories\">" + icon("tag") + "<span>整理分类</span></button></div>";
    setContent(node, content);
    panelAfter(routeAnchor(), node);
  }

  function renderCategoryPanel() {
    var existing = document.querySelector("[" + ROUND_ATTR + '="category-panel"]');
    if (location.pathname !== "/categories" || !isAuthed() || isPublicPath()) {
      if (existing) existing.remove();
      return;
    }

    var categories = readJson(CATEGORIES_KEY, []);
    if (!categories.length) loadCategories(false).then(schedule);

    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-cat-speed-panel";
      node.setAttribute(ROUND_ATTR, "category-panel");
    }

    var expense = categories.filter(function (item) { return item.type !== "income"; });
    var income = categories.filter(function (item) { return item.type === "income"; });
    var quick = categories.slice(0, 8).map(function (item) {
      return '<button type="button" class="cl-cat-speed-chip" data-cl-cat-search="' + html(item.name) + '">' + icon(item.type === "income" ? "sparkles" : "tag") + '<span>' + html(item.name) + "</span></button>";
    }).join("") || '<span class="cl-choice-step">正在读取分类</span>';

    var content = '<div class="cl-cat-speed-head"><div class="cl-cat-speed-copy"><span>Round 007</span><strong>分类速选</strong><small>查找、筛选、回到记账表单都更快。</small></div></div>' +
      '<div class="cl-cat-speed-metrics"><div class="cl-cat-speed-metric"><strong>' + categories.length + '</strong><span>全部分类</span></div><div class="cl-cat-speed-metric"><strong>' + expense.length + '</strong><span>支出</span></div><div class="cl-cat-speed-metric"><strong>' + income.length + '</strong><span>收入</span></div></div>' +
      '<div class="cl-cat-speed-actions"><button type="button" class="cl-speed-action ' + (catFilterMode === "all" ? "is-active" : "") + '" data-cl-cat-filter="all">全部</button><button type="button" class="cl-speed-action ' + (catFilterMode === "expense" ? "is-active" : "") + '" data-cl-cat-filter="expense">只看支出</button><button type="button" class="cl-speed-action ' + (catFilterMode === "income" ? "is-active" : "") + '" data-cl-cat-filter="income">只看收入</button><button type="button" class="cl-speed-action primary" data-cl-cat-action="focus">' + icon("search") + "<span>搜索</span></button><button type=\"button\" class=\"cl-speed-action\" data-cl-cat-action=\"openTx\">" + icon("plus") + "<span>记一笔</span></button></div>" +
      '<div class="cl-cat-speed-list">' + quick + "</div>";
    setContent(node, content);
    panelAfter(routeAnchor(), node);
    applyCategoryFilter(catFilterMode);
  }

  function ensureBudgetRescueFallback() {
    var existing = document.querySelector("[" + ROUND_ATTR + '="budget-rescue-fallback"]');
    if (location.pathname !== "/budgets" || !isAuthed() || isPublicPath()) {
      if (existing) existing.remove();
      return;
    }
    if (document.querySelector('[data-cl-round-002="budget-rescue"]')) return;

    var bodyText = textOf(document.body);
    var needsRescue = bodyText.indexOf("设置一个月度总预算") !== -1 ||
      bodyText.indexOf("还没有分类预算") !== -1 ||
      bodyText.indexOf("预算体温计") !== -1;
    if (!needsRescue) return;

    var anchor = document.querySelector('[data-cl-round-004="budget"]') ||
      document.querySelector('[data-cl-round-006="compass"]') ||
      document.querySelector(".page-header") ||
      document.querySelector(".app-shell .page");
    if (!anchor || !anchor.parentNode) return;

    var node = existing || document.createElement("section");
    if (!existing) {
      node.className = "cl-empty-boost cl-budget-rescue-fallback";
      node.setAttribute("data-cl-round-002", "budget-rescue");
      node.setAttribute(ROUND_ATTR, "budget-rescue-fallback");
    }

    setContent(node, [
      '<span class="cl-empty-kicker">' + icon("wallet") + "<span>预算起步</span></span>",
      '<h3 class="cl-empty-title">先给本月一个可执行的上限</h3>',
      '<p class="cl-empty-copy">预算页暂时没有可展示的数据。可以先记一笔，再回到这里设置总预算和分类限额。</p>',
      '<div class="cl-empty-mini-grid"><div class="cl-empty-mini"><strong>总预算</strong><span>控制本月花费</span></div><div class="cl-empty-mini"><strong>分类限额</strong><span>餐饮交通分开看</span></div><div class="cl-empty-mini"><strong>剩余额度</strong><span>每天知道还剩多少</span></div></div>',
      '<div class="cl-empty-actions"><button type="button" class="cl-empty-action primary" data-cl-budget-action="openTx">' + icon("plus") + "<span>去记一笔</span></button><button type=\"button\" class=\"cl-empty-action\" data-cl-budget-action=\"ledger\">" + icon("wallet") + "<span>查看账本</span></button><button type=\"button\" class=\"cl-empty-action\" data-cl-budget-action=\"reload\">刷新预算</button></div>"
    ].join(""));

    if (anchor.nextElementSibling !== node) anchor.insertAdjacentElement("afterend", node);
  }

  function applyCategoryFilterNow() {
    if (location.pathname !== "/categories") return;
    var sections = Array.prototype.slice.call(document.querySelectorAll(".cat-section"));
    sections.forEach(function (section, index) {
      var text = textOf(section);
      var isIncome = text.indexOf("收入") !== -1 || index === 1;
      var isExpense = text.indexOf("支出") !== -1 || index === 0;
      section.hidden = catFilterMode === "income" ? !isIncome : catFilterMode === "expense" ? !isExpense : false;
    });
  }

  function applyCategoryFilter(mode) {
    catFilterMode = mode || "all";
    applyCategoryFilterNow();
    window.setTimeout(applyCategoryFilterNow, 120);
    window.setTimeout(applyCategoryFilterNow, 360);
  }

  function setCategorySearch(name) {
    var input = document.querySelector(".search-input");
    if (!input) return;
    input.value = name || "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.classList.add("cl-choice-focus");
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center", behavior: "smooth" });
    window.setTimeout(function () {
      input.focus({ preventScroll: true });
    }, 80);
    window.setTimeout(function () {
      input.focus({ preventScroll: true });
    }, 220);
    window.setTimeout(function () {
      input.classList.remove("cl-choice-focus");
    }, 1400);
  }

  function flash(message) {
    var old = document.querySelector(".cl-choice-flash");
    if (old) old.remove();
    var node = document.createElement("div");
    node.className = "cl-choice-flash";
    node.textContent = message;
    document.body.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) node.remove();
    }, 1900);
  }

  function handleChoiceClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var cat = target.closest("[data-cl-choice-cat]");
    if (cat) {
      var sheet = getSheet();
      if (!sheet) return;
      var index = Number(cat.getAttribute("data-cl-choice-cat"));
      var cell = visibleControls(sheet, ".cat-cell")[index];
      if (cell) {
        sheet.__round007Category = textOf(cell);
        sheet.__round007CategoryIndex = index;
        cell.click();
        flash("已选择分类");
        schedule();
      }
      return;
    }

    var account = target.closest("[data-cl-choice-account]");
    if (account) {
      var sheetAccount = getSheet();
      var select = sheetAccount && sheetAccount.querySelector("select");
      if (select && setSelectValue(select, account.getAttribute("data-cl-choice-account"))) {
        flash("已切换记账账户");
        schedule();
      }
      return;
    }

    if (target.closest("[data-cl-choice-set-default]")) {
      var sheetDefault = getSheet();
      var current = sheetDefault ? currentAccount(sheetDefault) : null;
      saveDefaultAccount(current && { id: current.id, name: current.name });
      return;
    }

    if (target.closest("[data-cl-choice-refresh]")) {
      var sheetRefresh = getSheet();
      if (sheetRefresh) {
        delete sheetRefresh.__round007Category;
        delete sheetRefresh.__round007CategoryIndex;
      }
      schedule();
      return;
    }

    var defaultAccount = target.closest("[data-cl-default-account]");
    if (defaultAccount) {
      saveDefaultAccount({
        id: defaultAccount.getAttribute("data-cl-default-account"),
        name: defaultAccount.getAttribute("data-cl-default-account-name")
      });
      return;
    }

    var accountAction = target.closest("[data-cl-account-action]");
    if (accountAction) {
      var action = accountAction.getAttribute("data-cl-account-action");
      if (action === "openTx") openTransactionFromAnywhere();
      if (action === "categories") location.href = "/categories";
      return;
    }

    var filter = target.closest("[data-cl-cat-filter]");
    if (filter) {
      applyCategoryFilter(filter.getAttribute("data-cl-cat-filter"));
      renderCategoryPanel();
      return;
    }

    var catSearch = target.closest("[data-cl-cat-search]");
    if (catSearch) {
      setCategorySearch(catSearch.getAttribute("data-cl-cat-search"));
      return;
    }

    var catAction = target.closest("[data-cl-cat-action]");
    if (catAction) {
      var catActionName = catAction.getAttribute("data-cl-cat-action");
      if (catActionName === "focus") setCategorySearch("");
      if (catActionName === "openTx") openTransactionFromAnywhere();
      return;
    }

    var budgetAction = target.closest("[data-cl-budget-action]");
    if (budgetAction) {
      var budgetActionName = budgetAction.getAttribute("data-cl-budget-action");
      if (budgetActionName === "openTx") openTransactionFromAnywhere();
      if (budgetActionName === "ledger") location.href = "/ledger";
      if (budgetActionName === "reload") location.reload();
    }
  }

  function renderAll() {
    if (!isAuthed() || isPublicPath()) return;
    ensurePendingOpen();
    renderTxChoice();
    renderAccountPanel();
    renderCategoryPanel();
    ensureBudgetRescueFallback();
  }

  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () {
      timer = null;
      renderAll();
    }, 140);
  }

  function patchHistory() {
    if (historyPatched) return;
    historyPatched = true;
    ["pushState", "replaceState"].forEach(function (name) {
      var original = history[name];
      history[name] = function () {
        var result = original.apply(this, arguments);
        schedule();
        return result;
      };
    });
    window.addEventListener("popstate", schedule);
  }

  function boot() {
    patchFetch();
    patchHistory();
    loadAccounts(false).then(schedule);
    loadCategories(false).then(schedule);
    schedule();
    document.addEventListener("click", function (event) {
      handleChoiceClick(event);
      window.setTimeout(schedule, 80);
    });
    document.addEventListener("change", schedule);
    document.addEventListener("input", schedule);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
