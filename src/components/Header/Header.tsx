import React from 'react';
import Link from 'next/link';


export const Header = () => {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
      <Link href="/" style={styles.logo}>
        <h1>Entitlement Manager</h1>
      </Link>
      
      <nav style={styles.nav}>
        <Link href="/" style={styles.navLink}>
          Dashboard
        </Link>
        <Link href="/entitlements/new" style={styles.navLink}>
          Add Entitlement
        </Link>
      </nav>
    </div>
    </header>
  );
};


const styles = {
  header: {
    backgroundColor: 'var(--card-background)',
    borderBottom: '1px solid var(--border-color)',
    boxShadow: 'var(--box-shadow)',
    padding: '1rem 0'
  },
  
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem'
  },
  
  logo: {
    textDecoration: 'none'
  },
  
  logoH1: {
    margin: 0,
    fontSize: '1.5rem',
    color: 'var(--primary-color)'
  },
  nav: {
    display: 'flex',
    gap: '1.5rem'
  },
  navLink: {
    color: 'var(--text-color)',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 0.3s ease'
  }
};