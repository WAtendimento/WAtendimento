
function mesmaLocalizacao(lat1, lon1, lat2, lon2, margemMetros = 100) {
  const R = 6371000; // Raio da Terra em metros
  const toRad = graus => graus * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distancia = R * c;

  return distancia <= margemMetros;
}

function extrairLatLon(str) {
  const regex = /Latitude:\s*([-+]?[0-9]*\.?[0-9]+),\s*Longitude:\s*([-+]?[0-9]*\.?[0-9]+)/;
  const match = str.match(regex);

  if (match) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    return { latitude, longitude };
  }

  throw new Error("Formato inválido de string.");
}

function temLatitudeLongitude(texto) {
  const temLatitude = /latitude/i.test(texto);
  const temLongitude = /longitude/i.test(texto);
  return temLatitude && temLongitude;
}


// Função auxiliar para testes
function testar(nome, esperado, resultado) {
  const ok = esperado === resultado;
  console.log(`${ok ? '✅' : '❌'} ${nome} → ${resultado} (esperado: ${esperado})`);
  console.assert(ok, `Erro em: ${nome}`);
}

// // Casos dentro do raio (espera true)
// testar("Pontos iguais", true, mesmaLocalizacao(-23.55052, -46.633308, -23.55052, -46.633308));
// testar("Distância ~50m", true, mesmaLocalizacao(-23.55052, -46.633308, -23.55097, -46.633308));
// testar("Pequena variação (~70m)", true, mesmaLocalizacao(-23.55000, -46.63000, -23.55050, -46.63050));

// // Casos fora do raio (espera false)
// testar("Distância ~150m", false, mesmaLocalizacao(-23.55052, -46.633308, -23.55200, -46.633308));
// testar("Distância ~500m", false, mesmaLocalizacao(-23.55052, -46.633308, -23.54600, -46.63000));
// testar("Cidades diferentes (SP x RJ)", false, mesmaLocalizacao(-23.55052, -46.633308, -22.906847, -43.172896));

// const entrada = "Latitude: -23.55097, Longitude: -46.633308, Data e Hora: 2025-05-28T15:20:00Z";
// const { latitude, longitude } = extrairLatLon(entrada);

// console.log("Latitude:", latitude);   // -23.55052
// console.log("Longitude:", longitude); // -46.633308

// console.log(temLatitudeLongitude("Coordenadas: Latitude: -23.5, Longitude: -46.6")); // true
// console.log(temLatitudeLongitude("Latitude: -23.5")); // false
// console.log(temLatitudeLongitude("posição longitude e altitude")); // false

// Exportando a função para uso em outros módulos
module.exports = {
  mesmaLocalizacao,
  extrairLatLon,
  temLatitudeLongitude
};