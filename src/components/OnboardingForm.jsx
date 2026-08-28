'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useOnboarding } from '@/lib/formState';
import Step1 from './onboardingSteps/Step1';
import Step2 from './onboardingSteps/Step2';
import Step3 from './onboardingSteps/Step3';
import Step4 from './onboardingSteps/Step4';
import Step5 from './onboardingSteps/Step5';

const steps = { 1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5 };
const STEP_META = {
  1: { label: 'Goal', detail: 'Choose your direction' },
  2: { label: 'Baseline', detail: 'Set your starting point' },
  3: { label: 'Training', detail: 'Build around your week' },
  4: { label: 'Food', detail: 'Set food preferences' },
  5: { label: 'Review', detail: 'Review and build' },
};
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const EMPTY_BUILD_STATE = { phase: 'idle', workouts: 'idle', meals: 'idle' };

function splitAccountName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function upcomingDates(count = 7) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
}

function validateStep(step, formData) {
  const errors = {};
  if (step === 1 && !formData.fitnessGoal) errors.fitnessGoal = 'Choose one primary goal to continue.';

  if (step === 2) {
    if (!String(formData.firstName || '').trim()) errors.firstName = 'Enter your first name.';
    if (!String(formData.lastName || '').trim()) errors.lastName = 'Enter your last name.';
    if (!formData.birthday) errors.birthday = 'Enter your birthday.';
    else if (new Date(`${formData.birthday}T00:00:00`) > new Date()) errors.birthday = 'Birthday cannot be in the future.';
    if (!formData.gender) errors.gender = 'Choose the option used for calorie estimates.';
    if (!formData.activityLevel) errors.activityLevel = 'Choose your typical activity level.';
    const heightFt = Number(formData.heightFt);
    const heightIn = Number(formData.heightIn);
    const weight = Number(formData.weight);
    const goalWeight = formData.goalWeight === '' ? null : Number(formData.goalWeight);
    if (!Number.isFinite(heightFt) || heightFt < 1 || heightFt > 8) errors.heightFt = 'Use 1-8 feet.';
    if (!Number.isFinite(heightIn) || heightIn < 0 || heightIn > 11) errors.heightIn = 'Use 0-11 inches.';
    if (!Number.isFinite(weight) || weight <= 0) errors.weight = 'Enter a valid weight.';
    if (goalWeight != null && (!Number.isFinite(goalWeight) || goalWeight <= 0)) errors.goalWeight = 'Enter a valid goal weight.';
  }

  if (step === 3) {
    if (!Array.isArray(formData.workoutDays) || !formData.workoutDays.length) errors.workoutDays = 'Choose at least one training day.';
    if (!Array.isArray(formData.equipmentAccess) || !formData.equipmentAccess.length) errors.equipmentAccess = 'Choose at least one equipment option. Bodyweight is available if you train without equipment.';
    const duration = Number(formData.workoutDuration);
    if (!Number.isFinite(duration) || duration < 10 || duration > 180) errors.workoutDuration = 'Choose a workout duration.';
  }

  if (step === 4) {
    const meals = Number(formData.mealsPerDay);
    if (!Number.isInteger(meals) || meals < 1 || meals > 6) errors.mealsPerDay = 'Choose between 1 and 6 meals.';
  }
  return errors;
}

async function requestJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Request failed.');
  return data;
}

