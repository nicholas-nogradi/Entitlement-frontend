import React, { useState } from 'react';

export type EntitlementFormData = {
  sku: string;
  product_type: string;
  start_date: string;
  end_date: string;
  quantity: number;
  status?: 'fulfilled' | 'pending' | 'canceled';
};

type EntitlementFormProps = {
  onSubmit: (data: EntitlementFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<EntitlementFormData>;
  submitButtonLabel?: string;
};

export const EntitlementForm: React.FC<EntitlementFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  submitButtonLabel = 'Create Entitlement',
}) => {
  const [formData, setFormData] = useState<EntitlementFormData>({
    sku: initialData?.sku || '',
    product_type: initialData?.product_type || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    quantity: initialData?.quantity || 1,
    status: initialData?.status || 'pending',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EntitlementFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.product_type.trim()) {
      newErrors.product_type = 'Product type is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof EntitlementFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {submitError && (
        <div style={styles.errorAlert}>
          <p style={styles.errorText}>{submitError}</p>
        </div>
      )}

      <div style={styles.formGroup}>
        <label htmlFor="sku" style={styles.label}>
          SKU <span style={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="sku"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          placeholder="Enter SKU"
          style={{
            ...styles.input,
            ...(errors.sku ? styles.inputError : {}),
          }}
          disabled={isLoading}
        />
        {errors.sku && <span style={styles.fieldError}>{errors.sku}</span>}
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="product_type" style={styles.label}>
          Product Type <span style={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="product_type"
          name="product_type"
          value={formData.product_type}
          onChange={handleChange}
          placeholder="e.g., Software License, Hardware"
          style={{
            ...styles.input,
            ...(errors.product_type ? styles.inputError : {}),
          }}
          disabled={isLoading}
        />
        {errors.product_type && <span style={styles.fieldError}>{errors.product_type}</span>}
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label htmlFor="start_date" style={styles.label}>
            Start Date <span style={styles.required}>*</span>
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            style={{
              ...styles.input,
              ...(errors.start_date ? styles.inputError : {}),
            }}
            disabled={isLoading}
          />
          {errors.start_date && <span style={styles.fieldError}>{errors.start_date}</span>}
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="end_date" style={styles.label}>
            End Date <span style={styles.required}>*</span>
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            style={{
              ...styles.input,
              ...(errors.end_date ? styles.inputError : {}),
            }}
            disabled={isLoading}
          />
          {errors.end_date && <span style={styles.fieldError}>{errors.end_date}</span>}
        </div>
      </div>

      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label htmlFor="quantity" style={styles.label}>
            Quantity <span style={styles.required}>*</span>
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            placeholder="1"
            style={{
              ...styles.input,
              ...(errors.quantity ? styles.inputError : {}),
            }}
            disabled={isLoading}
          />
          {errors.quantity && <span style={styles.fieldError}>{errors.quantity}</span>}
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="status" style={styles.label}>
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            style={styles.select}
            disabled={isLoading}
          >
            <option value="pending">Pending</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      <div style={styles.formActions}>
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(isLoading ? styles.buttonDisabled : {}),
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : submitButtonLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
    maxWidth: '600px',
  },

  errorAlert: {
    backgroundColor: 'var(--danger-color, #e74c3c)',
    color: 'white',
    padding: '1rem',
    borderRadius: '0.25rem',
    marginBottom: '1rem',
  },

  errorText: {
    margin: 0,
    fontSize: '0.95rem',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },

  formRow: {
    display: 'flex',
    gap: '1.5rem',
  },

  label: {
    fontWeight: 500,
    color: 'var(--text-color, #333)',
    fontSize: '0.95rem',
  },

  required: {
    color: 'var(--danger-color, #e74c3c)',
  },

  input: {
    padding: '0.75rem 1rem',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: '0.25rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
  },

  inputError: {
    borderColor: 'var(--danger-color, #e74c3c)',
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
  },

  select: {
    padding: '0.75rem 1rem',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: '0.25rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    backgroundColor: 'white',
  },

  fieldError: {
    color: 'var(--danger-color, #e74c3c)',
    fontSize: '0.85rem',
  },

  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
  },

  submitButton: {
    backgroundColor: 'var(--primary-color, #3498db)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.25rem',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },

  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  cancelButton: {
    backgroundColor: 'var(--border-color, #ddd)',
    color: 'var(--text-color, #333)',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '0.25rem',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
};
