'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Survey data structure
const surveyQuestions = [
  // Section 1: Transportation
  {
    section: 'Transportation',
    question: 'How do you usually get to work/school?',
    type: 'single-select',
    key: 'commute_method',
    options: [
      'I drive alone',
      'I carpool with others',
      'Public transportation (bus, train, subway)',
      'I bike',
      'I walk',
      'I work/study from home',
      'Mix of multiple methods',
    ],
  },
  {
    section: 'Transportation',
    question: 'How far is your typical commute (one way)?',
    type: 'slider',
    key: 'commute_distance',
    conditional: (answers: any) => answers.commute_method !== 'I work/study from home',
    min: 0,
    max: 50,
    labels: ['0 mi', '10 mi', '20 mi', '30 mi', '40 mi', '50+ mi'],
  },
  {
    section: 'Transportation',
    question: 'How often do you fly per year?',
    type: 'single-select',
    key: 'flight_frequency',
    options: [
      'Never or almost never',
      '1-2 times',
      '3-5 times',
      '6-10 times',
      'More than 10 times',
    ],
  },
  // Section 2: Food & Diet
  {
    section: 'Food & Diet',
    question: 'How would you describe your current diet?',
    type: 'single-select',
    key: 'diet_type',
    options: [
      'I eat meat with most meals',
      'I eat meat several times a week',
      'I eat meat occasionally (1-2x/week)',
      'Pescatarian (fish but no meat)',
      'Vegetarian',
      'Vegan',
    ],
  },
  {
    section: 'Food & Diet',
    question: 'How often do you eat out or order takeout/delivery?',
    type: 'single-select',
    key: 'eating_out_frequency',
    options: [
      'Daily or almost daily',
      '4-6 times per week',
      '2-3 times per week',
      'Once a week',
      'A few times a month',
      'Rarely (once a month or less)',
    ],
  },
  {
    section: 'Food & Diet',
    question: 'Do you currently meal prep or cook at home?',
    type: 'single-select',
    key: 'cooking_habits',
    options: [
      'Yes, I meal prep regularly (3+ times/week)',
      'I cook at home most days but don\'t meal prep',
      'I cook occasionally (2-3x/week)',
      'Rarely, I mostly eat out or order in',
      'I don\'t cook at all',
    ],
  },
  {
    section: 'Food & Diet',
    question: 'When shopping for groceries, do you...?',
    type: 'multi-select',
    key: 'shopping_habits',
    options: [
      'Buy whatever looks good/convenient',
      'Look for local or seasonal produce',
      'Check where products are from',
      'Buy organic when possible',
      'Focus on price above all else',
      'Plan meals before shopping',
      'Use a shopping list',
    ],
  },
  // Section 3: Shopping & Consumption
  {
    section: 'Shopping & Consumption',
    question: 'How often do you buy new clothing?',
    type: 'single-select',
    key: 'clothing_frequency',
    options: [
      'Monthly or more often',
      'Every 2-3 months',
      'A few times a year (3-5)',
      '1-2 times per year',
      'Rarely (less than once a year)',
    ],
  },
  {
    section: 'Shopping & Consumption',
    question: 'Where do you primarily shop for non-food items?',
    type: 'single-select',
    key: 'shopping_location',
    options: [
      'Mostly online (Amazon, etc.)',
      'Big box stores (Target, Walmart)',
      'Local/small businesses',
      'Thrift stores or secondhand',
      'Mix of different places',
    ],
  },
  {
    section: 'Shopping & Consumption',
    question: 'When you need something, you typically...?',
    type: 'single-select',
    key: 'purchase_behavior',
    options: [
      'Buy it new immediately',
      'Search for deals first, then buy new',
      'Check if I can borrow/rent it',
      'Look for secondhand options first',
      'Try to make do without it',
    ],
  },
  // Section 4: Home & Energy
  {
    section: 'Home & Energy',
    question: 'What type of housing do you live in?',
    type: 'single-select',
    key: 'housing_type',
    options: [
      'House (I own or rent)',
      'Apartment',
      'College dorm',
      'Shared housing/roommates',
      'Living with family',
    ],
  },
  {
    section: 'Home & Energy',
    question: 'How much control do you have over energy use in your home?',
    type: 'single-select',
    key: 'energy_control',
    options: [
      'Full control (own home, pay utilities)',
      'Some control (rent, pay utilities)',
      'Limited control (some utilities included)',
      'No control (dorm, utilities included, live with parents)',
    ],
  },
  // Section 5: Lifestyle & Habits
  {
    section: 'Lifestyle & Habits',
    question: 'Which of these do you already do regularly?',
    type: 'multi-select',
    key: 'current_habits',
    options: [
      'Use reusable water bottles',
      'Use reusable shopping bags',
      'Recycle at home',
      'Compost food scraps',
      'Unplug devices when not in use',
      'Use energy-efficient lightbulbs',
      'Take short showers',
      'None of these yet',
    ],
  },
  {
    section: 'Lifestyle & Habits',
    question: 'What best describes your current awareness of your carbon footprint?',
    type: 'single-select',
    key: 'carbon_awareness',
    options: [
      'I have no idea what my carbon footprint is',
      'I have a rough sense but haven\'t measured it',
      'I\'ve calculated it before',
      'I actively track and try to reduce it',
    ],
  },
  // Section 6: Commitment & Motivation
  {
    section: 'Commitment & Motivation',
    question: 'How much time can you realistically dedicate to sustainability efforts weekly?',
    type: 'single-select',
    key: 'time_commitment',
    options: [
      '5-10 minutes (just quick wins)',
      '15-30 minutes (a few small changes)',
      '30-60 minutes (multiple actions)',
      '1+ hours (significant lifestyle changes)',
    ],
  },
  {
    section: 'Commitment & Motivation',
    question: 'What\'s your main motivation for reducing your carbon footprint?',
    type: 'single-select',
    key: 'motivation',
    options: [
      'Save money on everyday expenses',
      'Help the environment/planet',
      'Both equally',
      'Social reasons (friends/community doing it)',
      'Just curious to learn more',
    ],
  },
  {
    section: 'Commitment & Motivation',
    question: 'What kind of changes feel most achievable for you right now?',
    type: 'single-select',
    key: 'achievable_changes',
    options: [
      'Tiny habits I can do daily (unplug charger, use reusable cup)',
      'Small weekly actions (meatless Monday, walk instead of drive)',
      'Monthly commitments (buy secondhand, meal prep)',
      'Bigger lifestyle shifts (change commute, diet changes)',
      'I\'m ready for all of it!',
    ],
  },
];

