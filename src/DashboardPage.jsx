import React from 'react';
import { supabase } from './supabaseClient';

export default function DashboardPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
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
          src="https://app.powerbi.com/view?r=eyJrIjoiYzUzYjI5YjMtYmZmYi00N2YzLThmZmYtZWU3YmY4OGViOWYyIiwidCI6ImQxYzU2YTYwLWRjZjItNGJhMC04ZDE5LWU0MTY0NmU2ZWFkOCIsImMiOjN9"
          style={{
            border: 'none',
            width: '100%',
            height: '100%'
          }}
          allowFullScreen={true}
        />
      </div>
    </div>
  );
}
