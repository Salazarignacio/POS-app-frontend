/**
 * Reproduce un sonido de confirmación "beep" tipo escáner de código de barras.
 * Utiliza la API Web Audio nativa del navegador para no depender de archivos externos.
 */
export const playScanBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    // 1300 Hz da un tono agudo y limpio similar al de los escáneres de caja registradora
    oscillator.frequency.value = 1300; 

    // Ajuste de volumen y rampa de salida rápida para evitar ruidos de "click"
    gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (error) {
    console.warn("La reproducción de audio falló o el navegador la bloqueó:", error);
  }
};
