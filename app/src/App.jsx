import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

function App() {
  const [student, setStudent] = useState(null);
  const [page, setPage] = useState("overview");
  const [questionCount, setQuestionCount] = useState(10);
  const [mode, setMode] = useState("Tutor");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [sessionAnswers, setSessionAnswers] = useState([]);
  const [completedPracticeSessions, setCompletedPracticeSessions] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [customDomain, setCustomDomain] = useState("CARDIO");
  const [practiceSource, setPracticeSource] = useState("recommended");
  const [showQuizEvidence, setShowQuizEvidence] = useState(false);
  const [selectedSelfAssessment, setSelectedSelfAssessment] = useState(null);


  const recommendedQuiz = {
    title: "INSIGHTS Recommended Quiz",
    domain: "Cardiovascular System",
    questionCount: 10,
    mode: "Tutor",
    focusTopics: [
      "Valvular heart disease",
      "Arrhythmias",
      "Heart failure",
    ],
    reason:
      "Recommended from patterns across your recent assessment performance.",
  };

  const selfAssessmentCatalog = [
    {
      id: "ccssa",
      name: "Comprehensive Clinical Science Self-Assessment",
      shortName: "CCSSA",
      description:
        "Assess your readiness for Step 2 CK and review your performance across clinical science content areas.",
      context: "Step 2 CK preparation",
    },
    {
      id: "cbssa",
      name: "Comprehensive Basic Science Self-Assessment",
      shortName: "CBSSA",
      description:
        "Assess your readiness for Step 1 and review your performance across foundational science content areas.",
      context: "Step 1 preparation",
    },
    {
      id: "medicine-csms",
      name: "Medicine Clinical Science Mastery Series",
      shortName: "Medicine CMS",
      description:
        "Evaluate your knowledge of medicine content and prepare for a clinical science subject examination.",
      context: "Medicine clerkship",
    },
  ];

  const customPracticeDomains = student
    ? student.currentDomainPerformance.map((domain) => ({
        code: domain.domainCode,
        name: domain.domainName,
      }))
    : [];

    const selectedCustomDomain = customPracticeDomains.find(
      (domain) => domain.code === customDomain
    );

  useEffect(() => {
    fetch("/data/demo_student.json")
      .then((res) => res.json())
      .then((data) => setStudent(data))
      .catch((err) => console.error("Failed to load student data:", err));
  }, []);

  if (!student) {
    return <div className="loading">Loading INSIGHTS...</div>;
  }

  const { profile, home, readiness, practiceHistory } = student;
  const step2 = readiness?.[0];

  const allPracticeHistory = [
    ...practiceHistory,
    ...completedPracticeSessions,
  ];
  
  const cardioPractice = allPracticeHistory
  .filter((p) => p.domainCode === "CARDIO")
  .sort(
    (a, b) =>
      new Date(a.practiceDate) - new Date(b.practiceDate)
  );

  const practiceQuestions = [
    {
      id: "CARDIO-001",
      domain: "Cardiovascular System",
      topic: "Valvular heart disease",
      stem:
        "A 72-year-old man comes to the physician because of progressive shortness of breath with exertion and two episodes of lightheadedness while walking uphill. Cardiac examination shows a harsh systolic ejection murmur that is loudest at the right upper sternal border and radiates to the carotid arteries. Which of the following best explains this patient's symptoms?",
      choices: [
        {
          id: "A",
          text: "Decreased left ventricular afterload"
        },
        {
          id: "B",
          text: "Fixed obstruction to left ventricular outflow"
        },
        {
          id: "C",
          text: "Increased left ventricular compliance"
        },
        {
          id: "D",
          text: "Left-to-right shunting across the ventricular septum"
        },
        {
          id: "E",
          text: "Reduced systemic vascular resistance"
        }
      ],
      correctAnswer: "B",
      explanation:
        "The findings are consistent with aortic stenosis. A narrowed aortic valve creates a fixed obstruction to left ventricular outflow. During exertion, cardiac output cannot increase adequately, which can contribute to exertional dyspnea, lightheadedness, or syncope.",
      learningObjective:
        "Recognize the clinical findings of aortic stenosis and relate fixed left ventricular outflow obstruction to exertional symptoms."
    }
  ];
  
  const question =
  generatedQuestions.length > 0
    ? generatedQuestions[currentQuestion]
    : practiceQuestions[0];

    const correctCount = sessionAnswers.filter(
      (answer) => answer.correct
    ).length;
    
    const sessionPercent =
      sessionAnswers.length > 0
        ? Math.round(
            (correctCount / sessionAnswers.length) * 100
          )
        : 0;
    
    const topicResults = sessionAnswers.reduce((acc, answer) => {
      if (!acc[answer.topic]) {
        acc[answer.topic] = {
          correct: 0,
          total: 0,
        };
      }
    
      acc[answer.topic].total += 1;
    
      if (answer.correct) {
        acc[answer.topic].correct += 1;
      }
    
      return acc;
    }, {});

    async function generatePracticeSession(source = "recommended") {
    try {
      setIsGenerating(true);
      setGenerationError(null);
  
      const isRecommended = source === "recommended";
      setPracticeSource(source);

const domainName = isRecommended
  ? recommendedQuiz.domain
  : selectedCustomDomain?.name;

const focusTopics = isRecommended
  ? recommendedQuiz.focusTopics
  : [];

  const reason = isRecommended
  ? recommendedQuiz.reason
  : "Student-created formative practice session";

  const response = await fetch(
    `${API_BASE_URL}/api/generate-practice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: domainName,
        questionCount,
        mode,
        learnerLevel: `${profile.medicalSchoolYear} clinical medical student`,
        reason,
        focusTopics,
      }),
    }
  );
  
      if (!response.ok) {
        throw new Error("Practice generation failed.");
      }
  
      const data = await response.json();
  
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No practice questions were returned.");
      }
  
      setGeneratedQuestions(data.questions);
  
      setCurrentQuestion(0);
setSelectedAnswer(null);
setSubmitted(false);
setSessionAnswers([]);

setPage("quiz");
    } catch (error) {
      console.error(error);
      setGenerationError(
        "We couldn't create your practice session. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }
  
  

  if (page === "recommended-quiz") {
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>
  
          <div className="student-name">{profile.displayName}</div>
        </header>
  
        <main className="practice-page">
          <button
            className="back-link"
            onClick={() => setPage("overview")}
          >
            ← Back to INSIGHTS
          </button>
  
          <div className="practice-header">
            <p className="eyebrow">Recommended for you</p>
            <h1>{recommendedQuiz.title}</h1>
            <p className="subtext">
              A targeted practice session recommended from your INSIGHTS
              assessment history.
            </p>
          </div>
  
          <section className="practice-config-card">
            <div className="config-section">
              <p className="card-label">Quiz focus</p>
  
              <h2>{recommendedQuiz.domain}</h2>
  
              <p className="subtext">
                {recommendedQuiz.reason}
              </p>
            </div>
  
            <div className="config-divider" />
  
            <div className="config-section">
              <p className="card-label">Recommended session</p>
  
              <div className="recommended-quiz-summary">
                <div>
                  <strong>{recommendedQuiz.questionCount} questions</strong>
                  <p>{recommendedQuiz.mode} mode</p>
                </div>
              </div>
            </div>
  
            <div className="config-divider" />
  
            <div className="config-section">
            <p className="card-label">Quiz will emphasize</p>
  
              <div className="focus-topic-list">
                {recommendedQuiz.focusTopics.map((topic) => (
                  <span className="focus-topic-chip" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
  
            <div className="config-divider" />
  
            <div className="recommended-quiz-footer">
  <div className="why-quiz-block">
    <p className="card-label">Why this quiz?</p>

    <strong>
      Based on patterns across your recent assessment evidence.
    </strong>

    <button
      className="why-quiz-toggle"
      onClick={() => setShowQuizEvidence((prev) => !prev)}
    >
      {showQuizEvidence ? "Hide evidence" : "View supporting evidence"}
    </button>
  </div>

  <button
    className="primary-button large-button"
    onClick={() => generatePracticeSession("recommended")}
    disabled={isGenerating}
  >
    {isGenerating
      ? "Creating your recommended quiz..."
      : "Start recommended quiz"}
  </button>
</div>

{showQuizEvidence && (
  <div className="quiz-evidence-panel">
    <div className="quiz-evidence-header">
      <div>
        <p className="card-label">Supporting assessment evidence</p>
        <h3>Why Cardiovascular System?</h3>
      </div>

      <span className="evidence-type-badge">
        Assessment evidence
      </span>
    </div>

    <p className="quiz-evidence-intro">
      Cardiovascular performance has appeared relatively lower across
      multiple recent assessments. The recommended quiz is based on this
      assessment pattern, not on your practice results.
    </p>

    <div className="quiz-evidence-list">
      {student.assessments
        .map((assessment) => {
          const cardio = assessment.contentAreas?.find(
            (area) => area.domainCode === "CARDIO"
          );

          if (!cardio) return null;

          return {
            assessmentId: assessment.assessmentId,
            assessmentName: assessment.assessmentName,
            testDate: assessment.testDate,
            score: cardio.score,
            band: cardio.performanceBand,
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.testDate) - new Date(a.testDate))
        .slice(0, 4)
        .map((item) => (
          <button
            key={item.assessmentId}
            className="quiz-evidence-row"
            onClick={() => {
              const fullAssessment = student.assessments.find(
                (assessment) =>
                  assessment.assessmentId === item.assessmentId
              );

              setSelectedAssessment(fullAssessment);
              setPage("assessment-detail");
              window.scrollTo({ top: 0 });
            }}
          >
            <div>
              <strong>{item.assessmentName}</strong>
              <span>{item.testDate}</span>
            </div>

            <div className="quiz-evidence-result">
              <span>{item.score}</span>

              <span
                className={`band band-${item.band.toLowerCase()}`}
              >
                {item.band}
              </span>
            </div>
          </button>
        ))}
    </div>

    <button
      className="why-quiz-link"
      onClick={() => {
        const cardioDomain = student.currentDomainPerformance.find(
          (domain) => domain.domainCode === "CARDIO"
        );

        setSelectedDomain(cardioDomain);
        setPage("performance-detail");
        window.scrollTo({ top: 0 });
      }}
    >
      View full cardiovascular performance history
    </button>
  </div>
)}
  
            {generationError && (
              <p className="generation-error">
                {generationError}
              </p>
            )}
          </section>
        </main>
      </div>
    );
  }

  
  if (page === "configure-practice") {
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>

          <div className="student-name">{profile.displayName}</div>
        </header>

        <main className="practice-page">
          <button
            className="back-link"
            onClick={() => setPage("overview")}
          >
            ← Back to INSIGHTS
          </button>

          <div className="practice-header">
          <p className="eyebrow">Create your own practice</p>
<h1>Build a practice session</h1>
<p className="subtext">
  Choose what you want to study and how you want to practice.
</p>
          </div>

          <section className="practice-config-card">
          <div className="config-section">
  <p className="card-label">Content area</p>

  <select
    className="domain-select"
    value={customDomain}
    onChange={(e) => setCustomDomain(e.target.value)}
  >
    {customPracticeDomains.map((domain) => (
      <option key={domain.code} value={domain.code}>
        {domain.name}
      </option>
    ))}
  </select>
</div>

<div className="config-divider" />

            <div className="config-section">
              <p className="card-label">Number of questions</p>

              <div className="choice-row">
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    className={`choice-button ${
                      questionCount === count ? "selected" : ""
                    }`}
                    onClick={() => setQuestionCount(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="config-divider" />

            <div className="config-section">
              <p className="card-label">Practice mode</p>

              <div className="mode-grid">
                <button
                  className={`mode-card ${
                    mode === "Tutor" ? "selected" : ""
                  }`}
                  onClick={() => setMode("Tutor")}
                >
                  <div className="mode-title">Tutor mode</div>
                  <p>
                    Review the explanation after each question before moving
                    on.
                  </p>
                </button>

                <button
                  className={`mode-card ${
                    mode === "Timed" ? "selected" : ""
                  }`}
                  onClick={() => setMode("Timed")}
                >
                  <div className="mode-title">Timed</div>
                  <p>
                    Complete the practice session before reviewing explanations.
                  </p>
                </button>
              </div>
            </div>

            <div className="config-divider" />

            <div className="practice-summary">
              <div>
                <p className="card-label">Your session</p>
                <strong>
                {questionCount} {selectedCustomDomain?.name} questions · {mode}
                </strong>
              </div>

              <button
  className="primary-button large-button"
  onClick={() => generatePracticeSession("custom")}
  disabled={isGenerating}
>
  {isGenerating ? "Creating your practice..." : "Start practice"}
</button>
{generationError && (
  <p className="generation-error">
    {generationError}
  </p>
)}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (page === "results") {
    const resultsDomainName =
  practiceSource === "recommended"
    ? recommendedQuiz.domain
    : selectedCustomDomain?.name || "Practice";
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>
  
          <div className="student-name">{profile.displayName}</div>
        </header>
  
        <main className="practice-page">
          <div className="practice-header">
            <p className="eyebrow">Practice complete</p>
            <h1>{resultsDomainName}</h1>
            <p className="subtext">
              Here's how you performed in this targeted practice session.
            </p>
          </div>
  
          <section className="results-score-card">
            <div>
              <p className="card-label">Session score</p>
  
              <div className="results-score">
                {correctCount} / {sessionAnswers.length}
              </div>
  
              <div className="results-percent">
                {sessionPercent}% correct
              </div>
            </div>
  
            <div className="results-context">
              <p className="card-label">Session</p>
              <strong>{resultsDomainName}</strong>
              <p>
                {sessionAnswers.length} questions · {mode} mode
              </p>
            </div>
          </section>
  
          <section className="results-detail-card">
            <p className="card-label">Performance by topic</p>
            <h2>What you practiced</h2>
  
            <div className="topic-results">
              {Object.entries(topicResults).map(
                ([topic, result]) => (
                  <div className="topic-result-row" key={topic}>
                    <div>{topic}</div>
  
                    <strong>
                      {result.correct} / {result.total}
                    </strong>
                  </div>
                )
              )}
            </div>
          </section>
  
          <section className="next-step-card">
            <p className="card-label">Suggested next step</p>
  
            <h2>
  Continue practicing {resultsDomainName}
</h2>
  
<p>
  This session provides additional learning context about the
  topics you are working on. Continue practicing and use future
  assessment results to monitor your performance over time.
</p>
  
            <div className="results-actions">
            <button
  className="primary-button"
  onClick={() => {
    const completedSession = {
      practiceId: `LIVE-${Date.now()}`,
      practiceDate: new Date().toISOString().slice(0, 10),
    
      domainCode:
        practiceSource === "recommended"
          ? "CARDIO"
          : customDomain,
    
      domainName:
        practiceSource === "recommended"
          ? recommendedQuiz.domain
          : selectedCustomDomain?.name,
    
      questionCount: sessionAnswers.length,
      correctCount: correctCount,
      percentCorrect: sessionPercent,
      mode: mode,
    
      source:
        practiceSource === "recommended"
          ? "Recommended"
          : "Self-directed",
    };

    setCompletedPracticeSessions((prev) => [
      ...prev,
      completedSession,
    ]);

    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
>
  Return to INSIGHTS
</button>
  
              <button
                className="secondary-button"
                onClick={() => {
                  setPage("configure-practice");
                  setGeneratedQuestions([]);
                  setSessionAnswers([]);
                  setCurrentQuestion(0);
                  setSelectedAnswer(null);
                  setSubmitted(false);
                  window.scrollTo({ top: 0 });
                }}
              >
                Practice again
              </button>
            </div>
          </section>
  
          <p className="results-disclaimer">
            Practice questions in this prototype are AI-generated
            synthetic educational content and are not NBME examination
            items.
          </p>
        </main>
      </div>
    );
  }

  
  if (page === "quiz") {
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>

          <div className="student-name">{profile.displayName}</div>
        </header>

        <main className="practice-page">
          <button
            className="back-link"
            onClick={() =>
              setPage(
                practiceSource === "recommended"
                  ? "recommended-quiz"
                  : "configure-practice"
              )
            }
          >
            ← Back to setup
          </button>

          <div className="practice-header">
          <p className="eyebrow">
  {question?.domain || recommendedQuiz.domain}
</p>
            <h1>Practice session</h1>
            <p className="subtext">
              {questionCount} questions · {mode} mode
            </p>
          </div>

          <section className="question-card">
  <div className="question-progress">
    <div>
      <span className="question-number">
        Question {currentQuestion + 1}
      </span>
      <span className="question-total">
        {" "}of {questionCount}
      </span>
    </div>

    <div className="question-topic">
      {question.topic}
    </div>
  </div>

  <div className="progress-track">
    <div
      className="progress-fill"
      style={{
        width: `${((currentQuestion + 1) / questionCount) * 100}%`
      }}
    />
  </div>

  <div className="question-body">
    <p className="question-stem">
      {question.stem}
    </p>

    <div className="answer-list">
      {question.choices.map((choice) => {
        const isSelected = selectedAnswer === choice.id;

        const isCorrect =
          submitted &&
          mode === "Tutor" &&
          choice.id === question.correctAnswer;
        
        const isIncorrect =
          submitted &&
          mode === "Tutor" &&
          isSelected &&
          choice.id !== question.correctAnswer;

        return (
          <button
            key={choice.id}
            className={`answer-choice
              ${isSelected ? "answer-selected" : ""}
              ${isCorrect ? "answer-correct" : ""}
              ${isIncorrect ? "answer-incorrect" : ""}
            `}
            onClick={() => {
              if (!submitted) {
                setSelectedAnswer(choice.id);
              }
            }}
          >
            <span className="answer-letter">
              {choice.id}
            </span>

            <span className="answer-text">
              {choice.text}
            </span>
          </button>
        );
      })}
    </div>

    {!submitted && (
      <div className="question-actions">
        <button
  className="primary-button large-button"
  disabled={!selectedAnswer}
  onClick={() => {
    setSubmitted(true);

    setSessionAnswers((prev) => [
      ...prev,
      {
        questionId: question.id,
        topic: question.topic,
        selectedAnswer: selectedAnswer,
        correctAnswer: question.correctAnswer,
        correct: selectedAnswer === question.correctAnswer,
      },
    ]);
  }}
>
  Submit answer
</button>
      </div>
    )}

    {submitted && mode === "Tutor" && (
      <div
        className={`explanation-panel ${
          selectedAnswer === question.correctAnswer
            ? "explanation-correct"
            : "explanation-incorrect"
        }`}
      >
        <p className="feedback-label">
          {selectedAnswer === question.correctAnswer
            ? "Correct"
            : "Incorrect"}
        </p>

        <h3>Explanation</h3>

        <p>{question.explanation}</p>

        <div className="learning-objective">
          <p className="card-label">
            Learning objective
          </p>
          <p>{question.learningObjective}</p>
        </div>

        <button
  className="primary-button"
  onClick={() => {
    if (currentQuestion < generatedQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPage("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }}
>
  {currentQuestion < generatedQuestions.length - 1
    ? "Next question"
    : "View results"}
</button>
      </div>
    )}

{submitted && mode === "Timed" && (
  <div className="timed-answer-recorded">
    <strong>Answer recorded.</strong>

    <p>
      Explanations will be available after you complete the session.
    </p>

    <button
      className="primary-button"
      onClick={() => {
        if (currentQuestion < generatedQuestions.length - 1) {
          setCurrentQuestion((prev) => prev + 1);
          setSelectedAnswer(null);
          setSubmitted(false);
          window.scrollTo({ top: 0 });
        } else {
          setPage("results");
          window.scrollTo({ top: 0 });
        }
      }}
    >
      {currentQuestion < generatedQuestions.length - 1
        ? "Next question"
        : "View results"}
    </button>
  </div>
)}
  </div>
</section>
        </main>
      </div>
    );
  }

  if (page === "performance") {
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>
  
          <div className="student-name">{profile.displayName}</div>
        </header>
  
        <nav className="nav">
          <button className="nav-item" onClick={() => setPage("overview")}>
            Overview
          </button>
  
          <button className="nav-item active">
            Performance
          </button>
  
          <button className="nav-item" onClick={() => setPage("assessments")}>
            Assessments
          </button>
  
          <button className="nav-item" onClick={() => setPage("practice")}>
            Learning & Practice
          </button>
        </nav>
  
        <main className="main-content">
          <section className="page-heading">
            <p className="eyebrow">Your performance</p>
            <h1>Content area performance</h1>
            <p className="subtext">
              Explore patterns across your recent NBME assessments.
            </p>
          </section>
  
          <section className="performance-overview-card">
            <div>
              <p className="card-label">Current focus area</p>
              <h2>Cardiovascular System</h2>
              <p>
                Cardiovascular performance is relatively lower across your
                recent assessment history.
              </p>
            </div>
  
            <button
  className="primary-button"
  onClick={() => {
    const cardioDomain = student.currentDomainPerformance.find(
      (domain) => domain.domainCode === "CARDIO"
    );

    setSelectedDomain(cardioDomain);
    setPage("performance-detail");
    window.scrollTo({ top: 0 });
  }}
>
  View performance history
</button>
          </section>
  
          <section className="results-detail-card">
            <p className="card-label">Content map</p>
            <h2>Your current performance</h2>
  
            <div className="performance-list embedded-list">
              {student.currentDomainPerformance.map((domain) => (
                <div
                className="performance-row performance-clickable"
                key={domain.domainCode}
                onClick={() => {
                  setSelectedDomain(domain);
                  setPage("performance-detail");
                  window.scrollTo({ top: 0 });
                }}
              >
                  <div>
  <div className="domain-name">
    {domain.domainName}
  </div>

  <div className="domain-meta">
    Based on 7 assessments
  </div>
</div>

<div className="performance-row-right">
  <span
    className={`band band-${domain.currentBand.toLowerCase()}`}
  >
    {domain.currentBand}
  </span>
</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (page === "performance-detail" && selectedDomain) {
    const domainCode = selectedDomain.domainCode;
  
    const domainAssessmentHistory = student.assessments
      .map((assessment) => {
        const area = assessment.contentAreas?.find(
          (contentArea) => contentArea.domainCode === domainCode
        );
  
        if (!area) return null;
  
        return {
          assessmentId: assessment.assessmentId,
          assessmentName: assessment.assessmentName,
          testDate: assessment.testDate,
          phase: assessment.phase,
          score: area.score,
          band: area.performanceBand,
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) => new Date(a.testDate) - new Date(b.testDate)
      );
  
    const domainPracticeHistory = allPracticeHistory
      .filter((session) => session.domainCode === domainCode)
      .sort(
        (a, b) =>
          new Date(a.practiceDate) - new Date(b.practiceDate)
      );
  
    const chartWidth = 760;
    const chartHeight = 240;
    const chartPaddingX = 48;
    const chartPaddingY = 30;
  
    const minChartScore = 50;
    const maxChartScore = 90;
  
    const assessmentPoints = domainAssessmentHistory.map(
      (item, index) => {
        const usableWidth = chartWidth - chartPaddingX * 2;
        const usableHeight = chartHeight - chartPaddingY * 2;
  
        const x =
          domainAssessmentHistory.length === 1
            ? chartWidth / 2
            : chartPaddingX +
              (index / (domainAssessmentHistory.length - 1)) *
                usableWidth;
  
        const clampedScore = Math.min(
          maxChartScore,
          Math.max(minChartScore, item.score)
        );
  
        const y =
          chartPaddingY +
          ((maxChartScore - clampedScore) /
            (maxChartScore - minChartScore)) *
            usableHeight;
  
        return {
          ...item,
          x,
          y,
        };
      }
    );
  
    const polylinePoints = assessmentPoints
      .map((point) => `${point.x},${point.y}`)
      .join(" ");
  
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
          <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>
  
            <div className="brand-divider" />
  
            <div className="insights-wordmark">
              INSIGHTS<sup>®</sup>
            </div>
          </div>
  
          <div className="student-name">{profile.displayName}</div>
        </header>
  
        <nav className="nav">
          <button
            className="nav-item"
            onClick={() => setPage("overview")}
          >
            Overview
          </button>
  
          <button
            className="nav-item active"
            onClick={() => setPage("performance")}
          >
            Performance
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("assessments")}
          >
            Assessments
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("practice")}
          >
            Learning & Practice
          </button>
        </nav>
  
        <main className="main-content">
          <button
            className="back-link"
            onClick={() => setPage("performance")}
          >
            ← Back to My Performance
          </button>
  
          <section className="page-heading">
            <p className="eyebrow">Longitudinal performance</p>
  
            <h1>{selectedDomain.domainName}</h1>
  
            <p className="subtext">
              Review how this content area has appeared across your
              assessment history.
            </p>
          </section>
  
          <section className="longitudinal-summary-card">
          <div>
  <p className="card-label">Current INSIGHTS pattern</p>

  <span
    className={`band band-${selectedDomain.currentBand.toLowerCase()}`}
  >
    {selectedDomain.currentBand}
  </span>

  <p className="pattern-evidence-count">
    Based on {domainAssessmentHistory.length} formal assessment results
  </p>
</div>
  
            <div className="longitudinal-summary-copy">
              <strong>
                Based on patterns across formal assessment results.
              </strong>
  
              <p>
                Practice activity is shown separately below and does not
                replace or redefine your assessment performance.
              </p>
            </div>
          </section>
  
          <section className="results-detail-card">
            <p className="card-label">Assessment evidence</p>
  
            <h2>Performance across assessments</h2>
  
            <p className="assessment-context-copy">
              Each point represents this content area's performance on
              an individual NBME assessment.
            </p>
  
            <div className="longitudinal-chart-wrap">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="longitudinal-chart"
                role="img"
                aria-label={`${selectedDomain.domainName} assessment performance over time`}
              >
                {[50, 60, 70, 80, 90].map((value) => {
                  const usableHeight =
                    chartHeight - chartPaddingY * 2;
  
                  const y =
                    chartPaddingY +
                    ((maxChartScore - value) /
                      (maxChartScore - minChartScore)) *
                      usableHeight;
  
                  return (
                    <g key={value}>
                      <line
                        x1={chartPaddingX}
                        x2={chartWidth - chartPaddingX}
                        y1={y}
                        y2={y}
                        className="chart-grid-line"
                      />
  
                      <text
                        x={10}
                        y={y + 4}
                        className="chart-axis-label"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}
  
                {assessmentPoints.length > 1 && (
                  <polyline
                    points={polylinePoints}
                    className="assessment-trend-line"
                  />
                )}
  
                {assessmentPoints.map((point) => (
                  <g key={point.assessmentId}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="6"
                      className="assessment-trend-point"
                    />
  
                    <text
                      x={point.x}
                      y={point.y - 13}
                      textAnchor="middle"
                      className="chart-score-label"
                    >
                      {point.score}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
  
            <div className="assessment-timeline">
              {domainAssessmentHistory.map((item) => (
                <button
                  className="timeline-assessment"
                  key={item.assessmentId}
                  onClick={() => {
                    const fullAssessment = student.assessments.find(
                      (assessment) =>
                        assessment.assessmentId === item.assessmentId
                    );
  
                    setSelectedAssessment(fullAssessment);
                    setPage("assessment-detail");
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <span className="timeline-date">
                    {item.testDate}
                  </span>
  
                  <strong>{item.score}</strong>
  
                  <span className="timeline-assessment-name">
                    {item.assessmentName}
                  </span>
                </button>
              ))}
            </div>
          </section>
  
          <section className="results-detail-card compact-practice-bridge">
  <div>
    <p className="card-label">Learning & Practice</p>

    <h2>
      {domainPracticeHistory.length > 0
        ? `You've completed ${domainPracticeHistory.length} ${
            domainPracticeHistory.length === 1 ? "session" : "sessions"
          } in this area`
        : "No practice sessions in this area yet"}
    </h2>

    <p className="assessment-context-copy">
      Practice activity is available separately from your formal assessment
      performance.
    </p>
  </div>

  <button
    className="text-action"
    onClick={() => {
      setPage("practice");
      window.scrollTo({ top: 0 });
    }}
  >
    View practice history
  </button>
</section>
  
          {domainCode === "CARDIO" && (
            <section className="assessment-next-step-card">
            <div className="assessment-next-step-copy">
              <div className="new-capability-label">
                New in INSIGHTS · Learning & Practice
              </div>
          
              <p className="card-label">
                Recommended next step
              </p>
          
              <h2>Continue working on Cardiovascular System</h2>
  
                <p>
                  Cardiovascular has appeared relatively lower across
                  your recent assessment history. INSIGHTS has created
                  a recommended quiz based on this evidence.
                </p>
              </div>
  
              <div className="assessment-quiz-preview">
                <p className="card-label">Recommended by INSIGHTS</p>
  
                <strong>INSIGHTS Recommended Quiz</strong>
  
                <p>
                  {recommendedQuiz.questionCount} questions ·{" "}
                  {recommendedQuiz.mode} mode
                </p>
  
                <div className="focus-topic-list">
                  {recommendedQuiz.focusTopics.map((topic) => (
                    <span className="focus-topic-chip" key={topic}>
                      {topic}
                    </span>
                  ))}
                </div>
  
                <button
                  className="primary-button"
                  onClick={() => {
                    setQuestionCount(recommendedQuiz.questionCount);
                    setMode(recommendedQuiz.mode);
                    setPage("recommended-quiz");
                    window.scrollTo({ top: 0 });
                  }}
                >
                  View recommended quiz
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }


  if (page === "assessments") {
    const assessmentsNewestFirst = [...student.assessments].sort(
      (a, b) => new Date(b.testDate) - new Date(a.testDate)
    );
  
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>
  
          <div className="student-name">{profile.displayName}</div>
        </header>
  
        <nav className="nav">
          <button className="nav-item" onClick={() => setPage("overview")}>
            Overview
          </button>
  
          <button className="nav-item" onClick={() => setPage("performance")}>
            Performance
          </button>
  
          <button className="nav-item active">
            Assessments
          </button>
  
          <button className="nav-item" onClick={() => setPage("practice")}>
            Learning & Practice
          </button>
        </nav>
  
        <main className="main-content">
          <section className="page-heading">
            <p className="eyebrow">Assessment history</p>
            <h1>Your NBME assessments</h1>
            <p className="subtext">
              Review your assessment results across time.
            </p>
          </section>
  
          <section className="assessment-history-card">
            {assessmentsNewestFirst.map((assessment) => (
              <div
              className="assessment-history-row assessment-clickable"
              key={assessment.assessmentId}
              onClick={() => {
                setSelectedAssessment(assessment);
                setPage("assessment-detail");
                window.scrollTo({ top: 0 });
              }}
            >
                <div>
                  <div className="assessment-history-name">
                    {assessment.assessmentName}
                  </div>
  
                  <div className="domain-meta">
                    {assessment.testDate} · {assessment.phase}
                  </div>
                </div>
  
                <div className="assessment-history-score">
                  <strong>{assessment.totalScore}</strong>
                  <span>{assessment.totalScoreType}</span>
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    );
  }

  if (page === "assessment-detail" && selectedAssessment) {
    const assessmentCardio = selectedAssessment.contentAreas?.find(
      (area) => area.domainCode === "CARDIO"
    );
  
    const assessmentAreas = [...(selectedAssessment.contentAreas || [])].sort(
      (a, b) => a.score - b.score
    );
  
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>
  
          <div className="student-name">{profile.displayName}</div>
        </header>
  
        <nav className="nav">
          <button
            className="nav-item"
            onClick={() => setPage("overview")}
          >
            Overview
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("performance")}
          >
            Performance
          </button>
  
          <button
            className="nav-item active"
            onClick={() => setPage("assessments")}
          >
            Assessments
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("practice")}
          >
            Learning & Practice
          </button>
        </nav>
  
        <main className="main-content">
          <button
            className="back-link"
            onClick={() => setPage("assessments")}
          >
            ← Back to assessments
          </button>
  
          <section className="assessment-detail-heading">
            <div>
              <p className="eyebrow">Assessment result</p>
  
              <h1>{selectedAssessment.assessmentName}</h1>
  
              <p className="subtext">
                {selectedAssessment.testDate} · {selectedAssessment.phase}
              </p>
            </div>
  
            <div className="assessment-detail-score">
              <span className="card-label">Score</span>
  
              <strong>{selectedAssessment.totalScore}</strong>
  
              <span>{selectedAssessment.totalScoreType}</span>
            </div>
          </section>
  
          {selectedAssessment.readiness && (
            <section className="assessment-readiness-card">
              <div>
                <p className="card-label">
                  {selectedAssessment.readiness.target === "STEP2"
                    ? "Step 2 readiness"
                    : "Step 1 readiness"}
                </p>
  
                <div className="assessment-readiness-value">
                  {selectedAssessment.readiness.probability}%
                </div>
              </div>
  
              <div className="assessment-readiness-copy">
                <strong>
                  This readiness estimate is associated with this
                  self-assessment result.
                </strong>
  
                <p>
                  Review your content-area performance below for additional
                  context.
                </p>
              </div>
            </section>
          )}
  
          <section className="results-detail-card">
            <p className="card-label">Content-area performance</p>
            <h2>Your performance by content area</h2>
  
            <p className="assessment-context-copy">
              These results describe your relative performance across content
              areas on this assessment.
            </p>
  
            <div className="performance-list embedded-list">
              {assessmentAreas.map((area) => (
                <div
                  className="performance-row"
                  key={area.domainCode}
                >
                  <div>
                    <div className="domain-name">
                      {area.domainName}
                    </div>
                  </div>
  
                  <div className="performance-row-right">
                    <span className="domain-signal">
                      {area.score}
                    </span>
  
                    <span
                      className={`band band-${area.performanceBand.toLowerCase()}`}
                    >
                      {area.performanceBand}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
  
          {assessmentCardio && assessmentCardio.performanceBand === "Lower" && (
            <section className="assessment-next-step-card">
              <div className="assessment-next-step-copy">
  <div className="new-capability-label">
    New in INSIGHTS · Learning & Practice
  </div>

  <p className="card-label">
    Recommended next step
  </p>

  <h2>Cardiovascular System</h2>
  
                <p>
                  Cardiovascular performance was relatively lower on this
                  assessment. INSIGHTS also identifies cardiovascular as an
                  area to focus on across your recent assessment history.
                </p>
  
                <button
                  className="why-quiz-link"
                  onClick={() => setPage("performance")}
                >
                  View broader performance evidence
                </button>
              </div>
  
              <div className="assessment-quiz-preview">
                <p className="card-label">Recommended by INSIGHTS</p>
  
                <strong>INSIGHTS Recommended Quiz</strong>
  
                <p>
                  {recommendedQuiz.questionCount} questions ·{" "}
                  {recommendedQuiz.mode} mode
                </p>
  
                <div className="focus-topic-list">
                  {recommendedQuiz.focusTopics.map((topic) => (
                    <span className="focus-topic-chip" key={topic}>
                      {topic}
                    </span>
                  ))}
                </div>
  
                <button
                  className="primary-button"
                  onClick={() => {
                    setQuestionCount(recommendedQuiz.questionCount);
                    setMode(recommendedQuiz.mode);
                    setPage("recommended-quiz");
                    window.scrollTo({ top: 0 });
                  }}
                >
                  View recommended quiz
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  if (page === "self-assessment-detail" && selectedSelfAssessment) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
          <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>
  
            <div className="brand-divider" />
  
            <div className="insights-wordmark">
              INSIGHTS<sup>®</sup>
            </div>
          </div>
  
          <div className="student-name">
            {profile.displayName}
          </div>
        </header>
  
        <nav className="nav">
          <button
            className="nav-item"
            onClick={() => setPage("overview")}
          >
            Overview
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("performance")}
          >
            Performance
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("assessments")}
          >
            Assessments
          </button>
  
          <button
            className="nav-item active"
            onClick={() => setPage("practice")}
          >
            Learning & Practice
          </button>
        </nav>
  
        <main className="main-content">
          <button
            className="text-action"
            onClick={() => {
              setPage("self-assessment-shop");
              window.scrollTo({ top: 0 });
            }}
          >
            ← Back to Self-Assessments
          </button>
  
          <section className="page-heading">
            <p className="eyebrow">
              {selectedSelfAssessment.context}
            </p>
  
            <h1>{selectedSelfAssessment.name}</h1>
  
            <p className="subtext">
              {selectedSelfAssessment.description}
            </p>
          </section>
  
          <section className="self-assessment-detail-card">
            <div className="self-assessment-detail-content">
              <div>
                <p className="card-label">
                  NBME Self-Assessment
                </p>
  
                <h2>About this assessment</h2>
  
                <p className="learning-path-description">
                  Complete an NBME Self-Assessment and review your
                  results in INSIGHTS alongside your other assessment
                  history and performance information.
                </p>
              </div>
  
              <div className="self-assessment-detail-points">
                <div>
                  <span className="preview-label">
                    Assessment
                  </span>
  
                  <strong>
                    {selectedSelfAssessment.shortName}
                  </strong>
                </div>
  
                <div>
                  <span className="preview-label">
                    Results
                  </span>
  
                  <strong>
                    Available in INSIGHTS after completion
                  </strong>
                </div>
              </div>
            </div>
  
            <div className="self-assessment-purchase-panel">
              <p className="card-label">
                Ready to continue?
              </p>
  
              <h2>Continue to purchase</h2>
  
              <p>
                Continue to the NBME purchasing experience to
                purchase this Self-Assessment.
              </p>
  
              <button
                className="primary-button"
                onClick={() => {
                  alert(
                    `Prototype: continue to purchase ${selectedSelfAssessment.shortName}`
                  );
                }}
              >
                Continue to purchase
              </button>
            </div>
          </section>
  
          <p className="results-disclaimer">
            Purchasing is represented conceptually in this prototype.
          </p>
        </main>
      </div>
    );
  }

  if (page === "self-assessment-shop") {
    
  
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
          <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>
  
            <div className="brand-divider" />
  
            <div className="insights-wordmark">
              INSIGHTS<sup>®</sup>
            </div>
          </div>
  
          <div className="student-name">
            {profile.displayName}
          </div>
        </header>
  
        <nav className="nav">
          <button
            className="nav-item"
            onClick={() => setPage("overview")}
          >
            Overview
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("performance")}
          >
            Performance
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("assessments")}
          >
            Assessments
          </button>
  
          <button
            className="nav-item active"
            onClick={() => setPage("practice")}
          >
            Learning & Practice
          </button>
        </nav>
  
        <main className="main-content">
          <button
            className="text-action"
            onClick={() => {
              setPage("practice");
              window.scrollTo({ top: 0 });
            }}
          >
            ← Back to Learning & Practice
          </button>
  
          <section className="page-heading">
            <p className="eyebrow">NBME Self-Assessments</p>
  
            <h1>Choose a Self-Assessment</h1>
  
            <p className="subtext">
            Browse available NBME Self-Assessments to support your exam preparation and assess your readiness.
            </p>
          </section>
  
          <section className="self-assessment-catalog">
          {selfAssessmentCatalog.map((assessment) => (
              <div
              className="self-assessment-product-card"
              key={assessment.id}
            >
                <div className="self-assessment-product-copy">
                  
  
                  <p className="card-label">
                    {assessment.context}
                  </p>
  
                  <h2>{assessment.name}</h2>
  
                  <p className="learning-path-description">
                    {assessment.description}
                  </p>
                </div>
  
                <div className="self-assessment-product-action">
                <button
  className="secondary-button strong-secondary"
  onClick={() => {
    setSelectedSelfAssessment(assessment);
    setPage("self-assessment-detail");
    window.scrollTo({ top: 0 });
  }}
>
  View Self-Assessment
</button>
                </div>
              </div>
            ))}
          </section>
  
          <p className="results-disclaimer">
            Self-Assessment purchasing is represented conceptually
            in this prototype.
          </p>
        </main>
      </div>
    );
  }

  if (page === "practice") {
    const practiceNewestFirst = [...allPracticeHistory].sort(
      (a, b) => new Date(b.practiceDate) - new Date(a.practiceDate)
    );
  
    return (
      <div className="app-shell">
        <header className="topbar">
        <div className="brand">
        <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

  <div className="brand-divider" />

  <div className="insights-wordmark">
    INSIGHTS<sup>®</sup>
  </div>
</div>
  
          <div className="student-name">{profile.displayName}</div>
        </header>
  
        <nav className="nav">
          <button
            className="nav-item"
            onClick={() => setPage("overview")}
          >
            Overview
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("performance")}
          >
            Performance
          </button>
  
          <button
            className="nav-item"
            onClick={() => setPage("assessments")}
          >
            Assessments
          </button>
  
          <button className="nav-item active">
            Learning & Practice
          </button>
        </nav>
  
        <main className="main-content">
          <section className="page-heading">

<div className="new-capability-label">
  New in INSIGHTS
</div>

<p className="eyebrow">Learning & Practice</p>

<h1>What would you like to do?</h1>
<p className="subtext">
  Follow an INSIGHTS recommendation, create your own practice,
  or choose an NBME Self-Assessment.
</p>
          </section>
  
          <section className="learning-path-grid">
            <div className="learning-path-card recommended-path-card">
              <p className="card-label">Recommended by INSIGHTS</p>
  
              <h2>INSIGHTS Recommended Quiz</h2>
  
              <p className="learning-path-description">
                A targeted quiz built from patterns across your recent
                assessment performance.
              </p>
  
              <div className="recommended-quiz-preview">
                <div>
                  <span className="preview-label">Focus</span>
                  <strong>{recommendedQuiz.domain}</strong>
                </div>
  
                <div>
                  <span className="preview-label">Session</span>
                  <strong>
                    {recommendedQuiz.questionCount} questions ·{" "}
                    {recommendedQuiz.mode}
                  </strong>
                </div>
              </div>
  
              <div className="focus-topic-list">
                {recommendedQuiz.focusTopics.map((topic) => (
                  <span className="focus-topic-chip" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
  
              <div className="learning-path-actions">
                <button
                  className="primary-button"
                  onClick={() => {
                    setQuestionCount(recommendedQuiz.questionCount);
                    setMode(recommendedQuiz.mode);
                    setPage("recommended-quiz");
                  }}
                >
                  View recommended quiz
                </button>
              </div>
            </div>
  
            <div className="learning-path-card">
              <p className="card-label">Create your own</p>
  
              <h2>Build a practice session</h2>
  
              <p className="learning-path-description">
                Choose what you want to study, how many questions to answer,
                and how you want to practice.
              </p>
  
              <div className="create-practice-options">
                <div>
                  <span className="preview-label">Choose a topic</span>
                  <strong>Content area or subject</strong>
                </div>
  
                <div>
                  <span className="preview-label">Choose a session</span>
                  <strong>5, 10, 15, or 20 questions</strong>
                </div>
  
                <div>
                  <span className="preview-label">Choose a mode</span>
                  <strong>Tutor or Timed</strong>
                </div>
              </div>
  
              <div className="learning-path-actions">
                <button
                  className="secondary-button strong-secondary"
                  onClick={() => setPage("configure-practice")}
                >
                  Create practice
                </button>
              </div>
            </div>
            <div className="learning-path-card">
  <p className="card-label">NBME Self-Assessments</p>

  <h2>Choose a Self-Assessment</h2>

  <p className="learning-path-description">
    Choose from available NBME Self-Assessments to evaluate your
    knowledge and readiness.
  </p>

  <div className="create-practice-options">
    <div>
      <span className="preview-label">Choose an assessment</span>
      <strong>Browse available Self-Assessments</strong>
    </div>

    <div>
      <span className="preview-label">Results</span>
      <strong>Review results in INSIGHTS</strong>
    </div>
  </div>

  <div className="learning-path-actions">
    <button
      className="secondary-button strong-secondary"
      onClick={() => {
        setPage("self-assessment-shop");
        window.scrollTo({ top: 0 });
      }}
    >
      View Self-Assessments
    </button>
  </div>
</div>
          </section>
  
          <section className="practice-summary-section">
            <div className="summary-grid practice-summary-grid">
              <div className="summary-card">
                <p className="card-label">Questions completed</p>
  
                <div className="big-number">
                  {allPracticeHistory.reduce(
                    (sum, session) => sum + session.questionCount,
                    0
                  )}
                </div>
              </div>
  
              <div className="summary-card">
                <p className="card-label">Sessions completed</p>
  
                <div className="big-number">
                  {allPracticeHistory.length}
                </div>
              </div>
  
              
            </div>
          </section>
  
          <section className="assessment-history-card">
            <div className="history-section-title">
              <p className="card-label">Practice history</p>
              <h2>Recent sessions</h2>
            </div>
  
            {practiceNewestFirst.map((session) => {
  const sessionSource =
    session.source === "Recommended" ||
    session.source === "Targeted recommendation"
      ? "Recommended"
      : "Self-directed";

  return (
    <div
      className="assessment-history-row"
      key={session.practiceId}
    >
      <div>
        <div className="assessment-history-name">
          {session.domainName}
        </div>

        <div className="domain-meta">
          {session.practiceDate} · {session.questionCount} questions
          · {session.mode}
        </div>
      </div>

      <div className="practice-history-result">
        <span
          className={`practice-source-badge ${
            sessionSource === "Recommended"
              ? "practice-source-recommended"
              : ""
          }`}
        >
          {sessionSource}
        </span>

        <div className="practice-history-score">
          {session.percentCorrect}%
        </div>
      </div>
    </div>
  );
})}
          </section>
  
          <p className="results-disclaimer">
            AI-generated practice content in this prototype is synthetic
            educational material and is not an NBME examination item.
          </p>
        </main>
      </div>
    );
  }


  const recentAssessments = student?.assessments
  ? [...student.assessments]
      .sort(
        (a, b) => new Date(b.testDate) - new Date(a.testDate)
      )
      .slice(0, 3)
  : [];

const overviewCardio =
  student?.currentDomainPerformance?.find(
    (domain) => domain.domainCode === "CARDIO"
  ) || null;

  const latestOverviewAssessment = recentAssessments[0] || null;

  const latestOverviewReadiness =
    latestOverviewAssessment?.readiness || null;

return (
  <div className="app-shell">
    <header className="topbar">
      <div className="brand">
      <button
  className="brand-logo-button"
  onClick={() => {
    setPage("overview");
    window.scrollTo({ top: 0 });
  }}
  aria-label="Return to INSIGHTS Overview"
>
  <img
    src="/nbme-logo.svg"
    alt="NBME"
    className="nbme-logo"
  />
</button>

        <div className="brand-divider" />

        <div className="insights-wordmark">
          INSIGHTS<sup>®</sup>
        </div>
      </div>

      <div className="student-name">
        {profile.displayName}
      </div>
    </header>

    <nav className="nav">
      <button className="nav-item active">
        Overview
      </button>

      <button
        className="nav-item"
        onClick={() => setPage("performance")}
      >
        Performance
      </button>

      <button
        className="nav-item"
        onClick={() => setPage("assessments")}
      >
        Assessments
      </button>

      <button
        className="nav-item"
        onClick={() => setPage("practice")}
      >
        Learning & Practice
      </button>
    </nav>

    <main className="main-content insights-overview">
      <section className="insights-welcome">
        <p className="eyebrow">
          {profile.medicalSchoolYear} · Internal Medicine
        </p>

        <h1>Hi, {profile.firstName}</h1>

        <p className="subtext">
          Review your recent NBME performance and readiness.
        </p>
      </section>

      {/* CURRENT INSIGHTS: READINESS */}
      <section className="insights-primary-card">
        <div className="insights-primary-heading">
          <div>
            <p className="card-label">
              Step 2 readiness
            </p>

            <div className="insights-readiness-value">
            {latestOverviewReadiness?.probability ?? "—"}%
            </div>

            <strong>
            On track
            </strong>
          </div>

          <div className="insights-readiness-context">
            <p className="card-label">
              Based on your latest self-assessment
            </p>

            <strong>
            {latestOverviewAssessment?.assessmentName}
            </strong>

            <p>
            {latestOverviewAssessment?.testDate}
            </p>

            <button
              className="text-action"
              onClick={() => {
                const latest = latestOverviewAssessment;

                if (latest) {
                  setSelectedAssessment(latest);
                  setPage("assessment-detail");
                  window.scrollTo({ top: 0 });
                }
              }}
            >
              View assessment result
            </button>
          </div>
        </div>
      </section>

      {/* CURRENT INSIGHTS: RECENT ASSESSMENTS */}
      <section className="insights-section">
        <div className="insights-section-header">
          <div>
            <p className="card-label">
              Recent assessments
            </p>

            <h2>Your assessment history</h2>
          </div>

          <button
            className="text-action"
            onClick={() => setPage("assessments")}
          >
            View all assessments
          </button>
        </div>

        <div className="overview-assessment-list">
          {recentAssessments.map((assessment) => (
            <button
              className="overview-assessment-row"
              key={assessment.assessmentId}
              onClick={() => {
                setSelectedAssessment(assessment);
                setPage("assessment-detail");
                window.scrollTo({ top: 0 });
              }}
            >
              <div>
                <strong>
                  {assessment.assessmentName}
                </strong>

                <span>
                  {assessment.testDate} · {assessment.phase}
                </span>
              </div>

              <div className="overview-assessment-score">
                <strong>
                  {assessment.totalScore}
                </strong>

                <span>
                  {assessment.totalScoreType}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* CURRENT INSIGHTS: CONTENT AREA FEEDBACK */}
      <section className="insights-section">
        <div className="insights-section-header">
          <div>
            <p className="card-label">
              Content-area performance
            </p>

            <h2>Areas to review</h2>
          </div>

          <button
            className="text-action"
            onClick={() => setPage("performance")}
          >
            View all performance
          </button>
        </div>

        {overviewCardio && (
          <button
            className="overview-content-row"
            onClick={() => {
              setSelectedDomain(overviewCardio);
              setPage("performance-detail");
              window.scrollTo({ top: 0 });
            }}
          >
            <div>
              <strong>
                Cardiovascular System
              </strong>

              <span>
                Review the pattern across your recent assessments.
              </span>
            </div>

            <span
              className={`band band-${overviewCardio.currentBand.toLowerCase()}`}
            >
              {overviewCardio.currentBand}
            </span>
          </button>
        )}
      </section>

      {/* NEW: LEARNING & PRACTICE */}
      <section className="insights-recommendation-card">
      <div className="new-capability-label">
  New in INSIGHTS · Learning & Practice
</div>

        <div className="insights-recommendation-layout">
          <div>
            <p className="card-label">
              Recommended for you
            </p>

            <h2>Cardiovascular System</h2>

            <p>
              Based on patterns already visible in your
              INSIGHTS assessment history, a targeted quiz
              is available for additional practice.
            </p>

            <button
              className="why-quiz-link"
              onClick={() => {
                setSelectedDomain(overviewCardio);
                setPage("performance-detail");
                window.scrollTo({ top: 0 });
              }}
            >
              See the performance evidence
            </button>
          </div>

          <div className="overview-quiz-preview">
            <p className="card-label">
              INSIGHTS Recommended Quiz
            </p>

            <strong>
              {recommendedQuiz.questionCount} questions ·{" "}
              {recommendedQuiz.mode} mode
            </strong>

           

            <button
              className="primary-button"
              onClick={() => {
                setQuestionCount(
                  recommendedQuiz.questionCount
                );
                setMode(recommendedQuiz.mode);
                setPage("recommended-quiz");
                window.scrollTo({ top: 0 });
              }}
            >
              View recommended quiz
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
);
}

export default App;
