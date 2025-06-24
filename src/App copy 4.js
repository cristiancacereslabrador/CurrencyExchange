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

  // NUEVOS CAMPOS CONVERTIDORES
  const [bsToUsd, setBsToUsd] = useState("");
  const [usdToBsConv, setUsdToBsConv] = useState("");
  const [copToUsd, setCopToUsd] = useState("");
  const [usdToCop, setUsdToCop] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("https://api.exchangerate-api.com/v4/latest/USD");
        const usdToCop = parseFloat(data.rates.COP.toFixed(2));
        setUsdToPesos(usdToCop.toString());
        const usdToBsInicial = parseFloat(data.rates.VES.toFixed(2));
        setUsdToBs(usdToBsInicial);
        setUsdToCop(""); // limpiar si quedaba algo viejo

        const [y, m, d] = data.date.split("-");
        const meses = [
          "enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ];
        setLastUpdate(`${parseInt(d)} de ${meses[parseInt(m) - 1]}`);
        setActYear(y);
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
    const usdVal = parseFloat(usd.replaceAll(",", ".").replace(/[^\d.]/g, "")) || 0;
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

  const convertBsToUsd = () => {
    const bsVal = parseFloat(bsToUsd) || 0;
    return usdToBs ? format(bsVal / usdToBs) : "0.00";
  };

  const convertUsdToBs = () => {
    const usdVal = parseFloat(usdToBsConv) || 0;
    return usdToBs ? format(usdVal * usdToBs) : "0.00";
  };

  const convertCopToUsd = () => {
    const copVal = parseFloat(copToUsd) || 0;
    return usdToPesos ? format(copVal / usdToPesos) : "0.00";
  };

  const convertUsdToCop = () => {
    const usdVal = parseFloat(usdToCop) || 0;
    return usdToPesos ? format(usdVal * usdToPesos) : "0.00";
  };

  return (
    <div className="app-container">
      <h1 className="title">BS · PESOS · USD</h1>

      <div className="fixed-width-container">
        {/* BLOQUE NARANJA BOLIVARES -> PESOS */}
        <div className="form-container monto-section">

      <h1 className="title2">MONTO A PAGAR</h1>
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

        {/* INGRESOS */}
        <div className="form-container">
          <div className="input-group">
            <div className="label-below">PESOS RECIBIDOS</div>
            <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
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
            <div className="label-below">DÓLARES RECIBIDOS</div>
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

        {/* TOTALES */}
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
            <div className="faltante-group">
              <div className="faltante-item">
                <input
                  className="input secondary low result-box"
                  value={faltanteBs}
                  readOnly
                />
                <div className="faltante-label">BOLÍVARES</div>
              </div>
              <div className="faltante-item">
                <input
                  className="input secondary low result-box"
                  value={faltanteStr}
                  readOnly
                />
                <div className="faltante-label">PESOS</div>
              </div>
              <div className="faltante-item">
                <input
                  className="input secondary low result-box"
                  value={faltanteUsd}
                  readOnly
                />
                <div className="faltante-label">DÓLARES</div>
              </div>
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

        {/* EXCHANGE INFO */}
            <hr style={{ height: "4px", backgroundColor: "#fff", border: "none" }} />
      <p className="title-tc" style={{  }}>TASAS DE CAMBIO </p>
        <div className="exchange-info">
          <p className="inline-rate">
            1 USD =
            <input
              className="rate-input"
              type="text"
              value={usdToPesos}
              onChange={handle(setUsdToPesos)}
            />
            PESOS
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

        {/* NUEVA SECCIÓN VERDE */}
        <hr style={{ height: "4px", backgroundColor: "#fff", border: "none" }} />

       <div className="form-container monto-section" style={{ backgroundColor: "#007f3d" }}>
  {/* BOLÍVARES A DÓLARES */}
      <div className="label-below4">BOLÍVARES A DÓLARES</div>
  <div className="input-group dual-input">
    <div>
      <input
        className="input monto-input"
        type="text"
        value={bsToUsd}
        onChange={handle(setBsToUsd)}
        placeholder="0,00"
      />
    </div>
    <div className="input-with-unit">
      <input
        className="input monto-input3"
        type="text"
        value={convertBsToUsd()}
        readOnly
      />
      <span className="unit-label inside">DÓLARES</span>
    </div>
  </div>

  {/* DÓLARES A BOLÍVARES */}
      <div className="label-below4">DÓLARES A BOLÍVARES</div>
  <div className="input-group dual-input" style={{ marginBottom: "10px" }}>
    <div>
      <input
        className="input monto-input"
        type="text"
        value={usdToBsConv}
        onChange={handle(setUsdToBsConv)}
        placeholder="0,00"
      />
    </div>
    <div className="input-with-unit">
      <input
        className="input monto-input3"
        type="text"
        value={convertUsdToBs()}
        readOnly
      />
      <span className="unit-label inside">BOLÍVARES</span>
    </div>
  </div>

  {/* PESOS A DÓLARES */}
      <div className="label-below4">PESOS A DÓLARES</div>
  <div className="input-group dual-input" style={{ marginTop: "10px" }}>
    <div>
      <input
        className="input monto-input"
        type="text"
        value={copToUsd}
        onChange={handle(setCopToUsd)}
        placeholder="0,00"
      />
    </div>
    <div className="input-with-unit">
      <input
        className="input monto-input3"
        type="text"
        value={convertCopToUsd()}
        readOnly
      />
      <span className="unit-label inside">DÓLARES</span>
    </div>
  </div>

  {/* DÓLARES A PESOS */}
      <div className="label-below4">DÓLARES A PESOS</div>
  <div className="input-group dual-input" style={{ marginTop: "1px" }}>
    <div>
      <input
        className="input monto-input"
        type="text"
        value={usdToCop}
        onChange={handle(setUsdToCop)}
        placeholder="0,00"
      />
    </div>
    <div className="input-with-unit">
      <input
        className="input monto-input3"
        type="text"
        value={convertUsdToCop()}
        readOnly
      />
      <span className="unit-label inside">PESOS</span>
    </div>
  </div>


{/* BOLÍVARES A PESOS */}
    <div className="label-below4">BOLÍVARES A PESOS</div>
<div className="input-group dual-input" style={{ marginTop: "1px" }}>
  <div>
    <input
      className="input monto-input"
      type="text"
      value={bs}
      onChange={handle(setBs)}
      placeholder="0,00"
    />
  </div>
  <div className="input-with-unit">
    <input
      className="input monto-input3"
      type="text"
      value={bsPesosStr}
      readOnly
    />
    <span className="unit-label inside">PESOS</span>
  </div>
</div>

{/* PESOS A BOLÍVARES */}
    <div className="label-below4">PESOS A BOLÍVARES</div>
<div className="input-group dual-input" style={{ marginTop: "1px" }}>
  <div>
    <input
      className="input monto-input"
      type="text"
      value={pesos}
      onChange={handle(setPesos)}
      placeholder="0,00"
    />
  </div>
  <div className="input-with-unit">
    <input
      className="input monto-input3"
      type="text"
      value={format((parseFloat(pesos.replace(/,/g, ".")) || 0) / (parseFloat(bsPer1kPesos) || 1))}
      readOnly
    />
    <span className="unit-label inside">BOLÍVARES</span>
  </div>
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
    </div>
  );
};

export default App;
