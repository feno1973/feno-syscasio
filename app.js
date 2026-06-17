Bangle.removeAllListeners();
clearInterval();
clearWatch();

g.clear();

try {
  require("Font6x8").add(Graphics);
  require("Font8x12").add(Graphics);
  require("Font7x11Numeric7Seg").add(Graphics);
} catch (e) {
  // Fonts may already be cached by another app while testing from the terminal.
}

let hasSevenSegmentFont = false;
let currentScreen = 0;
const SCREEN_COUNT = 3;
const HRM_APP_ID = "feno-syscasio";
const MIN_HRM_CONFIDENCE = 80;
let lastHrm = { bpm: "--", confidence: 0 };
let isHrmEnabled = false;

function loadSevenSegmentFont() {
  if (hasSevenSegmentFont) return true;

  try {
    g.setFont("7x11Numeric7Seg", 3);
    hasSevenSegmentFont = true;
    return true;
  } catch (e) {
    hasSevenSegmentFont = false;
    return false;
  }
}

function diaES(d) {
  return ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"][d.getDay()];
}

function getTempNumber() {
  const data = require("Storage").readJSON("advcasio.data.json", true);
  if (data && data.weather && data.weather[0] && data.weather[0][0] !== undefined) {
    return String(data.weather[0][0]);
  }
  return "--";
}

function getBackgroundImage() {
  return {
    width: 176,
    height: 176,
    bpp: 1,
    buffer: require("heatshrink").decompress(atob("AFcB/4ASwEDCqfgg4VT+EPAgZIBDhoVEFaXPCiPzCoO/CqP9CoPnCqP2K6n6CoPfCtZuE/v+ChP+CrOwgnQCqWxwlGv4VSzsGCqWzwuQNrP8jfgoOB+FuwMG9keCpX97fmpml+/uzMytveCoe4h8eg1gnorECoPgwMyloVFh0MuVACpGDmXNComx/1Mv1PzpBDrhBE5ueCon840CCofYk9d0ptBzJtG2Pkg3yp8dTJ+4gHggRXCCp28jP3g1wvrFWCp3fCon/v4VI/oVDEhIAHCv4VF4EAAB0DCoeACp8BCqkACuE/QJv8CotgFJsGCoqaOgYVEwOfIJv9wAVDwcwFZsM4AVEK59ACoMJCoNACpsCCoOQFYQVRIIYV/Cv4Vsbf4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/Cv4V/CsFgCpsGComBmAVNhnAComf/4AM/OACoeA4ArNgcACol/FZv+Cos/Cpv8CopANAAQVqgIVDQRwVGNZoADCv4Vb8/xA4Of8f+v4eBBAPgv+D/7rBIN6/KhzxJCpkPFIPwCqMYAgMQCosBkvn334n375fPwAVBmEyvwYBCouv//+CoXr94VCsczv8MCo2tmcw5Ey4UKgxBCod24cICokd4Ot+c+FYPz9fmjvOCoX/CoorC+cw7E2wFoswrC4f8/wVH/szn2ImRXB8wVD3uONoyZLscZgkwCqM/YoPgCqLxIwAVPgIVDGYIAPCv4VE94VR+wVB2GAg0AsEAvB5BwGAjh/BkEAgeAh+dIKn7CoIURAAPwg4Vp8EDCqfAfIgAmA="))
  };
}

function drawBackground() {
  // Reset graphics state before drawing the 1-bit background image.
  // Otherwise the previous screen color can make the image appear inverted.
  g.reset();
  g.setColor(0, 0, 0);
  g.setBgColor(1, 1, 1);
  g.clear();

  // Draw the imported frame/background image exactly as converted.
  // Do not use { invert: true } here, otherwise it will be inverted twice.
  g.drawImage(getBackgroundImage(), -5, -4, { scale: 1.04 });

  // Restore default drawing color for dynamic data.
  g.setColor(0, 0, 0);
}

function drawDataBackgrounds() {
  // Fill the whole dynamic LCD/data area with one consistent Matrix-green tone.
  // This removes the old pale/white background gaps between the individual data blocks.
  g.setColor(0, 0.7, 0.15);
  g.fillRect(14, 32, 164, 144);
  g.setColor(0);
}

function drawBigThenSmall(big, small, x, y, color) {
    g.setColor(color);
    g.setFontAlign(-1, 0);
  
    if (loadSevenSegmentFont()) {
      g.setFont("7x11Numeric7Seg", 2);
      g.drawString(String(big), x, y);
      x += g.stringWidth(String(big)) + 2;
      g.setFont("6x8", 1);
      g.drawString(small, x, y + 1);
      return;
    }
  
    g.setFont("6x8", 2);
    g.drawString(String(big) + small, x, y);
  }

function getTimePosition() {
  if (loadSevenSegmentFont()) {
    return { x: 85, y: 88 };
  }

  return { x: 90, y: 88 };
}

function drawTime(now) {
  const timeText = require("locale").time(now, 1);
  const pos = getTimePosition();

  g.setColor(0);
  g.setFontAlign(0, 0);

  if (loadSevenSegmentFont()) {
    g.setFont("7x11Numeric7Seg", 3);
    g.drawString(timeText, pos.x, pos.y);
    return;
  }

  g.setFont("Vector", 38);
  g.drawString(timeText, pos.x, pos.y);
}

