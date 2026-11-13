import React, { useState } from 'react';
import { SkillAssessmentQuestion, UserSkill } from '../types';
import { SKILL_QUIZ_QUESTIONS } from '../data/mockData';
import { CheckCircle2, XCircle, Award, HelpCircle, X, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';

interface SkillAssessmentModalProps {
  skill: UserSkill;
  onClose: () => void;
  onVerified: (skillName: string, passed: boolean, score: number) => void;
}

export const SkillAssessmentModal: React.FC<SkillAssessmentModalProps> = ({
  skill,
  onClose,
  onVerified,
}) => {
  // Find questions or generate fallback questions for the skill
  const availableQuestions: SkillAssessmentQuestion[] = SKILL_QUIZ_QUESTIONS[skill.name] || [
    {
      id: `q-${skill.name}-1`,
      skillName: skill.name,
      difficulty: 'Intermediate',
      question: `In industry practice, what represents the primary core concept and best practice when applying ${skill.name}?`,
      options: [
        `Following standard design principles, modularity, and continuous automated verification.`,
        `Ignoring error handling and type boundaries in production.`,
        `Relying exclusively on unstructured scripts without version control.`,
        `Hardcoding secrets and credentials into public codebases.`
      ],
      correctIndex: 0,
      explanation: `Industry standard practice for ${skill.name} emphasizes clean modularity, automated test coverage, and security compliance.`
    },
    {
      id: `q-${skill.name}-2`,
      skillName: skill.name,
      difficulty: 'Intermediate',
      question: `Which factor is most critical when scaling applications utilizing ${skill.name} in a high-concurrency South African environment?`,
      options: [
        `Optimizing data structures, caching layers, and asynchronous throughput.`,
        `Increasing single-threaded blocking operations.`,
        `Disabling network compression and security encryption.`,
        `Running all processes synchronously without monitoring.`
      ],
      correctIndex: 0,
      explanation: `Scalability requires efficient asynchronous handling, database indexing, and memory optimization.`
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQ = availableQuestions[currentIndex];

  const handleSelectOption = (index: number) => {
    const updated = [...selectedAnswers];
    updated[currentIndex] = index;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (currentIndex < availableQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowExplanation(false);
    } else {
      // Calculate results
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let correct = 0;
    availableQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });

    const scorePercent = Math.round((correct / availableQuestions.length) * 100);
    const passed = scorePercent >= 60;
    setIsCompleted(true);

    if (typeof onVerified === 'function') {
      onVerified(skill.name, passed, scorePercent);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    availableQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    return Math.round((correct / availableQuestions.length) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-slate-900 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">Skill Verification Assessment</h3>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {skill.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Verify your proficiency to boost your AI Job Matching Compatibility score.
            </p>
          </div>
        </div>

        {/* Modal Body */}
        {!isCompleted ? (
          <div>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-bold">
                <span>Question {currentIndex + 1} of {availableQuestions.length}</span>
                <span className="text-emerald-700">Passing Grade: 60%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / availableQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 mb-5">
              <span className="text-[11px] font-black tracking-wider uppercase text-emerald-700 block mb-1.5">
                {currentQ.difficulty} Level
              </span>
              <p className="text-sm font-bold text-slate-900 leading-relaxed">
                {currentQ.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5 mb-6">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentIndex] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm transition-all flex items-start space-x-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-slate-900 ring-2 ring-emerald-500 font-bold shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-snug pt-0.5">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showExplanation ? 'Hide Clue' : 'Explain Concept'}</span>
              </button>

              <button
                type="button"
                disabled={selectedAnswers[currentIndex] === undefined}
                onClick={handleNext}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span>{currentIndex === availableQuestions.length - 1 ? 'Submit Answers' : 'Next Question'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {showExplanation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium">
                <strong className="font-bold text-blue-950">Concept Clue:</strong> {currentQ.explanation}
              </div>
            )}
          </div>
        ) : (
          /* Results View */
          <div className="text-center py-4">
            {calculateScore() >= 60 ? (
              <div className="space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
                  <ShieldCheck className="w-9 h-9" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Assessment Passed!</h4>
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    You scored <strong className="text-emerald-700 font-black text-sm">{calculateScore()}%</strong> on the {skill.name} Competency Assessment.
                  </p>
                </div>
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-left text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Skillix Verified Badge Awarded</span>
                  </div>
                  <p className="text-emerald-800 font-medium leading-relaxed">
                    Your {skill.name} skill is now verified. Employers and the AI matching engine will assign higher weighting to your applications.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                >
                  Return to Profile & Run Matches
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700 shadow-xs">
                  <RefreshCw className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">Skill Development Recommended</h4>
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    Score: <strong className="text-amber-700 font-black text-sm">{calculateScore()}%</strong> (60% required to verify)
                  </p>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Review the South African upskilling modules in the Career Roadmap tab to sharpen your {skill.name} fundamentals.
                </p>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setCurrentIndex(0);
                      setSelectedAnswers([]);
                      setIsCompleted(false);
                    }}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Retake Quiz
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
