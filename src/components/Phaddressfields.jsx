import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { regions, provinces, cities, barangays } from 'select-philippines-address';

// The package returns an error message (string) when a request fails
const asList = (result) => (Array.isArray(result) ? result : []);

const labelClass = 'mb-1 block text-xs tracking-widest text-[#2D3831]/60';

function SelectBox({ id, label, value, onChange, disabled, placeholder, children, inputClass }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} <span className="text-red-600">*</span>
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${inputClass} cursor-pointer appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <option value="">{placeholder}</option>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2D3831]/60" />
      </div>
    </div>
  );
}

/**
 * Region → Province → City/Municipality → Barangay dropdowns, plus ZIP code and street.
 * `value` keeps both the codes and the names, so the names can be shown/saved
 * and the codes let the dropdowns reload when editing a saved address.
 */
export default function PhAddressFields({ value, onChange, inputClass }) {
  const [regionList, setRegionList] = useState([]);
  const [provinceData, setProvinceData] = useState({ code: '', items: [] });
  const [cityData, setCityData] = useState({ code: '', items: [] });
  const [barangayData, setBarangayData] = useState({ code: '', items: [] });
  const [loadError, setLoadError] = useState(false);
  const provinceList = provinceData.code === value.regionCode ? provinceData.items : [];
  const cityList = cityData.code === value.provinceCode ? cityData.items : [];
  const barangayList = barangayData.code === value.cityCode ? barangayData.items : [];

  // regions (once)
  useEffect(() => {
    let off = false;
    regions().then((r) => {
      if (off) return;
      if (Array.isArray(r)) setRegionList(r);
      else setLoadError(true);
    });
    return () => {
      off = true;
    };
  }, []);

  // provinces when the region changes
  useEffect(() => {
    let off = false;
    if (!value.regionCode) return;
    provinces(value.regionCode).then(
      (r) => !off && setProvinceData({ code: value.regionCode, items: asList(r) })
    );
    return () => {
      off = true;
    };
  }, [value.regionCode]);

  // cities when the province changes
  useEffect(() => {
    let off = false;
    if (!value.provinceCode) return;
    cities(value.provinceCode).then(
      (r) => !off && setCityData({ code: value.provinceCode, items: asList(r) })
    );
    return () => {
      off = true;
    };
  }, [value.provinceCode]);

  // barangays when the city changes
  useEffect(() => {
    let off = false;
    if (!value.cityCode) return;
    barangays(value.cityCode).then(
      (r) => !off && setBarangayData({ code: value.cityCode, items: asList(r) })
    );
    return () => {
      off = true;
    };
  }, [value.cityCode]);

  const pickRegion = (e) => {
    const code = e.target.value;
    const item = regionList.find((r) => r.region_code === code);
    onChange({
      regionCode: code,
      region: item ? item.region_name : '',
      provinceCode: '',
      province: '',
      cityCode: '',
      city: '',
      barangayCode: '',
      barangay: '',
    });
  };

  const pickProvince = (e) => {
    const code = e.target.value;
    const item = provinceList.find((p) => p.province_code === code);
    onChange({
      provinceCode: code,
      province: item ? item.province_name : '',
      cityCode: '',
      city: '',
      barangayCode: '',
      barangay: '',
    });
  };

  const pickCity = (e) => {
    const code = e.target.value;
    const item = cityList.find((c) => c.city_code === code);
    onChange({
      cityCode: code,
      city: item ? item.city_name : '',
      barangayCode: '',
      barangay: '',
    });
  };

  const pickBarangay = (e) => {
    const code = e.target.value;
    const item = barangayList.find((b) => b.brgy_code === code);
    onChange({ barangayCode: code, barangay: item ? item.brgy_name : '' });
  };

  return (
    <div className="space-y-4">
      {loadError && (
        <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load the address list. Check your internet connection and reopen this form.
        </p>
      )}

      <SelectBox
        id="ph-region"
        label="REGION"
        value={value.regionCode}
        onChange={pickRegion}
        disabled={regionList.length === 0}
        placeholder="Select Region"
        inputClass={inputClass}
      >
        {regionList.map((r) => (
          <option key={r.region_code} value={r.region_code}>
            {r.region_name}
          </option>
        ))}
      </SelectBox>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectBox
          id="ph-province"
          label="PROVINCE"
          value={value.provinceCode}
          onChange={pickProvince}
          disabled={provinceList.length === 0}
          placeholder="Select Province"
          inputClass={inputClass}
        >
          {provinceList.map((p) => (
            <option key={p.province_code} value={p.province_code}>
              {p.province_name}
            </option>
          ))}
        </SelectBox>

        <SelectBox
          id="ph-city"
          label="CITY / MUNICIPALITY"
          value={value.cityCode}
          onChange={pickCity}
          disabled={cityList.length === 0}
          placeholder="Select City / Municipality"
          inputClass={inputClass}
        >
          {cityList.map((c) => (
            <option key={c.city_code} value={c.city_code}>
              {c.city_name}
            </option>
          ))}
        </SelectBox>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectBox
          id="ph-barangay"
          label="BARANGAY"
          value={value.barangayCode}
          onChange={pickBarangay}
          disabled={barangayList.length === 0}
          placeholder="Select Barangay"
          inputClass={inputClass}
        >
          {barangayList.map((b) => (
            <option key={b.brgy_code} value={b.brgy_code}>
              {b.brgy_name}
            </option>
          ))}
        </SelectBox>

        <div>
          <label htmlFor="ph-zip" className={labelClass}>
            ZIP CODE <span className="text-red-600">*</span>
          </label>
          <input
            id="ph-zip"
            value={value.zip}
            onChange={(e) => onChange({ zip: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            inputMode="numeric"
            placeholder="e.g. 5041"
            autoComplete="postal-code"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="ph-street" className={labelClass}>
          STREET NAME <span className="text-red-600">*</span>
        </label>
        <input
          id="ph-street"
          value={value.street}
          onChange={(e) => onChange({ street: e.target.value })}
          placeholder="House/Unit No., Street, Subdivision"
          autoComplete="street-address"
          className={inputClass}
        />
      </div>
    </div>
  );
}