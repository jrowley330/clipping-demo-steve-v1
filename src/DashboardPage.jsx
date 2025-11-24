import React from 'react';
import { supabase } from './supabaseClient';

export default function DashboardPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Clipping Agency Dashboard</h2>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <p>Dashboard content will go here (Power BI + payouts later).</p>
    </div>
  );
}
