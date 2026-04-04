import { useEffect, useState, useRef } from 'react';

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
            .filter((item) => item && item.name)
            .map((item) => ({
              code: item.code || item.codex || '',
              name: item.name || '',
            }))
            .filter((item) => item.name);

          if (provincesList.length > 0) {
            setProvinces(provincesList);
            setLoadingLocations(false);
            return;
          }
        }
      }

      // Fallback: Thử GitHub API
      const githubResponse = await fetch(
        'https://raw.githubusercontent.com/kenzouno1/DiaGioiHanhChinhVN/master/data.json',
      );
      if (githubResponse.ok) {
        const githubData = await githubResponse.json();
        const dataArray = Array.isArray(githubData)
          ? githubData
          : githubData.data || [];

        if (dataArray && dataArray.length > 0) {
          const provincesList = dataArray
            .filter((item) => item && item.name)
            .map((item) => ({
              code: item.code || item.id || '',
              name: item.name || '',
            }))
            .filter((item) => item.name);

          if (provincesList.length > 0) {
            setProvinces(provincesList);
            setLoadingLocations(false);
            return;
          }
        }
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
      return;
    }

    try {
      let provinceCode = provinceCodeOrName;
      if (typeof provinceCodeOrName === 'string' && !/^\d+$/.test(provinceCodeOrName)) {
        const foundProvince = provinces.find((p) => p.name === provinceCodeOrName);
        if (foundProvince && foundProvince.code) {
          provinceCode = foundProvince.code;
        } else {
          setDistricts([]);
          return;
        }
      }

      const apiUrl = `https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`;
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();

        if (data.districts && Array.isArray(data.districts)) {
          const districtsList = data.districts
            .filter((d) => d && d.name)
            .map((district) => ({
              code: district.code || district.codex || '',
              name: district.name || '',
            }))
            .filter((d) => d.name);

          setDistricts(districtsList);
          return;
        }
      }

      if (provinces.length > 0) {
        const foundProvince = provinces.find(
          (p) => p.code === provinceCode || p.name === provinceCodeOrName,
        );

        if (foundProvince) {
          const retryUrl = `https://provinces.open-api.vn/api/p/${foundProvince.code}?depth=2`;
          const retryResponse = await fetch(retryUrl);
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData.districts && Array.isArray(retryData.districts)) {
              const districtsList = retryData.districts
                .filter((d) => d && d.name)
                .map((district) => ({
                  code: district.code || district.codex || '',
                  name: district.name || '',
                }))
                .filter((d) => d.name);

              setDistricts(districtsList);
              return;
            }
          }
        }
      }

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
      let districtCode = districtCodeOrName;
      if (typeof districtCodeOrName === 'string' && !/^\d+$/.test(districtCodeOrName)) {
        const foundDistrict = districts.find((d) => d.name === districtCodeOrName);
        if (foundDistrict && foundDistrict.code) {
          districtCode = foundDistrict.code;
        } else {
          setWards([]);
          return;
        }
      }

      const apiUrl = `https://provinces.open-api.vn/api/d/${districtCode}?depth=2`;
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();

        if (data.wards && Array.isArray(data.wards)) {
          const wardsList = data.wards
            .filter((w) => w && w.name)
            .map((ward) => ({
              code: ward.code || ward.codex || '',
              name: ward.name || '',
            }))
            .filter((w) => w.name);

          setWards(wardsList);
          return;
        }
      }

      if (districts.length > 0) {
        const foundDistrict = districts.find(
          (d) => d.code === districtCode || d.name === districtCodeOrName,
        );

        if (foundDistrict) {
          const retryUrl = `https://provinces.open-api.vn/api/d/${foundDistrict.code}?depth=2`;
          const retryResponse = await fetch(retryUrl);
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (retryData.wards && Array.isArray(retryData.wards)) {
              const wardsList = retryData.wards
                .filter((w) => w && w.name)
                .map((ward) => ({
                  code: ward.code || ward.codex || '',
                  name: ward.name || '',
                }))
                .filter((w) => w.name);

              setWards(wardsList);
              return;
            }
          }
        }
      }

      setWards([]);
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
    }
  };

  const handleProvinceChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, province: value, district: '', ward: '' });
    setDistricts([]);
    setWards([]);

    if (!provinces || provinces.length === 0) {
      setProvinceSuggestions([]);
      setShowProvinceSuggestions(false);
      return;
    }

    if (value.length > 0) {
      const filtered = provinces
        .filter(
          (province) =>
            province &&
            province.name &&
            province.name.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 15);
      setProvinceSuggestions(filtered);
      setShowProvinceSuggestions(filtered.length > 0);
    } else {
      const allProvinces = provinces
        .filter((province) => province && province.name)
        .slice(0, 15);
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

  const handleDistrictChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, district: value, ward: '' });
    setWards([]);
    setWardSuggestions([]);
    setShowWardSuggestions(false);

    if (!districts || districts.length === 0) {
      setDistrictSuggestions([]);
      setShowDistrictSuggestions(false);
      return;
    }

    if (value.length > 0) {
      const filtered = districts
        .filter(
          (district) =>
            district &&
            district.name &&
            district.name.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 15);
      setDistrictSuggestions(filtered);
      setShowDistrictSuggestions(filtered.length > 0);
    } else {
      const allDistricts = districts
        .filter((district) => district && district.name)
        .slice(0, 15);
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
    const value = e.target.value;
    setFormData({ ...formData, ward: value });

    if (!wards || wards.length === 0) {
      setWardSuggestions([]);
      setShowWardSuggestions(false);
      return;
    }

    if (value.length > 0) {
      const filtered = wards
        .filter(
          (ward) =>
            ward &&
            ward.name &&
            ward.name.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 15);
      setWardSuggestions(filtered);
      setShowWardSuggestions(filtered.length > 0);
    } else {
      const allWards = wards
        .filter((ward) => ward && ward.name)
        .slice(0, 15);
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
  };
};

export default useVietnamLocations;

