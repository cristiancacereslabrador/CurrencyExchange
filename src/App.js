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
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [useParalelo, setUseParalelo] = useState(false);

  // Conversion state
  const [values, setValues] = useState({
    bs: "",
    usd: "",
    eur: "",
    cop: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let bcvUsd = 0, paraleloUsd = 0, bcvEur = 0, paraleloEur = 0;

      const apiTimeout = { timeout: 3500 };
      const bcvProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://www.bcv.org.ve/")}`;

      // Run everything in parallel to drastically speed up loading
      const [bcvReq, uOfiReq, uParaReq, eOfiReq, eParaReq, copReq] = await Promise.allSettled([
        axios.get(bcvProxyUrl, apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/dolares/oficial", apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/dolares/paralelo", apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/euros/oficial", apiTimeout),
        axios.get("https://ve.dolarapi.com/v1/euros/paralelo", apiTimeout),
        axios.get("https://api.exchangerate-api.com/v4/latest/USD", apiTimeout)
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

      // Intentar cargar de localStorage como respaldo dinámico si todo falla
      const cachedRates = JSON.parse(localStorage.getItem('venRatesCache')) || {};
      
      const finalRates = {
        usd_bcv: bcvUsd || cachedRates.usd_bcv || 500.46, 
        usd_paralelo: paraleloUsd || cachedRates.usd_paralelo || (bcvUsd ? bcvUsd * 1.15 : 575.52),
        eur_bcv: bcvEur || cachedRates.eur_bcv || 589.27,
        eur_paralelo: paraleloEur || cachedRates.eur_paralelo || (bcvEur ? bcvEur * 1.15 : 677.66),
        cop: usdToCop || cachedRates.cop || 3701,
      };

      setRates(finalRates);
      
      // Si la carga fue exitosa, guardamos en la memoria del navegador (localStorage)
      if (bcvUsd || paraleloUsd) {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    
    // Tasa Cúcuta: En paralelo, el peso suele valer menos en bolívares en la frontera que el cruce internacional directo.
    // Aplicamos un factor de castigo común (aprox 15% menos de valor del peso frente al bolívar)
    const currentCopRate = useParalelo ? rates.cop * 1.15 : rates.cop;

    if (num === 0 && !value.includes(",")) {
      setValues({ bs: "", usd: "", eur: "", cop: "" });
      return;
    }

    setValues(prev => {
      let newValues = { ...prev, [field]: value }; // Keep user input as is
      
      if (field === "bs") {
        const usdVal = num / currentUsdRate;
        newValues.usd = formatValue(usdVal.toFixed(2));
        newValues.eur = formatValue((num / currentEurRate).toFixed(2));
        newValues.cop = (usdVal * currentCopRate).toFixed(0);
      } else if (field === "usd") {
        const bsVal = num * currentUsdRate;
        newValues.bs = formatValue(bsVal.toFixed(2));
        newValues.eur = formatValue((bsVal / currentEurRate).toFixed(2));
        newValues.cop = (num * currentCopRate).toFixed(0);
      } else if (field === "eur") {
        const bsVal = num * currentEurRate;
        newValues.bs = formatValue(bsVal.toFixed(2));
        newValues.usd = formatValue((bsVal / currentUsdRate).toFixed(2));
        newValues.cop = ((bsVal / currentUsdRate) * currentCopRate).toFixed(0);
      } else if (field === "cop") {
        const usdVal = num / currentCopRate;
        const bsVal = usdVal * currentUsdRate;
        newValues.usd = formatValue(usdVal.toFixed(2));
        newValues.bs = formatValue(bsVal.toFixed(2));
        newValues.eur = formatValue((bsVal / currentEurRate).toFixed(2));
      }
      return newValues;
    });
  }, [rates, useParalelo]);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // Recalculate when rates change
  useEffect(() => {
    const currentValues = valuesRef.current;
    if (currentValues.usd) {
      convert("usd", currentValues.usd);
    } else if (currentValues.bs) {
      convert("bs", currentValues.bs);
    } else if (currentValues.eur) {
      convert("eur", currentValues.eur);
    } else if (currentValues.cop) {
      convert("cop", currentValues.cop);
    }
  }, [rates, useParalelo, convert]);

  const handleRateEdit = (type, value) => {
    const cleanValue = value.replace(/,/g, ".");
    const num = parseFloat(cleanValue) || 0;
    
    if (num <= 0) return;

    if (type === 'usd') {
      setRates(prev => ({ ...prev, [useParalelo ? 'usd_paralelo' : 'usd_bcv']: num }));
    } else if (type === 'eur') {
      setRates(prev => ({ ...prev, [useParalelo ? 'eur_paralelo' : 'eur_bcv']: num }));
    } else if (type === 'cop') {
      // If editing USD to COP directly
      setRates(prev => ({ ...prev, cop: useParalelo ? num / 1.15 : num }));
    } else if (type === 'peso_bs') {
      // If editing 1 Peso = X Bs.
      // 1 Peso = USD_BS / COP_RATE => COP_RATE = USD_BS / X
      const currentUsdRate = useParalelo ? rates.usd_paralelo : rates.usd_bcv;
      const newCopRate = currentUsdRate / num;
      setRates(prev => ({ ...prev, cop: useParalelo ? newCopRate / 1.15 : newCopRate }));
    }
  };


  const handleInputChange = (field, e) => {
    const val = e.target.value.replace(/[^0-9.,]/g, "");
    convert(field, val);
  };

  const clearValues = () => {
    setValues({ bs: "", usd: "", eur: "", cop: "" });
  };

  const toggleRateType = () => {
    setUseParalelo(!useParalelo);
    // Recalculate based on current USD value if it exists
    if (values.usd) {
      const usd = parseFloat(values.usd) || 0;
      const currentUsdRate = !useParalelo ? rates.usd_paralelo : rates.usd_bcv;
      const currentEurRate = !useParalelo ? rates.eur_paralelo : rates.eur_bcv;
      
      const bsVal = usd * currentUsdRate;
      setValues(prev => ({
        ...prev,
        bs: bsVal.toFixed(2),
        eur: (bsVal / currentEurRate).toFixed(2)
      }));
    }
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
              <div className="card-label"><Coins size={13} /><span>Bs.</span></div>
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
              <div className="card-label"><Globe size={13} /><span>COP</span></div>
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
                    value={formatValue((useParalelo ? rates.usd_paralelo : rates.usd_bcv).toFixed(2))}
                    onChange={(e) => handleRateEdit('usd', e.target.value)}
                  />
                <span className="stat-unit">Bs.</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 EUR {useParalelo ? "(PARALELO)" : "(BCV)"}</span>
              <div className="stat-value">
                = <input 
                    type="text" 
                    className="stat-input"
                    value={formatValue((useParalelo ? rates.eur_paralelo : rates.eur_bcv).toFixed(2))}
                    onChange={(e) => handleRateEdit('eur', e.target.value)}
                  />
                <span className="stat-unit">Bs.</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 PESO {useParalelo ? "(CÚCUTA)" : "(COP)"}</span>
              <div className="stat-value">
                = <input 
                    type="text" 
                    className="stat-input"
                    value={formatValue(((useParalelo ? rates.usd_paralelo : rates.usd_bcv) / (useParalelo ? rates.cop * 1.15 : rates.cop)).toFixed(4))}
                    onChange={(e) => handleRateEdit('peso_bs', e.target.value)}
                  />
                <span className="stat-unit">Bs.</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 DÓLAR (USD)</span>
              <div className="stat-value">
                = <input 
                    type="text" 
                    className="stat-input"
                    value={(useParalelo ? rates.cop * 1.15 : rates.cop).toFixed(0)}
                    onChange={(e) => handleRateEdit('cop', e.target.value)}
                  />
                <span className="stat-unit">COP</span>
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

