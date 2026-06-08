const stageOrder = stages.map((stage) => stage.id);

const state = {
  currentAccount: null,
  currentModule: "profile",
  menuOpen: false,
  recoveryOpen: false,
  selectedItem: null,
  stageIndex: Number(localStorage.getItem("lzy_stage_index") || 0),
  recovering: false,
};

const app = document.getElementById("app");

function stageVisible(stageId) {
  return stageOrder.indexOf(stageId) <= state.stageIndex;
}

function colorFor(name) {
  const account = accounts.find((a) => a.name === name);
  if (account) return account.color;
  if (name === "夏禾") return "#d9a73e";
  if (name === "系统" || name === "缓存") return "#8793a4";
  return "#6b7280";
}

function initial(name) {
  return name.slice(-1);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3600);
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-shell">
      <header class="login-header">
        <div class="school-mark">丽</div>
        <div>
          <div class="login-title">丽职院大学生服务平台</div>
          <div class="login-subtitle">统一身份认证 / 学生个人服务中心</div>
        </div>
      </header>
      <main class="login-main">
        <section class="login-card">
          <div class="notice-panel">
            <h1>学生服务平台</h1>
            <p>本平台提供课表、消息、校园卡、图书馆、场地预约、门禁、学生事务、文件柜、浏览安全记录等服务。历史归档账号仅显示已恢复数据。</p>
            <div class="notice-list">
              <div class="notice-item"><strong>服务通知</strong><br>旧版数据归档维护完成，部分停用账号可进入历史归档模式。</div>
              <div class="notice-item"><strong>安全提示</strong><br>请勿使用非本人账号。如需查看历史归档数据，请联系平台管理员。</div>
            </div>
          </div>
          <form class="login-form" id="loginForm">
            <h2>统一身份认证</h2>
            <div class="field">
              <label for="studentId">学号</label>
              <input id="studentId" placeholder="请输入学号" />
            </div>
            <button class="primary-btn" type="submit">登录</button>
            <div class="hint">请输入DM发放的历史归档学号。系统仅开放已停用账号的归档浏览权限。</div>
          </form>
        </section>
      </main>
      <footer class="login-subtitle" style="text-align:center;padding:16px;">丽职院信息化办公室</footer>
    </div>
  `;

  const sid = document.getElementById("studentId");
  document.getElementById("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const account = accounts.find((a) => a.studentId === sid.value.trim());
    if (!account) {
      toast("未查询到该学号的历史归档账号");
      return;
    }
    state.currentAccount = account;
    state.currentModule = "profile";
    state.menuOpen = false;
    state.selectedItem = null;
    renderApp();
    toast(`已进入 ${state.currentAccount.name} 的历史归档账号`);
  });
}

function renderApp() {
  const account = state.currentAccount;
  const recovery = recoveryProgress();
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand"><div class="school-mark">丽</div><span>丽职院大学生服务平台</span></div>
        <div class="top-actions">
          <span>历史归档模式</span>
          <span class="top-account-label">${account.name} / ${account.studentId}</span>
          <div class="top-recovery-meter" aria-label="当前恢复进度">
            <span>${recovery.percent}%</span>
            <i><b style="width:${recovery.percent}%"></b></i>
          </div>
          ${state.stageIndex < stages.length - 1 ? `<button class="secondary-btn top-recover" id="recoverBtn">恢复历史数据</button>` : `<span class="top-complete">数据已恢复</span>`}
          <button class="ghost-btn" id="logoutBtn">退出账号</button>
        </div>
      </header>
      <div class="layout">
        <aside class="sidebar">
          ${renderAccountCard(account)}
          ${renderModuleMenu(account)}
        </aside>
        <main class="content">
          ${renderModule(account, state.currentModule)}
        </main>
      </div>
      ${renderRecoveryPanel()}
    </div>
  `;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    state.currentAccount = null;
    renderLogin();
  });

  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      state.menuOpen = !state.menuOpen;
      renderApp();
    });
  }

  document.querySelectorAll(".module-entry").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentModule = button.dataset.module;
      state.selectedItem = null;
      state.menuOpen = false;
      renderApp();
    });
  });

  document.querySelectorAll("[data-item-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentModule = button.dataset.itemModule;
      state.selectedItem = Number(button.dataset.itemIndex);
      renderApp();
    });
  });

  document.querySelectorAll("[data-back-list]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedItem = null;
      renderApp();
    });
  });

  document.querySelectorAll("[data-damaged-play]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.closest(".damaged-media");
      if (!panel) return;
      panel.classList.add("failed");
      const message = panel.querySelector(".damage-message");
      if (message) message.textContent = "文件损坏，无法播放";
    });
  });

  document.querySelectorAll("[data-evidence-img]").forEach((img) => {
    img.addEventListener("error", () => {
      const box = img.closest(".evidence-image") || img.closest(".damaged-media");
      if (box) box.classList.add("image-error");
    });
  });

  const recover = document.getElementById("recoverBtn");
  if (recover) {
    recover.addEventListener("click", () => {
      if (state.stageIndex < stages.length - 1) {
        showRecoveryModal();
      }
    });
  }

  const reset = document.getElementById("resetStageBtn");
  if (reset) {
    reset.addEventListener("click", () => {
      state.stageIndex = 0;
      state.selectedItem = null;
      localStorage.setItem("lzy_stage_index", "0");
      toast("历史数据恢复进度已重置为基础资料");
      renderApp();
    });
  }

  const dockToggle = document.getElementById("recoveryDockToggle");
  if (dockToggle) {
    dockToggle.addEventListener("click", () => {
      state.recoveryOpen = !state.recoveryOpen;
      renderApp();
    });
  }
}

function visibleItems(account, moduleId) {
  return (account.modules[moduleId]?.items || []).filter((it) => stageVisible(it.stage));
}

function renderModuleMenu(account) {
  return `
    <button class="hamburger ${state.menuOpen ? "active" : ""}" id="menuToggle" aria-label="展开功能菜单">
      <span class="hamburger-icon"><i></i><i></i><i></i></span>
      <strong>${state.menuOpen ? "收起功能菜单" : "展开功能菜单"}</strong>
    </button>
    ${state.menuOpen ? `
      <nav class="module-menu">
        ${modules.map((module) => `
        <button class="module-entry ${state.currentModule === module.id ? "active" : ""}" data-module="${module.id}">
          <span class="nav-icon">${module.icon}</span>
          <span>${module.name}</span>
        </button>
      `).join("")}
      </nav>
    ` : ""}
  `;
}

function shortTitle(title) {
  return title.length > 18 ? title.slice(0, 18) + "..." : title;
}

function renderAccountCard(account) {
  return `
    <div class="account-card">
      <span class="avatar" style="background:${account.color}">${account.avatar}</span>
      <span class="account-name">
        <strong>${account.name}</strong>
        <span>${account.studentId}</span>
      </span>
      <div class="meta" style="margin-top:10px;">${account.college} / ${account.className}</div>
      <div class="meta">账号状态：${account.status}</div>
    </div>
  `;
}

function recoveryProgress() {
  const restored = Math.min(state.stageIndex + 1, stages.length);
  const percent = Math.round((restored / stages.length) * 100);
  return { restored, total: stages.length, percent };
}

