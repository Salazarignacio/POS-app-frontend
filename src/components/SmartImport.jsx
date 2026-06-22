import React, { useContext, useState } from "react";
import { Spinner, Modal } from "react-bootstrap";
import iaIcon from "../assets/ia.png";
import { SmartImportContext } from "../context/SmartImportContext";

export default function SmartImport() {
  const {
    file,
    setFile,
    loading,
    extractedProducts,
    setExtractedProducts,
    dbMatches,
    importProgress,
    importPrompt,
    setImportPrompt,
    isDragging,
    setIsDragging,
    pendingProducts,
    setPendingProducts,
    validateAndSetFile,
    handleProcessFile,
    handleApplyAiToImport,
    handleConfirmImport,
    handleConfirmPending,
    checkSingleMatch,
    normalizeName,
  } = useContext(SmartImportContext);

  const [showModal, setShowModal] = useState(false);

  const renderProductList = () => {
    if (extractedProducts.length === 0 && pendingProducts.length === 0) return null;
    return (
      <>
        {extractedProducts.length > 0 && (
          <div className="d-flex flex-column gap-3">
            {extractedProducts.map((p, idx) => {
              const match = dbMatches[p._tempId];
              const hasCode = p.codigo && p.codigo.trim() !== "" && p.codigo !== "null" && p.codigo.toLowerCase() !== "null";

              let status = "nuevo";
              if (match) {
                status = "actualizacion";
              } else if (!hasCode) {
                status = "sin_codigo";
              }

              return (
                <div
                  key={idx}
                  className="ia-result-card animate__animated animate__fadeInUp position-relative"
                  style={{
                    animationDelay: `${idx * 0.05}s`,
                    border: status === "sin_codigo" ? "1px dashed var(--bs-warning)" : "1px solid var(--hover-color)"
                  }}
                >
                  <button
                    className="position-absolute top-0 end-0 m-2 btn-edit"
                    style={{
                      height: "30px",
                      width: "30px",
                      color: "#ef4444",
                      padding: 0,
                    }}
                    onClick={() => handleRemoveProduct(idx)}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    {status === "actualizacion" && (
                      <span className="badge text-white px-2 py-1 rounded" style={{ fontSize: "0.7rem", fontWeight: "bold", background: "#0d6efd" }}>
                        <i className="fa-solid fa-arrows-rotate me-1"></i> Actualizar Existente
                      </span>
                    )}
                    {status === "nuevo" && (
                      <span className="badge text-white px-2 py-1 rounded" style={{ fontSize: "0.7rem", fontWeight: "bold", background: "#198754" }}>
                        <i className="fa-solid fa-plus me-1"></i> Crear Nuevo
                      </span>
                    )}
                    {status === "sin_codigo" && (
                      <span className="badge text-dark px-2 py-1 rounded" style={{ fontSize: "0.7rem", fontWeight: "bold", background: "#ffc107" }}>
                        <i className="fa-solid fa-triangle-exclamation me-1"></i> Sin Código
                      </span>
                    )}
                  </div>

                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Artículo
                      </label>
                      <input
                        type="text"
                        className="search-input w-100"
                        value={p.articulo || ""}
                        onChange={(e) =>
                          handleEditChange(idx, "articulo", e.target.value)
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Código
                      </label>
                      <input
                        type="text"
                        className="search-input w-100"
                        value={p.codigo || ""}
                        onChange={(e) =>
                          handleEditChange(idx, "codigo", e.target.value)
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Categoría
                      </label>
                      <input
                        type="text"
                        className="search-input w-100"
                        value={p.categoria || ""}
                        onChange={(e) =>
                          handleEditChange(idx, "categoria", e.target.value)
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Precio
                      </label>
                      <input
                        type="number"
                        className="search-input w-100"
                        value={p.precio || 0}
                        onChange={(e) =>
                          handleEditChange(idx, "precio", parseFloat(e.target.value))
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Stock
                      </label>
                      <input
                        type="number"
                        className="search-input w-100"
                        value={p.stock || 0}
                        onChange={(e) =>
                          handleEditChange(idx, "stock", parseInt(e.target.value))
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                  </div>

                  {/* Comparativa Visual de Cambios */}
                  {status === "actualizacion" && match && (
                    <div className="ia-card-diff mt-3 p-2 rounded-2 animate__animated animate__fadeIn" style={{ background: "rgba(13, 110, 253, 0.08)", border: "1px solid rgba(13, 110, 253, 0.15)", fontSize: "0.75rem" }}>
                      <div className="small text-muted d-flex flex-column gap-1">
                        {parseFloat(p.precio || 0) !== parseFloat(match.precio || 0) && (
                          <div className="d-flex align-items-center justify-content-between">
                            <span>Precio:</span>
                            <strong>
                              ${match.precio.toLocaleString()} ➔ ${parseFloat(p.precio || 0).toLocaleString()}
                              {match.precio > 0 && (
                                <span className={`ms-1 ${parseFloat(p.precio || 0) > match.precio ? "text-success" : "text-danger"}`}>
                                  ({parseFloat(p.precio || 0) > match.precio ? "+" : ""}{(((parseFloat(p.precio || 0) - match.precio) / match.precio) * 100).toFixed(0)}%)
                                </span>
                              )}
                            </strong>
                          </div>
                        )}
                        {parseInt(p.stock || 0) !== parseInt(match.stock || 0) && (
                          <div className="d-flex align-items-center justify-content-between">
                            <span>Stock:</span>
                            <strong>
                              {match.stock} ➔ {parseInt(p.stock || 0)}
                              <span className={`ms-1 ${parseInt(p.stock || 0) > match.stock ? "text-success" : "text-danger"}`}>
                                ({parseInt(p.stock || 0) > match.stock ? "+" : ""}{parseInt(p.stock || 0) - match.stock})
                              </span>
                            </strong>
                          </div>
                        )}
                        {parseFloat(p.precio || 0) === parseFloat(match.precio || 0) && parseInt(p.stock || 0) === parseInt(match.stock || 0) && (
                          <div className="text-center opacity-75 py-1">Sin cambios detectados</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SECCIÓN 2: PRODUCTOS SIN CÓDIGO (PENDIENTES DE REVISIÓN) */}
        {pendingProducts.length > 0 && (
          <div className="mt-5 pt-4 border-top animate__animated animate__fadeIn">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="ticket-title text-warning mb-0" style={{ fontSize: "1.1rem" }}>
                <i className="fa-solid fa-triangle-exclamation me-2"></i>
                Revisión de Productos sin Código
              </h4>
              <span className="badge bg-warning text-dark rounded-pill px-3">
                {pendingProducts.length} pendientes
              </span>
            </div>
            <p className="small opacity-75 mb-4">
              Estos productos no coinciden con ningún registro existente por nombre y no tienen código de barras. Asigna un código para guardarlos o descártalos.
            </p>

            <div className="d-flex flex-column gap-3 mb-4">
              {pendingProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="ia-result-card border-warning position-relative"
                  style={{ border: "1px solid var(--bs-warning)" }}
                >
                  <button
                    className="position-absolute top-0 end-0 m-2 btn-edit"
                    style={{
                      height: "30px",
                      width: "30px",
                      color: "#ef4444",
                      padding: 0,
                    }}
                    onClick={() => handleRemovePendingProduct(idx)}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>

                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Artículo
                      </label>
                      <input
                        type="text"
                        className="search-input w-100"
                        value={p.articulo || ""}
                        onChange={(e) =>
                          handlePendingEditChange(idx, "articulo", e.target.value)
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem", fontWeight: "bold", color: "var(--bs-warning)" }}>
                        Código (Requerido)
                      </label>
                      <input
                        type="text"
                        className="search-input w-100 border-warning"
                        placeholder="Escribe el código..."
                        value={p.codigo || ""}
                        onChange={(e) =>
                          handlePendingEditChange(idx, "codigo", e.target.value)
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Categoría
                      </label>
                      <input
                        type="text"
                        className="search-input w-100"
                        value={p.categoria || ""}
                        onChange={(e) =>
                          handlePendingEditChange(idx, "categoria", e.target.value)
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Precio
                      </label>
                      <input
                        type="number"
                        className="search-input w-100"
                        value={p.precio || 0}
                        onChange={(e) =>
                          handlePendingEditChange(idx, "precio", parseFloat(e.target.value))
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1" style={{ fontSize: "0.65rem" }}>
                        Stock
                      </label>
                      <input
                        type="number"
                        className="search-input w-100"
                        value={p.stock || 0}
                        onChange={(e) =>
                          handlePendingEditChange(idx, "stock", parseInt(e.target.value))
                        }
                        style={{ height: "35px" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="d-flex gap-3 mb-4">
              <button
                className="btn-confirm-save py-3 flex-grow-1"
                onClick={handleConfirmPending}
                disabled={loading || pendingProducts.every(p => !p.codigo?.trim())}
                style={{ gap: "10px", background: "var(--bs-warning)", color: "#000" }}
              >
                <i className="fa-solid fa-floppy-disk fa-xl"></i>
                <span>Guardar Pendientes Resueltos</span>
              </button>
              <button
                className="btn-cancel"
                onClick={() => setPendingProducts([])}
                disabled={loading}
                style={{ height: "54px" }}
              >
                Descartar Pendientes
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleEditChange = (index, field, value) => {
    const updatedProducts = [...extractedProducts];

    // Si el campo es código, limpiamos cualquier cosa que no sea número
    if (field === "codigo") {
      updatedProducts[index][field] = value.toString().replace(/\D/g, "");
    } else {
      updatedProducts[index][field] = value;
    }

    setExtractedProducts(updatedProducts);

    if (field === "codigo" || field === "articulo") {
      checkSingleMatch(updatedProducts[index]._tempId, updatedProducts[index].articulo, updatedProducts[index].codigo);
    }
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = extractedProducts.filter((_, i) => i !== index);
    setExtractedProducts(updatedProducts);
  };

  const handlePendingEditChange = (index, field, value) => {
    const updatedProducts = [...pendingProducts];
    if (field === "codigo") {
      updatedProducts[index][field] = value.toString().replace(/\D/g, "");
    } else {
      updatedProducts[index][field] = value;
    }
    setPendingProducts(updatedProducts);
  };

  const handleRemovePendingProduct = (index) => {
    setPendingProducts(pendingProducts.filter((_, i) => i !== index));
  };

  return (
    <div className="ia-carga-container">
      {/* PANEL IZQUIERDO: CONFIGURACIÓN Y CARGA */}
      <div className="ia-carga-panel">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <h2 className="section-title mb-0">IA Multimodal</h2>
          </div>
        </div>

        <div
          className={`ia-carga-upload ${isDragging ? "is-dragging" : ""}`}
          onClick={() => document.getElementById("file-upload").click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            id="file-upload"
            type="file"
            accept="image/*,.pdf,.docx,.xlsx"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <i
            className={`fa-solid ${file ? "fa-file-circle-check text-success" : "fa-cloud-arrow-up"} fa-3x opacity-50`}
          ></i>
          <div>
            <h5 className="mb-1" style={{ color: "var(--font-color)" }}>
              {file ? file.name : "Click o Arrastrar Lista de Precios"}
            </h5>
            <p className="small opacity-50 mb-0">JPG, PNG, PDF, DOCX o XLSX</p>
          </div>
          {file && (
            <button
              className="btn-cancel py-1 px-3 mt-2"
              style={{
                width: "auto",
                height: "auto",
                fontSize: "0.8rem",
                border: "1px solid #ef4444",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
            >
              Remover archivo
            </button>
          )}
        </div>

        <button
          className={loading || !file ? "btn-vacio py-3" : "btn-mas py-3"}
          onClick={handleProcessFile}
          disabled={loading || !file}
          style={{
            width: "100%",
            marginLeft: 0,
            height: "60px",
            fontSize: "1.1rem",
            borderRadius: "15px",
          }}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Escaneando documento...
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles me-2"></i>
              Escanear con Inteligencia Artificial
            </>
          )}
        </button>
      </div>

      {/* PANEL DERECHO: RESULTADOS */}
      <div className="ia-carga-results">
        {loading ? (
          <div className="scanner-container h-100">
            <div className="laser-line"></div>
            <div className="laser-glow"></div>
            <div className="text-center animate__animated animate__fadeIn">
              <div className="position-relative d-inline-block mb-4">
                <Spinner
                  animation="border"
                  className="custom-spinner"
                  style={{
                    width: "4.5rem",
                    height: "4.5rem",
                    borderWidth: "5px",
                  }}
                />
                <i
                  className="fa-solid fa-microchip fa-2xl position-absolute top-50 start-50 translate-middle animate__animated animate__pulse animate__infinite"
                  style={{
                    color: "var(--spinner-color)",
                    opacity: 0.8,
                  }}
                ></i>
              </div>
              <h4 className="scan-text">
                {importProgress.total > 0 
                  ? `Guardando Productos... (${importProgress.current} de ${importProgress.total})` 
                  : "Analizando Documento..."
                }
              </h4>
              
              {importProgress.total > 0 && (
                <div className="progress-container mx-auto mt-4 animate__animated animate__zoomIn" style={{ maxWidth: "300px", background: "rgba(255,255,255,0.1)", borderRadius: "10px", height: "10px", overflow: "hidden" }}>
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: `${(importProgress.current / importProgress.total) * 100}%`, 
                      background: "var(--btn-ppal)", 
                      height: "100%", 
                      transition: "width 0.2s ease" 
                    }}
                  ></div>
                </div>
              )}
              
              <p className="small opacity-50 mt-2">
                {importProgress.total > 0
                  ? "Subiendo datos al inventario..."
                  : "Shenron está procesando tu deseo"
                }
              </p>
            </div>
          </div>
        ) : extractedProducts.length === 0 && pendingProducts.length === 0 ? (
          <div
            className="no-products d-flex flex-column align-items-center justify-content-center py-5 h-100 opacity-50"
            style={{ color: "var(--font-color)" }}
          >
            <i className="fa-solid fa-list-check fa-4x mb-4"></i>
            <h4 className="fw-bold">Sin resultados aún</h4>
            <p className="small">
              Los productos detectados aparecerán aquí para su revisión.
            </p>
          </div>
        ) : (
          <div
            className="d-flex flex-column h-100 animate__animated animate__fadeIn"
            style={{ color: "var(--font-color)" }}
          >
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
              <h4 className="ticket-title mb-0">Resultados de Extracción</h4>
              <div className="d-flex align-items-center gap-2">
                <button
                  onClick={() => setShowModal(true)}
                  type="button"
                  style={{
                    background: "var(--hover-color)",
                    color: "var(--font-color)",
                    border: "1px solid var(--btn-ppal)",
                    borderRadius: "10px",
                    padding: "6px 14px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s ease"
                  }}
                  className="btn-modal-trigger hover-effect"
                >
                  <i className="fa-solid fa-expand" style={{ color: "var(--btn-ppal)" }}></i>
                  <span>Ver en Modal</span>
                </button>
                <span
                  className="badge bg-primary rounded-pill px-3"
                  style={{ background: "var(--btn-ppal)" }}
                >
                  {extractedProducts.length} detectados
                </span>
              </div>
            </div>

            {/* COMANDO DE IA PARA LA LISTA (NUEVO) */}
            {extractedProducts.length > 0 && (
              <div
                className="mb-4 p-3 rounded-3"
                style={{
                  background: "var(--hover-color)",
                  border: "1px solid var(--btn-ppal)",
                }}
              >
                <label
                  className="form-label d-block mb-2"
                  style={{ fontSize: "0.8rem", fontWeight: 800 }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles me-1"></i>
                  Modificar esta lista con IA
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleApplyAiToImport();
                  }}
                  className="d-flex gap-2"
                >
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Ej: 'Sube un 15% a todos' o 'Pon stock 0'..."
                    value={importPrompt}
                    onChange={(e) => setImportPrompt(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn-mas"
                    disabled={loading || !importPrompt.trim()}
                    style={{ width: "auto", padding: "0 20px", height: "42px" }}
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      "Aplicar"
                    )}
                  </button>
                </form>
              </div>
            )}

            <div className="scroll flex-grow-1 mb-4 pe-2">
              {renderProductList()}
            </div>

            {extractedProducts.length > 0 && (
              <div className="ia-action-bar">
                <button
                  className="btn-confirm-save py-3"
                  onClick={handleConfirmImport}
                  disabled={loading}
                  style={{ gap: "10px" }}
                >
                  <i className="fa-solid fa-cloud-arrow-up fa-xl"></i>
                  <span>Confirmar y Guardar Todo</span>
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setExtractedProducts([]);
                    setFile(null);
                  }}
                  disabled={loading}
                  style={{ height: "45px" }}
                >
                  Descartar resultados
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL PARA DESPLEGAR Y EDITAR LA LISTA DE PRODUCTOS DETECTADOS */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton style={{ background: "var(--bg-contenedores)", color: "var(--font-color)", borderBottom: "1px solid var(--hover-color)" }}>
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--btn-ppal)" }}></i>
            <span>Resultados de Extracción ({extractedProducts.length + pendingProducts.length} productos)</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "var(--bg-contenedores)", color: "var(--font-color)", padding: "24px" }}>
          
          {/* COMANDO DE IA DENTRO DEL MODAL */}
          {extractedProducts.length > 0 && (
            <div
              className="mb-4 p-3 rounded-3"
              style={{
                background: "var(--hover-color)",
                border: "1px solid var(--btn-ppal)",
              }}
            >
              <label
                className="form-label d-block mb-2"
                style={{ fontSize: "0.8rem", fontWeight: 800 }}
              >
                <i className="fa-solid fa-wand-magic-sparkles me-1"></i>
                Modificar esta lista con IA
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyAiToImport();
                }}
                className="d-flex gap-2"
              >
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ej: 'Sube un 15% a todos' o 'Pon stock 0'..."
                  value={importPrompt}
                  onChange={(e) => setImportPrompt(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn-mas"
                  disabled={loading || !importPrompt.trim()}
                  style={{ width: "auto", padding: "0 20px", height: "42px" }}
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    "Aplicar"
                  )}
                </button>
              </form>
            </div>
          )}

          <div className="scroll pe-2">
            {renderProductList()}
          </div>
        </Modal.Body>
        <Modal.Footer style={{ background: "var(--bg-contenedores)", borderTop: "1px solid var(--hover-color)", justifyContent: "space-between" }}>
          <button
            className="btn-cancel"
            onClick={() => setShowModal(false)}
            disabled={loading}
            style={{ height: "45px", width: "120px" }}
          >
            Cerrar
          </button>
          
          {extractedProducts.length > 0 && (
            <div className="d-flex gap-2">
              <button
                className="btn-cancel"
                onClick={() => {
                  if (window.confirm("¿Seguro que deseas descartar todos los resultados?")) {
                    setExtractedProducts([]);
                    setFile(null);
                    setShowModal(false);
                  }
                }}
                disabled={loading}
                style={{ height: "45px", width: "160px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444" }}
              >
                Descartar Todo
              </button>
              <button
                className="btn-mas"
                onClick={() => {
                  handleConfirmImport();
                  setShowModal(false);
                }}
                disabled={loading}
                style={{ height: "45px", width: "220px", background: "var(--btn-ppal)", borderRadius: "10px", fontWeight: "600", color: "#fff", border: "none" }}
              >
                <i className="fa-solid fa-cloud-arrow-up me-2"></i>
                <span>Confirmar e Importar</span>
              </button>
            </div>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
