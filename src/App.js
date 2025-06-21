import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  /* ─────────────  ESTADO PRINCIPAL  ───────────── */
  const [usdToCop, setUsdToCop] = useState(0);
  const [usdToBs, setUsdToBs] = useState(0);

  const [amountBs, setAmountBs] = useState(""); // Monto a cobrar
  const [cop, setCop] = useState("");
  const [usd, setUsd] = useState("");
  const [bs,  setBs]  = useState("");

  const [focusedField, setFocusedField] = useState(null);
  const [lastUpdate, setLastUpdate]     = useState("");
  const [actYear, setActYear]           = useState("");

  /* ─────────────  OBTENER TIPOS DE CAMBIO  ───────────── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );

        // Descuento 6 % “casa de cambio” sobre COP
        setUsdToCop(data.rates.COP * 0.94);
        setUsdToBs(data.rates.VES);

        const [y, m, d] = data.date.split("-");
        setActYear(y);
        const meses = [
          "enero","febrero","marzo","abril","mayo","junio",
          "julio","agosto","septiembre","octubre","noviembre","diciembre"
        ];
        setLastUpdate(`${parseInt(d)} de ${meses[parseInt(m) - 1]}`);
      } catch (err) {
        console.error("Error fetching exchange rates:", err);
      }
    })();
  }, []);

  /* ─────────────  UTILIDADES INPUT  ───────────── */
  const sanitize = (v) =>
    v
      .replace(/[^0-9.]/g, "")           // solo dígitos y punto
      .replace(/^(\d*\.\d{0,2}).*$/, "$1") // máx. 2 decimales
      .replace(/^0+(?=\d)/, "");         // sin ceros a la izquierda

  const handleChange = (setter) => (e) => setter(sanitize(e.target.value));

  const handleFocus = (field) => {
    setFocusedField(field);
    if (field === "usd") setUsd("");
    if (field === "cop") setCop("");
    if (field === "bs")  setBs("");
  };

  /* ─────────────  AUTORRELLENO DE DIVISAS  ───────────── */
  useEffect(() => {
    if (!focusedField || usdToBs === 0 || usdToCop === 0) return;

    const current = parseFloat(
      { usd, cop, bs }[focusedField] || "0"
    );

    if (focusedField === "usd") {
      setBs ((current * usdToBs ).toFixed(2));
      setCop((current * usdToCop).toFixed(2));
    }
    if (focusedField === "cop") {
      const usdCalc = current / usdToCop;
      setUsd(usdCalc.toFixed(2));
      setBs ((usdCalc * usdToBs).toFixed(2));
    }
    if (focusedField === "bs") {
      const usdCalc = current / usdToBs;
      setUsd(usdCalc.toFixed(2));
      setCop((usdCalc * usdToCop).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usd, cop, bs, focusedField, usdToBs, usdToCop]);

  /* ─────────────  CÁLCULO TOTAL & VUELTO  ───────────── */
  const { totalBs, changeBs } = useMemo(() => {
    const numUsd    = parseFloat(usd)    || 0;
    const numCop    = parseFloat(cop)    || 0;
    const numBs     = parseFloat(bs)     || 0;
    const numAmount = parseFloat(amountBs) || 0;

    const usdBs = numUsd * usdToBs;
    const copBs = (numCop / usdToCop) * usdToBs;

    const total  = usdBs + copBs + numBs;
    const change = total - numAmount;

    return {
      totalBs : total.toFixed(2),
      changeBs: change.toFixed(2)
    };
  }, [usd, cop, bs, amountBs, usdToBs, usdToCop]);

  /* ─────────────  RENDER  ───────────── */
  return (
    <div className="app-container">
      <h1 className="title">USD - BS - COP</h1>

      {/* Monto a cobrar */}
      <div className="form-container">
        <div className="input-group highlight">
          <label>Monto a cobrar (Bs)</label>
          <input
            type="text"
            value={amountBs}
            onChange={handleChange(setAmountBs)}
            className="input"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Pagos del cliente */}
      <div className="form-container">
        <div className="input-group">
          <label>Peso Colombiano (COP)</label>
          <input
            type="text"
            value={cop}
            onChange={handleChange(setCop)}
            onFocus={() => handleFocus("cop")}
            className="input"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        <div className="input-group">
          <label>Dólar (USD)</label>
          <input
            type="text"
            value={usd}
            onChange={handleChange(setUsd)}
            onFocus={() => handleFocus("usd")}
            className="input"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        <div className="input-group">
          <label>Bolívar (Bs)</label>
          <input
            type="text"
            value={bs}
            onChange={handleChange(setBs)}
            onFocus={() => handleFocus("bs")}
            className="input"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Resultados */}
      <div className="form-container">
        <div className="input-group">
          <label>Total recibido (Bs)</label>
          <input className="input" value={totalBs} readOnly />
        </div>
        <div className="input-group">
          <label>{changeBs >= 0 ? "Vuelto (Bs)" : "Faltante (Bs)"}</label>
          <input className="input" value={Math.abs(changeBs)} readOnly />
        </div>
      </div>

      {/* Info de cambio */}
      <div className="exchange-info">
        <p>1 USD = {usdToBs.toFixed(2)} BS</p>
        <p>1 USD = {usdToCop.toFixed(2)} COP</p>
      </div>

      {/* Fecha y footer */}
      <div className="act">
        <p>Actualizado al {lastUpdate}</p>
      </div>
      <div className="creator">
        <p>
          &copy; {actYear}&nbsp;
          <a href="https://wa.me/51980675172" className="name">
            Cristian Cáceres&nbsp;
            <i className="fab fa-whatsapp whatsapp-icon" />
          </a>
        </p>
      </div>
    </div>
  );
};

export default App;
