"use strict";

const SOURCE_ORDER = ["i", "t", "ly", "bk", "bc", "m", "n", "od"];
const SOURCE_META = {
  i: { title: "雅思 · 新东方100句（中英对照）", headers: ["句子 ID", "English", "中文"] },
  t: { title: "清华大学生10000词", headers: ["ID", "单词 / 书页", "页码"] },
  ly: { title: "刘毅词汇 · 第1–3册", headers: ["单词", "册", "页码"] },
  bk: { title: "百词斩 · 考研4781词", headers: ["单词", "音标", "简意", "词根词缀"] },
  bc: { title: "百词斩 · 万词10918", headers: ["单词", "音标", "简意", "词根词缀"] },
  m: { title: "麦考林7000", headers: ["ID", "单词"] },
  n: { title: "考研考频5530", headers: ["ID", "单词", "考频", "词义"] },
  od: { title: "在线词典 · 词根词缀", headers: ["单词", "词根", "词根词义", "类型", "详细解释"] },
};

const HISTORY_KEY = "word-search-history-v1";
const form = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const searchButton = document.getElementById("searchButton");
const loadStatus = document.getElementById("loadStatus");
const datasetInfo = document.getElementById("datasetInfo");
const spinner = document.getElementById("spinner");
const recentSearches = document.getElementById("recentSearches");
const resultSummary = document.getElementById("resultSummary");
const resultsContainer = document.getElementById("results");
const wordPopover = document.getElementById("wordPopover");
const popoverWord = document.getElementById("popoverWord");
const popoverPhonetic = document.getElementById("popoverPhonetic");
const imageDialog = document.getElementById("imageDialog");
const dialogTitle = document.getElementById("dialogTitle");
const pageImage = document.getElementById("pageImage");

let ready = false;
let requestId = 0;
let currentWord = "";
let currentPage = 1;
let audio = null;
let phoneticRequestId = 0;
const phoneticCache = new Map();
const pendingPhoneticRequests = new Map();

const worker = new Worker("./worker.js?v=20260827-2");

worker.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "phonetic-result") {
    const pending = pendingPhoneticRequests.get(message.id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingPhoneticRequests.delete(message.id);
      pending.resolve(message.phonetic || "");
    }
    return;
  }
  if (message.type === "progress") {
    loadStatus.textContent = `正在加载词库 ${message.loaded}/${message.total}…`;
    return;
  }
  if (message.type === "ready") {
    ready = true;
    spinner.classList.add("is-hidden");
    loadStatus.textContent = "词库已就绪";
    datasetInfo.textContent = `${Number(message.total).toLocaleString("zh-CN")} 条记录`;
    searchButton.disabled = false;
    const linkedQuery = new URLSearchParams(window.location.search).get("q");
    if (linkedQuery) {
      queryInput.value = linkedQuery;
      runSearch(linkedQuery);
    } else {
      queryInput.focus();
    }
    return;
  }
  if (message.type === "error") {
    spinner.classList.add("is-hidden");
    loadStatus.textContent = "词库加载失败";
    renderError("无法加载词库数据，请刷新页面后重试。", message.message);
    return;
  }
  if (message.type === "results" && message.id === requestId) {
    searchButton.disabled = false;
    searchButton.textContent = "搜索";
    renderResults(message.query, message.results);
  }
});

function getHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveHistory(query) {
  const normalized = query.toLocaleLowerCase();
  const next = [query, ...getHistory().filter((item) => item.toLocaleLowerCase() !== normalized)].slice(0, 10);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  recentSearches.replaceChildren();
  recentSearches.classList.toggle("is-visible", history.length > 0);
  if (!history.length) return;

  const label = document.createElement("span");
  label.className = "recent-label";
  label.textContent = "最近搜索";
  recentSearches.appendChild(label);

  for (const query of history) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-chip";
    button.textContent = query;
    button.addEventListener("click", () => {
      queryInput.value = query;
      runSearch(query);
    });
    recentSearches.appendChild(button);
  }
}

function runSearch(rawQuery) {
  const query = String(rawQuery || "").trim();
  if (!query) {
    queryInput.focus();
    return;
  }
  if (!ready) return;

  requestId += 1;
  searchButton.disabled = true;
  searchButton.textContent = "查询中…";
  resultSummary.textContent = `正在搜索“${query}”…`;
  resultsContainer.replaceChildren();
  saveHistory(query);
  worker.postMessage({ type: "search", id: requestId, query });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(queryInput.value);
});

function appendTextCell(rowElement, value, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
  rowElement.appendChild(cell);
  return cell;
}

function makeSpeakButton(word, label = word) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "word-button";
  button.dataset.speak = word;
  button.textContent = label;
  return button;
}

