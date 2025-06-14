'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (res.ok) {
      alert("Account created! Redirecting to login...");
      router.push("/signin");
    } else {
      const data = await res.json();
      alert("Signup failed: " + (data.error || "Unknown error"));
    }
  }

  return (
    <form onSubmit={handleSubmit}>

      <label>Name</label>
      <input type="name" value={name} onChange={e => setName(e.target.value)} required />
      
      <label>Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

      <label>Password</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />

      <button type="submit">Sign Up</button>
    </form>
  );
}