export default function OnboardingForm() {
  const { data: session, status } = useSession();
  const { step } = useParams();
  const router = useRouter();
  const { formData, updateForm } = useOnboarding();
  const currentStep = Number(step);
  const StepComponent = steps[currentStep];
  const [draftReady, setDraftReady] = useState(false);
  const [stepErrors, setStepErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [buildState, setBuildState] = useState(EMPTY_BUILD_STATE);
  const profileSavedRef = useRef(false);
  const progress = Math.round((currentStep / 5) * 100);
  const currentMeta = STEP_META[currentStep] || STEP_META[1];
  const draftKey = useMemo(() => {
    const identity = session?.user?.id || session?.user?.email;
    return identity ? `burnnbyte:onboarding:${identity}` : null;
  }, [session?.user?.email, session?.user?.id]);

  useEffect(() => {
    if (status !== 'authenticated' || !draftKey || draftReady) return;
    let restored = false;
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          updateForm(parsed);
          restored = true;
        }
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
    if (!restored && !formData.firstName && !formData.lastName) {
      updateForm(splitAccountName(session?.user?.name));
    }
    setDraftReady(true);
  }, [draftKey, draftReady, formData.firstName, formData.lastName, session?.user?.name, status, updateForm]);

  useEffect(() => {
    if (!draftReady || !draftKey || profileSavedRef.current) return;
    window.localStorage.setItem(draftKey, JSON.stringify(formData));
  }, [draftKey, draftReady, formData]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/signin');
      return;
    }
    if (status !== 'authenticated') return;
    let active = true;
    const checkRedirect = async () => {
      const response = await fetch('/api/user/profile', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      const onboarded = data.onboarded ?? data.preferencesFilledOut ?? false;
      if (active && onboarded && !profileSavedRef.current) router.replace('/');
    };
    checkRedirect();
    return () => { active = false; };
  }, [router, status]);

  const goToStep = (nextStep) => {
    setStepErrors({});
    setSubmitError('');
    router.push(`/onboarding/${nextStep}`);
  };

  const focusFirstError = () => {
    window.requestAnimationFrame(() => {
      document.querySelector('.onboard-native-form [aria-invalid="true"], .onboard-native-form [data-onboard-invalid="true"] button')?.focus();
    });
  };

  const profilePayload = () => ({
    ...formData,
    firstName: String(formData.firstName || '').trim(),
    lastName: String(formData.lastName || '').trim(),
    fitnessGoals: Array.isArray(formData.fitnessGoals) && formData.fitnessGoals.length
      ? formData.fitnessGoals
      : [formData.fitnessGoal],
    macroTargetMode: 'grams',
    calorieTarget: '',
    proteinTarget: '',
    carbsTarget: '',
    fatTarget: '',
    proteinPctTarget: '',
    carbsPctTarget: '',
    fatPctTarget: '',
  });

  const generationPayloads = () => {
    const dates = upcomingDates(7);
    const mealDates = dates.map(localDateString);
    const selectedDays = new Set(formData.workoutDays || []);
    const workoutDates = dates
      .filter((date) => selectedDays.has(DAY_CODES[date.getDay()]))
      .map(localDateString);
    const shared = profilePayload();
    return {
      workouts: { ...shared, dates: workoutDates },
      meals: { ...shared, targetDates: mealDates },
    };
  };

  const generateFirstWeek = async ({ workouts, meals }) => {
    const payloads = generationPayloads();
    const next = {
      phase: 'building',
      workouts: workouts ? 'running' : buildState.workouts,
      meals: meals ? 'running' : buildState.meals,
    };
    setBuildState(next);
    setSubmitError('');

    const tasks = [];
    if (workouts) tasks.push({ key: 'workouts', promise: requestJson('/api/generateWorkout', payloads.workouts) });
    if (meals) tasks.push({ key: 'meals', promise: requestJson('/api/generateMealPlan', payloads.meals) });
    const results = await Promise.allSettled(tasks.map((task) => task.promise));
    results.forEach((result, index) => {
      next[tasks[index].key] = result.status === 'fulfilled' ? 'success' : 'failed';
    });

    const complete = next.workouts === 'success' && next.meals === 'success';
    next.phase = complete ? 'complete' : 'partial';
    setBuildState({ ...next });
    if (complete) {
      router.replace('/?onboarding=complete');
      router.refresh();
      return;
    }
    const failed = [next.workouts === 'failed' ? 'workouts' : null, next.meals === 'failed' ? 'meals' : null].filter(Boolean).join(' and ');
    setSubmitError(`Your profile is saved, but we could not finish ${failed}. You can retry without re-entering anything.`);
  };

  const completeOnboarding = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      setBuildState({ phase: 'saving', workouts: 'idle', meals: 'idle' });
      await requestJson('/api/onboarding', profilePayload());
      profileSavedRef.current = true;
      if (draftKey) window.localStorage.removeItem(draftKey);
      await generateFirstWeek({ workouts: true, meals: true });
    } catch (error) {
      setBuildState(EMPTY_BUILD_STATE);
      setSubmitError(error.message || 'We could not save your setup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const retryGeneration = async () => {
    setSubmitting(true);
    try {
      await generateFirstWeek({ workouts: buildState.workouts === 'failed', meals: buildState.meals === 'failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitNext = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (currentStep < 5) {
      const errors = validateStep(currentStep, formData);
      setStepErrors(errors);
      if (Object.keys(errors).length) {
        focusFirstError();
        return;
      }
      goToStep(currentStep + 1);
      return;
    }
    for (const stepNumber of [1, 2, 3, 4]) {
      const errors = validateStep(stepNumber, formData);
      if (Object.keys(errors).length) {
        setStepErrors(errors);
        setSubmitError('Finish the highlighted details before building your first week.');
        router.push(`/onboarding/${stepNumber}`);
        focusFirstError();
        return;
      }
    }
    if (buildState.phase === 'partial') await retryGeneration();
    else await completeOnboarding();
  };

  const primaryLabel = submitting
    ? buildState.phase === 'saving' ? 'Saving your setup' : 'Building your first week'
    : currentStep < 5
      ? 'Continue'
      : buildState.phase === 'partial' ? 'Retry unfinished plans' : 'Build my first week';

  return (
    <main className="onboard-native-page">
      <div className="onboard-native-shell">
        <header className="onboard-native-brandbar">
          <div className="onboard-native-brand">
            <Image src="/logo.png" alt="" width={42} height={42} priority />
            <div><strong>burnNbyte</strong><span>Fuel smart. Train hard.</span></div>
          </div>
          <div className="onboard-native-badge">PLAN SETUP</div>
        </header>

        <section className="onboard-native-frame">
          <div className="onboard-native-progress">
            <div className="onboard-native-progress-head">
              <div><span>YOUR FIRST WEEK</span><strong>{currentMeta.detail}</strong></div>
              <b>{progress}%</b>
            </div>
            <div className="onboard-native-progress-rail" aria-label={`Step ${currentStep} of 5`}>
              {[1, 2, 3, 4, 5].map((item) => <span key={item} className={item <= currentStep ? 'active' : ''} />)}
            </div>
            <div className="onboard-native-progress-labels">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className={item === currentStep ? 'active' : ''}><i>{String(item).padStart(2, '0')}</i><span>{STEP_META[item].label}</span></div>
              ))}
            </div>
          </div>

          <form className="form onboard-form onboard-native-form" onSubmit={onSubmitNext} noValidate aria-busy={submitting}>
            {StepComponent ? (
              <StepComponent formData={formData} updateForm={updateForm} errors={stepErrors} onEdit={goToStep} buildState={buildState} />
            ) : <p className="muted">Loading...</p>}

            {submitError ? <div className="alert alert-error onboard-submit-error" role="alert">{submitError}</div> : null}

            <div className="onboard-actions onboard-native-actions">
              {buildState.phase === 'partial' ? (
                <button type="button" className="btn btn-secondary" onClick={() => router.replace('/?onboarding=partial')} disabled={submitting}>Continue to dashboard</button>
              ) : (
                <button type="button" onClick={() => goToStep(Math.max(1, currentStep - 1))} className="btn btn-secondary" disabled={currentStep === 1 || submitting}>
                  <ArrowLeft size={17} aria-hidden /> Back
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <LoaderCircle className="onboard-spin" size={17} aria-hidden /> : currentStep === 5 ? (buildState.phase === 'partial' ? <RefreshCw size={17} aria-hidden /> : <Sparkles size={17} aria-hidden />) : null}
                {primaryLabel}
                {!submitting && currentStep < 5 ? <ArrowRight size={17} aria-hidden /> : null}
              </button>
            </div>
          </form>
        </section>

        <footer className="onboard-native-footer">
          <span>YOUR DATA</span>
          <p>Your answers personalize training, meals, and nutrition guidance. Your progress is saved on this device until setup is complete.</p>
        </footer>
      </div>
    </main>
  );
}
