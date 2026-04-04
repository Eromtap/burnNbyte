'use client';

import { useRouter, useParams } from 'next/navigation';
import { useOnboarding } from '@/lib/formState';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Step1 from './onboardingSteps/Step1';
import Step2 from './onboardingSteps/Step2';
import Step3 from './onboardingSteps/Step3';

const steps = {
  1: Step1,
  2: Step2,
  3: Step3,
};

export default function OnboardingForm() {
  const { status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkRedirect = async () => {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      const data = await res.json();
      const onboarded = data.onboarded ?? data.preferencesFilledOut ?? false;
      if (onboarded) router.replace('/');
    };
    if (status === 'authenticated') checkRedirect();
  }, [status, router]);

  const { step } = useParams();
  const currentStep = Number(step);
  const StepComponent = steps[step];
  const { formData, updateForm } = useOnboarding();
  const progress = Math.max(0, Math.min(100, Math.round((currentStep / 3) * 100)));

  const prev = () => {
    const prevStep = Math.max(1, currentStep - 1);
    router.push(`/onboarding/${prevStep}`);
  };

  const next = async () => {
    const nextStep = currentStep + 1;

    if (currentStep === 3) {
      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            birthday: formData.birthday,
            gender: formData.gender,
            heightFt: formData.heightFt,
            heightIn: formData.heightIn,
            weight: formData.weight,
            goalWeight: formData.goalWeight,
            activityLevel: formData.activityLevel,
            fitnessGoal: formData.fitnessGoal,
            fitnessGoals: formData.fitnessGoals,
            dietaryPreferences: formData.dietaryPreferences,
            dislikedFoods: formData.dislikedFoods,
            allergies: formData.allergies,
            mealsPerDay: formData.mealsPerDay,
            workoutPreference: formData.workoutPreference,
            workoutDuration: formData.workoutDuration,
            workoutDays: formData.workoutDays,
            workoutsPerWeek: formData.workoutsPerWeek,
            equipmentAccess: formData.equipmentAccess,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Submission failed');

        await update();
        router.replace('/');
        router.refresh();
      } catch (err) {
        alert(err.message || 'Something went wrong saving your data.');
      }
      return;
    }

    router.push(`/onboarding/${nextStep}`);
  };

  const onSubmitNext = async (e) => {
    e.preventDefault();
    if (currentStep === 2) {
      const goals = Array.isArray(formData.fitnessGoals) ? formData.fitnessGoals : [];
      if (!formData.fitnessGoal && goals.length === 0) {
        alert('Please select at least one fitness goal.');
        return;
      }
    }
    await next();
  };

  return (
    <main>
      <div className="page-shell stack">
        <section className="hero-card page-hero onboard-hero">
          <div className="page-hero-copy">
            <div className="eyebrow">Onboarding</div>
            <div>
              <h1 className="page-hero-title">Set up burnNbyte once so the plan can actually fit you.</h1>
              <p className="page-hero-text">
                This onboarding collects the inputs that change your workouts and meals: body metrics, training goals, equipment, food preferences, and schedule.
              </p>
            </div>
          </div>
          <aside className="hero-panel hero-metrics">
            <div className="metric-card">
              <div className="metric-label">Progress</div>
              <div className="metric-value">{progress}%</div>
              <div className="progress"><span style={{ width: `${progress}%` }} /></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Current step</div>
              <div className="metric-value" style={{ fontSize: '1.6rem' }}>
                {currentStep === 1 ? 'Body profile' : currentStep === 2 ? 'Training setup' : 'Nutrition setup'}
              </div>
              <div className="metric-detail">Three screens. No filler.</div>
            </div>
          </aside>
        </section>

        <article className="card onboard-card">
          <header className="card-head onboard-card-head">
            <div>
              <h3>Profile setup</h3>
              <div className="sub">Step {currentStep} of 3</div>
            </div>
            <div className="onboard-steps">
              {[1, 2, 3].map((item) => (
                <div key={item} className={`onboard-step-dot ${item <= currentStep ? 'active' : ''}`}>{item}</div>
              ))}
            </div>
          </header>
          <form className="form onboard-form" onSubmit={onSubmitNext}>
            {StepComponent ? (
              <StepComponent formData={formData} updateForm={updateForm} />
            ) : (
              <p className="muted">Loading...</p>
            )}
            <div className="onboard-actions">
              <button type="button" onClick={prev} className="btn btn-secondary" disabled={currentStep === 1}>
                Back
              </button>
              <button type="submit" className="btn btn-primary">
                {currentStep === 3 ? 'Finish setup' : 'Continue'}
              </button>
            </div>
          </form>
        </article>
      </div>
    </main>
  );
}
