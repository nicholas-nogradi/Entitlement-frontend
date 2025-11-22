import React from 'react';

export const EntitlementCardSkeleton = () => {
  return (
    <div style={styles.card}>
      <div style={styles.statusBadgeSkeleton} />
      
      <div style={styles.cardHeader}>
        <div style={styles.skeletonLine} />
        <div style={{ ...styles.skeletonLine, marginTop: '0.5rem', width: '60%' }} />
      </div>
      
      <div style={styles.cardContent}>
        <div style={styles.infoRow}>
          <div style={{ ...styles.skeletonLine, width: '30%' }} />
          <div style={{ ...styles.skeletonLine, width: '40%' }} />
        </div>
        
        <div style={styles.infoRow}>
          <div style={{ ...styles.skeletonLine, width: '30%' }} />
          <div style={{ ...styles.skeletonLine, width: '40%' }} />
        </div>
        
        <div style={styles.infoRow}>
          <div style={{ ...styles.skeletonLine, width: '30%' }} />
          <div style={{ ...styles.skeletonLine, width: '40%' }} />
        </div>
        
        <div style={styles.infoRow}>
          <div style={{ ...styles.skeletonLine, width: '30%' }} />
          <div style={{ ...styles.skeletonLine, width: '40%' }} />
        </div>
      </div>
      
      <div style={styles.cardFooter}>
        <div style={{ ...styles.skeletonLine, width: '50%' }} />
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: 'var(--card-background)',
    borderRadius: '0.5rem',
    boxShadow: 'var(--box-shadow)',
    padding: '1.5rem',
    position: 'relative' as const,
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  statusBadgeSkeleton: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    width: '60px',
    height: '20px',
    borderRadius: '1rem',
    backgroundColor: 'var(--skeleton-color)',
    animation: 'pulse 2s infinite',
  },
  cardHeader: {
    marginBottom: '1rem',
  },
  cardContent: {
    flex: 1,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    gap: '1rem',
  },
  skeletonLine: {
    height: '1rem',
    backgroundColor: 'var(--skeleton-color)',
    borderRadius: '0.25rem',
    animation: 'pulse 2s infinite',
  },
  cardFooter: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-color)',
  },
};