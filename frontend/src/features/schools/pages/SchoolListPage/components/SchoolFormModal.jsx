import React from 'react';

const inputClass =
  'block h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

const selectClass =
  'block h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

const labelClass = 'mb-2 block text-sm font-medium text-slate-800';

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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8">
      <div className="relative w-full sm:w-[1000px] max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-8 py-5 text-white">
          <h2 className="text-[22px] font-semibold tracking-wide">
            {editingSchool ? 'Sửa trường học' : 'Thêm trường học'}
          </h2>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white shadow-sm transition hover:bg-white/20 hover:text-white/90"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="px-8 pb-6 pt-6 overflow-y-auto"
        >
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="shrink-0"
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

          <div className="mb-5 border-b border-slate-100 pb-3">
            <p className="text-base font-semibold text-slate-900">
              Thông tin cơ bản
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
            {/* Hàng 1 */}
            <div>
              <label className={labelClass}>
                Tên trường <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Mã trường <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                required
                className={inputClass}
              />
            </div>

            {/* Hàng 2 */}
            <div>
              <label className={labelClass}>Logo trường</label>
              <div className="flex h-[140px] gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex h-full w-32 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-center text-xs text-slate-500 overflow-hidden">
                  {formData.logo ? (
                    <img
                      src={formData.logo}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="space-y-1 px-2">
                      <div className="text-lg">🖼</div>
                      <p>Chưa có logo</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-center">
                  <label
                    htmlFor="school-logo-input"
                    className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                  >
                    Tải lên logo
                  </label>
                  <input
                    id="school-logo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <span className="mt-2 text-xs text-slate-500">
                    Hỗ trợ JPG, PNG. Tối đa 5MB
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={labelClass}>Năm thành lập</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.establishmentYear}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      establishmentYear: e.target.value,
                    })
                  }
                  placeholder="VD: 1990"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Cấp quản lý</label>
                  <select
                    value={formData.managementType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        managementType: e.target.value,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="">— Chọn —</option>
                    <option value="PUBLIC">Trường công</option>
                    <option value="PRIVATE">Trường tư</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className={selectClass}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Không hoạt động</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hàng 3 */}
            <div className="relative">
              <label className={labelClass}>Tỉnh/Thành phố</label>
              <input
                ref={provinceInputRef}
                type="text"
                value={formData.province}
                onChange={handleProvinceChange}
                placeholder="Nhập tỉnh/thành phố..."
                autoComplete="off"
                disabled={loadingLocations}
                className={inputClass}
              />
              {loadingLocations && (
                <span className="mt-1 block text-xs text-slate-500">
                  Đang tải dữ liệu...
                </span>
              )}
              {showProvinceSuggestions && provinceSuggestions.length > 0 && (
                <div
                  ref={provinceSuggestionsRef}
                  className="absolute left-0 right-0 top-full z-[10000] mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  {provinceSuggestions.map((province, index) => (
                    <div
                      key={province.code || index}
                      onClick={() => handleSelectProvince(province)}
                      className="cursor-pointer px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      {province.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className={labelClass}>Quận/Huyện</label>
              <input
                ref={districtInputRef}
                type="text"
                value={formData.district}
                onChange={handleDistrictChange}
                placeholder="Nhập quận/huyện..."
                autoComplete="off"
                disabled={!formData.province}
                className={inputClass}
              />
              {!formData.province && (
                <span className="mt-1 block text-xs text-slate-400">
                  Vui lòng chọn tỉnh/thành phố trước
                </span>
              )}
              {showDistrictSuggestions && districtSuggestions.length > 0 && (
                <div
                  ref={districtSuggestionsRef}
                  className="absolute left-0 right-0 top-full z-[10000] mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  {districtSuggestions.map((district, index) => (
                    <div
                      key={district.code || index}
                      onClick={() => handleSelectDistrict(district)}
                      className="cursor-pointer px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      {district.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hàng 4 */}
            <div className="relative">
              <label className={labelClass}>Phường/Xã</label>
              <input
                ref={wardInputRef}
                type="text"
                value={formData.ward}
                onChange={handleWardChange}
                placeholder="Nhập phường/xã..."
                autoComplete="off"
                disabled={!formData.district}
                className={inputClass}
              />
              {!formData.district && (
                <span className="mt-1 block text-xs text-slate-400">
                  Vui lòng chọn quận/huyện trước
                </span>
              )}
              {showWardSuggestions && wardSuggestions.length > 0 && (
                <div
                  ref={wardSuggestionsRef}
                  className="absolute left-0 right-0 top-full z-[10000] mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  {wardSuggestions.map((ward, index) => (
                    <div
                      key={ward.code || index}
                      onClick={() => handleSelectWard(ward)}
                      className="cursor-pointer px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      {ward.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Số điện thoại</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* Hàng 5 */}
            <div>
              <label className={labelClass}>Địa chỉ chi tiết</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Số nhà, tên đường..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder='VD: example@gmail.com'
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-600 hover:to-purple-600"
            >
              {editingSchool ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolFormModal;