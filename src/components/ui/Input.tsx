import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'email';
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  error,
  className = '',
  required = false,
}) => {
  const inputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    ${error ? 'border-red-300' : 'border-gray-300'}
    ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}
    ${className}
  `.trim();

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
      {label && (
        <label style={{display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151'}}>
          {label}
          {required && <span style={{color: '#EF4444', marginLeft: '4px'}}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        required={required}
      />
      {error && (
        <p style={{fontSize: '14px', color: '#DC2626', margin: '0'}}>{error}</p>
      )}
    </div>
  );
};