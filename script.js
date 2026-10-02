const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');
const mobileMenu = document.querySelector('[data-mobile-nav]');
const nav = document.querySelector('.nav');

const applyTheme = (mode) => {
  root.classList.toggle('light', mode === 'light');
  localStorage.setItem('ai-theme', mode);
  if (themeToggle) {
    themeToggle.textContent = mode === 'light' ? '☾' : '☀';
  }
};

const savedTheme = localStorage.getItem('ai-theme') || 'dark';
applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextMode = root.classList.contains('light') ? 'dark' : 'light';
    applyTheme(nextMode);
  });
}
if (mobileMenu && nav) {
  mobileMenu.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

const counters = document.querySelectorAll('[data-count]');
const animateCounter = (el) => {
  const target = Number(el.dataset.count || 0);
  const suffix = el.dataset.suffix || '';
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 65));
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = current + suffix;
  }, 20);
};
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
counters.forEach((counter) => observer.observe(counter));

const searchInputs = document.querySelectorAll('[data-search-input]');
const filterButtons = document.querySelectorAll('[data-filter]');
const modelCards = document.querySelectorAll('.model-card');
const sortSelect = document.querySelector('[data-sort-select]');

const applyModelVisibility = () => {
  const value = document.querySelector('[data-search-input]')?.value.toLowerCase() || '';
  const activeFilter = document.querySelector('[data-filter].active')?.dataset.filter || 'all';

  modelCards.forEach((card) => {
    const category = card.dataset.category || 'all';
    const text = card.textContent.toLowerCase();
    const matchFilter = activeFilter === 'all' || category === activeFilter;
    const matchSearch = !value || text.includes(value);
    card.style.display = matchFilter && matchSearch ? '' : 'none';
  });

  if (sortSelect) {
    const sortValue = sortSelect.value;
    if (sortValue === 'name-asc' || sortValue === 'name-desc') {
      const list = Array.from(modelCards);
      const visibleCards = list.filter((card) => card.style.display !== 'none');
      const sorted = visibleCards.sort((a, b) => {
        const aName = a.querySelector('h3')?.textContent || '';
        const bName = b.querySelector('h3')?.textContent || '';
        return sortValue === 'name-asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      });
      const parent = modelCards[0]?.parentElement;
      if (parent) {
        sorted.forEach((card) => parent.appendChild(card));
      }
    }
  }
};

searchInputs.forEach((input) => {
  input.addEventListener('input', applyModelVisibility);
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    applyModelVisibility();
  });
});

if (sortSelect) {
  sortSelect.addEventListener('change', applyModelVisibility);
}

const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = contactForm.querySelector('[name="name"]').value.trim();
    const email = contactForm.querySelector('[name="email"]').value.trim();
    const subject = contactForm.querySelector('[name="subject"]').value.trim();
    const message = contactForm.querySelector('[name="message"]').value.trim();
    const status = contactForm.querySelector('.form-status');

    if (!name || !email || !subject || !message) {
      status.textContent = 'Please complete all fields before sending.';
      status.style.color = '#fbbf24';
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      status.textContent = 'Please enter a valid email address.';
      status.style.color = '#fbbf24';
      return;
    }

    status.style.color = '#34d399';
    status.textContent = 'Demo message prepared. This form is for demo purposes only.';
    contactForm.reset();
  });
}

const demoTask = document.querySelector('[data-demo-task]');
const demoPrompt = document.querySelector('[data-demo-prompt]');
const demoOutput = document.querySelector('[data-demo-output]');
const generateBtn = document.querySelector('[data-generate-demo]');

if (generateBtn && demoPrompt && demoOutput) {
  const fallbackResponses = {
    summarize: 'Summary: This workflow reviews the key ideas, groups themes, and surfaces the most useful takeaways with an actionable summary for decision-makers.',
    explain: 'Explanation: The concept is best framed as a workflow that converts an input into structured steps, tools, and outputs while keeping human oversight in the loop.',
    ideas: 'Ideas: 1) automate a recurring reporting workflow, 2) create a research brief, 3) turn customer support notes into action lists.',
    analyze: 'Analysis: Emerging patterns show speed, volume, and repetition as the highest-ROI opportunities for automation and optimization.',
    code: 'Code example: const summarize = (items) => items.map(item => item.trim()).filter(Boolean).join(" | ");',
    content: 'Content draft: A practical AI strategy should combine data, expert review, and human-centered workflow design for reliable outcomes.',
    answer: 'Answer: The strongest approach is to start with a small, measurable workflow and validate results before scaling to broader automation.'
  };

  const getChatEndpoint = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? '/api/chat' : '/.netlify/functions/chat';
  };

  generateBtn.addEventListener('click', async () => {
    const task = demoTask ? demoTask.value : 'summarize';
    const prompt = demoPrompt.value.trim() || 'Explain how an AI assistant can support a small team.';

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    demoOutput.innerHTML = '<strong>Thinking...</strong><br><br>Requesting a live response from the AI service.';

    try {
      const response = await fetch(getChatEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, task })
      });

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error || 'Request failed';
        const fallback = data?.fallback || fallbackResponses[task] || fallbackResponses.summarize;
        throw new Error(`${message}\n${fallback}`);
      }

      const answer = data.answer || 'No response received.';
      demoOutput.innerHTML = `
        <strong>AI response</strong><br><br>
        <strong>Prompt:</strong> ${prompt}<br><br>
        <strong>Task:</strong> ${task}<br><br>
        ${answer}
      `;
    } catch (error) {
      const detail = (error && error.message) ? error.message : 'Unknown AI error';
      const fallback = fallbackResponses[task] || fallbackResponses.summarize;
      const message = detail.includes('GEMINI_API_KEY') || detail.includes('OPENAI_API_KEY') || detail.includes('configured')
        ? '<em>This site needs a Gemini or OpenAI API key in the server environment to generate live responses.</em>'
        : '<em>The live AI request failed. Check the backend environment or API key.</em>';

      demoOutput.innerHTML = `
        <strong>Live AI request failed</strong><br><br>
        <strong>Prompt:</strong> ${prompt}<br><br>
        <strong>Task:</strong> ${task}<br><br>
        ${message}<br><br>
        ${fallback}
      `;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate';
    }
  });
}

const demoButtons = document.querySelectorAll('[data-demo-button]');
demoButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const label = button.textContent.trim();
    const original = button.dataset.originalText || label;
    button.dataset.originalText = original;
    button.textContent = 'Demo mode';
    setTimeout(() => {
      button.textContent = original;
    }, 1000);
  });
});

const heroBadge = document.querySelector('.small-label');
if (heroBadge) {
  heroBadge.addEventListener('click', () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  });
}