function renderRecoveryPanel() {
  const recovery = recoveryProgress();
  return `
    <div class="recovery-dock ${state.recoveryOpen ? "open" : ""}">
      <button class="recovery-dock-toggle" id="recoveryDockToggle" type="button">
        <span>归档状态</span>
      </button>
      ${state.recoveryOpen ? `
        <div class="recovery-popover">
          <h3>历史归档状态</h3>
          <div class="archive-status">
            <div class="meta">当前归档包：${stages[state.stageIndex].title}</div>
            <div class="meta">${stages[state.stageIndex].recoveryText}</div>
            <div class="recovery-meter">
              <div>
                <strong>恢复进度</strong>
                <span>${recovery.restored}/${recovery.total} 阶段 · 约 ${recovery.percent}%</span>
              </div>
              <div class="cache-bar"><span style="width:${recovery.percent}%"></span></div>
            </div>
          </div>
          <button class="ghost-btn reset-stage-btn" id="resetStageBtn">重置进度</button>
          <div class="hint">仅DM需要时使用。恢复历史数据请点击右上角按钮。</div>
        </div>
      ` : ""}
    </div>
  `;
}

function showRecoveryModal() {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="recovery-modal">
      <h2>正在恢复历史数据</h2>
      <p id="recoverStatus">正在读取停用账号索引...</p>
      <div class="big-cache-bar"><span id="recoverProgress"></span></div>
      <div class="percent" id="recoverPercent">0%</div>
      <button class="primary-btn" id="recoverConfirm" style="display:none;">确认</button>
    </div>
  `;
  document.body.appendChild(modal);
  const progress = modal.querySelector("#recoverProgress");
  const percent = modal.querySelector("#recoverPercent");
  const status = modal.querySelector("#recoverStatus");
  const confirm = modal.querySelector("#recoverConfirm");
  const messages = [
    "正在读取停用账号索引...",
    "正在校验历史归档权限...",
    "正在恢复消息缓存...",
    "正在合并学生事务归档...",
    "正在写入本轮可见数据...",
  ];
  let value = 0;
  const timer = setInterval(() => {
    value += Math.floor(8 + Math.random() * 13);
    if (value > 100) value = 100;
    progress.style.width = `${value}%`;
    percent.textContent = `${value}%`;
    status.textContent = messages[Math.min(messages.length - 1, Math.floor(value / 22))];
    if (value === 100) {
      clearInterval(timer);
      status.textContent = "部分历史数据已恢复";
      confirm.style.display = "block";
      confirm.addEventListener("click", () => {
        state.stageIndex += 1;
        state.selectedItem = null;
        localStorage.setItem("lzy_stage_index", String(state.stageIndex));
        modal.remove();
        toast("部分历史数据已恢复");
        renderApp();
      }, { once: true });
    }
  }, 160);
}

function renderModule(account, moduleId) {
  if (moduleId === "profile") return renderProfile(account);
  const module = modules.find((m) => m.id === moduleId);
  const items = visibleItems(account, moduleId);
  if (moduleId === "messages") {
    const conversations = buildMessageConversations(items, account);
    if (state.selectedItem !== null && conversations[state.selectedItem]) {
      return renderMessageConversationPage(account, module, conversations, conversations[state.selectedItem]);
    }
    return renderMessageCenter(account, module, conversations);
  }
  if (state.selectedItem !== null && items[state.selectedItem]) {
    return renderDetailPage(account, module, items[state.selectedItem]);
  }
  return renderModuleList(module, items);
}

function renderModuleList(module, items) {
  if (!items.length) {
    return `
      <h1 class="page-title">${module.name}</h1>
      <div class="module-empty">${emptyText}</div>
    `;
  }
  if (module.id === "schedule") return renderScheduleList(module, items);
  if (module.id === "card") return renderCardList(module, items);
  if (module.id === "library") return renderLibraryList(module, items);
  if (module.id === "booking") return renderBookingList(module, items);
  if (module.id === "access") return renderAccessList(module, items);
  if (module.id === "affairs") return renderAffairsList(module, items);
  if (module.id === "files") return renderFilesList(module, items);
  if (module.id === "browser") return renderBrowserList(module, items);
  if (module.id === "wall") return renderWallList(module, items);
  return `
    <h1 class="page-title">${module.name}</h1>
    ${items.map((entry, index) => renderListCard(module.id, entry, index)).join("")}
  `;
}

function renderMessageCenter(account, module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="message-app">
      <aside class="conversation-list">
        <div class="message-account">
          <span class="avatar small" style="background:${account.color}">${account.avatar}</span>
          <div>
            <strong>${escapeHtml(account.name)}</strong>
            <span>历史消息归档</span>
          </div>
        </div>
        <div class="conversation-search">搜索</div>
        ${items.length ? items.map((entry, index) => renderConversationItem(module.id, entry, index, false, account)).join("") : `<div class="module-empty">${emptyText}</div>`}
      </aside>
      <section class="conversation-placeholder">
        <div class="placeholder-icon">信</div>
        <h2>请选择会话</h2>
        <p>消息中心仅恢复历史聊天记录，不支持发送新消息。</p>
      </section>
    </section>
  `;
}

function buildMessageConversations(items, account) {
  const map = new Map();
  items.forEach((entry) => {
    const normalized = normalizeMessageEntry(entry, account);
    const existing = map.get(normalized.key);
    if (existing) {
      existing.entries.push(...normalized.entries);
    } else {
      map.set(normalized.key, normalized);
    }
  });
  return [...map.values()].map((conversation) => ({
    ...conversation,
    entries: conversation.entries.sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)),
  }));
}

function normalizeMessageEntry(entry, account) {
  if (entry.type === "chat") {
    const isGroup = (entry.participants || []).length > 2 || entry.title.includes("群");
    const participants = entry.participants || [];
    const key = isGroup ? `group:${stripRecoveredTitle(entry.title)}` : `private:${[...participants].sort().join("|")}`;
    return {
      key,
      rawTitle: stripRecoveredTitle(entry.title),
      participants,
      isGroup,
      entries: [{ ...entry, dateLabel: chatDateLabel(entry) }],
    };
  }

  const privateName = privateNameFromTitle(entry.title);
  if (privateName) {
    const participants = [account.name, privateName];
    return {
      key: `private:${[...participants].sort().join("|")}`,
      rawTitle: privateName,
      participants,
      isGroup: false,
      entries: [itemAsChatEntry(entry, account, participants)],
    };
  }

  return {
    key: `note:${entry.stage}:${entry.title}`,
    rawTitle: entry.title,
    participants: [account.name],
    isGroup: false,
    entries: [itemAsChatEntry(entry, account, [account.name])],
  };
}

function itemAsChatEntry(entry, account, participants) {
  const match = entry.detail.match(/^([^：:]{1,8})[：:](.+)$/);
  const speaker = match ? match[1].trim() : account.name;
  const text = match ? match[2].trim() : entry.detail;
  return {
    ...entry,
    type: "chat",
    participants,
    lines: [[speaker, entry.meta || "归档", text]],
    dateLabel: chatDateLabel(entry),
  };
}

function stripRecoveredTitle(title) {
  return title.replace(/（.*?恢复段）/g, "").replace(/（.*?）/g, "").trim();
}