export default function SurveyPage() {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter out conditional questions
  const activeQuestions = surveyQuestions.filter((q) => {
    if (q.conditional) {
      return q.conditional(answers);
    }
    return true;
  });

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / activeQuestions.length) * 100;

  const handleAnswer = (value: any) => {
    setAnswers({ ...answers, [currentQuestion.key]: value });
  };

  const handleNext = async () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Survey complete - submit to backend
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('supabase_token');
        
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:8000/survey/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(answers),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Failed to submit survey');
        }

        console.log('Survey submitted successfully:', data);
        
        // Redirect to home or dashboard
        router.push('/');
      } catch (err: any) {
        console.error('Survey submission error:', err);
        setError(err.message || 'Failed to submit survey. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const currentAnswer = answers[currentQuestion.key];
  const isAnswered = currentAnswer !== undefined && currentAnswer !== null && 
    (Array.isArray(currentAnswer) ? currentAnswer.length > 0 : true);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--mint-bg)' }}>
      {/* Progress Bar */}
      <div className="w-full h-2 bg-white/30">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--fresh-green)',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
        {/* Background Illustration for Transportation Questions */}
        {(currentQuestion.key === 'commute_method' || currentQuestion.key === 'commute_distance') && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Electric transport-cuate.svg" 
                alt="Electric transport illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Flight Question */}
        {currentQuestion.key === 'flight_frequency' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Flying around the world-amico.svg" 
                alt="Flying around the world illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Diet Question */}
        {currentQuestion.key === 'diet_type' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Diet-cuate.svg" 
                alt="Diet illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Eating Out Question */}
        {currentQuestion.key === 'eating_out_frequency' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <div style={{ transform: 'scaleX(-1)' }}>
                <Image 
                  src="/Take Away-amico.svg" 
                  alt="Take away illustration" 
                  width={450} 
                  height={450}
                  priority
                />
              </div>
            </div>
          </div>
        )}

        {/* Background Illustration for Cooking/Meal Prep Question */}
        {currentQuestion.key === 'cooking_habits' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Cooking-cuate.svg" 
                alt="Cooking illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Grocery Shopping Question */}
        {currentQuestion.key === 'shopping_habits' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Eco shopping-rafiki.svg" 
                alt="Eco shopping illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Clothing Shopping Question */}
        {currentQuestion.key === 'clothing_frequency' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Shopping bag-cuate.svg" 
                alt="Shopping bag illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Non-Food Shopping Location Question */}
        {currentQuestion.key === 'shopping_location' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Ecommerce checkout laptop-rafiki.svg" 
                alt="Ecommerce checkout illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Purchase Behavior Question */}
        {currentQuestion.key === 'purchase_behavior' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Charity market-bro.svg" 
                alt="Charity market illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Housing Type Question */}
        {currentQuestion.key === 'housing_type' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Houses-cuate.svg" 
                alt="Houses illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Energy Control Question */}
        {currentQuestion.key === 'energy_control' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Sun energy-rafiki.svg" 
                alt="Sun energy illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Current Habits Question */}
        {currentQuestion.key === 'current_habits' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Recycling-amico.svg" 
                alt="Recycling illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Carbon Awareness Question */}
        {currentQuestion.key === 'carbon_awareness' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Taking care of the Earth-bro.svg" 
                alt="Taking care of the Earth illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Time Commitment Question */}
        {currentQuestion.key === 'time_commitment' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Work time-pana.svg" 
                alt="Work time illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Motivation Question */}
        {currentQuestion.key === 'motivation' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Climate change-rafiki.svg" 
                alt="Climate change illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        {/* Background Illustration for Achievable Changes Question */}
        {currentQuestion.key === 'achievable_changes' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:block" style={{ opacity: 0.12 }}>
              <Image 
                src="/Reforestation-amico.svg" 
                alt="Reforestation illustration" 
                width={450} 
                height={450}
                priority
              />
            </div>
          </div>
        )}

        <div
          className="w-full max-w-2xl rounded-2xl"
          style={{
            backgroundColor: 'var(--card-white)',
            padding: '48px',
            boxShadow: '0 8px 24px rgba(31, 58, 46, 0.12)',
          }}
        >
          {/* Section & Question Number */}
          <div className="mb-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--fresh-green)' }}>
              {currentQuestion.section}
            </p>
            <p className="text-xs" style={{ color: 'var(--sage-muted)' }}>
              Question {currentQuestionIndex + 1} of {activeQuestions.length}
            </p>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--forest-text)' }}>
            {currentQuestion.question}
          </h2>

          {/* Answer Options */}
          <div className="mb-8">
            {currentQuestion.type === 'single-select' && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: currentAnswer === option ? 'rgba(74, 124, 89, 0.1)' : 'var(--input-bg)',
                      border: `2px solid ${currentAnswer === option ? 'var(--fresh-green)' : 'var(--input-border)'}`,
                    }}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.key}
                      value={option}
                      checked={currentAnswer === option}
                      onChange={(e) => handleAnswer(e.target.value)}
                      className="w-5 h-5 cursor-pointer"
                      style={{ accentColor: 'var(--fresh-green)' }}
                    />
                    <span className="ml-3 flex-1" style={{ color: 'var(--forest-text)' }}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'multi-select' && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => {
                  const selectedOptions = currentAnswer || [];
                  const isSelected = selectedOptions.includes(option);
                  
                  return (
                    <label
                      key={option}
                      className="flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? 'rgba(74, 124, 89, 0.1)' : 'var(--input-bg)',
                        border: `2px solid ${isSelected ? 'var(--fresh-green)' : 'var(--input-border)'}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        value={option}
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelection = e.target.checked
                            ? [...selectedOptions, option]
                            : selectedOptions.filter((o: string) => o !== option);
                          handleAnswer(newSelection);
                        }}
                        className="w-5 h-5 rounded cursor-pointer"
                        style={{ accentColor: 'var(--fresh-green)' }}
                      />
                      <span className="ml-3 flex-1" style={{ color: 'var(--forest-text)' }}>
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'slider' && (
              <div className="py-4">
                <input
                  type="range"
                  min={currentQuestion.min}
                  max={currentQuestion.max}
                  value={currentAnswer || 0}
                  onChange={(e) => handleAnswer(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg cursor-pointer"
                  style={{
                    accentColor: 'var(--fresh-green)',
                  }}
                />
                <div className="flex justify-between mt-4">
                  {currentQuestion.labels?.map((label, idx) => (
                    <span
                      key={idx}
                      className="text-xs"
                      style={{ color: 'var(--sage-muted)' }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div className="text-center mt-4">
                  <span className="text-2xl font-bold" style={{ color: 'var(--fresh-green)' }}>
                    {currentAnswer || 0} {currentAnswer === 50 ? '+' : ''} mi
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {/* Error Message */}
            {error && (
              <div className="w-full p-3 mb-4 rounded-lg text-sm" style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                color: 'rgb(239, 68, 68)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                {error}
              </div>
            )}

            {/* Back Button */}
            {currentQuestionIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--sage-muted)',
                  border: '2px solid var(--input-border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(146, 160, 142, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Back
              </button>
            )}

            {/* Next/Submit Button */}
            <button
              onClick={handleNext}
              disabled={!isAnswered || loading}
              className="flex-1 py-3 rounded-xl font-semibold transition-all duration-200"
              style={{
                backgroundColor: (isAnswered && !loading) ? 'var(--button-green)' : 'var(--sage-muted)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(46, 93, 63, 0.2)',
                opacity: (isAnswered && !loading) ? 1 : 0.5,
                cursor: (isAnswered && !loading) ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={(e) => {
                if (isAnswered && !loading) {
                  e.currentTarget.style.backgroundColor = 'var(--button-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(31, 58, 46, 0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (isAnswered && !loading) {
                  e.currentTarget.style.backgroundColor = 'var(--button-green)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(46, 93, 63, 0.2)';
                }
              }}
            >
              {loading 
                ? 'Submitting...' 
                : currentQuestionIndex < activeQuestions.length - 1 
                  ? 'Next' 
                  : 'Complete Survey'
              }
            </button>
          </div>
        </div>

        {/* Attribution - only show for transportation questions */}
        {(currentQuestion.key === 'commute_method' || currentQuestion.key === 'commute_distance') && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for flight question */}
        {currentQuestion.key === 'flight_frequency' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/transport" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              Transport illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for diet question */}
        {currentQuestion.key === 'diet_type' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for eating out question */}
        {currentQuestion.key === 'eating_out_frequency' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/business" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              Business illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for cooking question */}
        {currentQuestion.key === 'cooking_habits' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for grocery shopping question */}
        {currentQuestion.key === 'shopping_habits' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/shopping" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              Shopping illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for clothing shopping question */}
        {currentQuestion.key === 'clothing_frequency' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for shopping location question */}
        {currentQuestion.key === 'shopping_location' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/online" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              Online illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for purchase behavior question */}
        {currentQuestion.key === 'purchase_behavior' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for housing type question */}
        {currentQuestion.key === 'housing_type' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/city" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              City illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for energy control question */}
        {currentQuestion.key === 'energy_control' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/worker" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              Worker illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for current habits question */}
        {currentQuestion.key === 'current_habits' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for carbon awareness question */}
        {currentQuestion.key === 'carbon_awareness' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for time commitment question */}
        {currentQuestion.key === 'time_commitment' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/work" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              Work illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for motivation question */}
        {currentQuestion.key === 'motivation' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/nature" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              Nature illustrations by Storyset
            </a>
          </div>
        )}

        {/* Attribution for achievable changes question */}
        {currentQuestion.key === 'achievable_changes' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: 'var(--sage-muted)' }}>
            <a 
              href="https://storyset.com/people" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'var(--sage-muted)' }}
            >
              People illustrations by Storyset
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