function drawProgressBar(x, y, w, h, percent) {
  const value = Math.max(0, Math.min(100, percent || 0));
  const fillWidth = Math.round((w - 4) * value / 100);

  g.setColor(0, 0, 0);
  g.drawRect(x, y, x + w, y + h);

  if (fillWidth > 0) {
    g.fillRect(x + 2, y + 2, x + 1 + fillWidth, y + h - 2);
  }
}

function updateHrmPower() {
  const shouldEnable = currentScreen === 1;
  if (isHrmEnabled === shouldEnable) return;

  isHrmEnabled = shouldEnable;
  Bangle.setHRMPower(shouldEnable, HRM_APP_ID);

  if (shouldEnable) {
    lastHrm = { bpm: "--", confidence: 0 };
  }
}

function getMetricPositions() {
  if (loadSevenSegmentFont()) {
    return {
      tempX: 26,
      tempY: 50,
      battX: 120,
      battY: 50,
      dateX: 92,
      dateY: 132,
      stepsX: 124,
      stepsY: 132
    };
  }

  return {
    tempX: 30,
    tempY: 50,
    battX: 120,
    battY: 50,
    dateX: 92,
    dateY: 132,
    stepsX: 124,
    stepsY: 132
  };
}

function drawMain() {
  drawBackground();
  // drawDataBackgrounds();

  const now = new Date();
  const health = Bangle.getHealthStatus("day") || {};
  const steps = health.steps || 0;
  const batt = E.getBattery();
  const pos = getMetricPositions();

  // Top small data area.
  drawBigThenSmall(getTempNumber(), "°", pos.tempX, pos.tempY, 0);
  drawBigThenSmall(batt, "%", pos.battX, pos.battY, 0);

  // Main time.
  drawTime(now);

  // Bottom data area.
  g.setColor(0, 0, 0);
  g.setFontAlign(0, 0);
  g.setFont("6x8", 2);
  g.drawString(diaES(now) + " " + now.getDate() + "/" + (now.getMonth() + 1), pos.dateX, pos.dateY);
  //g.drawString("P." + steps, pos.stepsX, pos.stepsY);
}

function drawHealthScreen() {
  drawBackground();
  // drawDataBackgrounds();

  const healthDay = Bangle.getHealthStatus("day") || {};
  const bpm = lastHrm.bpm;
  const confidence = lastHrm.confidence || 0;
  const steps = healthDay.steps || 0;
  const isReady = bpm !== "--" && confidence >= MIN_HRM_CONFIDENCE;

  g.setColor(0, 0, 0);
  g.setFontAlign(0, 0);

  g.setFont("6x8", 2);
  g.drawString("SALUD", 88, 48);

  if (!isReady) {
    g.setFont("6x8", 1);
    g.drawString("MIDIENDO", 88, 72);
    drawProgressBar(42, 84, 92, 10, confidence);
    g.drawString("CONF " + confidence + "%", 88, 104);

    g.setFont("6x8", 2);
    g.drawString("-- ppm", 88, 126);
    return;
  }

  if (loadSevenSegmentFont()) {
    g.setFont("7x11Numeric7Seg", 3);
    g.drawString(String(bpm), 82, 88);
    g.setFont("6x8", 2);
    g.drawString("ppm", 128, 88);
  } else {
    g.setFont("Vector", 28);
    g.drawString(String(bpm) + " ppm", 88, 88);
  }

  g.setFont("6x8", 1);
  g.drawString("CONF " + confidence + "%", 88, 116);
  g.drawString("PASOS " + steps, 88, 132);
}

function drawSystemScreen() {
  drawBackground();
  // drawDataBackgrounds();

  const memory = process.memory();
  const memoryPercent = Math.round(memory.usage * 100 / memory.total);
  const btConnected = NRF.getSecurityStatus().connected ? "ON" : "OFF";

  g.setColor(0, 0, 0);
  g.setFontAlign(0, 0);

  g.setFont("6x8", 2);
  g.drawString("SISTEMA", 88, 50);

  g.setFont("6x8", 2);
  g.drawString("BAT " + E.getBattery() + "%", 88, 80);
  g.drawString("BT " + btConnected, 88, 105);
  g.drawString("RAM " + memoryPercent + "%", 88, 130);
}

function draw() {
  updateHrmPower();

  switch (currentScreen) {
    case 1:
      drawHealthScreen();
      break;
    case 2:
      drawSystemScreen();
      break;
    default:
      drawMain();
      break;
  }
}

Bangle.on("swipe", function(dir) {
  currentScreen += dir;

  if (currentScreen < 0) currentScreen = SCREEN_COUNT - 1;
  if (currentScreen >= SCREEN_COUNT) currentScreen = 0;

  draw();
});

draw();

Bangle.on("HRM", function(hrm) {
  lastHrm = {
    bpm: hrm.bpm && hrm.bpm > 0 ? hrm.bpm : "--",
    confidence: hrm.confidence || 0
  };

  if (currentScreen === 1) draw();
});
setInterval(draw, 60000);