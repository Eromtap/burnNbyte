import { notFound } from 'next/navigation';
import OnboardingForm from '@/components/OnboardingForm';

const VALID_STEPS = new Set(['1', '2', '3', '4', '5']);

export default async function StepPage({ params }) {
  const { step } = await params;
  if (!VALID_STEPS.has(step)) notFound();

  return <OnboardingForm />;
}
