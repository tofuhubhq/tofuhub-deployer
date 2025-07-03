const stepsContainer = document.getElementById('steps-container');
const variablesContainer = document.getElementById('variables-container');

async function fetchState() {
  try {
    const response = await fetch('/state');
    if (!response.ok) throw new Error('Failed to fetch state');
    const data = await response.json();

    renderSteps(data.steps || []);
    renderVariables(data.variables || {});
  } catch (err) {
    console.error('Error fetching state:', err);
  }
}

function renderSteps(steps) {
  stepsContainer.innerHTML = '';

  steps.forEach((step) => {
    const div = document.createElement('div');
    div.className = 'step';
    div.innerHTML = `
      <h3>${step.name}</h3>
      <p>Package: ${step.package}</p>
    `;
    stepsContainer.appendChild(div);
  });
}

function renderVariables(vars) {
  if (!vars || Object.keys(vars).length === 0) {
    variablesContainer.innerHTML = `<p>No variables found.</p>`;
    return;
  }

  let table = `<form id="variable-form"><table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>`;

  for (const [key, value] of Object.entries(vars)) {
    table += `
      <tr>
        <td>${key}</td>
        <td>
          <input 
            type="text" 
            name="${key}" 
            value="${value.default || ''}" 
            placeholder="Enter value for ${key}"
            style="width: 100%;"
          />
        </td>
      </tr>`;
  }

  table += `</tbody></table></form>`;

  variablesContainer.innerHTML = table;
}

function getFormValues() {
  const form = document.getElementById('variable-form');
  const formData = new FormData(form);
  const result = {};
  for (const [key, value] of formData.entries()) {
    result[key] = value;
  }
  return result;
}

function setupLogStream(stepName) {
  const socket = new WebSocket(`wss://${location.host}/logs`);

  socket.onmessage = (event) => {
    console.info(event)
    const logEl = document.getElementById('log-output');
    if (logEl) {
      logEl.textContent += event.data;
      logEl.scrollTop = logEl.scrollHeight;
    }
  };
}

document.getElementById('deploy-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  const inputs = getFormValues();
  console.info(inputs)
  const res = await fetch('/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs)
  });

  // handle response...
});

// Initial fetch and poll every 2 seconds
setupLogStream()
fetchState();
setInterval(fetchState, 2000);


