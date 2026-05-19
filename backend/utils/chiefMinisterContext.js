const STATE_ALIASES = {
  'andhra pradesh': 'Andhra Pradesh',
  'arunachal pradesh': 'Arunachal Pradesh',
  'assam': 'Assam',
  'bihar': 'Bihar',
  'chhattisgarh': 'Chhattisgarh',
  'delhi': 'Delhi',
  'goa': 'Goa',
  'gujarat': 'Gujarat',
  'haryana': 'Haryana',
  'himachal pradesh': 'Himachal Pradesh',
  'jharkhand': 'Jharkhand',
  'karnataka': 'Karnataka',
  'kerala': 'Kerala',
  'madhya pradesh': 'Madhya Pradesh',
  'maharashtra': 'Maharashtra',
  'manipur': 'Manipur',
  'meghalaya': 'Meghalaya',
  'mizoram': 'Mizoram',
  'nagaland': 'Nagaland',
  'odisha': 'Odisha',
  'orissa': 'Odisha',
  'puducherry': 'Puducherry',
  'punjab': 'Punjab',
  'rajasthan': 'Rajasthan',
  'sikkim': 'Sikkim',
  'tamil nadu': 'Tamil Nadu',
  'tamil naidu': 'Tamil Nadu',
  'telangana': 'Telangana',
  'tripura': 'Tripura',
  'uttar pradesh': 'Uttar Pradesh',
  'uttarakhand': 'Uttarakhand',
  'west bengal': 'West Bengal',
};

const WIKI_TITLES = {
  'Andhra Pradesh': 'List_of_chief_ministers_of_Andhra_Pradesh',
  'Arunachal Pradesh': 'List_of_chief_ministers_of_Arunachal_Pradesh',
  'Assam': 'List_of_chief_ministers_of_Assam',
  'Bihar': 'List_of_chief_ministers_of_Bihar',
  'Chhattisgarh': 'List_of_chief_ministers_of_Chhattisgarh',
  'Delhi': 'List_of_chief_ministers_of_Delhi',
  'Goa': 'List_of_chief_ministers_of_Goa',
  'Gujarat': 'List_of_chief_ministers_of_Gujarat',
  'Haryana': 'List_of_chief_ministers_of_Haryana',
  'Himachal Pradesh': 'List_of_chief_ministers_of_Himachal_Pradesh',
  'Jharkhand': 'List_of_chief_ministers_of_Jharkhand',
  'Karnataka': 'List_of_chief_ministers_of_Karnataka',
  'Kerala': 'List_of_chief_ministers_of_Kerala',
  'Madhya Pradesh': 'List_of_chief_ministers_of_Madhya_Pradesh',
  'Maharashtra': 'List_of_chief_ministers_of_Maharashtra',
  'Manipur': 'List_of_chief_ministers_of_Manipur',
  'Meghalaya': 'List_of_chief_ministers_of_Meghalaya',
  'Mizoram': 'List_of_chief_ministers_of_Mizoram',
  'Nagaland': 'List_of_chief_ministers_of_Nagaland',
  'Odisha': 'List_of_chief_ministers_of_Odisha',
  'Puducherry': 'List_of_chief_ministers_of_Puducherry',
  'Punjab': 'List_of_chief_ministers_of_Punjab_(India)',
  'Rajasthan': 'List_of_chief_ministers_of_Rajasthan',
  'Sikkim': 'List_of_chief_ministers_of_Sikkim',
  'Tamil Nadu': 'List_of_chief_ministers_of_Tamil_Nadu',
  'Telangana': 'List_of_chief_ministers_of_Telangana',
  'Tripura': 'List_of_chief_ministers_of_Tripura',
  'Uttar Pradesh': 'List_of_chief_ministers_of_Uttar_Pradesh',
  'Uttarakhand': 'List_of_chief_ministers_of_Uttarakhand',
  'West Bengal': 'List_of_chief_ministers_of_West_Bengal',
};

function wantsChiefMinister(text = '') {
  return /\b(chief minister|\bcm\b)\b/i.test(text);
}

function mentionedStates(text = '') {
  const lower = text.toLowerCase();
  return Object.entries(STATE_ALIASES)
    .filter(([alias]) => lower.includes(alias))
    .map(([, canonical]) => canonical)
    .filter((state, index, arr) => arr.indexOf(state) === index);
}

function stripRefs(value = '') {
  return value
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function wikipediaExtract(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'MitraAI/1.0 current affairs helper' } });
  if (!response.ok) throw new Error(`Wikipedia summary failed: ${response.status}`);
  return await response.json();
}

async function wikipediaWikitext(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=${encodeURIComponent(title)}&origin=*`;
  const response = await fetch(url, { headers: { 'User-Agent': 'MitraAI/1.0 current affairs helper' } });
  if (!response.ok) throw new Error(`Wikipedia page failed: ${response.status}`);
  const data = await response.json();
  const page = Object.values(data?.query?.pages || {})[0];
  return page?.revisions?.[0]?.slots?.main?.['*'] || '';
}

function extractIncumbentFromWikitext(wikitext = '') {
  const incumbentPatterns = [
    /\|\s*incumbent\s*=\s*([^\n|]+)/i,
    /\|\s*current_holder\s*=\s*([^\n|]+)/i,
    /\|\s*chief_minister\s*=\s*([^\n|]+)/i,
  ];

  for (const pattern of incumbentPatterns) {
    const match = wikitext.match(pattern);
    if (match?.[1]) {
      const cleaned = stripRefs(match[1])
        .replace(/\{\{[^}]*\}\}/g, '')
        .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, '$2')
        .trim();
      if (cleaned) return cleaned;
    }
  }

  const currentRow = wikitext.match(/\|\s*(?:Incumbent|Current)[\s\S]{0,500}/i)?.[0] || '';
  const link = currentRow.match(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/);
  return link?.[1] ? stripRefs(link[1]) : '';
}

async function getChiefMinisterContext(text = '') {
  if (!wantsChiefMinister(text)) return '';

  const states = mentionedStates(text);
  if (!states.length) return 'Chief Minister question detected, but no Indian state was clearly identified.';

  const lines = [];
  for (const state of states) {
    const title = WIKI_TITLES[state];
    if (!title) continue;

    try {
      const [summary, wikitext] = await Promise.all([
        wikipediaExtract(title).catch(() => null),
        wikipediaWikitext(title).catch(() => ''),
      ]);
      const incumbent = extractIncumbentFromWikitext(wikitext);
      const sourceUrl = `https://en.wikipedia.org/wiki/${title}`;
      lines.push([
        `State: ${state}`,
        incumbent ? `Detected current/incumbent chief minister from live Wikipedia page data: ${incumbent}` : '',
        summary?.extract ? `Live page summary: ${summary.extract}` : '',
        `Source checked live: ${sourceUrl}`,
      ].filter(Boolean).join('\n'));
    } catch (error) {
      lines.push(`State: ${state}\nChief Minister lookup failed: ${error.message}`);
    }
  }

  return lines.length ? `Live Chief Minister lookup:\n\n${lines.join('\n\n')}` : '';
}

module.exports = { getChiefMinisterContext };
