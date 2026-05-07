const { meta, eventos } = window.EVENTOS_DATA;

const state = {
  search: "",
  year: "",
  month: "",
  tax: "",
  status: "",
  auditor: "",
  calendarDate: todayStart(),
  selectedDateKey: dateKey(todayStart()),
  currentFilteredEvents: [],
};

const els = {
  sourceFile: document.querySelector("#sourceFile"),
  metricTotal: document.querySelector("#metricTotal"),
  metricFuture: document.querySelector("#metricFuture"),
  metricNext7: document.querySelector("#metricNext7"),
  metricRevenue: document.querySelector("#metricRevenue"),
  tomorrowCount: document.querySelector("#tomorrowCount"),
  tomorrowList: document.querySelector("#tomorrowList"),
  tomorrowEmpty: document.querySelector("#tomorrowEmpty"),
  weeklyCount: document.querySelector("#weeklyCount"),
  weeklyList: document.querySelector("#weeklyList"),
  weeklyEmpty: document.querySelector("#weeklyEmpty"),
  exportWeekIcs: document.querySelector("#exportWeekIcs"),
  howToPanel: document.querySelector("#howToPanel"),
  toggleHowTo: document.querySelector("#toggleHowTo"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  selectedDayTitle: document.querySelector("#selectedDayTitle"),
  selectedDayCount: document.querySelector("#selectedDayCount"),
  selectedDayEvents: document.querySelector("#selectedDayEvents"),
  selectedDayEmpty: document.querySelector("#selectedDayEmpty"),
  resultCount: document.querySelector("#resultCount"),
  searchInput: document.querySelector("#searchInput"),
  yearFilter: document.querySelector("#yearFilter"),
  monthFilter: document.querySelector("#monthFilter"),
  taxFilter: document.querySelector("#taxFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  auditorFilter: document.querySelector("#auditorFilter"),
  clearFilters: document.querySelector("#clearFilters"),
  eventList: document.querySelector("#eventList"),
  emptyState: document.querySelector("#emptyState"),
};

const monthNames = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

const GOOGLE_CALENDAR_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_EVENT_START_HOUR = 9;
const DEFAULT_EVENT_END_HOUR = 10;

/*
  Futuro Google Calendar compartilhado:
  Este painel hoje gera apenas links de criação manual no Google Agenda.
  Quando houver backend e autenticação, a sincronização automática pode nascer aqui:
  - trocar buildGoogleCalendarUrl por uma chamada a uma API interna;
  - enviar id, nome, data, local, organizador e processo do evento;
  - o backend autentica com Google e cria/atualiza eventos no calendário compartilhado.
  Enquanto não houver backend, API ou OAuth, manter esta integração como link estático.
*/

function onlyFilled(values) {
  return [...new Set(values.filter(Boolean).map(String))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}

function text(value, fallback = "") {
  const raw = value === undefined || value === null || value === "" ? fallback : String(value);
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dateKey(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseEventDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFutureEvent(evento) {
  const date = parseEventDate(evento.dataEvento);
  return date ? date >= todayStart() : false;
}

function isNext7Event(evento) {
  const date = parseEventDate(evento.dataEvento);
  if (!date) return false;

  const today = todayStart();
  const limit = new Date(today);
  limit.setDate(today.getDate() + 7);
  return date >= today && date <= limit;
}

function getNext7Events(sourceEvents) {
  return sourceEvents
    .filter(isNext7Event)
    .sort((a, b) => {
      const dateA = parseEventDate(a.dataEvento);
      const dateB = parseEventDate(b.dataEvento);
      return dateA - dateB || String(a.nomeEvento).localeCompare(String(b.nomeEvento), "pt-BR");
    });
}

function isTomorrowEvent(evento) {
  const date = parseEventDate(evento.dataEvento);
  if (!date) return false;

  const tomorrow = todayStart();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateKey(date) === dateKey(tomorrow);
}

function getDateStatus(evento) {
  const date = parseEventDate(evento.dataEvento);
  if (!date) return { className: "no-date", label: "Sem data exata" };
  if (isNext7Event(evento)) return { className: "next-week", label: "Próximos 7 dias" };
  if (isFutureEvent(evento)) return { className: "future", label: "Futuro" };
  return { className: "past", label: "Realizado" };
}

function formatDate(value, month, year) {
  const date = parseEventDate(value);
  if (date) {
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  if (month && year) {
    return `${monthNames[Number(month)] || month}/${year}`;
  }

  return year || "Sem data";
}

function compactDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}00`;
}

function compactIcsDateTime(date) {
  return compactDateTime(date);
}

function escapeIcsText(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

function foldIcsLine(line) {
  const chunks = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

function getCalendarDates(evento) {
  const date = parseEventDate(evento.dataEvento);
  if (!date) return "";

  const start = new Date(date);
  start.setHours(DEFAULT_EVENT_START_HOUR, 0, 0, 0);

  const end = new Date(date);
  end.setHours(DEFAULT_EVENT_END_HOUR, 0, 0, 0);

  return `${compactDateTime(start)}/${compactDateTime(end)}`;
}

function getEventStartEnd(evento) {
  const date = parseEventDate(evento.dataEvento);
  if (!date) return null;

  const start = new Date(date);
  start.setHours(DEFAULT_EVENT_START_HOUR, 0, 0, 0);

  const end = new Date(date);
  end.setHours(DEFAULT_EVENT_END_HOUR, 0, 0, 0);

  return { start, end };
}

function buildEventSummary(evento) {
  return [
    `Evento: ${evento.nomeEvento || "Evento sem nome"}`,
    `Data: ${formatDate(evento.dataEvento, evento.mes, evento.ano)}`,
    `Local: ${evento.local || "Local não informado"}`,
    `Situação: ${evento.situacao || "Sem situação"}`,
    `Organizador: ${evento.organizador || "Organizador não informado"}`,
    `Processo: ${evento.processo || "Processo não informado"}`,
  ].join("\n");
}

function buildGoogleCalendarDescription(evento) {
  return [
    "Dados do evento",
    "",
    `Processo: ${evento.processo || "Não informado"}`,
    `Organizador: ${evento.organizador || "Não informado"}`,
    evento.cnpj ? `CNPJ: ${evento.cnpj}` : "",
    `Situação: ${evento.situacao || "Sem situação"}`,
    `Local: ${evento.local || "Não informado"}`,
    evento.obs ? `Observações: ${evento.obs}` : "",
    "",
    `Origem: ${meta.arquivoFonte}`,
  ].filter((line) => line !== "").join("\n");
}

function buildIcsDescription(evento) {
  return [
    `Processo: ${evento.processo || "Não informado"}`,
    `Organizador: ${evento.organizador || "Não informado"}`,
    `Auditor: ${evento.auditor || "Auditor não informado"}`,
    `Situação: ${evento.situacao || "Sem situação"}`,
    evento.obs ? `Observações: ${evento.obs}` : "",
  ].filter(Boolean).join("\n");
}

function buildGoogleCalendarUrl(evento) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.nomeEvento || "Evento",
    location: evento.local || "",
    details: buildGoogleCalendarDescription(evento),
    ctz: GOOGLE_CALENDAR_TIMEZONE,
  });

  const dates = getCalendarDates(evento);
  if (dates) {
    params.set("dates", dates);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function fillSelect(select, values, placeholder, formatter = (value) => value) {
  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = placeholder;
  select.appendChild(allOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = formatter(value);
    select.appendChild(option);
  });
}

function getSearchText(evento) {
  return [
    evento.nomeEvento,
    evento.organizador,
    evento.processo,
    evento.cnpj,
    evento.local,
    evento.enquadramento,
    evento.ticketeira,
    evento.auditor,
  ].join(" ").toLowerCase();
}

function filterEvents() {
  const term = state.search.trim().toLowerCase();

  return eventos.filter((evento) => {
    const matchesSearch = !term || getSearchText(evento).includes(term);
    const matchesYear = !state.year || evento.ano === state.year;
    const matchesMonth = !state.month || evento.mes === state.month;
    const matchesTax = !state.tax || evento.enquadramento === state.tax;
    const matchesStatus = !state.status || evento.situacao === state.status;
    const matchesAuditor = !state.auditor || evento.auditor === state.auditor;
    return matchesSearch && matchesYear && matchesMonth && matchesTax && matchesStatus && matchesAuditor;
  });
}

function renderMetrics(filtered) {
  const future = filtered.filter(isFutureEvent).length;
  const next7 = filtered.filter(isNext7Event).length;
  const revenue = filtered.reduce((total, evento) => {
    return total + Number(evento.receitaEstimada || 0);
  }, 0);

  els.metricTotal.textContent = filtered.length.toLocaleString("pt-BR");
  els.metricFuture.textContent = future.toLocaleString("pt-BR");
  els.metricNext7.textContent = next7.toLocaleString("pt-BR");
  els.metricRevenue.textContent = money(revenue);
}

function renderSmallEvent(evento) {
  return `
    <article class="day-event">
      <strong>${text(evento.nomeEvento, "Evento sem nome")}</strong>
      <span>${text(evento.local, "Local não informado")}</span>
      <span>${text(evento.organizador, "Organizador não informado")} · ${text(evento.processo, "Processo não informado")}</span>
      <a class="calendar-link small" href="${text(buildGoogleCalendarUrl(evento))}" target="_blank" rel="noopener noreferrer">Adicionar ao Google Agenda</a>
    </article>
  `;
}

function renderTomorrowNotices() {
  const tomorrowEvents = eventos.filter(isTomorrowEvent);
  els.tomorrowCount.textContent = `${tomorrowEvents.length.toLocaleString("pt-BR")} evento${tomorrowEvents.length === 1 ? "" : "s"}`;
  els.tomorrowList.innerHTML = tomorrowEvents.slice(0, 8).map((evento) => `
    <article class="notice-item" data-event-id="${text(evento.id)}">
      <strong>${text(evento.nomeEvento, "Evento sem nome")}</strong>
      <span>${text(evento.local, "Local não informado")}</span>
      <span>${text(evento.organizador, "Organizador não informado")} · ${text(evento.processo, "Processo não informado")}</span>
      <div class="notice-actions">
        <a class="calendar-link small" href="${text(buildGoogleCalendarUrl(evento))}" target="_blank" rel="noopener noreferrer">Adicionar ao Google Agenda</a>
        <button class="copy-button" type="button" data-copy-id="${text(evento.id)}">Copiar resumo</button>
      </div>
    </article>
  `).join("");
  els.tomorrowEmpty.hidden = tomorrowEvents.length > 0;
  bindCopyButtons(els.tomorrowList, tomorrowEvents);
}

function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

function bindCopyButtons(container, sourceEvents) {
  const byId = new Map(sourceEvents.map((evento) => [evento.id, evento]));
  container.querySelectorAll("[data-copy-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const evento = byId.get(button.dataset.copyId);
      if (!evento) return;

      copyText(buildEventSummary(evento)).then(() => {
        button.textContent = "Resumo copiado";
        setTimeout(() => {
          button.textContent = "Copiar resumo";
        }, 1800);
      });
    });
  });
}

function groupEventsByDate(sourceEvents) {
  return sourceEvents.reduce((groups, evento) => {
    const date = parseEventDate(evento.dataEvento);
    if (!date) return groups;
    const key = dateKey(date);
    groups[key] = groups[key] || [];
    groups[key].push(evento);
    return groups;
  }, {});
}

function renderWeeklyEvent(evento) {
  const tomorrowClass = isTomorrowEvent(evento) ? "tomorrow" : "";
  const statusChip = evento.situacao
    ? chip(text(evento.situacao), "warn")
    : chip("Sem situação", "neutral");

  return `
    <article class="weekly-event ${tomorrowClass}">
      <div class="weekly-main">
        <strong>${text(evento.nomeEvento, "Evento sem nome")}</strong>
        <span>${text(evento.local, "Local não informado")}</span>
        <div class="weekly-actions">
          <a class="calendar-link small" href="${text(buildGoogleCalendarUrl(evento))}" target="_blank" rel="noopener noreferrer">Adicionar ao Google Agenda</a>
          <button class="copy-button" type="button" data-copy-id="${text(evento.id)}">Copiar resumo</button>
        </div>
      </div>
      <div class="weekly-meta">
        <p><strong>Situação:</strong> ${statusChip}</p>
        <p><strong>Auditor:</strong> ${text(evento.auditor, "Auditor não informado")}</p>
        <p><strong>Organizador:</strong> ${text(evento.organizador, "Organizador não informado")}</p>
        <p><strong>Processo:</strong> ${text(evento.processo, "Processo não informado")}</p>
      </div>
    </article>
  `;
}

function renderWeeklyView(filtered) {
  const weeklyEvents = getNext7Events(filtered);
  const grouped = groupEventsByDate(weeklyEvents);
  const keys = Object.keys(grouped).sort();

  els.weeklyCount.textContent = `${weeklyEvents.length.toLocaleString("pt-BR")} evento${weeklyEvents.length === 1 ? "" : "s"}`;
  els.weeklyList.innerHTML = keys.map((key) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const isTomorrow = dateKey(date) === dateKey((() => {
      const tomorrow = todayStart();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })());

    return `
      <section class="weekly-day">
        <div class="weekly-date ${isTomorrow ? "tomorrow" : ""}">
          <strong>${date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</strong>
          <span>${grouped[key].length} evento${grouped[key].length === 1 ? "" : "s"}${isTomorrow ? " · amanhã" : ""}</span>
        </div>
        <div class="weekly-events">
          ${grouped[key].map(renderWeeklyEvent).join("")}
        </div>
      </section>
    `;
  }).join("");

  els.weeklyEmpty.hidden = weeklyEvents.length > 0;
  bindCopyButtons(els.weeklyList, weeklyEvents);
}

function buildIcsEvent(evento) {
  const range = getEventStartEnd(evento);
  if (!range) return "";

  const now = new Date();
  const uid = `${evento.id || `${dateKey(range.start)}-${evento.processo || evento.nomeEvento}`}@painel-eventos-local`;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${compactIcsDateTime(now)}`,
    `DTSTART;TZID=${GOOGLE_CALENDAR_TIMEZONE}:${compactIcsDateTime(range.start)}`,
    `DTEND;TZID=${GOOGLE_CALENDAR_TIMEZONE}:${compactIcsDateTime(range.end)}`,
    `SUMMARY:${escapeIcsText(evento.nomeEvento || "Evento")}`,
    `LOCATION:${escapeIcsText(evento.local || "")}`,
    `DESCRIPTION:${escapeIcsText(buildIcsDescription(evento))}`,
    "END:VEVENT",
  ];

  return lines.map(foldIcsLine).join("\r\n");
}

function buildWeekIcs(filtered) {
  const weeklyEvents = getNext7Events(filtered);
  const body = weeklyEvents.map(buildIcsEvent).filter(Boolean).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Painel de Eventos//Exportacao Semanal//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${GOOGLE_CALENDAR_TIMEZONE}`,
    "BEGIN:VTIMEZONE",
    `TZID:${GOOGLE_CALENDAR_TIMEZONE}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:-03",
    "END:STANDARD",
    "END:VTIMEZONE",
    body,
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function exportWeekIcs() {
  const weeklyEvents = getNext7Events(state.currentFilteredEvents);
  if (!weeklyEvents.length) return;

  const ics = buildWeekIcs(state.currentFilteredEvents);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `eventos-semana-${dateKey(todayStart())}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getEventsForDate(date) {
  const key = dateKey(date);
  return eventos.filter((evento) => {
    const eventDate = parseEventDate(evento.dataEvento);
    return eventDate && dateKey(eventDate) === key;
  });
}

function getEventsByDayForMonth(year, monthIndex) {
  return eventos.reduce((days, evento) => {
    const eventDate = parseEventDate(evento.dataEvento);
    if (!eventDate) return days;
    if (eventDate.getFullYear() !== year || eventDate.getMonth() !== monthIndex) return days;
    const key = dateKey(eventDate);
    days[key] = days[key] || [];
    days[key].push(evento);
    return days;
  }, {});
}

function renderSelectedDay() {
  const [year, month, day] = state.selectedDateKey.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const dayEvents = getEventsForDate(selectedDate);

  els.selectedDayTitle.textContent = `Eventos de ${selectedDate.toLocaleDateString("pt-BR")}`;
  els.selectedDayCount.textContent = `${dayEvents.length.toLocaleString("pt-BR")} evento${dayEvents.length === 1 ? "" : "s"}`;
  els.selectedDayEvents.innerHTML = dayEvents.map(renderSmallEvent).join("");
  els.selectedDayEmpty.hidden = dayEvents.length > 0;
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const monthIndex = state.calendarDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const monthEvents = getEventsByDayForMonth(year, monthIndex);
  const tomorrow = todayStart();
  tomorrow.setDate(tomorrow.getDate() + 1);

  els.calendarTitle.textContent = firstDay.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push('<button class="calendar-day outside" type="button" disabled></button>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    const key = dateKey(date);
    const dayEvents = monthEvents[key] || [];
    const classes = [
      "calendar-day",
      dayEvents.length ? "has-events" : "",
      key === dateKey(tomorrow) ? "tomorrow" : "",
      key === state.selectedDateKey ? "selected" : "",
    ].filter(Boolean).join(" ");

    cells.push(`
      <button class="${classes}" type="button" data-date="${key}">
        <span class="calendar-day-number">${day}</span>
        ${dayEvents.length ? `<span class="event-dot">${dayEvents.length}</span>` : ""}
      </button>
    `);
  }

  els.calendarGrid.innerHTML = cells.join("");
  els.calendarGrid.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDateKey = button.dataset.date;
      renderCalendar();
      renderSelectedDay();
    });
  });
}

function renderResultCount(filtered) {
  const shown = Math.min(filtered.length, 120).toLocaleString("pt-BR");
  const total = filtered.length.toLocaleString("pt-BR");
  els.resultCount.textContent = `Mostrando ${shown} de ${total}`;
}

function chip(label, variant = "") {
  if (!label) return "";
  return `<span class="chip ${variant}">${label}</span>`;
}

function renderEvent(evento) {
  const dateStatus = getDateStatus(evento);
  const statusChip = evento.situacao
    ? chip(text(evento.situacao), "warn")
    : chip("Sem situação", "neutral");

  return `
    <article class="event-card ${dateStatus.className}">
      <div class="date-panel">
        <span class="date-label">${text(formatDate(evento.dataEvento, evento.mes, evento.ano))}</span>
        ${chip(text(dateStatus.label), dateStatus.className)}
      </div>

      <div class="event-title">
        <h3>${text(evento.nomeEvento, "Evento sem nome")}</h3>
        <p>${text(evento.local, "Local não informado")}</p>
      </div>

      <div class="detail-column event-meta">
        <p class="detail-row"><strong>Situação:</strong> ${statusChip}</p>
        <p class="detail-row"><strong>Organizador:</strong> ${text(evento.organizador, "Organizador não informado")}</p>
        <p class="detail-row"><strong>Processo:</strong> ${text(evento.processo, "Não informado")}</p>
        <p class="detail-row"><strong>Auditor:</strong> ${text(evento.auditor, "Auditor não informado")}</p>
        <a class="calendar-link" href="${text(buildGoogleCalendarUrl(evento))}" target="_blank" rel="noopener noreferrer">Adicionar ao Google Agenda</a>
      </div>
    </article>
  `;
}

function render() {
  const filtered = filterEvents();
  state.currentFilteredEvents = filtered;
  renderMetrics(filtered);
  renderWeeklyView(filtered);
  renderTomorrowNotices();
  renderCalendar();
  renderSelectedDay();
  renderResultCount(filtered);

  els.eventList.innerHTML = filtered.slice(0, 120).map(renderEvent).join("");
  els.emptyState.hidden = filtered.length > 0;
}

function bindEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  [
    ["year", els.yearFilter],
    ["month", els.monthFilter],
    ["tax", els.taxFilter],
    ["status", els.statusFilter],
    ["auditor", els.auditorFilter],
  ].forEach(([key, select]) => {
    select.addEventListener("change", (event) => {
      state[key] = event.target.value;
      render();
    });
  });

  els.clearFilters.addEventListener("click", () => {
    Object.keys(state).forEach((key) => {
      state[key] = "";
    });

    els.searchInput.value = "";
    els.yearFilter.value = "";
    els.monthFilter.value = "";
    els.taxFilter.value = "";
    els.statusFilter.value = "";
    els.auditorFilter.value = "";
    render();
  });

  els.prevMonth.addEventListener("click", () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
    state.selectedDateKey = dateKey(new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1));
    renderCalendar();
    renderSelectedDay();
  });

  els.nextMonth.addEventListener("click", () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
    state.selectedDateKey = dateKey(new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1));
    renderCalendar();
    renderSelectedDay();
  });

  els.exportWeekIcs.addEventListener("click", exportWeekIcs);

  els.toggleHowTo.addEventListener("click", () => {
    const isCollapsed = els.howToPanel.classList.toggle("collapsed");
    els.toggleHowTo.textContent = isCollapsed ? "Mostrar" : "Ocultar";
    els.toggleHowTo.setAttribute("aria-expanded", String(!isCollapsed));
  });
}

function init() {
  els.sourceFile.textContent = meta.arquivoFonte;
  fillSelect(els.yearFilter, onlyFilled(eventos.map((evento) => evento.ano)).reverse(), "Todos");
  fillSelect(els.monthFilter, onlyFilled(eventos.map((evento) => evento.mes)), "Todos", (value) => monthNames[Number(value)] || value);
  fillSelect(els.taxFilter, onlyFilled(eventos.map((evento) => evento.enquadramento)), "Todos");
  fillSelect(els.statusFilter, onlyFilled(eventos.map((evento) => evento.situacao)), "Todas");
  fillSelect(els.auditorFilter, onlyFilled(eventos.map((evento) => evento.auditor)), "Todos");
  bindEvents();
  render();
}

init();
