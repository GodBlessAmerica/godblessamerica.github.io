"use strict";

const SOURCE_ORDER = ["i", "t", "ly", "bk", "bc", "m", "n", "od"];
const WORD_INDEX = { t: 1, m: 1, n: 1, i: 1, ly: 0, bk: 0, bc: 0, od: 0 };
const datasets = Object.fromEntries(SOURCE_ORDER.map((source) => [source, []]));
const phonetics = new Map();

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase();
}

function addPhonetic(word, phonetic) {
  const key = normalize(word).trim();
  const value = String(phonetic ?? "").trim();
  if (key && value && value !== "—" && !phonetics.has(key)) phonetics.set(key, value);
}

async function loadData() {
  try {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser does not support local compressed data.");
    }
    const manifestResponse = await fetch("./data/manifest.json", { cache: "force-cache" });
    if (!manifestResponse.ok) throw new Error(`manifest ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();

    let loaded = 0;
    const shards = await Promise.all(manifest.files.map(async (file) => {
      const response = await fetch(`./data/${file}`, { cache: "force-cache" });
      if (!response.ok) throw new Error(`${file} ${response.status}`);
      const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
      const shard = JSON.parse(await new Response(stream).text());
      loaded += 1;
      postMessage({ type: "progress", loaded, total: manifest.files.length });
      return shard;
    }));

    for (const shard of shards) {
      for (const source of SOURCE_ORDER) {
        if (!Array.isArray(shard[source])) continue;
        datasets[source].push(...shard[source]);
        if (source === "bk" || source === "bc") {
          for (const row of shard[source]) addPhonetic(row[0], row[1]);
        }
      }
    }

    postMessage({ type: "ready", total: manifest.total, counts: manifest.counts });
  } catch (error) {
    postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
}

function wordRank(word, query) {
  const value = normalize(word);
  if (value === query) return 0;
  if (value.startsWith(query)) return 1;
  const boundary = value.search(new RegExp(`(^|[^a-z])${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  if (boundary >= 0) return 2;
  return 3;
}

function searchSource(source, query) {
  const matches = [];
  let total = 0;

  for (let index = 0; index < datasets[source].length; index += 1) {
    const row = datasets[source][index];
    let matched = false;
    let rank = 3;

    if (source === "i") {
      matched = normalize(row[1]).includes(query) || normalize(row[2]).includes(query);
    } else {
      const word = row[WORD_INDEX[source]];
      matched = normalize(word).includes(query);
      if (matched) rank = wordRank(word, query);
    }

    if (!matched) continue;
    total += 1;
    matches.push({ row, rank, index });
  }

  matches.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return { total, rows: matches.slice(0, 50).map((item) => item.row) };
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "phonetic") {
    const word = normalize(message.word).trim();
    postMessage({ type: "phonetic-result", id: message.id, word: message.word, phonetic: phonetics.get(word) || "" });
    return;
  }
  if (message.type !== "search") return;
  const query = normalize(message.query).trim();
  if (!query) return;

  const results = {};
  for (const source of SOURCE_ORDER) results[source] = searchSource(source, query);
  postMessage({ type: "results", id: message.id, query: message.query, results });
});

loadData();
