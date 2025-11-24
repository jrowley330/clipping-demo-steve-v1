import React from 'react';
import { supabase } from './supabaseClient';

export default function DashboardPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // redirect back to login
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2>Clipping Agency Dashboard</h2>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <div style={{ width: '100%', height: '85vh' }}>
        <iframe
          title="Clipper Dashboards Demo Dev v1"
          src="https://app.powerbi.com/view?r=eyJrIjoiYzUzYjlJ5..." 
          style={{ border: 'none', width: '100%', height: '100%' }}
          allowFullScreen={true}
        />
      </div>
    </div>
  );
}
