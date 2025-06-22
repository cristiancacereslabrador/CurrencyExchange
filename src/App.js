import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./App.css";

/* --------------------------------------------------
   Utilidades de formato: miles con punto y decimales con coma
-------------------------------------------------- */
const format = (n) =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const cleanNumber = (v) =>
  v
    .replace(/[^0-9.,]/g, "")
    .replace(/,/g, ".")
    .replace(/^(\d*\.\d{0,2}).*$/, "$1")
    .replace(/^0+(?=\d)/, "");

const App = () => {
  /* ─────────── ESTADO ─────────── */
  const [usdToPesos, setUsdToPesos]   = useState("0");  // 1 USD ⇒ PESOS
  const [bsPer1kPesos, setBsPer1k]   = useState("27"); // 1000 PESOS ⇒ Bs
const [usdToBs, setUsdToBs] = useState(0);
  const [amountPesos, setAmountPesos] = useState("");  // monto a cobrar
  const [pesos, setPesos]             = useState("");  // pago en PESOS
  const [usd,   setUsd]               = useState("");  // pago en USD
  const [bs,    setBs]                = useState("");  // pago en Bs

  const [lastUpdate, setLastUpdate]   = useState("");
  const [actYear, setActYear]         = useState("");

  /* ─────────── OBTENER TASA INICIAL ─────────── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        // sin comisión de casa de cambio para claridad -> puedes ajustar
        setUsdToPesos(data.rates.COP.toFixed(2));

const bsResponse = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        setUsdToBs(bsResponse.data.rates.VES);


        const [y, m, d] = data.date.split("-");
        setActYear(y);
        const meses = [
          "enero","febrero","marzo","abril","mayo","junio","julio",
          "agosto","septiembre","octubre","noviembre","diciembre"
        ];
        setLastUpdate(`${parseInt(d)} de ${meses[parseInt(m) - 1]}`);
      } catch (err) {
        console.error("Error obteniendo tasa:", err);
      }
    })();
  }, []);

  /* ─────────── HANDLER GENÉRICO ─────────── */
  const handle = (setter) => (e) => setter(cleanNumber(e.target.value));

  /* ─────────── TASA USD → Bs DERIVADA ─────────── */
  // const usdToBsRate = useMemo(() => {
  //   const rUsdPesos = parseFloat(usdToPesos) || 0;
  //   const rBs1k     = parseFloat(bsPer1kPesos) || 0;
  //   return rUsdPesos && rBs1k ? (rUsdPesos * rBs1k) / 1000 : 0;
  // }, [usdToPesos, bsPer1kPesos]);

  /* ─────────── CÁLCULOS ─────────── */
  const {
    usdPesosStr,
    bsPesosStr,
    totalPesosStr,
    faltanteStr,
    vueltoStr,
  } = useMemo(() => {
    const rUsdPesos = parseFloat(usdToPesos)   || 0;
    const rBs1k     = parseFloat(bsPer1kPesos) || 1;

    const usdVal    = parseFloat(usd.replace(/,/g, '.'))   || 0;
    const pesosVal  = parseFloat(pesos.replace(/,/g, '.')) || 0;
    const bsVal     = parseFloat(bs.replace(/,/g, '.'))    || 0;
    const amountVal = parseFloat(amountPesos.replace(/,/g, '.')) || 0;

    const usdPesos = usdVal * rUsdPesos;
    const bsPesos  = (bsVal / rBs1k) * 1000;

    const total    = pesosVal + usdPesos + bsPesos;
    const falt     = Math.max(0, amountVal - total);
    const vuelto   = Math.max(0, total - amountVal);

    return {
      usdPesosStr   : format(usdPesos),
      bsPesosStr    : format(bsPesos),
      totalPesosStr : format(total),
      faltanteStr   : format(falt),
      vueltoStr     : format(vuelto),
    };
  }, [usd, pesos, bs, amountPesos, usdToPesos, bsPer1kPesos]);

  /* ─────────── RENDER ─────────── */
  return (
    <div className="app-container">
      <h1 className="title">COBRO COP·USD·BS</h1>

      {/* Monto a cobrar */}
      <div className="form-container">
        <div className="input-group highlight">
          <label>Monto a cobrar (PESOS)</label>
          <input
            className="input low"
            type="text"
            value={amountPesos}
            onChange={handle(setAmountPesos)}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Pagos */}
      <div className="form-container">
        {/* PESOS */}
        <div className="input-group">
          <label>Pesos (PESOS)</label>
          <input
            className="input low"
            type="text"
            value={pesos}
            onChange={handle(setPesos)}
            placeholder="0,00"
          />
        </div>

        {/* USD */}
        <div className="input-group">
          <label>Dólar (USD)</label>
          <div className="input-with-label">
            <input
              className="input low"
              type="text"
              value={usd}
              onChange={handle(setUsd)}
              placeholder="0,00"
            />
            <div className="converted-box">{usdPesosStr} PESOS</div>
          </div>
        </div>

        {/* Bs */}
        <div className="input-group">
          <label>Bolívar (Bs)</label>
          <div className="input-with-label">
            <input
              className="input low"
              type="text"
              value={bs}
              onChange={handle(setBs)}
              placeholder="0,00"
            />
            <div className="converted-box">{bsPesosStr} PESOS</div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="form-container">
        <div className="input-group">
          <label>Total recibido (PESOS)</label>
          <input className="input secondary low" value={totalPesosStr} readOnly />
        </div>
        <div className="input-group">
          <label>Faltante (PESOS)</label>
          <input className="input secondary low" value={faltanteStr} readOnly />
        </div>
        <div className="input-group">
          <label>Vuelto (PESOS)</label>
          <input className="input secondary low" value={vueltoStr} readOnly />
        </div>
      </div>

      {/* Tasas */}
     <div className="exchange-info">
  <p className="inline-rate">
    1 USD =
    <input
      className="rate-input"
      value={usdToPesos}
      onChange={handle(setUsdToPesos)}
    />
    PESOS
  </p>
  <p className="inline-rate">
    1000 PESOS =
    <input
      className="rate-input small"
      value={bsPer1kPesos}
      onChange={handle(setBsPer1k)}
    />
    Bs
  </p>
  <p className="inline-rate">
    1 USD = {format(usdToBs)} Bs (Tasa BCV actual)
  </p>
</div>


      {/* Footer */}
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
