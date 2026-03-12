import React, { useState, useEffect } from 'react';
import api from '../../../../shared/lib/api';
import './SchoolListPage.css';
import SchoolHeaderAndKPI from './components/SchoolHeaderAndKPI';
import SchoolFilterBar from './components/SchoolFilterBar';
import SchoolTable from './components/SchoolTable';
import useVietnamLocations from './hooks/useVietnamLocations';
import SchoolFormModal from './components/SchoolFormModal';
import SchoolDeleteRelatedModal from './components/SchoolDeleteRelatedModal';

const SchoolListPage = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    province: '',
    district: '',
    ward: '',
    address: '',
    phone: '',
    email: '',
    status: 'ACTIVE',
    logo: '',
    establishmentYear: '',
    managementType: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState(null);
  const [relatedData, setRelatedData] = useState({
    users: [],
    roles: [],
    classes: [],
    userCount: 0,
    roleCount: 0,
    classCount: 0
  });
  const [loadingRelatedData, setLoadingRelatedData] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const {
    provinces,
    districts,
    wards,
    loadingLocations,
    provinceSuggestions,
    districtSuggestions,
    wardSuggestions,
    showProvinceSuggestions,
    showDistrictSuggestions,
    showWardSuggestions,
    provinceInputRef,
    districtInputRef,
    wardInputRef,
    provinceSuggestionsRef,
    districtSuggestionsRef,
    wardSuggestionsRef,
    fetchDistrictsByProvince,
    fetchWardsByDistrict,
    handleProvinceChange,
    handleSelectProvince,
    handleDistrictChange,
    handleSelectDistrict,
    handleWardChange,
    handleSelectWard,
  } = useVietnamLocations(formData, setFormData);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data.schools || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous error

    const submitData = {
      ...formData,
      address: formData.address.trim(),
      logo: formData.logo || null,
      establishmentYear: formData.establishmentYear ? parseInt(formData.establishmentYear, 10) : null,
      managementType: formData.managementType || null
    };

    try {
      if (editingSchool) {
        await api.put(`/schools/${editingSchool.id}`, submitData);
      } else {
        await api.post('/schools', submitData);
      }

      setShowModal(false);
      setEditingSchool(null);
      setError('');
      setFormData({
        name: '',
        code: '',
        province: '',
        district: '',
        ward: '',
        address: '',
        phone: '',
        email: '',
        status: 'ACTIVE',
        logo: '',
        establishmentYear: '',
        managementType: ''
      });
      fetchSchools();
    } catch (err) {
      console.error('Error saving school:', err);
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Không thể lưu trường học. Vui lòng thử lại.';
      setError(errorMessage);
    }
  };

  const handleEdit = (school) => {
    setEditingSchool(school);
    setError(''); // Clear any previous error

    // Ưu tiên sử dụng các trường riêng biệt từ database
    // Nếu không có, mới parse từ address (cho dữ liệu cũ)
    let province = school.province || '';
    let district = school.district || '';
    let ward = school.ward || '';
    let addressDetail = school.address || '';

    // Nếu các trường riêng biệt không có, parse từ address (fallback cho dữ liệu cũ)
    if (!province && !district && !ward && school.address) {
      const addressParts = (school.address || '').split(',').map(s => s.trim());

      // Logic: format là "Địa chỉ chi tiết, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
      if (addressParts.length >= 4) {
        addressDetail = addressParts.slice(0, -3).join(', ');
        ward = addressParts[addressParts.length - 3] || '';
        district = addressParts[addressParts.length - 2] || '';
        province = addressParts[addressParts.length - 1] || '';
      } else if (addressParts.length === 3) {
        ward = addressParts[0] || '';
        district = addressParts[1] || '';
        province = addressParts[2] || '';
      } else if (addressParts.length === 2) {
        district = addressParts[0] || '';
        province = addressParts[1] || '';
      } else if (addressParts.length === 1) {
        province = addressParts[0] || '';
      }
    }

    setFormData({
      name: school.name || '',
      code: school.code || '',
      province: province,
      district: district,
      ward: ward,
      address: addressDetail,
      phone: school.phone || '',
      email: school.email || '',
      status: school.status || 'ACTIVE',
      logo: school.logo || '',
      establishmentYear: school.establishmentYear != null ? String(school.establishmentYear) : '',
      managementType: school.managementType || ''
    });

    // Nếu có province, fetch districts
    if (province) {
      const provinceObj = provinces.find(p => p.name === province);
      if (provinceObj) {
        fetchDistrictsByProvince(provinceObj.code).then(() => {
          // Sau khi fetch districts, thử fetch wards nếu có district
          if (district) {
            setTimeout(() => {
              const foundDistrict = districts.find(d => d.name === district);
              if (foundDistrict && foundDistrict.code) {
                fetchWardsByDistrict(foundDistrict.code);
              }
            }, 500);
          }
        });
      }
    }

    setShowModal(true);
  };

  const fetchRelatedData = async (schoolId) => {
    setLoadingRelatedData(true);
    try {
      console.log('Fetching related data for school ID:', schoolId);
      const response = await api.get(`/schools/${schoolId}/related-data`);
      console.log('Related data response:', response);
      console.log('Response data:', response.data);
      console.log('Response data users:', response.data?.users);
      console.log('Response data roles:', response.data?.roles);
      console.log('Response data classes:', response.data?.classes);
      console.log('Response data userCount:', response.data?.userCount);
      console.log('Response data roleCount:', response.data?.roleCount);
      console.log('Response data classCount:', response.data?.classCount);

      const relatedData = {
        users: response.data.users || [],
        roles: response.data.roles || [],
        classes: response.data.classes || [],
        userCount: response.data.userCount || 0,
        roleCount: response.data.roleCount || 0,
        classCount: response.data.classCount || 0
      };

      console.log('Parsed related data:', relatedData);
      console.log('Users array length:', relatedData.users.length);
      console.log('Roles array length:', relatedData.roles.length);
      console.log('Classes array length:', relatedData.classes.length);
      setRelatedData(relatedData);
    } catch (error) {
      console.error('Error fetching related data:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      alert('Không thể tải dữ liệu liên quan. Vui lòng thử lại.');
      setRelatedData({
        users: [],
        roles: [],
        classes: [],
        userCount: 0,
        roleCount: 0,
        classCount: 0
      });
    } finally {
      setLoadingRelatedData(false);
    }
  };

  const handleDeleteClick = async (id) => {
    const school = schools.find(s => s.id === id);
    setSchoolToDelete(school);
    await fetchRelatedData(id);
    setShowDeleteModal(true);
  };

  const handleDeleteAll = async () => {
    if (!schoolToDelete) return;

    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu liên quan và trường học này?')) {
      return;
    }

    try {
      await api.delete(`/schools/${schoolToDelete.id}`);
      alert('Xóa trường học thành công!');
      setShowDeleteModal(false);
      setSchoolToDelete(null);
      fetchSchools();
    } catch (error) {
      console.error('Error deleting school:', error);
      alert('Không thể xóa trường học. Vui lòng thử lại.');
    }
  };

  const handleDeleteAllRelated = async () => {
    if (!schoolToDelete) return;

    const totalItems = relatedData.userCount + relatedData.roleCount + relatedData.classCount;
    if (totalItems === 0) {
      alert('Không có dữ liệu liên quan để xóa.');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${totalItems} mục dữ liệu liên quan và trường học "${schoolToDelete.name}"?\n\nĐiều này sẽ xóa:\n- ${relatedData.userCount} người dùng\n- ${relatedData.roleCount} phân quyền\n- ${relatedData.classCount} lớp học\n- Trường học\n\nHành động này không thể hoàn tác!`)) {
      return;
    }

    try {
      // Xóa tất cả dữ liệu liên quan và trường học cùng lúc
      // Backend sẽ tự động xóa tất cả dữ liệu liên quan khi xóa trường học
      await api.delete(`/schools/${schoolToDelete.id}`);
      alert('Đã xóa toàn bộ dữ liệu liên quan và trường học thành công!');
      setShowDeleteModal(false);
      setSchoolToDelete(null);
      setRelatedData({
        users: [],
        roles: [],
        classes: [],
        userCount: 0,
        roleCount: 0,
        classCount: 0
      });
      fetchSchools();
    } catch (error) {
      console.error('Error deleting all related data and school:', error);
      let errorMessage = 'Không thể xóa toàn bộ dữ liệu. Vui lòng thử lại.';

      if (error.response?.data) {
        const data = error.response.data;
        errorMessage = data.error || data.message || data.msg || errorMessage;
      }

      alert(errorMessage);
    }
  };

  const handleDeleteItem = async (type, id) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${type} này?`)) {
      return;
    }

    setDeletingItem({ type, id });
    try {
      if (type === 'user') {
        await api.delete(`/users/${id}`);
      } else if (type === 'role') {
        await api.delete(`/roles/${id}`);
      } else if (type === 'class') {
        await api.delete(`/classes/${id}`);
      }

      // Refresh related data
      if (schoolToDelete) {
        await fetchRelatedData(schoolToDelete.id);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Không thể xóa ${type}. Vui lòng thử lại.`);
    } finally {
      setDeletingItem(null);
    }
  };

  const handleLock = async (school) => {
    const isLocked = school.status === 'LOCKED' || school.status === 'INACTIVE';
    const newStatus = isLocked ? 'ACTIVE' : 'LOCKED';
    const action = isLocked ? 'mở khóa' : 'khóa';

    if (!window.confirm(`Bạn có chắc chắn muốn ${action} trường học "${school.name}"?`)) {
      return;
    }

    try {
      const updatedSchool = {
        ...school,
        status: newStatus
      };

      await api.put(`/schools/${school.id}`, updatedSchool);
      alert(`Đã ${action} trường học thành công!`);
      fetchSchools();
    } catch (error) {
      console.error('Error locking/unlocking school:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Không thể cập nhật trạng thái trường học. Vui lòng thử lại.';
      alert(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa trường học này?')) {
      try {
        await api.delete(`/schools/${id}`);
        alert('Xóa trường học thành công!');
        fetchSchools();
      } catch (error) {
        console.error('Error deleting school:', error);
        console.error('Error response:', error.response);
        console.error('Error response data:', error.response?.data);
        console.error('Error response status:', error.response?.status);
        console.error('Error response headers:', error.response?.headers);

        // Ưu tiên lấy error từ response.data.error
        let errorMessage = null;

        if (error.response?.data) {
          // Kiểm tra tất cả các trường có thể chứa message
          errorMessage = error.response.data.error ||
            error.response.data.message ||
            error.response.data.msg ||
            (typeof error.response.data === 'string' ? error.response.data : null);

          console.log('Extracted error message from response.data:', errorMessage);

          // Nếu message là tiếng Anh, chuyển đổi sang tiếng Việt
          if (errorMessage && typeof errorMessage === 'string') {
            const msgLower = errorMessage.toLowerCase();

            // Kiểm tra nếu message chứa "Failed to delete school" hoặc foreign key constraint
            if (msgLower.includes('failed to delete school') ||
              msgLower.includes('foreign key constraint') ||
              msgLower.includes('cannot delete') ||
              msgLower.includes('fk3gj5j7vnsoxf1wp9n5hsqdiq3')) {

              // Kiểm tra cụ thể loại constraint
              if (msgLower.includes('users') && (msgLower.includes('school_id') || msgLower.includes('fk3gj5j7vnsoxf1wp9n5hsqdiq3'))) {
                errorMessage = 'Không thể xóa trường này vì có người dùng đang thuộc trường này. Vui lòng xóa hoặc chuyển tất cả người dùng trước.';
              } else if (msgLower.includes('roles') && msgLower.includes('school_id')) {
                errorMessage = 'Không thể xóa trường này vì có phân quyền đang thuộc trường này. Vui lòng xóa tất cả phân quyền trước.';
              } else if (msgLower.includes('classes') && msgLower.includes('school_id')) {
                errorMessage = 'Không thể xóa trường này vì có lớp học đang thuộc trường này. Vui lòng xóa tất cả lớp học trước.';
              } else if (msgLower.includes('foreign key') || msgLower.includes('cannot delete')) {
                errorMessage = 'Không thể xóa trường này vì có dữ liệu liên quan (người dùng, phân quyền, lớp học, v.v.). Vui lòng xóa tất cả dữ liệu liên quan trước.';
              } else {
                errorMessage = 'Không thể xóa trường học. Vui lòng kiểm tra lại dữ liệu liên quan hoặc thử lại sau.';
              }

              console.log('Converted English message to Vietnamese:', errorMessage);
            }
            // Nếu message đã là tiếng Việt (chứa "Không thể xóa"), giữ nguyên
            else if (errorMessage.includes('Không thể xóa')) {
              console.log('Message is already in Vietnamese, keeping as is');
            }
          }
        }

        // Nếu vẫn không có, kiểm tra error.message và chuyển đổi sang tiếng Việt
        if (!errorMessage && error.message) {
          console.log('Checking error.message:', error.message);
          const msg = error.message.toLowerCase();
          if (msg.includes('foreign key') || msg.includes('cannot delete') || msg.includes('users') || msg.includes('school_id') || msg.includes('fk3gj5j7vnsoxf1wp9n5hsqdiq3')) {
            errorMessage = 'Không thể xóa trường này vì có người dùng đang thuộc trường này. Vui lòng xóa hoặc chuyển tất cả người dùng trước.';
          } else if (msg.includes('roles')) {
            errorMessage = 'Không thể xóa trường này vì có phân quyền đang thuộc trường này. Vui lòng xóa tất cả phân quyền trước.';
          } else if (msg.includes('classes')) {
            errorMessage = 'Không thể xóa trường này vì có lớp học đang thuộc trường này. Vui lòng xóa tất cả lớp học trước.';
          } else {
            errorMessage = 'Không thể xóa trường học. Vui lòng kiểm tra lại dữ liệu liên quan hoặc thử lại sau.';
          }
        }

        // Fallback cuối cùng
        if (!errorMessage) {
          errorMessage = 'Không thể xóa trường học. Vui lòng thử lại.';
        }

        console.log('Final error message to display:', errorMessage);
        alert(errorMessage);
      }
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh (JPG, PNG, ...)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, logo: reader.result }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchool(null);
    setError('');
    setFormData({
      name: '',
      code: '',
      province: '',
      district: '',
      ward: '',
      address: '',
      phone: '',
      email: '',
      status: 'ACTIVE',
      logo: '',
      establishmentYear: '',
      managementType: ''
    });
  };

  // các handler địa chỉ đã được di chuyển vào hook useVietnamLocations

  if (loading) {
    return (
      <div className="school-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.status === 'ACTIVE').length;
  const lockedSchools = schools.filter((s) => s.status === 'LOCKED').length;
  const inactiveSchools = schools.filter((s) => s.status === 'INACTIVE').length;

  const filteredSchools = schools.filter((school) => {
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      const matchText =
        school.name?.toLowerCase().includes(term) ||
        school.code?.toLowerCase().includes(term);
      if (!matchText) {
        return false;
      }
    }

    if (statusFilter !== 'ALL') {
      return school.status === statusFilter;
    }

    return true;
  });

  return (
    <div className="school-list-page">
      <SchoolHeaderAndKPI
        totalSchools={totalSchools}
        activeSchools={activeSchools}
        lockedSchools={lockedSchools}
        inactiveSchools={inactiveSchools}
        onAddSchool={() => {
          setError('');
          setShowModal(true);
        }}
      />

      <div className="schools-main-card">
        <SchoolFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          totalSchools={totalSchools}
          filteredCount={filteredSchools.length}
        />

        <SchoolTable
          schools={filteredSchools}
          onEdit={handleEdit}
          onToggleLock={handleLock}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      <SchoolFormModal
        show={showModal}
        editingSchool={editingSchool}
        error={error}
        formData={formData}
        setFormData={setFormData}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        locations={{
          provinces,
          districts,
          wards,
          loadingLocations,
          provinceSuggestions,
          districtSuggestions,
          wardSuggestions,
          showProvinceSuggestions,
          showDistrictSuggestions,
          showWardSuggestions,
          provinceInputRef,
          districtInputRef,
          wardInputRef,
          provinceSuggestionsRef,
          districtSuggestionsRef,
          wardSuggestionsRef,
          handleProvinceChange,
          handleSelectProvince,
          handleDistrictChange,
          handleSelectDistrict,
          handleWardChange,
          handleSelectWard,
        }}
        handleLogoChange={handleLogoChange}
      />

      <SchoolDeleteRelatedModal
        show={showDeleteModal}
        schoolToDelete={schoolToDelete}
        relatedData={relatedData}
        loadingRelatedData={loadingRelatedData}
        deletingItem={deletingItem}
        onClose={() => {
          setShowDeleteModal(false);
          setSchoolToDelete(null);
          setRelatedData({
            users: [],
            roles: [],
            classes: [],
            userCount: 0,
            roleCount: 0,
            classCount: 0,
          });
        }}
        onDeleteAllRelated={handleDeleteAllRelated}
        onDeleteAll={handleDeleteAll}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  );
};

export default SchoolListPage;