function appendEnglishSentence(cell, sentence) {
  const parts = String(sentence).split(/([A-Za-z]+(?:[-'][A-Za-z]+)*)/g);
  for (const part of parts) {
    if (/^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(part)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "word-token";
      button.dataset.speak = part;
      button.textContent = part;
      cell.appendChild(button);
    } else {
      cell.appendChild(document.createTextNode(part));
    }
  }
}

function renderRow(source, values) {
  const row = document.createElement("tr");

  if (source === "i") {
    appendTextCell(row, values[0]);
    const english = document.createElement("td");
    appendEnglishSentence(english, values[1]);
    row.appendChild(english);
    appendTextCell(row, values[2]);
    return row;
  }

  if (source === "t") {
    appendTextCell(row, values[0]);
    const wordCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-button";
    button.dataset.page = values[2];
    button.textContent = values[1];
    button.title = `查看第 ${values[2]} 页`;
    wordCell.appendChild(button);
    row.appendChild(wordCell);
    appendTextCell(row, values[2]);
    return row;
  }

  if (source === "od") {
    const wordCell = document.createElement("td");
    wordCell.appendChild(makeSpeakButton(values[0]));
    row.appendChild(wordCell);
    appendTextCell(row, values[1]);
    appendTextCell(row, values[2]);
    appendTextCell(row, values[3]);
    const detailCell = document.createElement("td");
    detailCell.className = "details";
    const details = values.slice(4).filter(Boolean);
    if (!details.length) detailCell.textContent = "—";
    for (const detail of details) {
      const line = document.createElement("div");
      line.textContent = detail;
      detailCell.appendChild(line);
    }
    row.appendChild(detailCell);
    return row;
  }

  const wordIndex = ["m", "n"].includes(source) ? 1 : 0;
  values.forEach((value, index) => {
    if (index === wordIndex) {
      const cell = document.createElement("td");
      cell.appendChild(makeSpeakButton(value));
      row.appendChild(cell);
    } else {
      appendTextCell(row, value, value === "" ? "muted-cell" : "");
    }
  });
  return row;
}

function renderResults(query, resultMap) {
  resultsContainer.replaceChildren();
  let total = 0;
  let sourceCount = 0;

  for (const source of SOURCE_ORDER) {
    const result = resultMap[source];
    if (!result || !result.total) continue;
    total += result.total;
    sourceCount += 1;

    const card = document.createElement("article");
    card.className = "source-card";
    const header = document.createElement("header");
    header.className = "source-header";
    const title = document.createElement("h2");
    title.textContent = SOURCE_META[source].title;
    const count = document.createElement("span");
    count.className = "source-count";
    count.textContent = result.total > 50 ? `共 ${result.total} 条 · 显示前 50 条` : `${result.total} 条`;
    header.append(title, count);

    const scroll = document.createElement("div");
    scroll.className = "table-scroll";
    const table = document.createElement("table");
    const tableHead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of SOURCE_META[source].headers) {
      const heading = document.createElement("th");
      heading.scope = "col";
      heading.textContent = label;
      headRow.appendChild(heading);
    }
    tableHead.appendChild(headRow);
    const body = document.createElement("tbody");
    for (const row of result.rows) body.appendChild(renderRow(source, row));
    table.append(tableHead, body);
    scroll.appendChild(table);
    card.append(header, scroll);
    resultsContainer.appendChild(card);
  }

  if (!total) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("h2");
    title.textContent = "没有找到结果";
    const hint = document.createElement("p");
    hint.textContent = "可以尝试更短的单词片段、不同拼写，或输入句子中的中文关键词。";
    empty.append(title, hint);
    resultsContainer.appendChild(empty);
    resultSummary.textContent = `“${query}”没有匹配记录`;
    return;
  }

  resultSummary.textContent = `“${query}”共找到 ${total.toLocaleString("zh-CN")} 条，来自 ${sourceCount} 个词库`;
}

function renderError(titleText, detailText = "") {
  resultsContainer.replaceChildren();
  const error = document.createElement("div");
  error.className = "error-state";
  const title = document.createElement("h2");
  title.textContent = titleText;
  const detail = document.createElement("p");
  detail.textContent = detailText;
  error.append(title, detail);
  resultsContainer.appendChild(error);
}

function speakWord(word) {
  if (!word) return;
  if (audio) audio.pause();
  audio = new Audio(`https://dict.youdao.com/dictvoice?type=1&audio=${encodeURIComponent(word)}`);
  audio.play().catch(() => {});
}

function positionPopover(anchor) {
  const rect = anchor.getBoundingClientRect();
  wordPopover.classList.add("is-visible");
  wordPopover.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    const popoverRect = wordPopover.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - popoverRect.width - 12));
    const topCandidate = rect.bottom + 9;
    const top = topCandidate + popoverRect.height <= window.innerHeight - 12
      ? topCandidate
      : Math.max(12, rect.top - popoverRect.height - 9);
    wordPopover.style.left = `${left}px`;
    wordPopover.style.top = `${top}px`;
  });
}

