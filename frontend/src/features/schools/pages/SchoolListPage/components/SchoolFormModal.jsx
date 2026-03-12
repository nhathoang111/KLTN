import React from 'react';

const SchoolFormModal = ({
  show,
  editingSchool,
  error,
  formData,
  setFormData,
  onClose,
  onSubmit,
  locations,
  handleLogoChange,
}) => {
  if (!show) return null;

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
    handleProvinceChange,
    handleSelectProvince,
    handleDistrictChange,
    handleSelectDistrict,
    handleWardChange,
    handleSelectWard,
  } = locations;

  return (
    <div className="common-modal-overlay">
      <div className="common-modal">
        <div className="common-modal-header">
          <h2>{editingSchool ? 'Sửa trường học' : 'Thêm trường học'}</h2>
          <button className="common-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={onSubmit} className="common-modal-form">
          {error && (
            <div
              className="error-message"
              style={{
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
                fontWeight: '500',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ flexShrink: 0 }}
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
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

          <div className="common-form-group">
            <label>Logo trường</label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {formData.logo ? (
                <img
                  src={formData.logo}
                  alt="Logo"
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #e1e5e9',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    border: '2px dashed #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: '#9ca3af',
                  }}
                >
                  Chưa có
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ fontSize: 14 }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                color: '#6b7280',
                marginTop: 4,
                display: 'block',
              }}
            >
              JPG, PNG (tùy chọn)
            </span>
          </div>

          <div className="common-form-group">
            <label>Năm thành lập</label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.establishmentYear}
              onChange={(e) =>
                setFormData({ ...formData, establishmentYear: e.target.value })
              }
              placeholder="VD: 1990"
            />
          </div>

          <div className="common-form-group">
            <label>Cấp quản lý (trường công / tư)</label>
            <select
              value={formData.managementType}
              onChange={(e) =>
                setFormData({ ...formData, managementType: e.target.value })
              }
            >
              <option value="">-- Chọn --</option>
              <option value="PUBLIC">Trường công</option>
              <option value="PRIVATE">Trường tư</option>
            </select>
          </div>

          <div className="common-form-group" style={{ position: 'relative' }}>
            <label>Tỉnh/Thành phố</label>
            <input
              ref={provinceInputRef}
              type="text"
              value={formData.province}
              onChange={handleProvinceChange}
              onFocus={() => {
                if (!provinces || provinces.length === 0) {
                  return;
                }

                if (formData.province.length === 0) {
                  const allProvinces = provinces
                    .filter((province) => province && province.name)
                    .slice(0, 15);
                  setProvinceSuggestions(allProvinces);
                  setShowProvinceSuggestions(true);
                } else if (provinceSuggestions.length > 0) {
                  setShowProvinceSuggestions(true);
                } else {
                  const filtered = provinces
                    .filter(
                      (province) =>
                        province &&
                        province.name &&
                        province.name
                          .toLowerCase()
                          .includes(formData.province.toLowerCase()),
                    )
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
              <span
                style={{
                  fontSize: '0.85em',
                  color: '#666',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
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
                  marginTop: '4px',
                }}
              >
                {provinceSuggestions.map((province, index) => (
                  <div
                    key={province.code || index}
                    onClick={() => handleSelectProvince(province)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom:
                        index < provinceSuggestions.length - 1
                          ? '1px solid #f0f0f0'
                          : 'none',
                      transition: 'background-color 0.2s',
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
                if (!districts || districts.length === 0) {
                  return;
                }

                if (formData.district.length === 0) {
                  const allDistricts = districts
                    .filter((district) => district && district.name)
                    .slice(0, 15);
                  setDistrictSuggestions(allDistricts);
                  setShowDistrictSuggestions(true);
                } else if (districtSuggestions.length > 0) {
                  setShowDistrictSuggestions(true);
                } else {
                  const filtered = districts
                    .filter(
                      (district) =>
                        district &&
                        district.name &&
                        district.name
                          .toLowerCase()
                          .includes(formData.district.toLowerCase()),
                    )
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
              <span
                style={{
                  fontSize: '0.85em',
                  color: '#999',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
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
                  marginTop: '4px',
                }}
              >
                {districtSuggestions.map((district, index) => (
                  <div
                    key={district.code || index}
                    onClick={() => handleSelectDistrict(district)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom:
                        index < districtSuggestions.length - 1
                          ? '1px solid #f0f0f0'
                          : 'none',
                      transition: 'background-color 0.2s',
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
                if (!wards || wards.length === 0) {
                  return;
                }

                if (formData.ward.length === 0) {
                  const allWards = wards
                    .filter((ward) => ward && ward.name)
                    .slice(0, 15);
                  setWardSuggestions(allWards);
                  setShowWardSuggestions(true);
                } else if (wardSuggestions.length > 0) {
                  setShowWardSuggestions(true);
                } else {
                  const filtered = wards
                    .filter(
                      (ward) =>
                        ward &&
                        ward.name &&
                        ward.name
                          .toLowerCase()
                          .includes(formData.ward.toLowerCase()),
                    )
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
              <span
                style={{
                  fontSize: '0.85em',
                  color: '#999',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
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
                  marginTop: '4px',
                }}
              >
                {wardSuggestions.map((ward, index) => (
                  <div
                    key={ward.code || index}
                    onClick={() => handleSelectWard(ward)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom:
                        index < wardSuggestions.length - 1
                          ? '1px solid #f0f0f0'
                          : 'none',
                      transition: 'background-color 0.2s',
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
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Số nhà, tên đường..."
            />
          </div>

          <div className="common-form-group">
            <label>Số điện thoại</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <div className="common-form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="common-form-group">
            <label>Trạng thái</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Không hoạt động</option>
            </select>
          </div>

          <div className="common-modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {editingSchool ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolFormModal;

