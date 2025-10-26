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
    <main>
      <div className="stack" style={{ maxWidth: 420, margin: '40px auto' }}>
        <h1 className="brand" style={{ justifyContent: 'center', fontSize: 24 }}><span className="logo-dot"/> burnNbyte</h1>
        <form onSubmit={handleSubmit} className="card form">
          <label>
            <span>Name</span>
            <input type="name" value={name} onChange={e => setName(e.target.value)} required />
          </label>
          
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>

          <button type="submit" className="btn btn-primary">Sign Up</button>
        </form>
      </div>
    </main>
  );
}
