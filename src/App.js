import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  /* ─────────────  ESTADO PRINCIPAL  ───────────── */
  const [usdToCop, setUsdToCop] = useState("0"); // ← string para que <input> lo muestre
  const [usdToBs,  setUsdToBs]  = useState(0);

  const [amountBs, setAmountBs] = useState("");   // monto a cobrar
  const [cop, setCop] = useState("");
  const [usd, setUsd] = useState("");
  const [bs,  setBs]  = useState("");

  const [focusedField, setFocusedField] = useState(null);
  const [lastUpdate, setLastUpdate]     = useState("");
  const [actYear,   setActYear]         = useState("");

  /* ─────────────  OBTENER TIPOS DE CAMBIO  ───────────── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );

        // COP con 6 % de comisión
        setUsdToCop((data.rates.COP * 0.94).toFixed(2));
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
      .replace(/[^0-9.]/g, "")
      .replace(/^(\d*\.\d{0,2}).*$/, "$1")
      .replace(/^0+(?=\d)/, "");

  const handleChange      = (setter) => (e) => setter(sanitize(e.target.value));
  const handleRateChange  = (e)    => setUsdToCop(sanitize(e.target.value));
  const handleFocus = (field) => {
    setFocusedField(field);
    if (field === "usd") setUsd("");
    if (field === "cop") setCop("");
    if (field === "bs")  setBs("");
  };

  /* ─────────────  AUTORRELLENO DE DIVISAS  ───────────── */
  useEffect(() => {
    if (!focusedField || usdToBs === 0 || parseFloat(usdToCop) === 0) return;

    const current = parseFloat({ usd, cop, bs }[focusedField] || "0");

    if (focusedField === "usd") {
      setBs ((current * usdToBs ).toFixed(2));
      setCop((current * parseFloat(usdToCop)).toFixed(2));
    }
    if (focusedField === "cop") {
      const usdCalc = current / parseFloat(usdToCop);
      setUsd(usdCalc.toFixed(2));
      setBs ((usdCalc * usdToBs).toFixed(2));
    }
    if (focusedField === "bs") {
      const usdCalc = current / usdToBs;
      setUsd(usdCalc.toFixed(2));
      setCop((usdCalc * parseFloat(usdToCop)).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usd, cop, bs, focusedField, usdToBs, usdToCop]);

  /* ─────────────  CÁLCULO TOTAL, VUELTO Y EQUIVALENCIAS  ───────────── */
  const {
    totalBs,
    changeBs,
    usdBsDisplay,
    copBsDisplay
  } = useMemo(() => {
    const numUsd     = parseFloat(usd) || 0;
    const numCop     = parseFloat(cop) || 0;
    const numBs      = parseFloat(bs)  || 0;
    const numAmount  = parseFloat(amountBs) || 0;
    const rateCop    = parseFloat(usdToCop) || 1;           // evita /0

    const usdBs = numUsd * usdToBs;
    const copBs = (numCop / rateCop) * usdToBs;

    const total  = usdBs + copBs + numBs;
    const change = total - numAmount;

    return {
      totalBs      : total.toFixed(2),
      changeBs     : change.toFixed(2),
      usdBsDisplay : usdBs.toFixed(2),
      copBsDisplay : copBs.toFixed(2)
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
        {/* COP */}
        <div className="input-group">
          <label>Peso Colombiano (COP)</label>
          <div className="dual-input">
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
            <input
              className="input secondary"
              value={copBsDisplay}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>
        {/* USD */}
        <div className="input-group">
          <label>Dólar (USD)</label>
          <div className="dual-input">
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
            <input
              className="input secondary"
              value={usdBsDisplay}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>
        {/* BS */}
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
          <input className="input" value={totalBs} readOnly tabIndex={-1} />
        </div>
        <div className="input-group">
          <label>{changeBs >= 0 ? "Vuelto (Bs)" : "Faltante (Bs)"}</label>
          <input
            className="input"
            value={Math.abs(changeBs)}
            readOnly
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Tipos de cambio */}
      <div className="exchange-info">
        <p>1 USD = {usdToBs.toFixed(2)} BS</p>
        <p>
          1 USD =
          <input
            className="rate-input"
            value={usdToCop}
            onChange={handleRateChange}
            inputMode="decimal"
            step="0.01"
          />
          COP
        </p>
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
