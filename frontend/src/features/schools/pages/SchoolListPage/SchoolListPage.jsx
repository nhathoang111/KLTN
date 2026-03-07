import React, { useState, useEffect, useRef } from 'react';
import api from '../../../../shared/lib/api';
import './SchoolListPage.css';

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
    status: 'ACTIVE'
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceSuggestions, setProvinceSuggestions] = useState([]);
  const [districtSuggestions, setDistrictSuggestions] = useState([]);
  const [wardSuggestions, setWardSuggestions] = useState([]);
  const [showProvinceSuggestions, setShowProvinceSuggestions] = useState(false);
  const [showDistrictSuggestions, setShowDistrictSuggestions] = useState(false);
  const [showWardSuggestions, setShowWardSuggestions] = useState(false);
  const provinceInputRef = useRef(null);
  const districtInputRef = useRef(null);
  const wardInputRef = useRef(null);
  const provinceSuggestionsRef = useRef(null);
  const districtSuggestionsRef = useRef(null);
  const wardSuggestionsRef = useRef(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
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

  useEffect(() => {
    fetchSchools();
    fetchVietnamLocations();
  }, []);

  // Fetch dữ liệu địa chỉ Việt Nam từ API công khai
  const fetchVietnamLocations = async () => {
    setLoadingLocations(true);

    try {
      // Sử dụng API công khai từ provinces.open-api.vn
      const response = await fetch('https://provinces.open-api.vn/api/?depth=1');
      if (response.ok) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const provincesList = data
            .filter(item => item && item.name)
            .map(item => ({
              code: item.code || item.codex || '',
              name: item.name || ''
            }))
            .filter(item => item.name);

          if (provincesList.length > 0) {
            console.log('Loaded provinces from open-api.vn:', provincesList.length);
            setProvinces(provincesList);
            setLoadingLocations(false);
            return;
          }
        }
      }

      // Fallback: Thử GitHub API
      const githubResponse = await fetch('https://raw.githubusercontent.com/kenzouno1/DiaGioiHanhChinhVN/master/data.json');
      if (githubResponse.ok) {
        const githubData = await githubResponse.json();
        let dataArray = Array.isArray(githubData) ? githubData : (githubData.data || []);

        if (dataArray && dataArray.length > 0) {
          const provincesList = dataArray
            .filter(item => item && item.name)
            .map(item => ({
              code: item.code || item.id || '',
              name: item.name || ''
            }))
            .filter(item => item.name);

          if (provincesList.length > 0) {
            console.log('Loaded provinces from GitHub:', provincesList.length);
            setProvinces(provincesList);
            setLoadingLocations(false);
            return;
          }
        }
      }

      console.log('All APIs failed, using empty list');
      setProvinces([]);
    } catch (error) {
      console.error('Error fetching Vietnam locations:', error);
      setProvinces([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Lấy danh sách quận/huyện dựa trên tỉnh/thành phố đã chọn
  const fetchDistrictsByProvince = async (provinceCodeOrName) => {
    if (!provinceCodeOrName) {
      setDistricts([]);
      return;
    }

    try {
      // Tìm province code từ name nếu cần
      let provinceCode = provinceCodeOrName;
      if (typeof provinceCodeOrName === 'string' && !/^\d+$/.test(provinceCodeOrName)) {
        // Nếu là name, tìm code trong danh sách provinces
        const foundProvince = provinces.find(p => p.name === provinceCodeOrName);
        if (foundProvince && foundProvince.code) {
          provinceCode = foundProvince.code;
        } else {
          console.log('Province not found in list:', provinceCodeOrName);
          setDistricts([]);
          return;
        }
      }

      console.log('Fetching districts for province code:', provinceCode);

      // Sử dụng API công khai từ provinces.open-api.vn
      const apiUrl = `https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`;
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();

        if (data.districts && Array.isArray(data.districts)) {
          const districtsList = data.districts
            .filter(d => d && d.name)
            .map(district => ({
              code: district.code || district.codex || '',
              name: district.name || ''
            }))
            .filter(d => d.name);

          console.log('Loaded districts from open-api.vn:', districtsList.length);
          setDistricts(districtsList);
          return;
        }
      }

      // Fallback: Thử tìm trong provinces data đã load
      if (provinces.length > 0) {
        const foundProvince = provinces.find(p =>
          p.code === provinceCode ||
          p.name === provinceCodeOrName
        );

        if (foundProvince) {
          // Thử fetch lại với code chính xác
          const retryUrl = `https://provinces.open-api.vn/api/p/${foundProvince.code}?depth=2`;
          const retryResponse = await fetch(retryUrl);
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData.districts && Array.isArray(retryData.districts)) {
              const districtsList = retryData.districts
                .filter(d => d && d.name)
                .map(district => ({
                  code: district.code || district.codex || '',
                  name: district.name || ''
                }))
                .filter(d => d.name);

              console.log('Loaded districts on retry:', districtsList.length);
              setDistricts(districtsList);
              return;
            }
          }
        }
      }

      console.log('No districts found for province:', provinceCodeOrName);
      setDistricts([]);
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
    }
  };

  // Lấy danh sách phường/xã dựa trên quận/huyện đã chọn
  const fetchWardsByDistrict = async (districtCodeOrName) => {
    if (!districtCodeOrName) {
      setWards([]);
      return;
    }

    try {
      // Tìm district code từ name nếu cần
      let districtCode = districtCodeOrName;
      if (typeof districtCodeOrName === 'string' && !/^\d+$/.test(districtCodeOrName)) {
        // Nếu là name, tìm code trong danh sách districts
        const foundDistrict = districts.find(d => d.name === districtCodeOrName);
        if (foundDistrict && foundDistrict.code) {
          districtCode = foundDistrict.code;
        } else {
          console.log('District not found in list:', districtCodeOrName);
          setWards([]);
          return;
        }
      }

      console.log('Fetching wards for district code:', districtCode);

      // Sử dụng API công khai từ provinces.open-api.vn
      const apiUrl = `https://provinces.open-api.vn/api/d/${districtCode}?depth=2`;
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();

        if (data.wards && Array.isArray(data.wards)) {
          const wardsList = data.wards
            .filter(w => w && w.name)
            .map(ward => ({
              code: ward.code || ward.codex || '',
              name: ward.name || ''
            }))
            .filter(w => w.name);

          console.log('Loaded wards from open-api.vn:', wardsList.length);
          setWards(wardsList);
          return;
        }
      }

      // Fallback: Thử tìm trong districts data đã load
      if (districts.length > 0) {
        const foundDistrict = districts.find(d =>
          d.code === districtCode ||
          d.name === districtCodeOrName
        );

        if (foundDistrict) {
          // Thử fetch lại với code chính xác
          const retryUrl = `https://provinces.open-api.vn/api/d/${foundDistrict.code}?depth=2`;
          const retryResponse = await fetch(retryUrl);
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData.wards && Array.isArray(retryData.wards)) {
              const wardsList = retryData.wards
                .filter(w => w && w.name)
                .map(ward => ({
                  code: ward.code || ward.codex || '',
                  name: ward.name || ''
                }))
                .filter(w => w.name);

              console.log('Loaded wards on retry:', wardsList.length);
              setWards(wardsList);
              return;
            }
          }
        }
      }

      console.log('No wards found for district:', districtCodeOrName);
      setWards([]);
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
    }
  };

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

    // Chỉ gửi số nhà + tên đường vào trường address
    // province, district, ward gửi riêng biệt
    const submitData = {
      ...formData,
      address: formData.address.trim() // Chỉ gửi số nhà + tên đường
      // province, district, ward đã có trong formData, sẽ được gửi riêng
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
        status: 'ACTIVE'
      });
      setDistricts([]);
      setWards([]);
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
      status: school.status || 'ACTIVE'
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
      status: 'ACTIVE'
    });
    setProvinceSuggestions([]);
    setDistrictSuggestions([]);
    setWardSuggestions([]);
    setShowProvinceSuggestions(false);
    setShowDistrictSuggestions(false);
    setShowWardSuggestions(false);
    setDistricts([]);
    setWards([]);
  };

  const handleProvinceChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, province: value, district: '', ward: '' });
    setError('');
    setDistricts([]);
    setWards([]);

    if (!provinces || provinces.length === 0) {
      console.log('No provinces data available');
      setProvinceSuggestions([]);
      setShowProvinceSuggestions(false);
      return;
    }

    console.log('Provinces available:', provinces.length, 'Search value:', value);

    if (value.length > 0) {
      const filtered = provinces
        .filter(province => province && province.name &&
          province.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 15);
      console.log('Filtered provinces:', filtered.length);
      setProvinceSuggestions(filtered);
      setShowProvinceSuggestions(filtered.length > 0);
    } else {
      // Hiển thị tất cả tỉnh/thành phố khi input rỗng
      const allProvinces = provinces
        .filter(province => province && province.name)
        .slice(0, 15);
      console.log('All provinces (first 15):', allProvinces.length);
      setProvinceSuggestions(allProvinces);
      setShowProvinceSuggestions(allProvinces.length > 0);
    }
  };

  const handleSelectProvince = (province) => {
    setFormData({ ...formData, province: province.name, district: '', ward: '' });
    setProvinceSuggestions([]);
    setShowProvinceSuggestions(false);
    setDistricts([]);
    setDistrictSuggestions([]);
    setShowDistrictSuggestions(false);
    setWards([]);
    setWardSuggestions([]);
    setShowWardSuggestions(false);

    // Fetch districts bằng cả code và name để tăng khả năng tìm thấy
    if (province.code) {
      fetchDistrictsByProvince(province.code);
    } else if (province.name) {
      // Nếu không có code, thử tìm lại province trong danh sách để lấy code
      const foundProvince = provinces.find(p => p.name === province.name);
      if (foundProvince && foundProvince.code) {
        fetchDistrictsByProvince(foundProvince.code);
      } else {
        // Thử fetch bằng name
        fetchDistrictsByProvince(province.name);
      }
    }
  };

  const handleDistrictChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, district: value, ward: '' });
    setError('');
    setWards([]);
    setWardSuggestions([]);
    setShowWardSuggestions(false);

    if (!districts || districts.length === 0) {
      console.log('No districts data available');
      setDistrictSuggestions([]);
      setShowDistrictSuggestions(false);
      return;
    }

    console.log('Districts available:', districts.length, 'Search value:', value);

    if (value.length > 0) {
      const filtered = districts
        .filter(district => district && district.name &&
          district.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 15);
      console.log('Filtered districts:', filtered.length);
      setDistrictSuggestions(filtered);
      setShowDistrictSuggestions(filtered.length > 0);
    } else {
      // Hiển thị tất cả quận/huyện khi input rỗng
      const allDistricts = districts
        .filter(district => district && district.name)
        .slice(0, 15);
      console.log('All districts (first 15):', allDistricts.length);
      setDistrictSuggestions(allDistricts);
      setShowDistrictSuggestions(allDistricts.length > 0);
    }
  };

  const handleSelectDistrict = (district) => {
    setFormData({ ...formData, district: district.name, ward: '' });
    setDistrictSuggestions([]);
    setShowDistrictSuggestions(false);
    setWards([]);
    setWardSuggestions([]);
    setShowWardSuggestions(false);

    // Fetch wards khi chọn district
    if (district.code) {
      fetchWardsByDistrict(district.code);
    } else if (district.name) {
      const foundDistrict = districts.find(d => d.name === district.name);
      if (foundDistrict && foundDistrict.code) {
        fetchWardsByDistrict(foundDistrict.code);
      } else {
        fetchWardsByDistrict(district.name);
      }
    }
  };

  const handleWardChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, ward: value });
    setError('');

    if (!wards || wards.length === 0) {
      console.log('No wards data available');
      setWardSuggestions([]);
      setShowWardSuggestions(false);
      return;
    }

    console.log('Wards available:', wards.length, 'Search value:', value);

    if (value.length > 0) {
      const filtered = wards
        .filter(ward => ward && ward.name &&
          ward.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 15);
      console.log('Filtered wards:', filtered.length);
      setWardSuggestions(filtered);
      setShowWardSuggestions(filtered.length > 0);
    } else {
      // Hiển thị tất cả phường/xã khi input rỗng
      const allWards = wards
        .filter(ward => ward && ward.name)
        .slice(0, 15);
      console.log('All wards (first 15):', allWards.length);
      setWardSuggestions(allWards);
      setShowWardSuggestions(allWards.length > 0);
    }
  };

  const handleSelectWard = (ward) => {
    setFormData({ ...formData, ward: ward.name });
    setWardSuggestions([]);
    setShowWardSuggestions(false);
  };

  // Đóng suggestions khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        provinceSuggestionsRef.current &&
        !provinceSuggestionsRef.current.contains(event.target) &&
        provinceInputRef.current &&
        !provinceInputRef.current.contains(event.target)
      ) {
        setShowProvinceSuggestions(false);
      }
      if (
        districtSuggestionsRef.current &&
        !districtSuggestionsRef.current.contains(event.target) &&
        districtInputRef.current &&
        !districtInputRef.current.contains(event.target)
      ) {
        setShowDistrictSuggestions(false);
      }
      if (
        wardSuggestionsRef.current &&
        !wardSuggestionsRef.current.contains(event.target) &&
        wardInputRef.current &&
        !wardInputRef.current.contains(event.target)
      ) {
        setShowWardSuggestions(false);
      }
    };

    if (showProvinceSuggestions || showDistrictSuggestions || showWardSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProvinceSuggestions, showDistrictSuggestions, showWardSuggestions]);

  if (loading) {
    return (
      <div className="school-list-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="school-list-page">
      <div className="common-page-header">
        <h1>Quản lý trường học</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setError(''); // Clear any previous error
            setShowModal(true);
          }}
        >
          Thêm trường học
        </button>
      </div>

      <div className="common-table-container schools-table-container">
        <table className="common-table schools-table">
          <thead>
            <tr>
              <th>Tên trường</th>
              <th>Mã trường</th>
              <th>Địa chỉ</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => {
              // Hiển thị đầy đủ thông tin địa chỉ trong giao diện
              // Kết hợp: address (số nhà + tên đường) + ward + district + province
              let displayAddress = '';
              if (school.province || school.district || school.ward) {
                // Dữ liệu mới: kết hợp từ các trường riêng biệt
                const addressParts = [
                  school.address,
                  school.ward,
                  school.district,
                  school.province
                ].filter(part => part && part.trim());
                displayAddress = addressParts.join(', ');
              } else {
                // Dữ liệu cũ: hiển thị toàn bộ address
                displayAddress = school.address || '';
              }

              return (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td>{school.code}</td>
                  <td>{displayAddress}</td>
                  <td>{school.phone}</td>
                  <td>{school.email}</td>
                  <td>
                    <span className={`status-badge ${school.status?.toLowerCase()}`}>
                      {school.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleEdit(school)}
                      >
                        Sửa
                      </button>
                      <button
                        className={`btn btn-sm ${school.status === 'LOCKED' || school.status === 'INACTIVE' ? 'btn-success' : 'btn-warning'}`}
                        onClick={() => handleLock(school)}
                        style={{
                          backgroundColor: school.status === 'LOCKED' || school.status === 'INACTIVE' ? '#10b981' : '#f59e0b',
                          borderColor: school.status === 'LOCKED' || school.status === 'INACTIVE' ? '#10b981' : '#f59e0b',
                          color: 'white'
                        }}
                      >
                        {school.status === 'LOCKED' || school.status === 'INACTIVE' ? 'Mở khóa' : 'Khóa'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteClick(school.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="common-modal-overlay">
          <div className="common-modal">
            <div className="common-modal-header">
              <h2>{editingSchool ? 'Sửa trường học' : 'Thêm trường học'}</h2>
              <button className="common-close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="common-modal-form">
              {error && (
                <div className="error-message" style={{
                  backgroundColor: '#fee2e2',
                  borderLeft: '4px solid #ef4444',
                  color: '#991b1b',
                  padding: '12px 16px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              <div className="common-form-group">
                <label>Tên trường *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group">
                <label>Mã trường *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div className="common-form-group" style={{ position: 'relative' }}>
                <label>Tỉnh/Thành phố</label>
                <input
                  ref={provinceInputRef}
                  type="text"
                  value={formData.province}
                  onChange={handleProvinceChange}
                  onFocus={() => {
                    // Hiển thị suggestions khi focus vào input
                    if (!provinces || provinces.length === 0) {
                      return;
                    }

                    if (formData.province.length === 0) {
                      // Nếu input rỗng, hiển thị tất cả tỉnh/thành phố
                      const allProvinces = provinces
                        .filter(province => province && province.name)
                        .slice(0, 15);
                      setProvinceSuggestions(allProvinces);
                      setShowProvinceSuggestions(true);
                    } else if (provinceSuggestions.length > 0) {
                      // Nếu đã có suggestions, hiển thị lại
                      setShowProvinceSuggestions(true);
                    } else {
                      // Tìm lại suggestions dựa trên giá trị hiện tại
                      const filtered = provinces
                        .filter(province => province && province.name &&
                          province.name.toLowerCase().includes(formData.province.toLowerCase()))
                        .slice(0, 15);
                      setProvinceSuggestions(filtered);
                      setShowProvinceSuggestions(true);
                    }
                  }}
                  placeholder="Nhập tỉnh/thành phố..."
                  autoComplete="off"
                  disabled={loadingLocations}
                />
                {loadingLocations && (
                  <span style={{ fontSize: '0.85em', color: '#666', marginTop: '4px', display: 'block' }}>
                    Đang tải dữ liệu...
                  </span>
                )}
                {showProvinceSuggestions && provinceSuggestions.length > 0 && (
                  <div
                    ref={provinceSuggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #e1e5e9',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 10000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    {provinceSuggestions.map((province, index) => (
                      <div
                        key={province.code || index}
                        onClick={() => handleSelectProvince(province)}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: index < provinceSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'white';
                        }}
                      >
                        {province.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="common-form-group" style={{ position: 'relative' }}>
                <label>Quận/Huyện</label>
                <input
                  ref={districtInputRef}
                  type="text"
                  value={formData.district}
                  onChange={handleDistrictChange}
                  onFocus={() => {
                    // Hiển thị suggestions khi focus vào input
                    if (!districts || districts.length === 0) {
                      return;
                    }

                    if (formData.district.length === 0) {
                      // Nếu input rỗng, hiển thị tất cả quận/huyện
                      const allDistricts = districts
                        .filter(district => district && district.name)
                        .slice(0, 15);
                      setDistrictSuggestions(allDistricts);
                      setShowDistrictSuggestions(true);
                    } else if (districtSuggestions.length > 0) {
                      // Nếu đã có suggestions, hiển thị lại
                      setShowDistrictSuggestions(true);
                    } else {
                      // Tìm lại suggestions dựa trên giá trị hiện tại
                      const filtered = districts
                        .filter(district => district && district.name &&
                          district.name.toLowerCase().includes(formData.district.toLowerCase()))
                        .slice(0, 15);
                      setDistrictSuggestions(filtered);
                      setShowDistrictSuggestions(true);
                    }
                  }}
                  placeholder="Nhập quận/huyện..."
                  autoComplete="off"
                  disabled={!formData.province}
                />
                {!formData.province && (
                  <span style={{ fontSize: '0.85em', color: '#999', marginTop: '4px', display: 'block' }}>
                    Vui lòng chọn tỉnh/thành phố trước
                  </span>
                )}
                {showDistrictSuggestions && districtSuggestions.length > 0 && (
                  <div
                    ref={districtSuggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #e1e5e9',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 10000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    {districtSuggestions.map((district, index) => (
                      <div
                        key={district.code || index}
                        onClick={() => handleSelectDistrict(district)}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: index < districtSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'white';
                        }}
                      >
                        {district.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="common-form-group" style={{ position: 'relative' }}>
                <label>Phường/Xã</label>
                <input
                  ref={wardInputRef}
                  type="text"
                  value={formData.ward}
                  onChange={handleWardChange}
                  onFocus={() => {
                    // Hiển thị suggestions khi focus vào input
                    if (!wards || wards.length === 0) {
                      return;
                    }

                    if (formData.ward.length === 0) {
                      // Nếu input rỗng, hiển thị tất cả phường/xã
                      const allWards = wards
                        .filter(ward => ward && ward.name)
                        .slice(0, 15);
                      setWardSuggestions(allWards);
                      setShowWardSuggestions(true);
                    } else if (wardSuggestions.length > 0) {
                      // Nếu đã có suggestions, hiển thị lại
                      setShowWardSuggestions(true);
                    } else {
                      // Tìm lại suggestions dựa trên giá trị hiện tại
                      const filtered = wards
                        .filter(ward => ward && ward.name &&
                          ward.name.toLowerCase().includes(formData.ward.toLowerCase()))
                        .slice(0, 15);
                      setWardSuggestions(filtered);
                      setShowWardSuggestions(true);
                    }
                  }}
                  placeholder="Nhập phường/xã..."
                  autoComplete="off"
                  disabled={!formData.district}
                />
                {!formData.district && (
                  <span style={{ fontSize: '0.85em', color: '#999', marginTop: '4px', display: 'block' }}>
                    Vui lòng chọn quận/huyện trước
                  </span>
                )}
                {showWardSuggestions && wardSuggestions.length > 0 && (
                  <div
                    ref={wardSuggestionsRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #e1e5e9',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 10000,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    {wardSuggestions.map((ward, index) => (
                      <div
                        key={ward.code || index}
                        onClick={() => handleSelectWard(ward)}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          borderBottom: index < wardSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f5f5f5';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'white';
                        }}
                      >
                        {ward.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="common-form-group">
                <label>Địa chỉ chi tiết</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({ ...formData, address: e.target.value });
                    setError('');
                  }}
                  placeholder="Số nhà, tên đường..."
                />
              </div>
              <div className="common-form-group">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    setError(''); // Clear error when user types
                  }}
                />
              </div>
              <div className="common-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setError(''); // Clear error when user types
                  }}
                />
              </div>
              <div className="common-form-group">
                <label>Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Không hoạt động</option>
                </select>
              </div>
              <div className="common-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSchool ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && schoolToDelete && (
        <div className="common-modal-overlay">
          <div className="common-modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="common-modal-header">
              <h2>Xóa trường học: {schoolToDelete.name}</h2>
              <button className="common-close-btn" onClick={() => {
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
              }}>×</button>
            </div>
            <div className="common-modal-body" style={{ padding: '20px' }}>
              {loadingRelatedData ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Đang tải dữ liệu...</p>
                </div>
              ) : (
                <>
                  {relatedData.userCount === 0 && relatedData.roleCount === 0 && relatedData.classCount === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      backgroundColor: '#d1fae5',
                      borderRadius: '8px',
                      border: '1px solid #10b981',
                      marginBottom: '20px'
                    }}>
                      <p style={{ margin: 0, color: '#065f46', fontWeight: '600' }}>
                        ✓ Không có dữ liệu liên quan. Bạn có thể xóa trường học này ngay.
                      </p>
                    </div>
                  ) : (
                    <p style={{ marginBottom: '20px', color: '#666' }}>
                      Trước khi xóa trường học, bạn cần xóa hoặc chuyển các dữ liệu liên quan sau:
                    </p>
                  )}
                  {/* Users Section */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      padding: '12px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        Người dùng ({relatedData.userCount})
                      </h3>
                    </div>
                    {relatedData.users.length > 0 ? (
                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #e1e5e9',
                        borderRadius: '8px',
                        padding: '8px'
                      }}>
                        {relatedData.users.map((user) => (
                          <div key={user.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: '1px solid #e1e5e9'
                          }}>
                            <span>{user.fullName || user.email} ({user.role?.name || 'Không có'})</span>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteItem('user', user.id)}
                              disabled={deletingItem?.type === 'user' && deletingItem?.id === user.id}
                            >
                              {deletingItem?.type === 'user' && deletingItem?.id === user.id ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#999', fontStyle: 'italic', padding: '12px' }}>Không có người dùng</p>
                    )}
                  </div>

                  {/* Roles Section */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      padding: '12px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        Phân quyền ({relatedData.roleCount})
                      </h3>
                    </div>
                    {relatedData.roles.length > 0 ? (
                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #e1e5e9',
                        borderRadius: '8px',
                        padding: '8px'
                      }}>
                        {relatedData.roles.map((role) => (
                          <div key={role.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: '1px solid #e1e5e9'
                          }}>
                            <span>{role.name} {role.description ? `- ${role.description}` : ''}</span>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteItem('role', role.id)}
                              disabled={deletingItem?.type === 'role' && deletingItem?.id === role.id}
                            >
                              {deletingItem?.type === 'role' && deletingItem?.id === role.id ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#999', fontStyle: 'italic', padding: '12px' }}>Không có phân quyền</p>
                    )}
                  </div>

                  {/* Classes Section */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      padding: '12px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        Lớp học ({relatedData.classCount})
                      </h3>
                    </div>
                    {relatedData.classes.length > 0 ? (
                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid #e1e5e9',
                        borderRadius: '8px',
                        padding: '8px'
                      }}>
                        {relatedData.classes.map((cls) => (
                          <div key={cls.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: '1px solid #e1e5e9'
                          }}>
                            <span>{cls.name} {cls.schoolYear ? `(${cls.schoolYear})` : ''}</span>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteItem('class', cls.id)}
                              disabled={deletingItem?.type === 'class' && deletingItem?.id === cls.id}
                            >
                              {deletingItem?.type === 'class' && deletingItem?.id === cls.id ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#999', fontStyle: 'italic', padding: '12px' }}>Không có lớp học</p>
                    )}
                  </div>

                  {/* Summary */}
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #fbbf24'
                  }}>
                    <p style={{ margin: 0, fontWeight: '600', color: '#92400e' }}>
                      Tổng cộng: {relatedData.userCount + relatedData.roleCount + relatedData.classCount} mục dữ liệu liên quan
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="common-modal-actions" style={{ padding: '20px', borderTop: '1px solid #e1e5e9', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
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
                }}
              >
                Đóng
              </button>
              {(relatedData.userCount > 0 || relatedData.roleCount > 0 || relatedData.classCount > 0) && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteAllRelated}
                  style={{
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626'
                  }}
                >
                  Xóa toàn bộ
                </button>
              )}
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteAll}
                disabled={
                  relatedData.userCount > 0 ||
                  relatedData.roleCount > 0 ||
                  relatedData.classCount > 0
                }
                style={{
                  opacity: (relatedData.userCount > 0 || relatedData.roleCount > 0 || relatedData.classCount > 0) ? 0.5 : 1,
                  cursor: (relatedData.userCount > 0 || relatedData.roleCount > 0 || relatedData.classCount > 0) ? 'not-allowed' : 'pointer'
                }}
              >
                Xóa trường học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolListPage;


