import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../shared/lib/api';
import { useAuth } from '../../../auth/context/AuthContext';

const ClassCreatePage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    gradeLevel: '',
    schoolYear: '',
    capacity: '',
    status: 'ACTIVE',
    schoolId: '',
    homeroomTeacherId: ''
  });
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchSchools();
    fetchTeachers();

    // Set default school for Admin users
    if (user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id) {
      setFormData(prev => ({
        ...prev,
        schoolId: user.school.id.toString()
      }));
    }
  }, [user]);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      let allSchools = response.data.schools || [];

      // Filter schools for admin - only show their own school
      const userRole = user?.role?.name?.toUpperCase();
      if (userRole === 'ADMIN' && user?.school?.id) {
        allSchools = allSchools.filter(school => school.id === user.school.id);
      }

      setSchools(allSchools);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const userRole = user?.role?.name?.toUpperCase();
      const schoolId = user?.school?.id;

      let url = '/users';
      if (userRole === 'ADMIN' && schoolId) {
        url += `?userRole=ADMIN&schoolId=${schoolId}`;
      }

      const response = await api.get(url);
      const allUsers = response.data.users || [];
      console.log('All users:', allUsers);
      const teacherUsers = allUsers.filter(user => {
        const roleName = user.role?.name?.toUpperCase();
        return roleName === 'TEACHER' || roleName?.startsWith('TEACHER') || roleName === 'GIÁO VIÊN';
      });
      console.log('Filtered teachers:', teacherUsers);
      setTeachers(teacherUsers);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const handleChange = (e) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value
    };

    // If schoolId changes, reset teacher selection
    if (e.target.name === 'schoolId') {
      newFormData.homeroomTeacherId = '';
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        gradeLevel: parseInt(formData.gradeLevel),
        capacity: parseInt(formData.capacity),
        schoolId: parseInt(formData.schoolId),
        homeroomTeacherId: formData.homeroomTeacherId ? parseInt(formData.homeroomTeacherId) : null
      };

      await api.post('/classes', submitData);
      navigate('/classes');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Class</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details below to create a new class.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Class Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
                  Grade Level *
                </label>
                <input
                  type="number"
                  name="gradeLevel"
                  id="gradeLevel"
                  required
                  min="1"
                  max="12"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="schoolYear" className="block text-sm font-medium text-gray-700">
                  School Year *
                </label>
                <input
                  type="text"
                  name="schoolYear"
                  id="schoolYear"
                  required
                  placeholder="2024-2025"
                  value={formData.schoolYear}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                  Capacity *
                </label>
                <input
                  type="number"
                  name="capacity"
                  id="capacity"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  id="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="schoolId" className="block text-sm font-medium text-gray-700">
                School *
              </label>
              <select
                name="schoolId"
                id="schoolId"
                required
                value={formData.schoolId}
                onChange={handleChange}
                disabled={user?.role?.name?.toUpperCase() === 'ADMIN' && user?.school?.id}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a school</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="homeroomTeacherId" className="block text-sm font-medium text-gray-700">
                Homeroom Teacher
              </label>
              <select
                name="homeroomTeacherId"
                id="homeroomTeacherId"
                value={formData.homeroomTeacherId}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={!formData.schoolId}
              >
                <option value="">{formData.schoolId ? "Select a teacher (optional)" : "Select a school first"}</option>
                {teachers
                  .filter(teacher => teacher.school?.id === parseInt(formData.schoolId))
                  .map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Class'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassCreatePage;