function privateNameFromTitle(title) {
  const match = title.match(/^与([^（]+)(?:（.*）)?$/);
  return match ? match[1].trim() : "";
}

function chatDateLabel(entry) {
  const text = `${entry.title || ""} ${entry.meta || ""} ${entry.detail || ""}`;
  const match = text.match(/\d+月\d+日/);
  if (match) return match[0];
  return {
    base: "4月12日",
    death: "4月17日",
    summon: "4月18日-4月24日",
    aftermath: "4月24日",
    dispersal: "5月2日",
    final: "深层缓存",
  }[entry.stage] || "历史归档";
}

function renderScheduleList(module, items) {
  const timetableIndex = items.findIndex((entry) => entry.title.includes("课表") || entry.title.includes("课程表"));
  const agenda = items.filter((_, index) => index !== timetableIndex);
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="portal-panel edu-panel">
      <div class="portal-panel-head">
        <div>
          <strong>教务课表与考勤</strong>
          <span>2020-2021学年 第二学期</span>
        </div>
        <span class="system-badge">旧版教务数据</span>
      </div>
      ${timetableIndex >= 0 ? `
        <button class="schedule-main-card" data-item-module="${module.id}" data-item-index="${timetableIndex}">
          <span>本周课程表</span>
          <strong>${escapeHtml(items[timetableIndex].title)}</strong>
          <em>${escapeHtml(scheduleSummary(items[timetableIndex]))}</em>
        </button>
      ` : ""}
      <div class="agenda-list">
        ${agenda.length ? agenda.map((entry) => {
          const index = items.indexOf(entry);
          return `
            <button class="agenda-row" data-item-module="${module.id}" data-item-index="${index}">
              <span>${escapeHtml(entry.meta || "日程")}</span>
              <strong>${escapeHtml(entry.title)}</strong>
              <em>${escapeHtml(previewText(entry))}</em>
            </button>
          `;
        }).join("") : `<div class="module-empty">${emptyText}</div>`}
      </div>
    </section>
  `;
}

function scheduleSummary(entry) {
  const courses = parseScheduleCourses(entry.detail, []);
  const days = ["周一", "周二", "周三", "周四", "周五"];
  const activeDays = days.filter((day) => courses.some((course) => course.day === day));
  const eveningCount = courses.filter((course) => course.period === "9-10").length;
  const dayText = activeDays.length === days.length ? "覆盖周一至周五" : `覆盖${activeDays.join("、")}`;
  return `本周 ${courses.length} 条课程安排，${dayText}${eveningCount ? `，含 ${eveningCount} 条晚间安排` : ""}。`;
}

function renderCardList(module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="portal-panel card-system">
      <div class="card-balance">
        <span>校园卡账户</span>
        <strong>历史归档</strong>
        <em>流水仅供查询</em>
      </div>
      <table class="system-table">
        <thead><tr><th>账单名称</th><th>摘要</th><th>状态</th><th></th></tr></thead>
        <tbody>${items.map((entry, index) => `
          <tr>
            <td>${escapeHtml(entry.title)}</td>
            <td>${escapeHtml(previewText(entry))}</td>
            <td><span class="status-pill">已归档</span></td>
            <td><button class="table-link" data-item-module="${module.id}" data-item-index="${index}">查看流水</button></td>
          </tr>
        `).join("")}</tbody>
      </table>
    </section>
  `;
}

