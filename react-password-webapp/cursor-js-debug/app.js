function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function multiply(a, b) {
  return a * b;
}

function onRunClick() {
  const x = toNumber(document.getElementById("x").value);
  const y = toNumber(document.getElementById("y").value);
  const result = multiply(x, y);

  debugger;

  document.getElementById("out").textContent = `Resultat: ${x} * ${y} = ${result}`;
}

document.getElementById("runBtn").addEventListener("click", onRunClick);
