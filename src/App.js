import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./App.css";

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
  const [usdToPesos, setUsdToPesos] = useState("0");
  const [usdToBs, setUsdToBs] = useState("");
  const [bsPer1kPesos, setBsPer1k] = useState("27");
  const [bsMonto, setBsMonto] = useState("");
  const [pesos, setPesos] = useState("");
  const [usd, setUsd] = useState("");
  const [bs, setBs] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [actYear, setActYear] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        const usdToCop = parseFloat(data.rates.COP.toFixed(2));
        setUsdToPesos(usdToCop.toString());
        const usdToBsInicial = parseFloat(data.rates.VES.toFixed(2));
        setUsdToBs(usdToBsInicial);
        const [y, m, d] = data.date.split("-");
        setActYear(y);
        const meses = [
          "enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ];
        setLastUpdate(`${parseInt(d)} de ${meses[parseInt(m) - 1]}`);
      } catch (err) {
        console.error("Error obteniendo tasa:", err);
      }
    })();
  }, []);

  const handle = (setter) => (e) => setter(cleanNumber(e.target.value));

  const pesosMontoCalculado = useMemo(() => {
    const bsVal = parseFloat(bsMonto.replace(/,/g, ".")) || 0;
    const rBs1k = parseFloat(bsPer1kPesos) || 1;
    const res = format(bsVal * rBs1k);
    return res;
  }, [bsMonto, bsPer1kPesos]);

  const {
    usdPesosStr,
    bsPesosStr,
    totalPesosStr,
    faltanteBs,
    faltanteUsd,
    faltanteStr,
    vueltoStr,
  } = useMemo(() => {
    const rUsdPesos = parseFloat(usdToPesos) || 0;
    const rUsdBs = parseFloat(usdToBs) || 1;
    const usdVal = parseFloat(usd.replace(/,/g, ".")) || 0;
    const pesosVal = parseFloat(pesos.replace(/,/g, ".")) || 0;
    const bsVal = parseFloat(bs.replace(/,/g, ".")) || 0;
    const bsMontoVal = parseFloat(bsMonto.replace(/,/g, ".")) || 0;
    const rBs1k = parseFloat(bsPer1kPesos) || 1;

    const montoObjetivoEnPesos = bsMontoVal * rBs1k;
    const usdPesos = usdVal * rUsdPesos;
    const bsPesos = bsVal * rBs1k;
    const total = pesosVal + usdPesos + bsPesos;

    const falt = Math.max(0, montoObjetivoEnPesos - total);
    const vuelto = Math.max(0, total - montoObjetivoEnPesos);

    return {
      usdPesosStr: format(usdPesos),
      bsPesosStr: format(bsPesos),
      totalPesosStr: format(total),
      faltanteStr: format(falt),
      faltanteBs: format((falt * rUsdBs) / rUsdPesos),
      faltanteUsd: format(falt / rUsdPesos),
      vueltoStr: format(vuelto),
    };
  }, [usd, pesos, bs, bsMonto, usdToPesos, usdToBs, bsPer1kPesos]);

  return (
    <div className="app-container">
      <h1 className="title">BS · PESOS · USD</h1>

      <div className="form-container monto-section">
        <div className="input-group dual-input">
          <div>
            <input
              className="input monto-input"
              type="text"
              value={bsMonto}
              onChange={handle(setBsMonto)}
              placeholder="0,00"
            />
            <div className="label-below2">BOLÍVARES</div>
          </div>
          <div>
            <input
              className="input monto-input2"
              type="text"
              value={pesosMontoCalculado}
              readOnly
            />
            <div className="label-below2">PESOS</div>
          </div>
        </div>
      </div>

      <div className="form-container">
        <div className="input-group">
            <div className="label-below">PESOS RECIBIDOS</div>
          <div style={{ position: "relative", display: "inline-block" }}>
            <input
              className="input low"
              type="text"
              value={pesos}
              onChange={handle(setPesos)}
              placeholder="0,00"
              style={{ paddingRight: "60px" }}
            />
            <span className="unit-label">PESOS</span>
          </div>
        </div>

        <div className="input-group">
            <div className="label-below">DOLARES RECIBIDOS</div>
          <div className="input-with-label">
            <input
              className="input low2"
              type="text"
              value={usd}
              onChange={handle(setUsd)}
              placeholder="0,00"
            />
            <div className="converted-box">{usdPesosStr} PESOS</div>
          </div>
        </div>

        <div className="input-group">
            <div className="label-below">BOLÍVARES RECIBIDOS</div>
          <div className="input-with-label">
            <input
              className="input low2"
              type="text"
              value={bs}
              onChange={handle(setBs)}
              placeholder="0,00"
            />
            <div className="converted-box">{bsPesosStr} PESOS</div>
          </div>
        </div>
      </div>

      <div className="form-container">
        <div className="input-group">
          <label style={{ color: "white" }}>TOTAL RECIBIDO</label>
          <div className="input-with-unit">
            <input
              className="input secondary low result-box"
              value={totalPesosStr}
              readOnly
            />
            <span className="unit-label">PESOS</span>
          </div>
        </div>

        <div className="input-group">
          <label style={{ color: "white" }}>DINERO FALTANTE</label>
          <div className="dual-input">
            <input
              className="input secondary low result-box"
              value={faltanteBs}
              readOnly
            />
            <input
              className="input secondary low result-box"
              value={faltanteStr}
              readOnly
            />
            <input
              className="input secondary low result-box"
              value={faltanteUsd}
              readOnly
            />
          </div>
          <div className="label-below dual-input">
            <span>BOLÍVARES</span>
            <span>PESOS</span>
            <span>DOLARES</span>
          </div>
        </div>

        <div className="input-group">
          <label style={{ color: "white" }}>TOTAL VUELTO</label>
          <div className="input-with-unit">
            <input
              className="input secondary low result-box"
              value={vueltoStr}
              readOnly
            />
            <span className="unit-label">PESOS</span>
          </div>
        </div>
      </div>

      <div className="exchange-info">
        <p className="inline-rate">
          1 USD =
          <input
            className="rate-input"
            type="text"
            value={usdToPesos}
            onChange={handle(setUsdToPesos)}
          />
          PESOS COLOMBIANOS
        </p>
       <div className="inline-rate-row">
  <p className="inline-rate">
    1 PESO =
    <input
      className="rate-input small"
      type="text"
      value={bsPer1kPesos}
      onChange={handle(setBsPer1k)}
    />
    BS.
  </p>
  <p className="inline-rate">
    1 USD =
    <input
      className="rate-input small2"
      type="text"
      value={usdToBs}
      onChange={handle(setUsdToBs)}
    />
    BS.
  </p>
</div>

      </div>

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
