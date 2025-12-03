import React, { ReactNode } from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick} role='dialog'>
      <div style={{ ...styles.modal, ...styles[size] }}>
        <div style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};

const styles = {
  backdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  modal: {
    backgroundColor: 'var(--card-background, white)',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    maxHeight: '90vh',
    overflow: 'auto',
    animation: 'modalSlideIn 0.3s ease',
  },

  small: {
    width: '90%',
    maxWidth: '400px',
  },

  medium: {
    width: '90%',
    maxWidth: '600px',
  },

  large: {
    width: '90%',
    maxWidth: '900px',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid var(--border-color, #ddd)',
  },

  title: {
    margin: 0,
    fontSize: '0.5rem',
    color: 'var(--text-color, #333)',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    cursor: 'pointer',
    color: 'var(--text-light, #999)',
    padding: 0,
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },

  content: {
    padding: '1.5rem',
  },
};

// Add animation keyframes to global styles
const modalAnimation = `
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-50px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// You should add this to your global CSS file (e.g., styles/globals.css)
export const modalStyles = modalAnimation;
