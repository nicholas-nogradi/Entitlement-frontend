import React, { useState } from 'react';
import Link from 'next/link';
import { Modal } from '../Modal/Modal';
import { EntitlementForm, EntitlementFormData } from '../Forms/EntitlementForm';


export const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitForm = async (data: EntitlementFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create entitlement');
      }

      // Close modal on success
      setIsModalOpen(false);
      
      // Optional: You can add a success toast notification here
      // Or refresh the entitlements list
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link href="/" style={styles.logo}>
          <h1 style={styles.logoH1}>Entitlement Manager</h1>
        </Link>
        
        <nav style={styles.nav}>
          <Link href="/" style={styles.navLink}>
            Dashboard
          </Link>
          <button
            onClick={handleOpenModal}
            style={styles.navButton}
          >
            Add Entitlement
          </button>
        </nav>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Entitlement"
        size="medium"
      >
        <EntitlementForm
          onSubmit={handleSubmitForm}
          onCancel={handleCloseModal}
          isLoading={isLoading}
          submitButtonLabel="Create Entitlement"
        />
      </Modal>
    </header>
  );
};


const styles = {
  header: {
    backgroundColor: 'var(--card-background)',
    borderBottom: '1px solid var(--border-color)',
    boxShadow: 'var(--box-shadow)',
    padding: '1rem 0',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  
  logo: {
    textDecoration: 'none'
  },
  
  logoH1: {
    margin: 0,
    fontSize: '1.5rem',
    color: 'var(--primary-color)',
    padding: 0
  },
  nav: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center'
  },
  navLink: {
    color: 'var(--text-color)',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 0.3s ease',
    padding: 0
  },
  navButton: {
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '0.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    fontSize: '1rem'
  }
};