function renderLibraryList(module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="library-system">
      <div class="library-searchbar">馆藏 / 借阅 / 电子资源检索</div>
      <div class="library-tabs"><span class="active">全部记录</span><span>借阅</span><span>检索</span><span>电子资源</span></div>
      <div class="library-results">
        ${items.map((entry, index) => `
          <button class="library-result" data-item-module="${module.id}" data-item-index="${index}">
            <strong>${escapeHtml(entry.title)}</strong>
            <span>${escapeHtml(previewText(entry))}</span>
            <em>${escapeHtml(entry.meta || "历史归档")}</em>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBookingList(module, items) {
  const bookings = items.map((entry, index) => ({ ...parseBooking(entry), entry, index }));
  const activeDates = new Set(bookings.map((booking) => booking.day).filter(Boolean));
  const selectedDay = [...activeDates][0] || "24";
  const selectedBookings = bookings.filter((booking) => booking.day === selectedDay);
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="portal-panel booking-system">
      <div class="booking-calendar">
        ${["一", "二", "三", "四", "五", "六", "日"].map((day) => `<span>${day}</span>`).join("")}
        ${Array.from({ length: 14 }, (_, i) => {
          const day = String(i + 12);
          return `<i class="${activeDates.has(day) ? "marked" : ""} ${day === selectedDay ? "selected" : ""}">${day}</i>`;
        }).join("")}
      </div>
      <div class="booking-rows">
        <div class="booking-day-title">${selectedDay ? `4月${selectedDay}日预约` : "预约明细"}</div>
        ${selectedBookings.length ? selectedBookings.map((booking) => `
          <button class="booking-row" data-item-module="${module.id}" data-item-index="${booking.index}">
            <strong>${escapeHtml(booking.time || booking.entry.title)}</strong>
            <span>${escapeHtml(booking.place || "未登记地点")}</span>
            <em>${escapeHtml(booking.owner ? `预约人：${booking.owner}` : "预约状态：历史归档")}${booking.note ? ` / ${escapeHtml(booking.note)}` : ""}</em>
          </button>
        `).join("") : `<div class="module-empty">该日期暂无相关预约</div>`}
      </div>
    </section>
  `;
}

function parseBooking(entry) {
  const text = entry.detail || "";
  const date = text.match(/(\d+)月(\d+)日/);
  const time = text.match(/(\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
  const place = text.match(/地点：([^；。]+)/);
  const owner = text.match(/预约人：([^；。]+)/);
  const note = text.match(/备注：([^；。]+)/);
  const purpose = text.match(/用途：([^；。]+)/);
  return {
    month: date?.[1] || "",
    day: date?.[2] || "",
    time: time?.[1] || "",
    place: place?.[1] || inferBookingPlace(entry),
    owner: owner?.[1] || "",
    note: note?.[1] || purpose?.[1] || "",
  };
}

function inferBookingPlace(entry) {
  if (entry.title.includes("篮球场") || entry.detail.includes("篮球场")) return "篮球场";
  if (entry.title.includes("教室") || entry.detail.includes("教室")) return "教学楼教室";
  if (entry.title.includes("实验室") || entry.detail.includes("实验室")) return "实验室";
  if (entry.detail === emptyText) return "";
  return "";
}

function renderAccessList(module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="portal-panel">
      <div class="portal-panel-head">
        <div><strong>本人门禁流水</strong><span>仅显示当前账号刷卡记录</span></div>
        <span class="system-badge">门禁系统</span>
      </div>
      <table class="system-table">
        <thead><tr><th>记录</th><th>摘要</th><th>结果</th><th></th></tr></thead>
        <tbody>${items.map((entry, index) => `
          <tr>
            <td>${escapeHtml(entry.title)}</td>
            <td>${escapeHtml(previewText(entry))}</td>
            <td><span class="status-pill ${accessStatus(entry.detail) === "异常" ? "warn" : ""}">${accessStatus(entry.detail)}</span></td>
            <td><button class="table-link" data-item-module="${module.id}" data-item-index="${index}">查看</button></td>
          </tr>
        `).join("")}</tbody>
      </table>
    </section>
  `;
}

function renderAffairsList(module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="affairs-system">
      ${items.map((entry, index) => `
        <button class="affairs-ticket" data-item-module="${module.id}" data-item-index="${index}">
          <span class="file-stamp">办</span>
          <span>
            <strong>${escapeHtml(entry.title)}</strong>
            <em>${escapeHtml(previewText(entry))}</em>
          </span>
          <b>${escapeHtml(entry.meta || "归档")}</b>
        </button>
      `).join("")}
    </section>
  `;
}

function renderFilesList(module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="file-grid">
      ${items.map((entry, index) => {
        const type = fileKind(entry);
        return `
          <button class="file-tile ${type}" data-item-module="${module.id}" data-item-index="${index}">
            ${entry.media?.src ? `
              <span class="file-thumb">
                <img data-evidence-img src="${escapeHtml(entry.media.src)}" alt="" loading="lazy" />
                ${entry.media.kind === "video" ? `<i></i>` : ""}
              </span>
            ` : `<span class="file-icon">${fileKindLabel(type)}</span>`}
            <strong>${escapeHtml(entry.title)}</strong>
            <em>${escapeHtml(entry.meta || "历史文件")}</em>
          </button>
        `;
      }).join("")}
    </section>
  `;
}

function renderBrowserList(module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="security-console">
      <div class="security-head">
        <strong>浏览与安全记录</strong>
        <span>旧系统缓存 / 风险链接 / 外链快照</span>
      </div>
      ${items.map((entry, index) => `
        <button class="security-row ${entry.detail.includes("风险") || entry.detail.includes("拦截") ? "danger" : ""}" data-item-module="${module.id}" data-item-index="${index}">
          <span>${entry.detail.includes("风险") || entry.detail.includes("拦截") ? "高" : "低"}</span>
          <strong>${escapeHtml(entry.title)}</strong>
          <em>${escapeHtml(previewText(entry))}</em>
        </button>
      `).join("")}
    </section>
  `;
}

function renderWallList(module, items) {
  return `
    <h1 class="page-title">${module.name}</h1>
    <section class="wall-feed-list">
      ${items.map((entry, index) => `
        <button class="wall-feed-card" data-item-module="${module.id}" data-item-index="${index}">
          <span class="wall-avatar">匿</span>
          <span>
            <strong>${escapeHtml(entry.title)}</strong>
            <em>${escapeHtml(previewText(entry))}</em>
          </span>
        </button>
      `).join("")}
    </section>
  `;
}

function renderMessageConversationPage(account, module, conversations, conversation) {
  return `
    <button class="ghost-btn" data-back-list="${module.id}">返回${module.name}</button>
    <h1 class="page-title">${module.name}</h1>
    <section class="message-app conversation-open">
      <aside class="conversation-list">
        <div class="message-account">
          <span class="avatar small" style="background:${account.color}">${account.avatar}</span>
          <div>
            <strong>${escapeHtml(account.name)}</strong>
            <span>历史消息归档</span>
          </div>
        </div>
        <div class="conversation-search">搜索</div>
        ${conversations.map((chat, index) => renderConversationItem(module.id, chat, index, chat === conversation, account)).join("")}
      </aside>
      ${renderConversationChat(conversation, true, account)}
    </section>
  `;
}

function renderConversationItem(moduleId, conversation, index, active, account) {
  const last = lastConversationLine(conversation);
  const speaker = last ? last[0] : conversation.rawTitle;
  const time = last ? last[1] : conversation.entries.at(-1)?.meta || "";
  const text = last ? last[2] : "聊天记录";
  const title = conversationDisplayTitle(conversation, account);
  const other = conversation.participants?.find((name) => name !== account?.name) || speaker;
  const avatarName = conversation.isGroup ? "群" : other;
  return `
    <button class="conversation-item ${active ? "active" : ""}" data-item-module="${moduleId}" data-item-index="${index}">
      <span class="conversation-avatar ${conversation.isGroup ? "group" : ""}" style="background:${colorFor(avatarName)}">${conversation.isGroup ? "群" : escapeHtml(initial(avatarName))}</span>
      <span class="conversation-main">
        <span class="conversation-title">${escapeHtml(title)}</span>
        <span class="conversation-preview">${escapeHtml(conversation.isGroup && last ? `${speaker}: ${text}` : text)}</span>
      </span>
      <span class="conversation-time">${escapeHtml(time)}</span>
    </button>
  `;
}

function conversationDisplayTitle(conversation, account) {
  if (!conversation.entries) return conversation.title || conversation.rawTitle;
  if (conversation.isGroup) return conversation.rawTitle;
  const other = conversation.participants.find((name) => name !== account?.name) || conversation.rawTitle;
  if (account?.id === "linzhi" && other === "夏禾") return "最好的小禾";
  return other;
}

function lastConversationLine(conversation) {
  return [...conversation.entries].reverse().flatMap((entry) => [...entry.lines].reverse()).find((line) => !isSystemSpeaker(line[0]));
}

function lastChatLine(entry) {
  if (entry.type !== "chat") return null;
  return [...entry.lines].reverse().find((line) => !isSystemSpeaker(line[0]));
}

function isSystemSpeaker(speaker) {
  return speaker === "系统" || speaker === "缓存" || speaker === "绯荤粺" || speaker === "缂撳瓨";
}

function renderConversationChat(conversation, embedded, account) {
  const title = conversationDisplayTitle(conversation, account);
  return `
    <section class="${embedded ? "chat-panel" : "card"}">
      <div class="chat-window">
        <div class="chat-header">
          <strong>${escapeHtml(title)}</strong>
          <div class="meta">成员：${escapeHtml(conversation.participants.join("、"))}</div>
        </div>
        <div class="chat-body">
          ${conversation.entries.map((entry) => `
            <div class="chat-date-divider">${escapeHtml(entry.dateLabel || chatDateLabel(entry))}</div>
            ${entry.lines.map(([speaker, time, text]) => renderChatLine(speaker, time, text, account.name)).join("")}
          `).join("")}
        </div>
        <div class="chat-disabled-input">历史归档消息，不支持发送</div>
      </div>
    </section>
  `;
}

function renderProfile(account) {
  return `
    <h1 class="page-title">个人信息</h1>
    <div class="card">
      <div class="grid">
        <div class="stat"><strong>${account.name}</strong><span>姓名</span></div>
        <div class="stat"><strong>${account.studentId}</strong><span>学号</span></div>
        <div class="stat"><strong>${account.status}</strong><span>账号状态</span></div>
      </div>
    </div>
    <div class="card">
      <h3>基础档案</h3>
      <table class="data-table">
        <tr><th>学院班级</th><td>${account.college} / ${account.className}</td></tr>
        <tr><th>兴趣标签</th><td>${account.tags.map((tag) => `<span class="source-chip">${tag}</span>`).join("")}</td></tr>
        <tr><th>常用联系人</th><td>${account.contacts}</td></tr>
      </table>
    </div>
    ${(account.modules.profile.items || []).filter((it) => stageVisible(it.stage)).map(renderItem).join("")}
  `;
}

function renderListCard(moduleId, entry, index) {
  return `
    <article class="record list-card">
      <div>
        <div class="record-title">${escapeHtml(entry.title)}</div>
        <div class="record-detail">${escapeHtml(previewText(entry))}</div>
        ${entry.meta ? `<div class="record-meta">${escapeHtml(entry.meta)}</div>` : ""}
      </div>
      <button class="secondary-btn open-detail" data-item-module="${moduleId}" data-item-index="${index}">查看详情</button>
    </article>
  `;
}

function previewText(entry) {
  if (entry.type === "chat") {
    const last = entry.lines.find((line) => line[0] !== "系统" && line[0] !== "缓存");
    return last ? `${last[0]}：${last[2]}` : "聊天记录";
  }
  return entry.detail.length > 72 ? entry.detail.slice(0, 72) + "..." : entry.detail;
}

function renderDetailPage(account, module, entry) {
  return `
    <button class="ghost-btn" data-back-list="${module.id}">返回${module.name}</button>
    <h1 class="page-title">${escapeHtml(module.name)}详情</h1>
    <div class="detail-head">
      <div>
        <div class="detail-kicker">${escapeHtml(account.name)} / ${escapeHtml(module.name)}</div>
        <h2>${escapeHtml(entry.title)}</h2>
        <div class="meta">恢复批次：${escapeHtml(stages.find((s) => s.id === entry.stage)?.title || entry.stage)}${entry.meta ? " / " + escapeHtml(entry.meta) : ""}</div>
      </div>
    </div>
    ${renderDetailBody(module.id, entry)}
  `;
}

function renderDetailBody(moduleId, entry) {
  if (entry.type === "chat") return renderChat(entry, false, state.currentAccount?.name || "");
  if (moduleId === "schedule" && (entry.title.includes("课表") || entry.title.includes("课程表"))) return renderScheduleTable(entry);
  if (moduleId === "schedule") return renderScheduleAgendaRecord(entry);
  if (entry.title.includes("丽州市晚报") || entry.title.includes("新闻核验")) return renderNews(entry);
  if (moduleId === "card") return renderCardLedger(entry);
  if (moduleId === "library") return renderLibraryRecord(entry);
  if (moduleId === "access") return renderAccessRecord(entry);
  if (moduleId === "affairs") return renderAffairsRecord(entry);
  if (moduleId === "files") return renderFileRecord(entry);
  if (moduleId === "browser") return renderBrowserRecord(entry);
  if (moduleId === "wall") return renderWallRecord(entry);
  if (moduleId === "booking") return renderBookingRecord(entry);
  return renderItem(entry);
}

function renderScheduleTable(entry) {
  const templates = [
    { day: "周一", period: "1-2", time: "08:10-09:45", room: "三教204", teacher: "张老师", weeks: "1-16周" },
    { day: "周二", period: "3-4", time: "10:05-11:40", room: "二教306", teacher: "李老师", weeks: "1-16周" },
    { day: "周三", period: "5-6", time: "14:00-15:35", room: "实训楼B212", teacher: "王老师", weeks: "1-12周" },
    { day: "周四", period: "7-8", time: "15:55-17:30", room: "三教204", teacher: "陈老师", weeks: "单双周" },
    { day: "周五", period: "3-4", time: "10:05-11:40", room: "图书馆研讨室", teacher: "赵老师", weeks: "5-14周" },
  ];
  const days = ["周一", "周二", "周三", "周四", "周五"];
  const periods = [
    { key: "1-2", time: "08:10-09:45" },
    { key: "3-4", time: "10:05-11:40" },
    { key: "5-6", time: "14:00-15:35" },
    { key: "7-8", time: "15:55-17:30" },
    { key: "9-10", time: "18:30-20:05" },
  ];
  const cells = new Map();
  const courses = parseScheduleCourses(entry.detail, templates);
  courses.forEach((course, index) => {
    const template = templates[index % templates.length];
    const normalized = { ...template, ...course };
    cells.set(`${normalized.day}-${normalized.period}`, normalized);
  });

  return `
    <div class="timetable-shell">
      <div class="timetable-toolbar">
        <div>
          <strong>2020-2021学年 第二学期</strong>
          <span>第8教学周</span>
        </div>
        <div class="timetable-chip">历史归档课表</div>
      </div>
      <table class="timetable">
        <thead>
          <tr>
            <th>节次</th>
            ${days.map((day) => `<th>${day}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${periods.map((period) => `
            <tr>
              <th><strong>${period.key}节</strong><span>${period.time}</span></th>
              ${days.map((day) => {
                const course = cells.get(`${day}-${period.key}`);
                return `<td>${course ? `
                  <div class="course-block">
                    <strong>${escapeHtml(course.name)}</strong>
                    <span>${escapeHtml(course.room)}</span>
                    <span>${escapeHtml(course.teacher)} / ${escapeHtml(course.weeks)}</span>
                  </div>
                ` : `<div class="empty-slot">暂无课程</div>`}</td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="timetable-note">备注：本页为旧版教务系统恢复出的周课表，缺失课程以“暂无课程”显示。</div>
    </div>
  `;
}

function parseScheduleCourses(detail, templates) {
  const chunks = detail.split(/[；;]/).map((x) => x.trim()).filter(Boolean);
  if (chunks.some((chunk) => chunk.includes("|"))) {
    return chunks.map((chunk, index) => {
      const [name, day, period, time, room, teacher, weeks] = chunk.split("|").map((x) => x?.trim());
      const fallback = templates[index % templates.length];
      return {
        name: name || fallback.name,
        day: day || fallback.day,
        period: period || fallback.period,
        time: time || fallback.time,
        room: room || fallback.room,
        teacher: teacher || fallback.teacher,
        weeks: weeks || fallback.weeks,
      };
    });
  }
  return detail
    .split(/[、，,。；;]/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

function renderScheduleAgendaRecord(entry) {
  return `
    <div class="agenda-detail">
      <div class="agenda-detail-head">
        <span>教务日程</span>
        <strong>${escapeHtml(entry.title)}</strong>
        <em>${escapeHtml(entry.meta || "历史归档日程")}</em>
      </div>
      <table class="system-table">
        <tr><th>日程内容</th><td>${escapeHtml(entry.detail)}</td></tr>
        <tr><th>归档状态</th><td><span class="status-pill">已恢复</span></td></tr>
      </table>
    </div>
  `;
}

function renderCardLedger(entry) {
  const rows = entry.detail.split("；").map((x) => x.trim()).filter(Boolean);
  return `
    <div class="ledger-page">
      <div class="ledger-summary">
        <span>电子校园卡</span>
        <strong>消费明细</strong>
        <em>归档账单 / 不显示实时余额</em>
      </div>
      <table class="system-table receipt-table">
        <thead><tr><th>序号</th><th>消费项目</th><th>金额/备注</th><th>状态</th></tr></thead>
        <tbody>${rows.map((row, i) => {
          const amount = row.match(/\d+(?:\.\d+)?/);
          return `<tr><td>${i + 1}</td><td>${escapeHtml(row.replace(/\s*\d+(?:\.\d+)?\s*$/, ""))}</td><td>${amount ? amount[0] : "备注记录"}</td><td><span class="status-pill">历史归档</span></td></tr>`;
        }).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderLibraryRecord(entry) {
  const rows = entry.detail.split(/[；、]/).map((x) => x.trim()).filter(Boolean);
  const mode = entry.title.includes("检索") ? "检索历史" : entry.title.includes("电子") ? "电子资源" : entry.title.includes("残页") ? "馆藏残页" : "借阅记录";
  return `
    <div class="library-slip">
      <div class="slip-title">丽职院图书馆服务 / ${mode}</div>
      ${rows.length > 1 ? `
        <table class="system-table">
          <thead><tr><th>${mode === "借阅记录" ? "书名/资源" : "关键词/条目"}</th><th>归档状态</th></tr></thead>
          <tbody>${rows.map((row) => `<tr><td>${escapeHtml(row)}</td><td>可查</td></tr>`).join("")}</tbody>
        </table>
      ` : `<div class="record-detail">${escapeHtml(entry.detail)}</div>`}
      ${entry.meta ? `<div class="record-meta">${escapeHtml(entry.meta)}</div>` : ""}
    </div>
  `;
}

function renderAccessRecord(entry) {
  const lines = entry.detail.split("；").map((x) => x.trim()).filter(Boolean);
  return `
    <div class="access-page">
      <div class="device-title">门禁通行流水</div>
      <table class="system-table access-table">
        <thead><tr><th>时间 / 区域</th><th>设备回执</th><th>状态</th></tr></thead>
        <tbody>${lines.map((line) => {
          const parts = line.split("：");
          const status = accessStatus(line);
          return `<tr><td>${escapeHtml(parts[0] || line)}</td><td>${escapeHtml(parts.length > 1 ? parts.slice(1).join("：") : "归档记录")}</td><td><span class="status-pill ${status === "异常" ? "warn" : ""}">${status}</span></td></tr>`;
        }).join("")}</tbody>
      </table>
      <div class="hint">门禁页只显示当前账号本人的通行流水；涉及他人的进入信息只会出现在事故材料或聊天附件中。</div>
    </div>
  `;
}

function accessStatus(text) {
  if (text.includes("失败") || text.includes("异常") || text.includes("报警")) return "异常";
  return "正常";
}

function renderAffairsRecord(entry) {
  return `
    <div class="official-doc">
      <div class="official-code">LYZY-XSSW-${String(entry.title.length * 17).padStart(4, "0")}</div>
      <div class="official-title">丽职院学生事务归档</div>
      <div class="official-row"><strong>事项：</strong>${escapeHtml(entry.title)}</div>
      <div class="official-row"><strong>内容：</strong>${escapeHtml(entry.detail)}</div>
      ${entry.meta ? `<div class="official-row"><strong>归档时间：</strong>${escapeHtml(entry.meta)}</div>` : ""}
      <div class="official-seal">学生事务中心归档件</div>
    </div>
  `;
}

function renderFileRecord(entry) {
  if (entry.type === "forum-print") return renderForumPrintRecord(entry);
  if (entry.type === "cache-index") return renderCacheIndexRecord(entry);
  const type = fileKind(entry);
  if (entry.media?.kind === "image") {
    return renderEvidenceImage(entry);
  }
  if (entry.media?.kind === "video") {
    return renderDamagedVideo(entry);
  }
  return `
    <div class="file-preview ${type}">
      <div class="file-toolbar">
        <span>${fileKindLabel(type)}预览</span>
        <span class="meta">历史附件恢复</span>
      </div>
      ${type === "audio" ? `<div class="audio-wave">${Array.from({ length: 28 }, (_, i) => `<i style="height:${16 + (i * 7) % 34}px"></i>`).join("")}</div>` : ""}
      ${type === "image" ? `<div class="image-placeholder"><span>${escapeHtml(entry.title)}</span></div>` : ""}
      <div class="file-paper">
        <div class="record-detail">${escapeHtml(entry.detail)}</div>
      </div>
    </div>
  `;
}

function renderForumPrintRecord(entry) {
  return `
    <div class="file-preview pdf forum-print-preview">
      <div class="file-toolbar">
        <span>网页打印预览</span>
        <span class="meta">${escapeHtml(entry.meta || "历史打印缓存")}</span>
      </div>
      <div class="forum-print-page">
        <div class="forum-print-site">
          <strong>莲都夜话</strong>
          <span>论坛 / 夜话杂谈 / 缓存打印</span>
        </div>
        <h3>【莲都怪谈】招魂残帖</h3>
        <div class="forum-print-meta">楼主：烟雨　发表于：2024-03-12 21:47　只看楼主　倒序浏览</div>
        <div class="forum-print-body">
          <p>听学姐说，档案馆旧书区有一本残了页的《招魂残帖》。</p>
          <p>她也只看到开头一页，后面都缺了。</p>
          <p class="ritual-line">冤者未安，可循名暂归。亲近者持旧名、旧物、旧问，只问最后一句。</p>
          <p class="ritual-line">旧愿得了，方可安心轮回。</p>
        </div>
        <div class="torn-corner-note">右下角缺损</div>
        <div class="margin-note">周叙批注：缺页位置和林栀后来找的后页能对上。</div>
        <div class="forum-print-footer">缓存时间：${escapeHtml(entry.meta || "2024-04-18 18:32")}　Processed in 0.045678 second(s)</div>
      </div>
      <div class="record-detail">${escapeHtml(entry.detail)}</div>
    </div>
  `;
}

function renderCacheIndexRecord(entry) {
  const rows = entry.detail
    .split("；")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(1)
    .map((row) => row.split(",").map((x) => x.trim()));
  return `
    <div class="file-preview text">
      <div class="file-toolbar">
        <span>CSV预览</span>
        <span class="meta">旧论坛缓存索引</span>
      </div>
      <table class="system-table cache-index-table">
        <thead><tr><th>title</th><th>url</th><th>first_seen</th><th>last_seen</th></tr></thead>
        <tbody>${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row[0] || "")}</td>
            <td><code>${escapeHtml(row[1] || "")}</code></td>
            <td>${escapeHtml(row[2] || "")}</td>
            <td>${escapeHtml(row[3] || "")}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderEvidenceImage(entry) {
  return `
    <div class="file-preview image evidence-preview">
      <div class="file-toolbar">
        <span>图片预览</span>
        <span class="meta">${escapeHtml(entry.meta || "历史附件恢复")}</span>
      </div>
      <figure class="evidence-image">
        <img data-evidence-img src="${escapeHtml(entry.media.src)}" alt="${escapeHtml(entry.title)}" loading="lazy" />
        <figcaption>图片加载失败，请刷新页面后重试</figcaption>
      </figure>
    </div>
  `;
}

function renderDamagedVideo(entry) {
  return `
    <div class="file-preview video evidence-preview">
      <div class="file-toolbar">
        <span>视频预览</span>
        <span class="meta">${escapeHtml(entry.meta || "历史附件恢复")}</span>
      </div>
      <div class="damaged-media">
        <img data-evidence-img src="${escapeHtml(entry.media.src)}" alt="${escapeHtml(entry.title)}" loading="lazy" />
        <button class="play-overlay" data-damaged-play type="button" aria-label="播放${escapeHtml(entry.title)}">
          <span></span>
        </button>
        <div class="damage-message"></div>
      </div>
      <div class="file-paper">
        <div class="record-detail">${escapeHtml(entry.detail)}</div>
      </div>
    </div>
  `;
}

function renderBrowserRecord(entry) {
  if (entry.title.includes("统一认证")) return renderSsoCacheRecord(entry);
  if (entry.type === "browser-history") return renderBrowserHistoryRecord(entry);
  if (entry.type === "browser-log") return renderBrowserSecurityLog(entry);
  if (entry.type === "browser-page") return renderBrowserPageRecord(entry);
  const risky = entry.detail.includes("风险") || entry.detail.includes("拦截") || entry.detail.includes("净愿");
  return `
    <div class="browser-frame ${risky ? "risky" : ""}">
      <div class="browser-bar"><span></span><span></span><span></span><input value="${escapeHtml(entry.title)}" readonly /></div>
      <div class="browser-warning">${risky ? "安全中心提示：该页面来自风险缓存或被拦截外链" : "普通浏览缓存"}</div>
      <div class="browser-content">
        ${entry.media?.kind === "image" ? `
          <figure class="evidence-image browser-evidence">
            <img data-evidence-img src="${escapeHtml(entry.media.src)}" alt="${escapeHtml(entry.title)}" loading="lazy" />
          </figure>
        ` : ""}
        <div class="record-detail">${escapeHtml(entry.detail)}</div>
        ${entry.meta ? `<div class="record-meta">${escapeHtml(entry.meta)}</div>` : ""}
      </div>
    </div>
  `;
}

function renderBrowserHistoryRecord(entry) {
  const parts = entry.detail.split(/[；。]/).map((x) => x.trim()).filter(Boolean);
  const rows = parts
    .filter((part) => /^\d{4}-\d{2}-\d{2}/.test(part))
    .map((part) => {
      const match = part.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+?)\s+([a-z][^\s]+)$/i);
      return match
        ? { date: match[1], time: match[2], title: match[3], url: match[4] }
        : { date: "", time: "", title: part, url: "" };
    });
  const device = (parts.find((part) => part.startsWith("设备：")) || "").replace("设备：", "");
  return `
    <div class="browser-frame browser-history-frame">
      <div class="browser-bar"><span></span><span></span><span></span><input value="chrome://history/?q=jyg-help.top" readonly /></div>
      <div class="browser-warning">浏览器历史记录 / 缓存恢复${device ? `　设备：${escapeHtml(device)}` : ""}</div>
      <div class="browser-history-list">
        ${rows.map((row) => `
          <div class="history-row">
            <div class="history-time"><strong>${escapeHtml(row.time)}</strong><span>${escapeHtml(row.date)}</span></div>
            <div class="history-main">
              <strong>${escapeHtml(row.title)}</strong>
              <code>${escapeHtml(row.url)}</code>
            </div>
            <span class="history-chip">${row.url.includes("#deep") ? "标题缓存" : row.url.includes("/next") ? "页面残留" : row.url.includes("search") ? "搜索记录" : "访问记录"}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderBrowserSecurityLog(entry) {
  const rows = entry.detail.split("；").map((x) => x.trim()).filter(Boolean);
  return `
    <div class="browser-frame risky">
      <div class="browser-bar"><span></span><span></span><span></span><input value="security://blocked-history" readonly /></div>
      <div class="browser-warning">安全中心拦截记录：脚本已阻断，仅保留标题与来源残留</div>
      <table class="system-table browser-log-table">
        <tbody>${rows.map((row) => {
          const parts = row.split("：");
          return `<tr><th>${escapeHtml(parts[0] || "记录")}</th><td>${escapeHtml(parts.length > 1 ? parts.slice(1).join("：") : row)}</td></tr>`;
        }).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderBrowserPageRecord(entry) {
  const risky = entry.detail.includes("风险") || entry.detail.includes("饭不用吃") || entry.detail.includes("jyg-help");
  const isRiskTalk = entry.title.includes("安全话术");
  const url = isRiskTalk ? "http://jyg-help.top/old/daixuan.html" : "http://jyg-help.top/zh";
  return `
    <div class="browser-frame ${risky ? "risky" : ""}">
      <div class="browser-bar"><span></span><span></span><span></span><input value="${escapeHtml(url)}" readonly /></div>
      <div class="browser-warning">${risky ? "风险链接，已拦截，保留快照" : "旧论坛页面缓存"}</div>
      <article class="cached-webpage ${isRiskTalk ? "risk-webpage" : ""}">
        <div class="cached-site">${isRiskTalk ? "病友互助 / 代愿" : "莲都夜话论坛"}</div>
        <h3>${escapeHtml(isRiskTalk ? "医院治不好的，不一定是病" : "【莲都怪谈】招魂残帖")}</h3>
        ${isRiskTalk ? `
          <p>只是靠近一下，不会有事。</p>
          <ol>
            <li>饭不用吃，线不用解，镜子对着你就行。</li>
            <li>到铃声响再松，不要提前回头。</li>
          </ol>
          <small>过紧、卡住或无人看护，风险自负。</small>
        ` : `
          <p>冤者未安，可循名暂归。</p>
          <p>亲近者持旧名、旧物、旧愿，只问最后一句。</p>
          <p>心愿得了，方可安心轮回。</p>
        `}
      </article>
      <div class="record-detail">${escapeHtml(entry.detail)}</div>
      ${entry.meta ? `<div class="record-meta">${escapeHtml(entry.meta)}</div>` : ""}
    </div>
  `;
}

function renderSsoCacheRecord(entry) {
  const rows = entry.detail.split("；").map((x) => x.trim()).filter(Boolean);
  return `
    <div class="browser-frame">
      <div class="browser-bar"><span></span><span></span><span></span><input value="https://id.lzy.edu.cn/sso/authorize" readonly /></div>
      <div class="browser-warning">浏览器缓存：统一身份认证回跳记录，仅显示本机访问残留</div>
      <div class="sso-cache-card">
        <div class="sso-logo">统一身份认证</div>
        <table class="system-table sso-cache-table">
          <tbody>${rows.map((row) => {
            const parts = row.split("：");
            return `<tr><th>${escapeHtml(parts[0] || "记录")}</th><td>${escapeHtml(parts.length > 1 ? parts.slice(1).join("：") : row)}</td></tr>`;
          }).join("")}</tbody>
        </table>
        <div class="hint">该页不是他人账号安全后台，只是当前设备浏览器恢复出的认证跳转缓存。</div>
      </div>
    </div>
  `;
}

function renderWallRecord(entry) {
  const wall = parseWallPost(entry);
  return `
    <div class="wall-post">
      <div class="wall-browser-head">
        <strong>丽职院校园墙</strong>
        <span>${escapeHtml(entry.title)} / 缓存恢复</span>
      </div>
      <article class="forum-thread">
        <div class="thread-author">
          <span>匿</span>
          <strong>匿名投稿</strong>
          <em>${escapeHtml(wall.status)}</em>
        </div>
        <div class="thread-body">${escapeHtml(wall.post)}</div>
        <div class="thread-meta"><span>浏览 128</span><span>评论 ${wall.comments.length}</span><span>原帖不可访问</span></div>
      </article>
      <section class="comment-thread">
        <div class="comment-title">评论区</div>
        ${wall.comments.length ? wall.comments.map((comment, index) => `
          <div class="comment-row">
            <span class="comment-avatar">${index + 1}L</span>
            <div>
              <div class="comment-meta">匿名同学 · 缓存楼层 ${index + 1}</div>
              <div class="comment-body">${escapeHtml(comment)}</div>
            </div>
          </div>
        `).join("") : `<div class="comment-empty">评论缓存缺失</div>`}
      </section>
      <div class="wall-actions"><span>评论已折叠</span><span>仅恢复缓存片段</span></div>
    </div>
  `;
}

function parseWallPost(entry) {
  const parts = entry.detail.split(/(?=评论：)/).map((x) => x.trim()).filter(Boolean);
  const first = parts.shift() || "";
  const hasPost = first.startsWith("匿名：");
  const post = hasPost ? first.replace(/^匿名：/, "").trim() : "原帖内容已缺失，仅恢复评论缓存。";
  const comments = [
    ...(hasPost ? [] : [first]),
    ...parts,
  ].map((x) => x.replace(/^评论：/, "").trim()).filter(Boolean);
  return {
    post,
    comments,
    status: hasPost ? "匿名发布" : "主帖缺失",
  };
}

function renderBookingRecord(entry) {
  const booking = parseBooking(entry);
  return `
    <div class="booking-detail">
      <div class="booking-status">预约单 / 历史归档</div>
      <table class="system-table">
        <tr><th>预约标题</th><td>${escapeHtml(entry.title)}</td></tr>
        <tr><th>预约日期</th><td>${escapeHtml(booking.month && booking.day ? `${booking.month}月${booking.day}日` : "未登记")}</td></tr>
        <tr><th>预约时间</th><td>${escapeHtml(booking.time || "未登记")}</td></tr>
        <tr><th>预约地点</th><td>${escapeHtml(booking.place || "未登记")}</td></tr>
        <tr><th>预约人</th><td>${escapeHtml(booking.owner || "当前账号")}</td></tr>
        <tr><th>备注/用途</th><td>${escapeHtml(booking.note || entry.detail)}</td></tr>
        <tr><th>状态</th><td>历史归档</td></tr>
      </table>
    </div>
  `;
}

function fileKind(entry) {
  if (entry.media?.kind === "image") return "image";
  if (entry.media?.kind === "video") return "video";
  if (entry.title.includes(".jpg") || entry.title.includes(".png")) return "image";
  if (entry.title.includes(".m4a") || entry.title.includes("录音") || entry.title.includes("音频")) return "audio";
  if (entry.title.includes(".pdf") || entry.title.includes("报告") || entry.title.includes("处理表")) return "pdf";
  if (entry.title.includes(".zip")) return "zip";
  if (entry.title.includes(".mp4") || entry.title.includes(".mov")) return "video";
  return "text";
}

function fileKindLabel(type) {
  return { image: "图片", audio: "音频", pdf: "PDF", zip: "压缩包", video: "视频", text: "文本" }[type] || "文件";
}

function renderItem(entry) {
  if (entry.type === "chat") return renderChat(entry, false, state.currentAccount?.name || "");
  if (entry.title.includes("丽州市晚报") || entry.title.includes("新闻核验")) return renderNews(entry);
  return `
    <article class="record">
      <div class="record-title">${escapeHtml(entry.title)}</div>
      <div class="record-detail">${escapeHtml(entry.detail)}</div>
      ${entry.meta ? `<div class="record-meta">${escapeHtml(entry.meta)}</div>` : ""}
    </article>
  `;
}

function renderChat(chatEntry, embedded = false, selfName = "") {
  return `
    <section class="${embedded ? "chat-panel" : "card"}">
      <div class="chat-window">
        <div class="chat-header">
          <strong>${escapeHtml(chatEntry.title)}</strong>
          <div class="meta">成员：${escapeHtml(chatEntry.participants.join("、"))}${chatEntry.meta ? " / " + escapeHtml(chatEntry.meta) : ""}</div>
        </div>
        <div class="chat-body">
          <div class="chat-date-divider">${escapeHtml(chatDateLabel(chatEntry))}</div>
          ${chatEntry.lines.map(([speaker, time, text]) => {
            return renderChatLine(speaker, time, text, selfName);
          }).join("")}
        </div>
        <div class="chat-disabled-input">历史归档消息，不支持发送</div>
      </div>
    </section>
  `;
}

function renderChatLine(speaker, time, text, selfName) {
  if (isSystemSpeaker(speaker)) {
    return `<div class="system-bubble">[${escapeHtml(speaker)} ${escapeHtml(time)}] ${escapeHtml(text)}</div>`;
  }
  const isSelf = speaker === selfName;
  return `
    <div class="bubble-row ${isSelf ? "self" : ""}">
      <div class="bubble-avatar" style="background:${colorFor(speaker)}">${escapeHtml(initial(speaker))}</div>
      <div>
        <div class="bubble-meta">${escapeHtml(speaker)} ${escapeHtml(time)}</div>
        <div class="bubble">${escapeHtml(text)}</div>
      </div>
    </div>
  `;
}

function renderNews(entry) {
  return `
    <section class="news-page">
      <div class="news-masthead">丽州市晚报</div>
      <div class="meta">首页 / 法治 / 社会新闻 / 公告通报</div>
      <div class="news-title">“净愿会”借病友互助名义传播迷信仪式，警方提醒勿信“替命祛病”骗局</div>
      <div class="news-info">来源：丽州市晚报　记者：周明远　发布时间：2021-11-03 09:42　责任编辑：林安</div>
      <p>近日，丽州市公安机关联合网信部门处置一批以“病友互助”“民俗疗愈”“亲属代愿”为名传播迷信内容的网络社群。</p>
      <p>据调查，该组织自称“净愿会”，常以重病患者家属、丧亲者、长期照护者为目标，通过论坛私信、匿名群组等方式获取对方家庭病情、经济压力和心理状态，再以“冷读”方式伪装成所谓“通灵验证”。</p>
      <p>警方通报称，该组织曾多次向受害者传播“替愿”“过祟”“问魂”等仪式文本，声称亲属可在“濒死未死”状态下替病人承受病祟。相关说法没有任何医学依据，且存在严重人身安全风险。</p>
      <p>警方提醒，凡以“替命”“转病”“问魂”“入像”等名义要求当事人进行禁食、束缚、憋气、深夜独处、封闭空间仪式的，均属于高危诱导行为。若发现相关网页、群组或帖子，请及时向学校或公安机关举报。</p>
      <div class="news-related">
        <strong>相关报道</strong><br>
        多地出现“病友互助”诈骗群，警方提示谨防情绪操控<br>
        女大学生深夜参与“净愿”仪式受伤，校方称已介入<br>
        专家：所谓“濒死转病”实为心理操控与危险行为
      </div>
      <div class="record-meta">关键词：净愿会 / 替命 / 过祟 / 问魂 / 病友互助诈骗</div>
    </section>
  `;
}

renderLogin();
