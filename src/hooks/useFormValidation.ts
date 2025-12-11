import { useState } from 'react';

type ValidationRules<T> = {
  [K in keyof T]?: (value: T[K], formData: T) => string;
};

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  validationRules: ValidationRules<T>
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = (name: keyof T, value: any): string => {
    const rule = validationRules[name];
    return rule ? rule(value, formData) : '';
  };

  const handleFieldChange = (name: keyof T, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, (formData as any)[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    const newTouched: Partial<Record<keyof T, boolean>> = {};

    Object.keys(validationRules).forEach(key => {
      const k = key as keyof T;
      newTouched[k] = true;
      const error = validateField(k, formData[k]);
      if (error) newErrors[k] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = (data?: T) => {
    setFormData(data || initialData);
    setErrors({});
    setTouched({});
  };

  return {
    formData,
    errors,
    touched,
    setFormData,
    handleFieldChange,
    handleBlur,
    validateAll,
    resetForm,
  };
}
