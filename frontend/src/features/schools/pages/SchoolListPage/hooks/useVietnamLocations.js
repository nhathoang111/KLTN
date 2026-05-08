import { useEffect, useState, useRef } from 'react';

const API_BASE_NEW = 'https://provinces.open-api.vn/api/v2';

const normalizeLocationItem = (item) => ({
  code: item?.code || item?.codex || item?.id || '',
  name: item?.name || '',
});

const parseLocationList = (items) =>
  (Array.isArray(items) ? items : [])
    .map(normalizeLocationItem)
    .filter((item) => item.name);

const normalizeSearchText = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Hook quản lý dữ liệu địa chỉ Việt Nam và autocomplete cho form trường học
const useVietnamLocations = (formData, setFormData) => {
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

  const fetchFromEndpoints = async (paths = []) => {
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        const json = await response.json();
        return json;
      } catch (error) {
        console.warn('Address endpoint fetch failed:', path, error);
      }
    }
    return null;
  };

  // Fetch dữ liệu địa chỉ Việt Nam từ API công khai
  const fetchVietnamLocations = async () => {
    setLoadingLocations(true);

    try {
      // Chỉ dùng API v2 (dữ liệu hành chính mới sau sáp nhập).
      const data = await fetchFromEndpoints([`${API_BASE_NEW}/?depth=1`]);
      const provincesList = parseLocationList(data);
      if (provincesList.length > 0) {
        setProvinces(provincesList);
        return;
      }

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
      return [];
    }

    try {
      let provinceCode = provinceCodeOrName;
      if (typeof provinceCodeOrName === 'string' && !/^\d+$/.test(provinceCodeOrName)) {
        const foundProvince = provinces.find((p) => p.name === provinceCodeOrName);
        if (foundProvince && foundProvince.code) {
          provinceCode = foundProvince.code;
        } else {
          setDistricts([]);
          return [];
        }
      }

      const data = await fetchFromEndpoints([
        `${API_BASE_NEW}/p/${provinceCode}?depth=3`,
        `${API_BASE_NEW}/p/${provinceCode}?depth=2`,
      ]);
      const districtsList = parseLocationList(
        data?.districts || data?.children || [],
      );
      if (districtsList.length > 0) {
        setDistricts(districtsList);
        const mergedWards = (data?.districts || data?.children || []).flatMap(
          (district) => parseLocationList(district?.wards || district?.children || []),
        );
        setWards(mergedWards);
        return districtsList;
      }

      // Một số nguồn dữ liệu mới có thể trả trực tiếp phường/xã theo tỉnh (không còn cấp quận/huyện).
      const provinceWards = parseLocationList(data?.wards || []);
      if (provinceWards.length > 0) {
        setDistricts([]);
        setWards(provinceWards);
        return [];
      }

      if (provinces.length > 0) {
        const foundProvince = provinces.find(
          (p) => p.code === provinceCode || p.name === provinceCodeOrName,
        );

        if (foundProvince) {
          const retryData = await fetchFromEndpoints([
            `${API_BASE_NEW}/p/${foundProvince.code}?depth=3`,
            `${API_BASE_NEW}/p/${foundProvince.code}?depth=2`,
          ]);
          const retryDistricts = parseLocationList(
            retryData?.districts || retryData?.children || [],
          );
          if (retryDistricts.length > 0) {
            setDistricts(retryDistricts);
            const mergedWards = (retryData?.districts || retryData?.children || []).flatMap(
              (district) => parseLocationList(district?.wards || district?.children || []),
            );
            setWards(mergedWards);
            return retryDistricts;
          }

          const retryProvinceWards = parseLocationList(retryData?.wards || []);
          if (retryProvinceWards.length > 0) {
            setDistricts([]);
            setWards(retryProvinceWards);
            return [];
          }
        }
      }

      setDistricts([]);
      return [];
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
      return [];
    }
  };

  // Lấy danh sách phường/xã dựa trên quận/huyện đã chọn
  const fetchWardsByDistrict = async (districtCodeOrName) => {
    if (!districtCodeOrName) {
      setWards([]);
      return [];
    }

    try {
      let districtCode = districtCodeOrName;
      if (typeof districtCodeOrName === 'string' && !/^\d+$/.test(districtCodeOrName)) {
        const foundDistrict = districts.find((d) => d.name === districtCodeOrName);
        if (foundDistrict && foundDistrict.code) {
          districtCode = foundDistrict.code;
        } else {
          setWards([]);
          return [];
        }
      }

      const data = await fetchFromEndpoints([
        `${API_BASE_NEW}/d/${districtCode}?depth=2`,
      ]);
      const wardsList = parseLocationList(
        data?.wards || data?.children || [],
      );
      if (wardsList.length > 0) {
        setWards(wardsList);
        return wardsList;
      }

      if (districts.length > 0) {
        const foundDistrict = districts.find(
          (d) => d.code === districtCode || d.name === districtCodeOrName,
        );

        if (foundDistrict) {
          const retryData = await fetchFromEndpoints([
            `${API_BASE_NEW}/d/${foundDistrict.code}?depth=2`,
          ]);
          const retryWards = parseLocationList(
            retryData?.wards || retryData?.children || [],
          );
          if (retryWards.length > 0) {
            setWards(retryWards);
            return retryWards;
          }
        }
      }

      setWards([]);
      return [];
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
      return [];
    }
  };

  const handleProvinceChange = async (e) => {
    const value = e.target.value || '';
    const normalizedValue = normalizeSearchText(value);
    const selectedProvince = (provinces || []).find(
      (province) =>
        String(province.code) === String(normalizedValue) ||
        normalizeSearchText(province.name) === normalizedValue,
    );

    setFormData({
      ...formData,
      province: selectedProvince?.name || value,
      district: '',
      ward: '',
    });
    setDistricts([]);
    setWards([]);
    if (value.length > 0) {
      const filtered = (provinces || [])
        .filter((province) =>
          normalizeSearchText(province?.name).includes(normalizedValue),
        )
      setProvinceSuggestions(filtered);
      setShowProvinceSuggestions(filtered.length > 0);
    } else {
      const allProvinces = (provinces || []).slice(0, 15);
      setProvinceSuggestions(allProvinces);
      setShowProvinceSuggestions(allProvinces.length > 0);
    }
    setDistrictSuggestions([]);
    setShowDistrictSuggestions(false);
    setWardSuggestions([]);
    setShowWardSuggestions(false);

    if (selectedProvince?.code) {
      await fetchDistrictsByProvince(selectedProvince.code);
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

    if (province.code) {
      fetchDistrictsByProvince(province.code);
    } else if (province.name) {
      const foundProvince = provinces.find((p) => p.name === province.name);
      if (foundProvince && foundProvince.code) {
        fetchDistrictsByProvince(foundProvince.code);
      } else {
        fetchDistrictsByProvince(province.name);
      }
    }
  };

  const handleDistrictChange = async (e) => {
    const value = e.target.value;
    const selectedDistrict = (districts || []).find(
      (district) => String(district.code) === String(value),
    );

    setFormData({
      ...formData,
      district: selectedDistrict?.name || '',
      ward: '',
    });
    setWards([]);
    setDistrictSuggestions([]);
    setShowDistrictSuggestions(false);
    setWardSuggestions([]);
    setShowWardSuggestions(false);

    if (selectedDistrict?.code) {
      await fetchWardsByDistrict(selectedDistrict.code);
    }
  };

  const handleSelectDistrict = (district) => {
    setFormData({ ...formData, district: district.name, ward: '' });
    setDistrictSuggestions([]);
    setShowDistrictSuggestions(false);
    setWards([]);
    setWardSuggestions([]);
    setShowWardSuggestions(false);

    if (district.code) {
      fetchWardsByDistrict(district.code);
    } else if (district.name) {
      const foundDistrict = districts.find((d) => d.name === district.name);
      if (foundDistrict && foundDistrict.code) {
        fetchWardsByDistrict(foundDistrict.code);
      } else {
        fetchWardsByDistrict(district.name);
      }
    }
  };

  const handleWardChange = (e) => {
    const value = e.target.value || '';
    const normalizedValue = normalizeSearchText(value);
    const selectedWard = (wards || []).find(
      (ward) =>
        String(ward.code) === String(normalizedValue) ||
        normalizeSearchText(ward.name) === normalizedValue,
    );
    setFormData({ ...formData, ward: selectedWard?.name || value });
    if (normalizedValue.length > 0) {
      const filtered = (wards || [])
        .filter((ward) =>
          normalizeSearchText(ward?.name).includes(normalizedValue),
        )
      setWardSuggestions(filtered);
      setShowWardSuggestions(filtered.length > 0);
    } else {
      const allWards = (wards || []).slice(0, 15);
      setWardSuggestions(allWards);
      setShowWardSuggestions(allWards.length > 0);
    }
  };

  const handleSelectWard = (ward) => {
    setFormData({ ...formData, ward: ward.name });
    setWardSuggestions([]);
    setShowWardSuggestions(false);
  };

  const handleProvinceFocus = () => {
    const allProvinces = (provinces || []).slice(0, 15);
    setProvinceSuggestions(allProvinces);
    setShowProvinceSuggestions(allProvinces.length > 0);
  };

  const handleDistrictFocus = async () => {
    if (!formData.province) {
      setDistrictSuggestions([]);
      setShowDistrictSuggestions(false);
      return;
    }

    let sourceDistricts = districts || [];
    if (sourceDistricts.length === 0 && formData.province) {
      sourceDistricts = await fetchDistrictsByProvince(formData.province);
    }
    const allDistricts = sourceDistricts.slice(0, 15);
    setDistrictSuggestions(allDistricts);
    setShowDistrictSuggestions(allDistricts.length > 0);
  };

  const handleWardFocus = async () => {
    if (!formData.province) {
      setWardSuggestions([]);
      setShowWardSuggestions(false);
      return;
    }

    let sourceWards = wards || [];
    if (sourceWards.length === 0 && formData.province) {
      await fetchDistrictsByProvince(formData.province);
      sourceWards = wards || [];
    }
    const allWards = sourceWards.slice(0, 15);
    setWardSuggestions(allWards);
    setShowWardSuggestions(allWards.length > 0);
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
  }, [
    showProvinceSuggestions,
    showDistrictSuggestions,
    showWardSuggestions,
  ]);

  useEffect(() => {
    fetchVietnamLocations();
  }, []);

  return {
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
    handleProvinceFocus,
    handleDistrictFocus,
    handleWardFocus,
  };
};

export default useVietnamLocations;

