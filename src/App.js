import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [usdToCop, setUsdToCop] = useState(0);
  const [usdToBs, setUsdToBs] = useState(0);
  const [cop, setCop] = useState(""); // Inicialmente vacío
  const [bs, setBs] = useState(""); // Inicialmente vacío
  const [usd, setUsd] = useState(""); // Inicialmente vacío
  const [focusedField, setFocusedField] = useState(null); // Campo enfocado

  // Fetch exchange rates on component mount
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        // API para obtener tasas de cambio USD a COP
        const copResponse = await axios.get(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        setUsdToCop(copResponse.data.rates.COP);

        // API para obtener tasas de cambio USD a VES (Bolívar)
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

  // Manejar cambios de input (solo números enteros para el campo seleccionado)
  const handleInputChange = (setter, value) => {
    const numericValue = value.replace(/[^0-9]/g, ""); // Aceptar solo números enteros
    setter(numericValue);
  };

  // Actualizar los otros campos cuando USD cambia
  useEffect(() => {
    if (focusedField === "usd" && usdToBs > 0 && usdToCop > 0) {
      const usdValue = parseInt(usd) || 0;
      setBs((usdValue * usdToBs).toFixed(2)); // Mostrar con 2 decimales
      setCop((usdValue * usdToCop).toFixed(2)); // Mostrar con 2 decimales
    }
  }, [usd, usdToBs, usdToCop, focusedField]);

  // Actualizar los otros campos cuando COP cambia
  useEffect(() => {
    if (focusedField === "cop" && usdToBs > 0 && usdToCop > 0) {
      const copValue = parseInt(cop) || 0;
      setUsd((copValue / usdToCop).toFixed(0)); // Mostrar USD como entero
      setBs(((copValue / usdToCop) * usdToBs).toFixed(2)); // Mostrar BS con 2 decimales
    }
  }, [cop, usdToBs, usdToCop, focusedField]);

  // Actualizar los otros campos cuando BS cambia
  useEffect(() => {
    if (focusedField === "bs" && usdToBs > 0 && usdToCop > 0) {
      const bsValue = parseInt(bs) || 0;
      setUsd((bsValue / usdToBs).toFixed(0)); // Mostrar USD como entero
      setCop(((bsValue / usdToBs) * usdToCop).toFixed(2)); // Mostrar COP con 2 decimales
    }
  }, [bs, usdToBs, usdToCop, focusedField]);

  const handleFocus = (field) => {
    setFocusedField(field); // Setear el campo enfocado
    if (field === "usd") setUsd("");
    if (field === "bs") setBs("");
    if (field === "cop") setCop("");
  };

  return (
    <div className="app-container bg-blue-800 text-white min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">CAMBIO BS - USD - COP</h1>
      <div className="w-full max-w-lg bg-gray-900 p-4 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block text-lg">Bolívar (BS)</label>
          <input
            type="text"
            value={bs}
            onChange={(e) => handleInputChange(setBs, e.target.value)}
            onFocus={() => handleFocus("bs")}
            className="w-full p-2 mt-1 border border-gray-700 bg-gray-800 text-white rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-lg">Dólar (USD)</label>
          <input
            type="text"
            value={usd}
            onChange={(e) => handleInputChange(setUsd, e.target.value)}
            onFocus={() => handleFocus("usd")}
            className="w-full p-2 mt-1 border border-gray-700 bg-gray-800 text-white rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-lg">Peso Colombiano (COP)</label>
          <input
            type="text"
            value={cop}
            onChange={(e) => handleInputChange(setCop, e.target.value)}
            onFocus={() => handleFocus("cop")}
            className="w-full p-2 mt-1 border border-gray-700 bg-gray-800 text-white rounded"
          />
        </div>
        <div className="text-sm">
          <p>1 DÓLAR EQUIVALE A {usdToBs.toFixed(2)} BS</p>
          <p>1 DÓLAR EQUIVALE A {usdToCop.toFixed(2)} COP</p>
        </div>
      </div>
    </div>
  );
};

export default App;

// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;
