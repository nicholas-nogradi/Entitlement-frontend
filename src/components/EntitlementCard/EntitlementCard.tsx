import Link from "next/link";
import React from "react";
import { EntitlementCardSkeleton } from "./EntitlementCardSkeleton";
import { it } from "node:test";

type EntitlementCardProps = {
  entitlement: {
    entitlementID: string,
    sku: string,
    product_type?: string,
    start_date: string,
    end_date: string,
    quantity: number,
    status: 'fulfilled' | 'pending' | 'canceled',
  }
  isLoading: boolean
};

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

const getStatusColor = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'FULFILLED':
        return styles.fulfilled;
      case 'PENDING':
        return styles.pending;
      case 'CANCELED':
        return styles.canceled;
      default:
        return styles.pending;
    }
  };


export const EntitlementCard = ({entitlement, isLoading = false}: EntitlementCardProps) => {

  if (isLoading) {
    return <EntitlementCardSkeleton />;
  }

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.headerWithBadge}>
          <div style={styles.cardHeader}>
            <h3>ID: {entitlement.entitlementID}</h3>
            <div style={styles.sku}>{entitlement.sku}</div>
          </div>

          <div style={{...styles.statusBadge, ...getStatusColor(entitlement.status) }}>
            {entitlement.status}
          </div>
        </div>
        
        <div style={styles.cardContent}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Product:</span>
            <span>{entitlement.product_type || 'N/A'}</span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.label}>Start Date:</span>
            <span>{formatDate(entitlement.start_date)}</span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.label}>End Date:</span>
            <span>{formatDate(entitlement.end_date)}</span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.label}>Quantity:</span>
            <span>{entitlement.quantity}</span>
          </div>
        </div>
        
        <div style={styles.cardFooter}>
          <Link href={`/entitlements/${entitlement.entitlementID}`} style={styles.viewDetails}>View Details →</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'var(--card-background)',
    borderRadius: '0.5rem',
    boxShadow: 'var(--box-shadow)',
    padding: '1.5rem',
    transition: 'var(--transition)',
    cursor: 'pointer',
    minHeight:'300px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  headerWithBadge: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem',
  },
  statusBadge: {
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  fulfilled: {
    backgroundColor: 'var(--secondary-color)',
  },
  pending: {
    backgroundColor: 'var(--warning-color)',
  },
  canceled: {
    backgroundColor: 'var(--danger-color)',
  },
  cardHeader: {
    flex: 1,
    margin: 0,
  },
  sku: {
    color: 'var(--text-light)',
    fontSize: '0.875rem',
  },
  cardContent: {
    flex: 1,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  label: {
    color: 'var(--text-light)',
    fontWeight: 500,
  },
  cardFooter: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-color)',
  },
  viewDetails: {
    color: 'var(--primary-color)',
    fontWeight: 500,
    textAlign: 'right' as const,
  },
}