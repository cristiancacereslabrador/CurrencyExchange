import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css"; // Importa el archivo CSS

const App = () => {
  const [usdToCop, setUsdToCop] = useState(0);
  const [usdToBs, setUsdToBs] = useState(0);
  const [cop, setCop] = useState("");
  const [bs, setBs] = useState("");
  const [usd, setUsd] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const copResponse = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );

        const copOficial = copResponse.data.rates.COP;
        const copChanged = copOficial - copOficial * 0.06;
        // setUsdToCop(copOficial); //ORI
        setUsdToCop(copChanged); //MINE
        const bsResponse = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        setUsdToBs(bsResponse.data.rates.VES);
      } catch (error) {
        console.error("Error fetching exchange rates", error);
      }
    };
    fetchExchangeRates();
  }, []);

  const handleInputChange = (setter, value) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setter(numericValue);
  };

  useEffect(() => {
    if (focusedField === "usd" && usdToBs > 0 && usdToCop > 0) {
      const usdValue = parseInt(usd) || 0;
      setBs((usdValue * usdToBs).toFixed(2));
      setCop((usdValue * usdToCop).toFixed(2));
    }
  }, [usd, usdToBs, usdToCop, focusedField]);

  useEffect(() => {
    if (focusedField === "cop" && usdToBs > 0 && usdToCop > 0) {
      const copValue = parseInt(cop) || 0;
      setUsd((copValue / usdToCop).toFixed(0));
      setBs(((copValue / usdToCop) * usdToBs).toFixed(2));
    }
  }, [cop, usdToBs, usdToCop, focusedField]);

  useEffect(() => {
    if (focusedField === "bs" && usdToBs > 0 && usdToCop > 0) {
      const bsValue = parseInt(bs) || 0;
      setUsd((bsValue / usdToBs).toFixed(0));
      setCop(((bsValue / usdToBs) * usdToCop).toFixed(2));
    }
  }, [bs, usdToBs, usdToCop, focusedField]);

  const handleFocus = (field) => {
    setFocusedField(field);
    if (field === "usd") setUsd("");
    if (field === "bs") setBs("");
    if (field === "cop") setCop("");
  };

  return (
    <div className="app-container">
      <h1 className="title">USD - BS - COP</h1>
      <div className="form-container">
        <div className="input-group">
          <label>Bolívar (BS)</label>
          <input
            type="text"
            value={bs}
            onChange={(e) => handleInputChange(setBs, e.target.value)}
            onFocus={() => handleFocus("bs")}
            className="input"
            inputMode="numeric" // Indica un teclado numérico en dispositivos móviles
            pattern="[0-9]*" // Asegura que solo números sean ingresados
          />
        </div>
        <div className="input-group">
          <label>Dólar (USD)</label>
          <input
            type="text"
            value={usd}
            onChange={(e) => handleInputChange(setUsd, e.target.value)}
            onFocus={() => handleFocus("usd")}
            className="input"
            inputMode="numeric" // Indica un teclado numérico en dispositivos móviles
            pattern="[0-9]*" // Asegura que solo números sean ingresados
          />
        </div>
        <div className="input-group">
          <label>Peso Colombiano (COP)</label>
          <input
            type="text"
            value={cop}
            onChange={(e) => handleInputChange(setCop, e.target.value)}
            onFocus={() => handleFocus("cop")}
            className="input"
            inputMode="numeric" // Indica un teclado numérico en dispositivos móviles
            pattern="[0-9]*" // Asegura que solo números sean ingresados
          />
        </div>
      </div>
      <div className="exchange-info">
        <p>1 DÓLAR EQUIVALE A {usdToBs.toFixed(2)} BS</p>
        <p>1 DÓLAR EQUIVALE A {usdToCop.toFixed(2)} COP</p>
      </div>
      {/* <div className="creator">
        <p className="">
          &copy; 2024{" "}
          <a href="https://wa.me/51980675172" className="name">
            Cristian Cáceres <i className="fab fa-whatsapp"></i>
          </a>
        </p>
      </div> */}
      <div className="creator">
        <p>
          &copy; 2024
          <a href="https://wa.me/51980675172" className="name">
            Cristian Cáceres
            <i className="fab fa-whatsapp whatsapp-icon"></i>
          </a>
        </p>
      </div>
    </div>
  );
};

export default App;
