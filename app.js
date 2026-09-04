let dataset = [];
let currentActiveTag = "All";

const loader = document.getElementById('loading-spinner');
const searchInterface = document.getElementById('search-interface');
const container = document.getElementById('modules-container');
const searchBox = document.getElementById('search-box');
const resultsArea = document.getElementById('results-area');
const snippetsContainer = document.getElementById('snippets-container');
const resultsCount = document.getElementById('results-count');
const tagFilters = document.getElementById('tag-filters');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Henter hovedindeks og moduler i parallell
async function loadAllDataAndInitialize() {
  try {
    const indexResponse = await fetch('index.json');
    if (!indexResponse.ok) throw new Error('Kunne ikke laste index.json');
    const indexData = await indexResponse.json();

    const fetchPromises = indexData.map(async (item) => {
      try {
        const moduleResponse = await fetch(item.file);
        if (!moduleResponse.ok) throw new Error(`Feil på ${item.file}`);
        const moduleContent = await moduleResponse.json();
        return { ...item, content: moduleContent.content };
      } catch (err) {
        console.error(`Klarte ikke hente innhold for: ${item.title}`, err);
        return { ...item, content: "[Innhold utilgjengelig]" };
      }
    });

    dataset = await Promise.all(fetchPromises);

    // Fjern spinner og vis grensesnittet
    loader.classList.add('hidden');
    searchInterface.classList.remove('hidden');

    updateInterface();
  } catch (error) {
    console.error("Kritisk feil under oppstart:", error);
    loader.innerHTML = `<div style="color: red; font-weight: bold;">Klarte ikke å starte søkemotoren. Sjekk konsollen for detaljer.</div>`;
  }
}

// Oppdaterer treff og moduler basert på tekst og valgt tag
function updateInterface() {
  const query = searchBox.value.trim();
  snippetsContainer.innerHTML = '';
  
  const tagFilteredData = dataset.filter(item => {
    return currentActiveTag === "All" || item.tags.includes(currentActiveTag);
  });

  renderModules(tagFilteredData);

  if (!query) {
    resultsArea.classList.remove('active');
    return;
  }

  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  let matchCount = 0;

  tagFilteredData.forEach(item => {
    const sentences = item.content.split(/[.!?]+/);

    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes(query.toLowerCase())) {
        matchCount++;
        const highlightedText = sentence.trim().replace(regex, '<mark>$1</mark>');

        const snippetDiv = document.createElement('div');
        snippetDiv.className = 'snippet-item';
        snippetDiv.innerHTML = `
          <div class="snippet-source">Funnet i (${item.tags.join(', ')}): ${item.title}</div>
          <div class="snippet-text">... ${highlightedText} ...</div>
        `;

        snippetDiv.addEventListener('click', () => {
          const targetModule = document.getElementById(item.id);
          if (targetModule) {
            targetModule.classList.add('open');
            targetModule.scrollIntoView({ behavior: 'smooth' });
          }
        });
        snippetsContainer.appendChild(snippetDiv);
      }
    });
  });

  if (matchCount > 0) {
    resultsCount.textContent = `Fant ${matchCount} treff i kontekst innenfor "${currentActiveTag}":`;
    resultsArea.classList.add('active');
  } else {
    resultsCount.textContent = `Ingen treff matchet søkekriteriene dine.`;
    resultsArea.classList.add('active');
  }
}

// Rendrer selve trekkspill-modulene i bunnen
function renderModules(filteredData) {
  container.innerHTML = '';
  
  if(filteredData.length === 0) {
    container.innerHTML = `<div style="padding:1rem; color:#64748b;"><h3>Ingen moduler tilgjengelig</h3></div>`;
    return;
  }

  filteredData.forEach(item => {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'module';
    moduleDiv.id = item.id;
    
    const badges = item.tags.map(t => `<span class="module-badge">${t}</span>`).join(' ');

    moduleDiv.innerHTML = `
      <button class="module-header">
        <div>
          <div>${item.title}</div>
          <div class="module-badge-container">${badges}</div>
        </div>
        <span>▼</span>
      </button>
      <div class="module-body">
        <div class="module-content">${item.content}</div>
      </div>
    `;

    moduleDiv.querySelector('.module-header').addEventListener('click', () => {
      moduleDiv.classList.toggle('open');
    });

    container.appendChild(moduleDiv);
  });
}

// Lytter til klikk på tag-knapper
tagFilters.addEventListener('click', (e) => {
  if (!e.target.classList.contains('tag-btn')) return;
  
  document.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  
  currentActiveTag = e.target.getAttribute('data-tag');
  updateInterface();
});

searchBox.addEventListener('input', updateInterface);

// Start applikasjonen
loadAllDataAndInitialize();
