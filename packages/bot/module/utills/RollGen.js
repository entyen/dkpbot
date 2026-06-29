const { createCanvas } = require("canvas");
const GIFEncoder = require("gif-encoder-2");

const createRollingGif = async () => {
  const width = 200;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(width, height);

  encoder.start();
  encoder.setRepeat(-1);
  encoder.setQuality(10);

  const finalNumber = Math.floor(Math.random() * 100) + 1;

  for (let frame = 0; frame < 40; frame++) {
    // Темный мистический фон
    const bgGradient = ctx.createRadialGradient(100, 100, 0, 100, 100, 150);
    bgGradient.addColorStop(0, "#1a0033");
    bgGradient.addColorStop(1, "#0d0019");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Магические частицы
    for (let i = 0; i < 20; i++) {
      const particleAngle = (frame * 0.1 + i * 0.5) % (Math.PI * 2);
      const particleRadius = 30 + Math.sin(frame * 0.1 + i) * 20;
      const px = 100 + Math.cos(particleAngle) * particleRadius;
      const py = 100 + Math.sin(particleAngle) * particleRadius;
      
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(138, 43, 226, ${0.3 + Math.sin(frame * 0.1 + i) * 0.3})`;
      ctx.fill();
    }

    // Хрустальный шар
    const ballGradient = ctx.createRadialGradient(90, 80, 0, 100, 100, 70);
    ballGradient.addColorStop(0, "rgba(200, 180, 255, 0.8)");
    ballGradient.addColorStop(0.5, "rgba(100, 50, 200, 0.6)");
    ballGradient.addColorStop(1, "rgba(50, 0, 100, 0.9)");
    
    ctx.beginPath();
    ctx.arc(100, 100, 70, 0, Math.PI * 2);
    ctx.fillStyle = ballGradient;
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 150, 255, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Блик на шаре
    ctx.beginPath();
    ctx.ellipse(80, 75, 15, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();

    // Мерцающие числа внутри шара
    if (frame < 35) {
      const showNumber = Math.floor(Math.random() * 100) + 1;
      const alpha = 0.3 + Math.sin(frame * 0.5) * 0.2;
      
      ctx.fillStyle = `rgba(200, 180, 255, ${alpha})`;
      ctx.font = "bold 35px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(showNumber.toString(), 100, 100);
    } else {
      // Финальное число проявляется
      const progress = (frame - 35) / 5;
      
      // Свечение
      ctx.shadowColor = "#ff00ff";
      ctx.shadowBlur = 20 * progress;
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 45px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(finalNumber.toString(), 100, 100);
      
      ctx.shadowBlur = 0;
      
      // Подпись
      ctx.fillStyle = "rgba(200, 180, 255, 0.8)";
      ctx.font = "12px Arial";
      ctx.fillText("СУДЬБА РЕШЕНА", 100, 140);
    }

    encoder.setDelay(frame < 35 ? 60 : 200);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
};

module.exports = { createRollingGif };