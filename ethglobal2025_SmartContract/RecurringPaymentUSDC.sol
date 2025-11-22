// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/*
  RecurringPaymentETH.sol

  - Pagos exclusivamente en Ether (no ERC20).
  - Constructor SIN parámetros (deploy sin args).
  - createRecord(destination, totalTimes, unitPaymentWei) es payable y requiere:
      msg.value == totalTimes * unitPaymentWei
    donde unitPaymentWei y totalTimes son pasados al crear el registro.
  - payInstallment(id, bridge) envía unitPaymentWei (en wei) a la dirección bridge y
    reduce totalRemaining/timesRemaining.
  - cancelRecord(id) devuelve el totalRemaining al sender.
  - ReentrancyGuard inline para seguridad.
  - Solo el sender que creó el registro puede ejecutar payInstallment y cancelRecord.
*/

/// @notice Implementación mínima de ReentrancyGuard (OpenZeppelin-like)
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    constructor() { _status = _NOT_ENTERED; }
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract RecurringPaymentETH is ReentrancyGuard {
    uint256 private _nextId = 1;

    struct Record {
        address destination;     // wallet destino final (empresa / receptor)
        address sender;          // wallet que pagó / creó el registro
        uint256 totalTimes;      // cantidad total de veces pactadas
        uint256 timesRemaining;  // veces que faltan por pagar
        uint256 unitPayment;     // pago unitario por vez (en wei)
        uint256 totalRemaining;  // monto restante (in wei)
        bool active;             // activo / cancelado / completado
        uint256 createdAt;
    }

    // id => Record
    mapping(uint256 => Record) public records;
    // lista de ids creados
    uint256[] public recordIds;

    event RecordCreated(uint256 indexed id, address indexed sender, address indexed destination, uint256 totalTimes, uint256 unitPayment, uint256 totalAmount);
    event InstallmentPaid(uint256 indexed id, address indexed payer, address indexed bridge, uint256 amount, uint256 timesRemaining, uint256 totalRemaining);
    event RecordCancelled(uint256 indexed id, address indexed sender, uint256 refundedAmount);

    constructor() {} // deploy sin parámetros

    modifier onlySender(uint256 id) {
        require(records[id].sender != address(0), "Registro no existe");
        require(records[id].sender == msg.sender, "Solo el sender puede ejecutar");
        _;
    }

    /// @notice Crear un nuevo registro/contrato. Debes enviar ETH en msg.value = totalTimes * unitPayment (ambos en wei).
    /// @param destination Wallet destino (recibe resultado/final)
    /// @param totalTimes Cantidad de veces que se pacta (ej. 12)
    /// @param unitPayment Pago unitario por vez (en wei)
    /// @return id Identificador del registro creado
    function createRecord(address destination, uint256 totalTimes, uint256 unitPayment) external payable nonReentrant returns (uint256 id) {
        require(destination != address(0), "Destino invalido");
        require(totalTimes > 0, "Times debe ser > 0");
        require(unitPayment > 0, "Pago unitario debe ser > 0");

        uint256 totalAmount = totalTimes * unitPayment;
        require(totalAmount / totalTimes == unitPayment, "Overflow en calculo total"); // sanity
        require(msg.value == totalAmount, "Enviar ETH igual a totalTimes * unitPayment");

        id = _nextId++;
        Record storage r = records[id];
        r.destination = destination;
        r.sender = msg.sender;
        r.totalTimes = totalTimes;
        r.timesRemaining = totalTimes;
        r.unitPayment = unitPayment;
        r.totalRemaining = totalAmount;
        r.active = true;
        r.createdAt = block.timestamp;

        recordIds.push(id);

        emit RecordCreated(id, msg.sender, destination, totalTimes, unitPayment, totalAmount);
    }

    /// @notice Obtener datos de un registro por id.
    /// @param id Identificador del registro.
    /// @return destination Dirección destino del registro
    /// @return sender Dirección que creó el registro (remitente)
    /// @return totalTimes Cantidad total de veces pactadas
    /// @return timesRemaining Veces que faltan por pagar
    /// @return unitPayment Pago unitario por vez (en wei)
    /// @return totalRemaining Monto total restante (wei)
    /// @return active Estado activo/no activo
    /// @return createdAt Timestamp de creación
    function getRecord(uint256 id) external view returns (
        address destination,
        address sender,
        uint256 totalTimes,
        uint256 timesRemaining,
        uint256 unitPayment,
        uint256 totalRemaining,
        bool active,
        uint256 createdAt
    ) {
        Record storage r = records[id];
        require(r.sender != address(0), "Registro no existe");
        return (r.destination, r.sender, r.totalTimes, r.timesRemaining, r.unitPayment, r.totalRemaining, r.active, r.createdAt);
    }

    /// @notice Devuelve todos los ids de registros creados (útil para front-end).
    /// @return ids Array con los ids existentes
    function getAllRecordIds() external view returns (uint256[] memory ids) {
        return recordIds;
    }

    /// @notice Paga una cuota (1 vez). El pago se envía a `bridge` (por ejemplo una wallet puente).
    /// @dev Solo el sender que creó el registro puede llamar a esta función.
    /// @param id Identificador del registro.
    /// @param bridge Dirección donde enviar la cuota (por ejemplo bridge o wallet destino intermedia).
    function payInstallment(uint256 id, address payable bridge) external nonReentrant onlySender(id) {
        require(bridge != address(0), "Bridge invalido");
        Record storage r = records[id];
        require(r.active, "Registro no activo");
        require(r.timesRemaining > 0, "No quedan cuotas");
        require(r.totalRemaining >= r.unitPayment, "Fondos insuficientes en contrato");

        uint256 amount = r.unitPayment;

        // Guardar estado antes de enviar para evitar reentrancy
        r.timesRemaining -= 1;
        r.totalRemaining -= amount;
        if (r.timesRemaining == 0) {
            r.active = false;
        }

        // Enviar Ether al bridge
        (bool sent, ) = bridge.call{value: amount}("");
        require(sent, "Transfer failed");

        emit InstallmentPaid(id, msg.sender, bridge, amount, r.timesRemaining, r.totalRemaining);
    }

    /// @notice Cancelar/revertir el registro y devolver lo que queda al sender.
    /// @dev Solo el sender puede cancelar.
    /// @param id Identificador del registro.
    function cancelRecord(uint256 id) external nonReentrant onlySender(id) {
        Record storage r = records[id];
        require(r.active, "Registro no activo o ya completado");
        uint256 refund = r.totalRemaining;
        require(refund > 0, "Nada que devolver");

        // Reset estado antes de transferir para evitar reentrancy
        r.totalRemaining = 0;
        r.timesRemaining = 0;
        r.active = false;

        (bool sent, ) = payable(r.sender).call{value: refund}("");
        require(sent, "Refund failed");

        emit RecordCancelled(id, r.sender, refund);
    }

    // función de recepción para aceptar ETH (no estrictamente necesaria pero útil)
    receive() external payable {}
}