'use client';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
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

  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkRedirect = async () => {
      const res = await fetch('/api/check-onboarded'); // You'll need to create this endpoint
      const { onboarded } = await res.json();
      if (onboarded) router.push('/'); // Redirect away if already onboarded
    };

    if (session) checkRedirect();
  }, [session]);
  
  const { step } = useParams();
  const StepComponent = steps[step];
  const { formData, updateForm } = useOnboarding();

  const prev = () => {
    const prevStep = Math.max(1, +step - 1);
    router.push(`/onboarding/${prevStep}`);
  };

  const next = async () => {
    const nextStep = +step + 1;

    if (+step === 3) {
      // Replace this with your real auth user ID
      const userId = 'mock-user-id';

      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
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
            workoutsPerWeek: formData.workoutsPerWeek,
          }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Submission failed');
        console.log('✅ Profile saved:', data);
        router.push('/'); // or your app home
      } catch (err) {
        alert(err.message || 'Something went wrong saving your data.');
      }

      return;
    }

    router.push(`/onboarding/${nextStep}`);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded-lg">
      {StepComponent && <StepComponent formData={formData} updateForm={updateForm} />}
      <div className="flex justify-between mt-8">
        <button
          onClick={prev}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          disabled={+step === 1}
        >
          Back
        </button>
        <button
          onClick={next}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
        >
          {+step === 3 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}