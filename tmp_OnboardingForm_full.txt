'use client';

import { useRouter, useParams } from 'next/navigation';
import { useOnboarding } from '@/lib/formState';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Step components
import Step1 from './onboardingSteps/Step1'; // Goal
import Step2 from './onboardingSteps/Step2'; // Weight
import Step3 from './onboardingSteps/Step3'; // Activity level
import StepLayout from './onboardingSteps/StepLayout';

const steps = {
  1: Step1,
  2: Step2,
  3: Step3,
};

export default function OnboardingForm() {
  // pull update() from useSession
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Optional: prevent flicker while we don’t know session state
  useEffect(() => {
    const checkRedirect = async () => {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      const data = await res.json();
      // align this with your API shape: preferencesFilledOut vs onboarded
      const onboarded = data.onboarded ?? data.preferencesFilledOut ?? false;
      if (onboarded) router.replace('/');
    };
    if (status === 'authenticated') checkRedirect();
  }, [status, router]);

  const { step } = useParams();
  const StepComponent = steps[step]; // OK if your dynamic route param is "1", "2", "3"
  const { formData, updateForm } = useOnboarding();

  const prev = () => {
    const prevStep = Math.max(1, Number(step) - 1);
    router.push(`/onboarding/${prevStep}`);
  };

  const next = async () => {
    const nextStep = Number(step) + 1;

    if (Number(step) === 3) {
      try {
        // Prefer NOT sending userId (server should read from session),
        // but if your API currently expects it, use session.user.id:
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // userId: session?.user?.id, // <-- include only if your API requires it
            firstName: formData.firstName,
            lastName: formData.lastName,
            birthday: formData.birthday,
            gender: formData.gender,
            heightFt: formData.heightFt,
            heightIn: formData.heightIn,
            weight: formData.weight,
            activityLevel: formData.activityLevel,
            fitnessGoal: formData.fitnessGoal,
            dietaryPreferences: formData.dietaryPreferences,
            allergies: formData.allergies,
            mealsPerDay: formData.mealsPerDay,
            workoutPreference: formData.workoutPreference,
            workoutDuration: formData.workoutDuration,
            workoutDays: formData.workoutDays,
            workoutsPerWeek: formData.workoutsPerWeek,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Submission failed');

        // 🔑 Force the client session to re-fetch (runs your jwt() again)
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

  return (
    <div className="max-w-xl mx-auto mt-10 card">
      {StepComponent ? (
        <StepComponent formData={formData} updateForm={updateForm} />
      ) : (
        <p className="muted">Loading…</p>
      )}
      <div className="flex justify-between mt-8">
        <button
          onClick={prev}
          className="btn btn-secondary"
          disabled={Number(step) === 1}
        >
          Back
        </button>
        <button
          onClick={next}
          className="btn btn-primary"
        >
          {Number(step) === 3 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}


