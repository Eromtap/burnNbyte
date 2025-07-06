"use client";

import { createContext, useContext, useState } from "react";

const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthday: '', 
    gender: "",
    heightFt: "",
    heightIn: "",
    weight: "",
    activityLevel: "",
    fitnessGoal: "",
    dietaryPreferences: [],
    allergies: "",
    mealsPerDay: "",
    workoutPreference: "",
    workoutDuration: "",
    workoutsPerWeek: "",
  });

  const updateForm = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <OnboardingContext.Provider value={{ formData, updateForm }}>
      {children}
    </OnboardingContext.Provider>
  );
}

//export const useOnboarding = () => useContext(OnboardingContext);

export function useOnboarding() {
  return useContext(OnboardingContext);
}