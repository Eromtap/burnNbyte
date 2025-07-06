'use client';
import { useRouter, useParams } from 'next/navigation';
import OnboardingForm from '@/components/OnboardingForm';

export default function StepPage() {
  const router = useRouter();
  const { step } = useParams();

  return <OnboardingForm step={step} router={router} />;
}