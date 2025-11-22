# GUÍA PASO A PASO - REMIX IDE

## ⚠️ PROBLEMA: "Enviar ETH igual a totalTimes * unitPayment"

Este error significa que NO estás enviando la cantidad correcta de ETH con la transacción.

---

## ✅ SOLUCIÓN PARA TU CASO ACTUAL:

### PASO 1: Configurar el VALUE (ANTES de llamar createRecord)

```
┌────────────────────────────────────────┐
│ DEPLOY & RUN TRANSACTIONS             │
├────────────────────────────────────────┤
│ ENVIRONMENT                            │
│ Injected Provider - MetaMask           │
│                                        │
│ ACCOUNT                                │
│ 0x11c4...67d3 (100 ETH)               │
│                                        │
│ GAS LIMIT                              │
│ 3000000                                │
│                                        │
│ VALUE  ← ← ← ¡¡¡AQUÍ!!!               │
│ ┌──────────┬─────────┐                │
│ │ 0.006    │ Ether ▼ │ ← IMPORTANTE   │
│ └──────────┴─────────┘                │
└────────────────────────────────────────┘
```

**IMPORTANTE:** Debes escribir `0.006` y seleccionar `Ether` en el dropdown.

---

### PASO 2: Llenar el formulario createRecord

```
┌────────────────────────────────────────┐
│ Deployed Contracts                     │
├────────────────────────────────────────┤
│ RECURRINGPAYMENTUSDC AT 0X1F84...     │
│                                        │
│ ▼ createRecord                         │
│   ┌──────────────────────────────────┐ │
│   │ destination (address)            │ │
│   │ 0x247004302ad03c945aa0497ac7557 │ │
│   │ e355ebbd313                      │ │
│   └──────────────────────────────────┘ │
│   ┌──────────────────────────────────┐ │
│   │ totalTimes (uint256)             │ │
│   │ 6                                │ │
│   └──────────────────────────────────┘ │
│   ┌──────────────────────────────────┐ │
│   │ unitPayment (uint256)            │ │
│   │ 1000000000000000                 │ │
│   └──────────────────────────────────┘ │
│   [transact] ← Click aquí             │
└────────────────────────────────────────┘
```

---

### PASO 3: Verificar antes de ejecutar

✓ VALUE = 0.006 (en Ether, NO en Wei)
✓ destination = 0x247004302ad03c945aa0497ac7557e355ebbd313
✓ totalTimes = 6
✓ unitPayment = 1000000000000000 (esto es 0.001 ETH en wei)
✓ Tu wallet tiene al menos 0.007 ETH (0.006 + gas)

**Cálculo:**
- Cuota individual: 0.001 ETH × 6 cuotas = 0.006 ETH total
- msg.value debe ser EXACTAMENTE 0.006 ETH

---

## 🚫 ERRORES COMUNES:

### ❌ ERROR 1: Campo VALUE vacío
```
┌──────────┬─────────┐
│          │ Ether ▼ │  ← ¡VACÍO! Esto envía 0 ETH
└──────────┴─────────┘
```

### ❌ ERROR 2: Valor incorrecto en VALUE
```
┌──────────┬─────────┐
│ 0.001    │ Ether ▼ │  ← ¡INCORRECTO! Debe ser 0.006
└──────────┴─────────┘
```

### ❌ ERROR 3: Unidad incorrecta (Wei en lugar de Ether)
```
┌──────────┬─────────┐
│ 0.006    │ Wei   ▼ │  ← ¡INCORRECTO! Debe ser Ether
└──────────┴─────────┘
```

### ❌ ERROR 4: unitPayment incorrecto
```
unitPayment: 0.001  ← ¡INCORRECTO! Debe ser en wei: 1000000000000000
```

---

## 📊 TABLA DE CONVERSIÓN RÁPIDA:

| ETH (humano) | Wei (para unitPayment) | Cuotas | VALUE total |
|--------------|------------------------|--------|-------------|
| 0.001 ETH    | 1000000000000000       | 6      | 0.006 ETH   |
| 0.01 ETH     | 10000000000000000      | 6      | 0.06 ETH    |
| 0.1 ETH      | 100000000000000000     | 6      | 0.6 ETH     |
| 1 ETH        | 1000000000000000000    | 6      | 6 ETH       |

---

## 🔧 CALCULADORA EN CONSOLA (si tienes dudas):

Abre la consola del navegador (F12) en Remix y ejecuta:

```javascript
// Convierte ETH a Wei
const ethToWei = (eth) => BigInt(Math.floor(eth * 1e18));
const unitPaymentEth = 0.001;
const totalTimes = 6;

const unitPaymentWei = ethToWei(unitPaymentEth);
const totalEth = unitPaymentEth * totalTimes;

console.log("unitPayment (wei):", unitPaymentWei.toString());
console.log("VALUE (ETH):", totalEth);
```

---

## ✅ CHECKLIST FINAL:

Antes de hacer clic en "transact":

- [ ] ¿El campo VALUE dice 0.006?
- [ ] ¿El dropdown dice "Ether" (no Wei)?
- [ ] ¿destination es la dirección correcta?
- [ ] ¿totalTimes es 6?
- [ ] ¿unitPayment es 1000000000000000?
- [ ] ¿Tu wallet tiene suficiente balance?

Si todos son ✓, entonces la transacción funcionará.
