import React, { useState, useEffect, useCallback } from "react";
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

      // 1. Primary Source: BCV Scraper (Direct from website)
      try {
        const bcvProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://www.bcv.org.ve/")}`;
        const bcvRes = await axios.get(bcvProxyUrl);
        const html = bcvRes.data.contents;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        const parseBcvRate = (id) => {
          const text = doc.querySelector(`${id} strong`)?.textContent || "0";
          return parseFloat(text.replace(",", "."));
        };

        bcvUsd = parseBcvRate("#dolar");
        bcvEur = parseBcvRate("#euro");
      } catch (scrapeErr) {
        console.warn("BCV Scraper failed, using DolarAPI as fallback", scrapeErr);
      }

      // 2. Parallel Rates and Fallback for Official
      try {
        const [uOfi, uPara, eOfi, ePara] = await Promise.allSettled([
          axios.get("https://ve.dolarapi.com/v1/dolares/oficial"),
          axios.get("https://ve.dolarapi.com/v1/dolares/paralelo"),
          axios.get("https://ve.dolarapi.com/v1/euros/oficial"),
          axios.get("https://ve.dolarapi.com/v1/euros/paralelo")
        ]);
        
        if (!bcvUsd && uOfi.status === "fulfilled") bcvUsd = uOfi.value.data.promedio;
        if (uPara.status === "fulfilled") paraleloUsd = uPara.value.data.promedio;
        if (!bcvEur && eOfi.status === "fulfilled") bcvEur = eOfi.value.data.promedio;
        if (ePara.status === "fulfilled") paraleloEur = ePara.value.data.promedio;
      } catch (apiErr) {
        console.warn("DolarAPI failed", apiErr);
      }

      // 3. Fetch COP rate
      const copRes = await axios.get("https://api.exchangerate-api.com/v4/latest/USD");
      const usdToCop = copRes.data.rates.COP;

      setRates({
        usd_bcv: bcvUsd || 500.46, 
        usd_paralelo: paraleloUsd || (bcvUsd * 1.15),
        eur_bcv: bcvEur || 589.27,
        eur_paralelo: paraleloEur || (bcvEur * 1.15),
        cop: usdToCop,
      });

      const date = new Date();
      setLastUpdate(date.toLocaleString('es-VE', {
        timeZone: 'America/Caracas',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }));
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

    let newValues = { ...values, [field]: value }; // Keep user input as is (could have comma)

    if (num === 0 && !value.includes(",")) {
      setValues({ bs: "", usd: "", eur: "", cop: "" });
      return;
    }

    if (field === "bs") {
      const usdVal = num / currentUsdRate;
      newValues.usd = formatValue(usdVal.toFixed(2));
      newValues.eur = formatValue((num / currentEurRate).toFixed(2));
      newValues.cop = (usdVal * rates.cop).toFixed(0);
    } else if (field === "usd") {
      const bsVal = num * currentUsdRate;
      newValues.bs = formatValue(bsVal.toFixed(2));
      newValues.eur = formatValue((bsVal / currentEurRate).toFixed(2));
      newValues.cop = (num * rates.cop).toFixed(0);
    } else if (field === "eur") {
      const bsVal = num * currentEurRate;
      newValues.bs = formatValue(bsVal.toFixed(2));
      newValues.usd = formatValue((bsVal / currentUsdRate).toFixed(2));
      newValues.cop = ((bsVal / currentUsdRate) * rates.cop).toFixed(0);
    } else if (field === "cop") {
      const usdVal = num / rates.cop;
      const bsVal = usdVal * currentUsdRate;
      newValues.usd = formatValue(usdVal.toFixed(2));
      newValues.bs = formatValue(bsVal.toFixed(2));
      newValues.eur = formatValue((bsVal / currentEurRate).toFixed(2));
    }

    setValues(newValues);
  }, [rates, useParalelo, values]);


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
            <h1>VenExchange Pro</h1>
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
              <span className="stat-value">= {formatValue((useParalelo ? rates.usd_paralelo : rates.usd_bcv).toFixed(2))} Bs.</span>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 EUR {useParalelo ? "(PARALELO)" : "(BCV)"}</span>
              <span className="stat-value">= {formatValue((useParalelo ? rates.eur_paralelo : rates.eur_bcv).toFixed(2))} Bs.</span>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 PESO (COP)</span>
              <span className="stat-value">= {formatValue(((useParalelo ? rates.usd_paralelo : rates.usd_bcv) / rates.cop).toFixed(4))} Bs.</span>
            </div>
            <div className="stat-item">
              <span className="stat-name">1 DÓLAR (USD)</span>
              <span className="stat-value">= {rates.cop.toFixed(0)} COP</span>
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

