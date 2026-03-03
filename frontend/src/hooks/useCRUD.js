import { useState, useCallback } from 'react';
import api from '../services/api';

export const useCRUD = (endpoint, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { 
    onSuccess, 
    onError, 
    showSuccessMessage = true,
    showErrorMessage = true 
  } = options;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(endpoint);
      const result = response.data[endpoint.split('/').pop()] || response.data;
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Có lỗi xảy ra khi tải dữ liệu';
      setError(errorMessage);
      if (showErrorMessage && onError) {
        onError(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onError, showErrorMessage]);

  const create = useCallback(async (newData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(endpoint, newData);
      const createdItem = response.data;
      
      setData(prev => [...prev, createdItem]);
      
      if (showSuccessMessage) {
        setSuccess('Tạo mới thành công!');
        setTimeout(() => setSuccess(null), 3000);
      }
      
      if (onSuccess) {
        onSuccess(createdItem, 'create');
      }
      
      return createdItem;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Có lỗi xảy ra khi tạo mới';
      setError(errorMessage);
      if (showErrorMessage && onError) {
        onError(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onSuccess, onError, showSuccessMessage, showErrorMessage]);

  const update = useCallback(async (id, updatedData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`${endpoint}/${id}`, updatedData);
      const updatedItem = response.data;
      
      setData(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
      
      if (showSuccessMessage) {
        setSuccess('Cập nhật thành công!');
        setTimeout(() => setSuccess(null), 3000);
      }
      
      if (onSuccess) {
        onSuccess(updatedItem, 'update');
      }
      
      return updatedItem;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Có lỗi xảy ra khi cập nhật';
      setError(errorMessage);
      if (showErrorMessage && onError) {
        onError(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onSuccess, onError, showSuccessMessage, showErrorMessage]);

  const remove = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await api.delete(`${endpoint}/${id}`);
      
      setData(prev => prev.filter(item => item.id !== id));
      
      if (showSuccessMessage) {
        setSuccess('Xóa thành công!');
        setTimeout(() => setSuccess(null), 3000);
      }
      
      if (onSuccess) {
        onSuccess({ id }, 'delete');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Có lỗi xảy ra khi xóa';
      setError(errorMessage);
      if (showErrorMessage && onError) {
        onError(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, onSuccess, onError, showSuccessMessage, showErrorMessage]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    data,
    loading,
    error,
    success,
    fetchData,
    create,
    update,
    remove,
    clearMessages
  };
};

export const useForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValue(name, newValue);
  }, [setValue]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setFieldTouched(name);
  }, [setFieldTouched]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const validate = useCallback((validationRules) => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = values[field];
      
      if (rules.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = rules.required;
      } else if (rules.min && value && value.length < rules.min) {
        newErrors[field] = rules.minMessage || `Tối thiểu ${rules.min} ký tự`;
      } else if (rules.max && value && value.length > rules.max) {
        newErrors[field] = rules.maxMessage || `Tối đa ${rules.max} ký tự`;
      } else if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[field] = rules.patternMessage || 'Định dạng không hợp lệ';
      } else if (rules.custom && value) {
        const customError = rules.custom(value, values);
        if (customError) {
          newErrors[field] = customError;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldError,
    setFieldTouched,
    handleChange,
    handleBlur,
    reset,
    validate
  };
};