function getLocalPhonetic(word) {
  return new Promise((resolve) => {
    phoneticRequestId += 1;
    const id = phoneticRequestId;
    const timer = setTimeout(() => {
      pendingPhoneticRequests.delete(id);
      resolve("");
    }, 1200);
    pendingPhoneticRequests.set(id, { resolve, timer });
    worker.postMessage({ type: "phonetic", id, word });
  });
}

async function fetchJson(url, timeout = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function firstResolvedPhonetic(lookups) {
  return new Promise((resolve) => {
    let remaining = lookups.length;
    let resolved = false;
    const finishEmpty = () => {
      remaining -= 1;
      if (!resolved && remaining === 0) resolve("");
    };
    for (const lookup of lookups) {
      Promise.resolve(lookup).then((phonetic) => {
        if (phonetic && !resolved) {
          resolved = true;
          resolve(phonetic);
        } else {
          finishEmpty();
        }
      }).catch(finishEmpty);
    }
  });
}

function getRemotePhonetic(word) {
  const encodedWord = encodeURIComponent(word);
  const dictionaryApiDev = fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodedWord}`)
    .then((data) => data?.[0]?.phonetic || data?.[0]?.phonetics?.find((item) => item.text)?.text || "");
  const freeDictionaryApi = fetchJson(`https://freedictionaryapi.com/api/v1/entries/en/${encodedWord}`)
    .then((data) => {
      const pronunciations = (data?.entries || []).flatMap((entry) => entry.pronunciations || []);
      return pronunciations.find((item) => item.type === "ipa" && item.text)?.text
        || pronunciations.find((item) => item.text)?.text
        || "";
    });
  return firstResolvedPhonetic([dictionaryApiDev, freeDictionaryApi]);
}

async function showWord(word, anchor) {
  currentWord = word;
  popoverWord.textContent = word;
  popoverPhonetic.textContent = "正在查询音标…";
  positionPopover(anchor);
  speakWord(word);

  const cacheKey = String(word).normalize("NFKC").toLocaleLowerCase();
  if (phoneticCache.has(cacheKey)) {
    popoverPhonetic.textContent = phoneticCache.get(cacheKey) || "暂未收录音标";
    return;
  }

  const localPhonetic = await getLocalPhonetic(word);
  if (currentWord !== word) return;
  if (localPhonetic) {
    phoneticCache.set(cacheKey, localPhonetic);
    popoverPhonetic.textContent = localPhonetic;
    return;
  }

  let remotePhonetic = "";
  try {
    remotePhonetic = await getRemotePhonetic(word);
  } catch {
    // Third-party dictionary services are optional; local search must keep working.
    remotePhonetic = "";
  }
  if (currentWord !== word) return;
  phoneticCache.set(cacheKey, remotePhonetic);
  popoverPhonetic.textContent = remotePhonetic || "暂未收录音标";
}

function hidePopover() {
  wordPopover.classList.remove("is-visible");
  wordPopover.setAttribute("aria-hidden", "true");
}

resultsContainer.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    openPage(Number(pageButton.dataset.page));
    return;
  }
  const wordButton = event.target.closest("[data-speak]");
  if (wordButton) showWord(wordButton.dataset.speak, wordButton);
});

document.getElementById("speakAgain").addEventListener("click", () => speakWord(currentWord));
document.getElementById("closePopover").addEventListener("click", hidePopover);
document.addEventListener("click", (event) => {
  if (!wordPopover.contains(event.target) && !event.target.closest("[data-speak]")) hidePopover();
});
window.addEventListener("resize", hidePopover);
window.addEventListener("scroll", hidePopover, true);

function openPage(page) {
  currentPage = Math.max(1, Math.min(490, page));
  const atlas = Math.floor((currentPage - 1) / 8);
  const slot = (currentPage - 1) % 8;
  const row = Math.floor(slot / 2);
  const column = slot % 2;
  dialogTitle.textContent = `清华词书 · 第 ${currentPage} 页`;
  pageImage.src = `./tsinghuapng/atlas-${String(atlas).padStart(2, "0")}.webp`;
  pageImage.style.transform = `translate(${-column * 50}%, ${-row * 25}%)`;
  pageImage.alt = `清华词书第 ${currentPage} 页`;
  if (!imageDialog.open) imageDialog.showModal();
}

document.getElementById("previousPage").addEventListener("click", () => openPage(currentPage - 1));
document.getElementById("nextPage").addEventListener("click", () => openPage(currentPage + 1));
document.getElementById("closeDialog").addEventListener("click", () => imageDialog.close());
imageDialog.addEventListener("click", (event) => {
  if (event.target === imageDialog) imageDialog.close();
});

renderHistory();
