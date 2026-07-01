import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { 
  ArrowRightLeft, 
  RefreshCcw, 
  Eraser,
  Info, 
  DollarSign, 
  Euro, 
  Coins,
  Globe
} from "lucide-react";
import "./App.css";

const App = () => {
  // Rates state
  const [rates, setRates] = useState({
    usd_bcv: 0,
    usd_paralelo: 0,
    eur_bcv: 0,
    eur_paralelo: 0,
    cop: 0,
    usdt: 0,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [useParalelo, setUseParalelo] = useState(false);

  // Conversion state
  const [lastEditedField, setLastEditedField] = useState("usd");
  const [values, setValues] = useState({
    bs: "",
    usd: "",
    eur: "",
    cop: "",
    usdt: "",
  });

  const [rateValues, setRateValues] = useState({
    usd: "",
    eur: "",
    peso_bs: "",
    cop: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let bcvUsd = 0, paraleloUsd = 0, bcvEur = 0, paraleloEur = 0;

      const apiTimeout = { timeout: 3500 };
      const bcvProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://www.bcv.org.ve/")}`;

      // Run everything in parallel to drastically speed up loading
      const [bcvReq, uOfiReq, uParaReq, eOfiReq, eParaReq, copReq, usdtReq] = await Promise.allSettled([
        axios.get(bcvProxyUrl, apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/dolares/oficial", apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/dolares/paralelo", apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/euros/oficial", apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/euros/paralelo", apiTimeout),
        axios.get("https://api.exchangerate-api.com/v4/latest/USD", apiTimeout),
        axios.get("https://www.usdt.com.ve/api/v1/rates/current", apiTimeout)
      ]);

      // 1. Parse BCV Scraper (Highest Priority for Official)
      if (bcvReq.status === "fulfilled") {
        try {
          const html = bcvReq.value.data.contents;
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const parseBcvRate = (id) => {
            const text = doc.querySelector(`${id} strong`)?.textContent || "0";
            return parseFloat(text.replace(",", "."));
          };
          bcvUsd = parseBcvRate("#dolar");
          bcvEur = parseBcvRate("#euro");
        } catch (e) {
          console.warn("Could not parse BCV HTML");
        }
      }

      // 2. Parse DolarAPI (Fallback for Official, Primary for Paralelo)
      if (!bcvUsd && uOfiReq.status === "fulfilled") bcvUsd = uOfiReq.value.data.promedio;
      if (uParaReq.status === "fulfilled") paraleloUsd = uParaReq.value.data.promedio;
      if (!bcvEur && eOfiReq.status === "fulfilled") bcvEur = eOfiReq.value.data.promedio;
      if (eParaReq.status === "fulfilled") paraleloEur = eParaReq.value.data.promedio;

      // 3. Parse COP
      let usdToCop = null;
      if (copReq.status === "fulfilled") {
        usdToCop = copReq.value.data.rates.COP;
      }

      // 4. Parse USDT
      let usdtRate = null;
      if (usdtReq.status === "fulfilled" && usdtReq.value.data && usdtReq.value.data.success) {
        usdtRate = usdtReq.value.data.data.best?.buy_rate || usdtReq.value.data.data.binance?.buy_rate;
      }

      // Intentar cargar de localStorage como respaldo dinámico si todo falla
      const cachedRates = JSON.parse(localStorage.getItem('venRatesCache')) || {};
      
      const finalRates = {
        usd_bcv: bcvUsd || cachedRates.usd_bcv || 500.46, 
        usd_paralelo: paraleloUsd || cachedRates.usd_paralelo || (bcvUsd ? bcvUsd * 1.15 : 575.52),
        eur_bcv: bcvEur || cachedRates.eur_bcv || 589.27,
        eur_paralelo: paraleloEur || cachedRates.eur_paralelo || (bcvEur ? bcvEur * 1.15 : 677.66),
        cop: usdToCop || cachedRates.cop || 3701,
        usdt: usdtRate || cachedRates.usdt || paraleloUsd || bcvUsd || 700.00,
      };

      setRates(finalRates);
      
      // Si la carga fue exitosa, guardamos en la memoria del navegador (localStorage)
      if (bcvUsd || paraleloUsd || usdtRate) {
        localStorage.setItem('venRatesCache', JSON.stringify(finalRates));
      }

      const date = new Date();
      const timeString = date.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
      
      const finalLastUpdate = (bcvUsd || paraleloUsd) ? timeString : (localStorage.getItem('venLastUpdate') || timeString);
      setLastUpdate(finalLastUpdate);
      
      if (bcvUsd || paraleloUsd) {
        localStorage.setItem('venLastUpdate', finalLastUpdate);
      }

      setLoading(false);
    } catch (err) {
      console.error("Critical error fetching rates:", err);
      setError("Error al conectar con los servicios de tasa. Usando datos guardados.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync rate inputs when rates or type changes
  useEffect(() => {
    const currentUsd = useParalelo ? rates.usd_paralelo : rates.usd_bcv;
    const currentEur = useParalelo ? rates.eur_paralelo : rates.eur_bcv;
    const currentCop = useParalelo ? rates.cop * 0.95 : rates.cop;
    
    // Solo actualizar si el usuario no tiene el foco en ningún input de tasa
    // (o simplemente confiar en que rates solo cambia por acciones externas o Blur)
    setRateValues({
      usd: currentUsd.toFixed(2),
      eur: currentEur.toFixed(2),
      peso_bs: (currentUsd / currentCop).toFixed(4),
      cop: currentCop.toFixed(0)
    });
  }, [rates, useParalelo]);

  const formatValue = (val) => {
    if (!val) return "";
    return val.toString().replace(/\./g, ",");
  };

  // Calculation Logic
  const convert = useCallback((field, value) => {
    // Treat comma as dot for calculation
    const cleanValue = value.replace(/,/g, ".");
    const num = parseFloat(cleanValue) || 0;
    
    const currentUsdRate = (useParalelo ? rates.usd_paralelo : rates.usd_bcv) || 1;
    const currentEurRate = (useParalelo ? rates.eur_paralelo : rates.eur_bcv) || 1;
    const currentUsdtRate = rates.usdt || (useParalelo ? rates.usd_paralelo : rates.usd_bcv) || 1;
    
    // Tasa Cúcuta: En paralelo, el peso suele valer menos en bolívares en la frontera que el cruce internacional directo.
    // Aplicamos un factor de castigo común (aprox 5% menos de valor del peso frente al bolívar)
    const currentCopRate = useParalelo ? rates.cop * 0.95 : rates.cop;

    if (num === 0 && !value.includes(",")) {
      setValues({ bs: "", usd: "", eur: "", cop: "", usdt: "" });
      return;
    }

    setValues(prev => {
      let newValues = { ...prev, [field]: value }; // Keep user input as is
      
      if (field === "bs") {
        const usdVal = num / currentUsdRate;
        newValues.usd = formatValue(usdVal.toFixed(2));
        newValues.eur = formatValue((num / currentEurRate).toFixed(2));
        newValues.cop = (usdVal * currentCopRate).toFixed(0);
        newValues.usdt = formatValue((num / currentUsdtRate).toFixed(2));
      } else if (field === "usd") {
        const bsVal = num * currentUsdRate;
        newValues.bs = formatValue(bsVal.toFixed(2));
        newValues.eur = formatValue((bsVal / currentEurRate).toFixed(2));
        newValues.cop = (num * currentCopRate).toFixed(0);
        newValues.usdt = formatValue(num.toFixed(2));
      } else if (field === "eur") {
        const bsVal = num * currentEurRate;
        newValues.bs = formatValue(bsVal.toFixed(2));
        newValues.usd = formatValue((bsVal / currentUsdRate).toFixed(2));
        newValues.cop = ((bsVal / currentUsdRate) * currentCopRate).toFixed(0);
        newValues.usdt = formatValue((bsVal / currentUsdtRate).toFixed(2));
      } else if (field === "cop") {
        const usdVal = num / currentCopRate;
        const bsVal = usdVal * currentUsdRate;
        newValues.usd = formatValue(usdVal.toFixed(2));
        newValues.bs = formatValue(bsVal.toFixed(2));
        newValues.eur = formatValue((bsVal / currentEurRate).toFixed(2));
        newValues.usdt = formatValue((bsVal / currentUsdtRate).toFixed(2));
      } else if (field === "usdt") {
        const usdVal = num;
        const bsVal = num * currentUsdtRate;
        newValues.usd = formatValue(usdVal.toFixed(2));
        newValues.bs = formatValue(bsVal.toFixed(2));
        newValues.eur = formatValue(((usdVal * currentUsdRate) / currentEurRate).toFixed(2));
        newValues.cop = (usdVal * currentCopRate).toFixed(0);
      }
      return newValues;
    });
  }, [rates, useParalelo]);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // Recalculate when rates change or toggle rate type
  useEffect(() => {
    const currentValues = valuesRef.current;
    const valueToConvert = currentValues[lastEditedField];
    if (valueToConvert) {
      convert(lastEditedField, valueToConvert);
    }
  }, [rates, useParalelo, lastEditedField, convert]);

  const handleRateEdit = (type, value) => {
    // Solo actualizamos el texto visual mientras escribe
    const displayValue = value.replace(/[^0-9.,]/g, "");
    setRateValues(prev => ({ ...prev, [type]: displayValue }));
  };

  const handleRateBlur = (type) => {
    const value = rateValues[type];
    const cleanValue = value.replace(/,/g, ".");
    const num = parseFloat(cleanValue) || 0;
    
    // Si el campo está vacío o es 0, restauramos el valor actual de las tasas
    if (num <= 0) {
      const currentUsd = useParalelo ? rates.usd_paralelo : rates.usd_bcv;
      const currentEur = useParalelo ? rates.eur_paralelo : rates.eur_bcv;
      const currentCop = useParalelo ? rates.cop * 0.95 : rates.cop;
      
      setRateValues({
        usd: currentUsd.toFixed(2),
        eur: currentEur.toFixed(2),
        peso_bs: (currentUsd / currentCop).toFixed(4),
        cop: currentCop.toFixed(0)
      });
      return;
    }

    // Actualizar las tasas reales y disparar cálculos
    if (type === 'usd') {
      setRates(prev => ({ ...prev, [useParalelo ? 'usd_paralelo' : 'usd_bcv']: num }));
    } else if (type === 'eur') {
      setRates(prev => ({ ...prev, [useParalelo ? 'eur_paralelo' : 'eur_bcv']: num }));
    } else if (type === 'cop') {
      setRates(prev => ({ ...prev, cop: useParalelo ? num / 0.95 : num }));
    } else if (type === 'peso_bs') {
      const currentUsdRate = useParalelo ? rates.usd_paralelo : rates.usd_bcv;
      const newCopRate = currentUsdRate / num;
      setRates(prev => ({ ...prev, cop: useParalelo ? newCopRate / 0.95 : newCopRate }));
    }
  };


  const handleInputChange = (field, e) => {
    const val = e.target.value.replace(/[^0-9.,]/g, "");
    setLastEditedField(field);
    convert(field, val);
  };

  const clearValues = () => {
    setLastEditedField("usd");
    setValues({ bs: "", usd: "", eur: "", cop: "", usdt: "" });
  };

  const toggleRateType = () => {
    setUseParalelo(!useParalelo);
  };

  return (
    <div className="app-wrapper">
      <div className="glass-container">
        <header className="app-header">
          <div className="logo-section">
            <ArrowRightLeft className="logo-icon" size={32} />
            <h1>VenCambioMoneda</h1>
          </div>
          <div className="header-buttons">
            <button className="clear-btn" onClick={clearValues} title="Borrar valores">
              <Eraser size={18} />
            </button>
            <button className="refresh-btn" onClick={fetchData} disabled={loading} title="Actualizar tasas">
              <RefreshCcw className={loading ? "spinning" : ""} size={18} />
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <Info size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="rate-selector">
          <button 
            className={`selector-btn ${!useParalelo ? "active" : ""}`}
            onClick={() => useParalelo && toggleRateType()}
          >
            Oficial BCV
          </button>
          <button 
            className={`selector-btn ${useParalelo ? "active" : ""}`}
            onClick={() => !useParalelo && toggleRateType()}
          >
            Paralelo
          </button>
        </div>

        <main className="converter-grid">
          {/* Bolivares */}
          <div className="input-card bs-card">
            <div className="card-row">
              <div className="card-label"><Coins size={13} /><span>BS.</span></div>
              <input type="text" value={values.bs} onChange={(e) => handleInputChange("bs", e)} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>

          {/* Dolares */}
          <div className="input-card usd-card">
            <div className="card-row">
              <div className="card-label"><DollarSign size={13} /><span>USD</span></div>
              <input type="text" value={values.usd} onChange={(e) => handleInputChange("usd", e)} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>

          {/* USDT */}
          <div className="input-card usdt-card">
            <div className="card-row">
              <div className="card-label"><DollarSign size={13} /><span>USDT</span></div>
              <input type="text" value={values.usdt} onChange={(e) => handleInputChange("usdt", e)} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>

          {/* Euros */}
          <div className="input-card eur-card">
            <div className="card-row">
              <div className="card-label"><Euro size={13} /><span>EUR</span></div>
              <input type="text" value={values.eur} onChange={(e) => handleInputChange("eur", e)} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>

          {/* Pesos Colombianos */}
          <div className="input-card cop-card">
            <div className="card-row">
              <div className="card-label"><Globe size={13} /><span>PESOS</span></div>
              <input type="text" value={values.cop} onChange={(e) => handleInputChange("cop", e)} placeholder="0" inputMode="numeric" />
            </div>
          </div>
        </main>

        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-name">1 USD {useParalelo ? "(PARALELO)" : "(BCV)"}</span>
              <div className="stat-value">
                = <input 
                    type="text" 
                    className="stat-input"
                    value={rateValues.usd}
                    onChange={(e) => handleRateEdit('usd', e.target.value)}
                    onFocus={() => setRateValues(prev => ({ ...prev, usd: "" }))}
                    onBlur={() => handleRateBlur('usd')}
                  />
                <span className="stat-unit">BS.</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 EUR {useParalelo ? "(PARALELO)" : "(BCV)"}</span>
              <div className="stat-value">
                = <input 
                    type="text" 
                    className="stat-input"
                    value={rateValues.eur}
                    onChange={(e) => handleRateEdit('eur', e.target.value)}
                    onFocus={() => setRateValues(prev => ({ ...prev, eur: "" }))}
                    onBlur={() => handleRateBlur('eur')}
                  />
                <span className="stat-unit">BS.</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 PESO {useParalelo ? "(CÚCUTA)" : "(PESOS)"}</span>
              <div className="stat-value">
                = <input 
                    type="text" 
                    className="stat-input"
                    value={rateValues.peso_bs}
                    onChange={(e) => handleRateEdit('peso_bs', e.target.value)}
                    onFocus={() => setRateValues(prev => ({ ...prev, peso_bs: "" }))}
                    onBlur={() => handleRateBlur('peso_bs')}
                  />
                <span className="stat-unit">BS.</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 DÓLAR (USD)</span>
              <div className="stat-value">
                = <input 
                    type="text" 
                    className="stat-input"
                    value={rateValues.cop}
                    onChange={(e) => handleRateEdit('cop', e.target.value)}
                    onFocus={() => setRateValues(prev => ({ ...prev, cop: "" }))}
                    onBlur={() => handleRateBlur('cop')}
                  />
                <span className="stat-unit">PESOS</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 USDT (BINANCE P2P)</span>
              <div className="stat-value">
                = <span className="stat-readonly-value">{formatValue(rates.usdt ? rates.usdt.toFixed(2) : "0,00")}</span>
                <span className="stat-unit">BS.</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="app-footer">
          <p className="footer-update">Actualizado: {lastUpdate || "Cargando..."}</p>
          <div className="credits">
            <span>&copy; {new Date().getFullYear()} Cristian Cáceres</span>
            <a href="https://wa.me/51980675172" target="_blank" rel="noreferrer" className="wa-link">
              <i className="fab fa-whatsapp"></i>
              Contacto
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
