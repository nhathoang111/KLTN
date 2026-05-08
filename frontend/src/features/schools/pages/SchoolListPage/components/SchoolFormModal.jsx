import React from 'react';

const inputClass =
  'block h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

const selectClass =
  'block h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

const labelClass = 'mb-2 block text-sm font-medium text-slate-800';

const SchoolFormModal = ({
  show,
  editingSchool,
  warning,
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
    wards,
    loadingLocations,
    provinceSuggestions,
    wardSuggestions,
    showProvinceSuggestions,
    showWardSuggestions,
    provinceInputRef,
    wardInputRef,
    provinceSuggestionsRef,
    wardSuggestionsRef,
    handleProvinceChange,
    handleSelectProvince,
    handleWardChange,
    handleSelectWard,
    handleProvinceFocus,
    handleWardFocus,
  } = locations;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={editingSchool ? 'Sửa trường học' : 'Thêm trường học'}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-slate-200 bg-white px-6 py-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold leading-tight text-slate-900">
              {editingSchool ? 'Sửa trường học' : 'Thêm trường học'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin trường học để lưu vào hệ thống.
            </p>
          </div>
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[75vh] overflow-auto px-6 py-5">
          {warning && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="shrink-0"
              >
                <path d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.981-1.742 2.981H4.42c-1.53 0-2.492-1.647-1.742-2.98l5.58-9.921zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-7a1 1 0 00-1 1v3a1 1 0 102 0V8a1 1 0 00-1-1z" />
              </svg>
              <span>{warning}</span>
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
                  <label className={labelClass}>Loại trường</label>
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
                    <option value="INACTIVE">Ngưng hoạt động</option>
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
                onFocus={handleProvinceFocus}
                disabled={loadingLocations}
                autoComplete="off"
                className={inputClass}
                placeholder={
                  loadingLocations ? 'Đang tải dữ liệu...' : 'Nhập để tìm tỉnh/thành phố'
                }
              />
              {showProvinceSuggestions && provinceSuggestions.length > 0 && (
                <div
                  ref={provinceSuggestionsRef}
                  className="absolute left-0 right-0 top-full z-10000 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
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

            {/* Hàng 4 */}
            <div className="relative">
              <label className={labelClass}>Phường/Xã</label>
              <input
                ref={wardInputRef}
                type="text"
                value={formData.ward}
                onChange={handleWardChange}
                onFocus={handleWardFocus}
                disabled={!formData.province || wards.length === 0}
                autoComplete="off"
                className={inputClass}
                placeholder={
                  !formData.province
                    ? 'Chọn tỉnh/thành phố trước'
                    : wards.length === 0
                      ? 'Không có dữ liệu phường/xã'
                      : 'Nhập để tìm phường/xã'
                }
              />
              {showWardSuggestions && wardSuggestions.length > 0 && (
                <div
                  ref={wardSuggestionsRef}
                  className="absolute left-0 right-0 top-full z-10000 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
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

          <div className="mt-8 flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-500"
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