/* =========================================================
   Keysglade — Reise-Quiz
   Fragen werden aus der bestehenden Datenbasis erzeugt,
   keine externe Quelle.
========================================================= */

let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const QUIZ_CATEGORY_PHRASING = {
  beaches: { name: "Um welches Ziel geht es hier?", region: (n) => `In welcher Region liegt "${n}"?` },
  cities: { name: "Um welches Ziel geht es hier?", region: (n) => `In welcher Region liegt "${n}"?` },
  parks: { name: "Um welches Ziel geht es hier?", region: (n) => `In welcher Region liegt "${n}"?` },
  history: { name: "Um welches historische Ziel geht es hier?", region: (n) => `In welcher Region liegt "${n}"?` },
  art: { name: "Um welches Ziel geht es hier?", region: (n) => `In welcher Region liegt "${n}"?` },
  food: { name: "Um welche kulinarische Spezialität geht es hier?", region: (n) => `In welcher Region ist "${n}" besonders verbreitet?` },
  wildlife: { name: "Um welche Tierart geht es hier?", region: (n) => `In welcher Region lässt sich "${n}" besonders gut beobachten?` },
  adventure: { name: "Um welche Aktivität geht es hier?", region: (n) => `In welcher Region wird "${n}" besonders häufig angeboten?` },
};

function buildQuizQuestions(count = 8) {
  const pool = ENTRIES.filter((e) => e.cat !== "planning");
  const picked = shuffleArray(pool).slice(0, count);

  return picked.map((entry) => {
    const phrasing = QUIZ_CATEGORY_PHRASING[entry.cat] || QUIZ_CATEGORY_PHRASING.beaches;
    const useRegionQuestion = entry.region !== "Allgemein" && Math.random() < 0.5;

    if (useRegionQuestion) {
      const wrongRegions = shuffleArray(REGIONS.filter((r) => r !== entry.region && r !== "Allgemein")).slice(0, 3);
      const options = shuffleArray([entry.region, ...wrongRegions]);
      return {
        question: phrasing.region(entry.name),
        icon: entry.icon,
        options,
        correct: entry.region,
      };
    }

    const sameCat = pool.filter((e) => e.cat === entry.cat && e.id !== entry.id);
    const wrongNames = shuffleArray(sameCat).slice(0, 3).map((e) => e.name);
    const options = shuffleArray([entry.name, ...wrongNames]);
    return {
      question: entry.desc,
      icon: entry.icon,
      options,
      correct: entry.name,
      isNameQuestion: true,
      namePrompt: phrasing.name,
    };
  });
}

function renderQuizQuestion() {
  const container = document.getElementById("quiz-container");
  if (quizIndex >= quizQuestions.length) {
    container.innerHTML = `
      <div class="quiz-result">
        <p class="quiz-result-score">${quizScore} von ${quizQuestions.length} richtig</p>
        <button id="quiz-restart-btn" class="btn-primary">Nochmal spielen</button>
      </div>
    `;
    document.getElementById("quiz-restart-btn").addEventListener("click", startQuiz);
    return;
  }

  const q = quizQuestions[quizIndex];
  container.innerHTML = `
    <div class="quiz-progress">Frage ${quizIndex + 1} von ${quizQuestions.length} · ${quizScore} richtig</div>
    <div class="quiz-icon">${q.icon}</div>
    <p class="quiz-question">${q.isNameQuestion ? q.namePrompt : q.question}</p>
    ${q.isNameQuestion ? `<p class="quiz-question-desc">${q.question}</p>` : ""}
    <div class="quiz-options">
      ${q.options.map((opt) => `<button class="quiz-option-btn" data-value="${escapeHtml(opt)}">${opt}</button>`).join("")}
    </div>
  `;

  container.querySelectorAll(".quiz-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleQuizAnswer(btn, q));
  });
}

function handleQuizAnswer(btn, q) {
  const container = document.getElementById("quiz-container");
  const isCorrect = btn.dataset.value === q.correct;
  if (isCorrect) quizScore++;

  container.querySelectorAll(".quiz-option-btn").forEach((b) => {
    b.disabled = true;
    if (b.dataset.value === q.correct) b.classList.add("correct");
    else if (b === btn) b.classList.add("incorrect");
  });

  setTimeout(() => {
    quizIndex++;
    renderQuizQuestion();
  }, 1100);
}

function startQuiz() {
  quizQuestions = buildQuizQuestions();
  quizIndex = 0;
  quizScore = 0;
  renderQuizQuestion();
}

function setupQuiz() {
  if (!document.getElementById("quiz-container")) return;
  startQuiz();
}
